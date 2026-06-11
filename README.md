# QQ宠物 · 数值平衡模拟器

## 1. 项目背景与目标

这是 **新 QQ 宠物** 的离线数值平衡模拟工具，用于在上线前 review 整套金币经济：

- **核心问题**：学习 / 打工 / 进修 / 雇佣 / 冒险 / PK / 生病 / 装扮 / 抽奖等模块叠加后，玩家在不同投入强度下，金币曲线是否 **前期不吃紧、后期不膨胀**。
- **使用方式**：左侧调参 → 右侧即时看金币曲线、成长节奏、收支拆解、平衡仪表盘；支持期望值模式与蒙特卡洛模式。
- **设计原则**（策划原文）：综合考虑所有数值，保证短期内不发生通货膨胀；所有数值可调。

### 1.1 产品机制总览（策划文档）

宠物有三维 **基础状态**（本模拟器暂不计量收益影响，仅作背景）：


| 属性  | 满值  | 自然下降                |
| --- | --- | ------------------- |
| 心情  | 100 | 每 2 小时 -1（≈ 每日 -12） |
| 清洁  | 100 | 每 2 小时 -1           |
| 体力  | 100 | 每 2 小时 -1           |


宠物有三维 **学习属性**（与职业解锁相关，上限 500）：

- **武力**（wu）、**智力**（zhi）、**魅力**（mei）

**每日行动点**：学习（含进修）与打工 **共用上限 4 次**。打工占用时间，打工期间不能学习 / 冒险 / PK。

**成长线**：学前辅导课（强制首次）→ 小学（6 门毕业）→ 中学（8 门）→ 大学（10 门）→ 毕业后开启职业。

**毕业后**：只能在进修学院提升属性（需花钱），不能再回小/中/大学。玩家每天在「进修」与「打工赚钱」之间分配 4 次行动点。

---

## 2. 在线访问（自动部署）

推送到 `main` 分支后，GitHub Actions 会自动构建并发布到 GitHub Pages：

**https://dj259753.github.io/pet-economy-sim/**

首次需在仓库 **Settings → Pages → Build and deployment → Source** 选 **GitHub Actions**。之后每次 `git push` 约 1–2 分钟更新。

线上版为只读：可加载仓库内的 `config.snapshot.json`；「保存到项目」在本地 `npm run dev` 时有效，线上会改为下载 JSON。

---

## 3. 快速开始

```bash
npm install
npm run dev          # http://localhost:5173
npx tsx scripts/sanity.ts       # 命令行跑全策略汇总
npx tsx scripts/write-snapshot.ts  # 用代码默认值重写 public/config.snapshot.json
```

### 2.1 配置保存与分享（发项目 = 发配置）

团队配置在 `**public/config.snapshot.json**`，随 git 提交。


| 操作        | 说明                                        |
| --------- | ----------------------------------------- |
| 自动保存      | 改动写入浏览器 localStorage                      |
| **保存到项目** | dev 模式写入 `public/config.snapshot.json`    |
| 重载项目配置    | 丢弃本地未写回修改，读 snapshot                      |
| 恢复默认      | 回到 `src/sim/config.ts` 的 `DEFAULT_CONFIG` |


**加载优先级**：`snapshot`（若比 localStorage 新或本地无缓存）> `localStorage` > `DEFAULT_CONFIG`。

调完数值分享流程：`保存到项目` → `git add public/config.snapshot.json` → commit → 对方 clone 即用。

---

## 4. 代码结构（给 AI 的定位表）

```
src/
  sim/
    config.ts      ← 所有数值默认值与 TypeScript 类型（改默认从这里）
    engine.ts      ← 逐日模拟核心逻辑与公式（改行为从这里）
    balance.ts     ← 平衡仪表盘指标计算
  components/
    ConfigPanel.tsx   ← 左侧参数 UI
    ResultsPanel.tsx  ← 右侧图表与平衡仪表盘
  persist.ts       ← localStorage / snapshot 读写
  App.tsx
public/
  config.snapshot.json  ← 团队共享配置（优先于 DEFAULT_CONFIG）
```

**改数值的两条路径**：

1. **改默认**：编辑 `config.ts` 的 `DEFAULT_CONFIG`，再 `npx tsx scripts/write-snapshot.ts`
2. **改公式/行为**：编辑 `engine.ts` 中对应函数（见第 6 节）

---

## 5. 每日模拟循环（`engine.ts` → `runSim`）

对每个模拟日 `day = 1..N`，按以下顺序执行：

```
1. 重置当日收支、雇佣计数、生病 debuff
2. 发放当日洗护套装额度；体力自然衰减 decayPerDay
3. 可能触发生病（每 intervalDays 天）→ 自动选治疗档
4. 尝试偿还生病赊账（留 goldReserve 安全线）
5. 消耗「行动点」× min(dailyActions, dailyActionLimit)：
     - 未毕业：上课（学前班 / 小中大）
     - 已毕业：有属性缺口且金币够 → 进修，否则打工
6. 冒险 × adventuresPerDay（金币 < 安全线则跳过）
7. PK × pksPerDay
8. 被雇佣被动收入
9. 装扮 SKU 上架与购买
10. 抽奖赛季刷新 + 抽奖
11. 再次尝试偿还生病赊账
12. 记录当日金币、属性、收支明细
```

---

## 6. 各玩法机制详解

### 5.1 基础体力与经济


| 配置键 `base.*`                    | 含义              | 当前默认          |
| ------------------------------- | --------------- | ------------- |
| `staminaMax`                    | 体力上限            | 100           |
| `decayPerDay`                   | 每日自然消耗（≈每2h -1） | 12            |
| `foodCost` / `foodGain`         | 食物：花金币买体力       | 10 金币 = 10 体力 |
| `initialGold`                   | 开服初始金币          | 300           |
| `dailyActionLimit`              | 学习+打工每日上限       | 4             |
| `tutorialGold` / `tutorialAttr` | 学前班奖励           | 300 金币，三维各 +1 |


**体力恢复顺序**（`ensureStamina`）：

1. 若开启洗护：体力 ≤ 阈值时用洗护套装回满（见 5.10）
2. 否则买食物：`ceil(缺口/foodGain) × foodCost`

**隐性体力成本**：`foodCost / foodGain` 金币/点（默认 1 金币/点）。

**模拟器简化**：心情、清洁 **不影响收益**（策划确认第一期不管）。

---

### 5.2 成长线：学前班 + 小 / 中 / 大学

**配置**：`stages[]`，每项含 `required`（毕业门数）、`graduationBonus`（毕业一次性奖金）、`scholarship`、`courses[]`。

#### 学前班（`phase = -1`）

- 首次行动强制学前班：`tutorialAttr` 加到三维，`tutorialGold` 入账，然后进入小学。

#### 课程单次收益

```
体力 -= course.stamina
三维 += course.wu/zhi/mei（含夏令营随机属性，见下）
金币 += course.baseGold
金币 += scholarshipGain(stage.scholarship)   // 若 modules.scholarship 开启
coursesDone++
若 coursesDone >= stage.required → 发放 graduationBonus，升入下一阶段
```

#### 奖学金公式（`scholarshipGain`）

期望值模式：

```
EV = p1 × amount1 + p2 × amount2
```

蒙特卡洛：先 roll `p1` 得 `amount1`，否则 roll `p2` 得 `amount2`，否则 0。

#### 公益夏令营（随机属性课）

蒙特卡洛：

- 随机维度 +`random` 点
- `extraProb` 概率再随机一维 +`extraAmount`

期望模式：三维各加 `random/3 + extraProb×extraAmount/3`。

#### 选课 AI（`pickCourse`）

按 **目标职业下一档属性缺口** 加权选课：

```
score = wu×缺口武 + zhi×缺口智 + mei×缺口魅 + random×平均缺口×0.9
```

#### 毕业门数（策划原文）


| 阶段  | 需上课数 | 毕业奖金 |
| --- | ---- | ---- |
| 小学  | 6    | 100  |
| 中学  | 8    | 200  |
| 大学  | 10   | 300  |


#### 当前课程表默认值

见 `config.ts` → `stages`。相对策划原文已平衡调整：小学保底 30、中学 40、大学 40；小中奖学金 15%/35%。

---

### 5.3 进修学院（毕业后）

**配置**：`training.`*

```
前提：gold >= cost + goldReserve 且体力够
gold -= cost
体力 -= stamina
三维 += 所选进修课属性（同 pickCourse 逻辑）
gold += scholarshipGain(training.scholarship)
```

当前默认：学费 **100**，体力 20，奖学金 10%×40 + 30%×20。

---

### 5.4 职业、晋升与打工

#### 8 条职业线（`jobsCfg.jobs`）


| id       | 职业       | 属性类型         |
| -------- | -------- | ------------ |
| huajia   | 画家       | 魅+智          |
| zhentan  | 侦探       | 智+武          |
| fashi    | 大魔法师     | 智+魅          |
| dachu    | 大厨       | 武+智          |
| wushu    | 武术家      | 纯武           |
| meng     | 梦境旅人     | 纯智           |
| mingxing | 大明星      | 纯魅           |
| wanxiang | 万象之主（彩蛋） | 见习无门槛；仅高级/大师 |


**晋升双条件**（`checkPromotion`）：

1. 三维 ≥ 下一档 `wu/zhi/mei` 要求
2. 在当前档位打工次数 ≥ `workFromPrev`（升档后 `workCount` 清零）

经验次数（策划原文）：见习→初级 10，→中级 18，→高级 32，→大师 48。

属性要求表见策划文档；代码在 `config.ts` 各 `dualJob` / `singleJob` 定义，**门槛不在平衡调整范围内**。

#### 小乞丐保底打工（重要）

若毕业后 **未达目标职业见习属性门槛**（`tierIdx = -1`），打工走 `payRows[5]`（小乞丐行），**无属性门槛**，用于金币耗尽时攒钱进修。

入职见习后 `tierIdx = 0`，开始计工作经验。

#### 四类打工订单


| 键名    | 名称  | 时长     | 默认体力 |
| ----- | --- | ------ | ---- |
| kuai  | 快单  | 60min  | 10   |
| wen   | 稳单  | 120min | 15   |
| guaji | 挂机单 | 240min | 20   |
| du    | 赌单  | 240min | 20   |


**收益配置**：`jobsCfg.payRows[tierIndex][orderKey]`，为固定值或 `min~max` 区间。

**单次打工收入**（`doWork`）：

```
base = sampleRange(payRow[orderKey])        // 期望=(min+max)/2
hireBonus = base × hirePct                  // 若主动雇佣
earn('work', base)
earn('hire', hireBonus)
workCount++
```

**当前 payRows（平衡版，见习不变、大师快单 140）**：


| 档位    | 快单  | 稳单      | 挂机单     | 赌单     |
| ----- | --- | ------- | ------- | ------ |
| 0 见习  | 100 | 80~160  | 140~180 | 20~220 |
| 1 初级  | 110 | 90~170  | 150~185 | 24~235 |
| 2 中级  | 120 | 100~190 | 165~210 | 32~255 |
| 3 高级  | 130 | 115~215 | 180~230 | 36~285 |
| 4 大师  | 140 | 125~230 | 195~250 | 45~300 |
| 5 小乞丐 | 80  | 25~130  | 85~150  | 12~300 |


**自动选单**（`bestOrderKey`，策略 `orderPref = auto`）：

```
净期望 = mid(收益) × (1 + hireFactor) - 体力消耗 × (foodCost/foodGain)
取四类订单中净期望最高者
```

---

### 5.5 主动雇佣（打工加成）

**配置**：`hire.`*，开关 `modules.hire`。

每次打工可雇 1 人（每日上限 `hire.dailyLimit`，默认 6；策略 `useHire` 控制）。

```
bonusPct = sampleRange(bonusByTier[当前档位])   // 按 payRow 对应档位
若 RNG 且被打断（概率 interruptProb）：bonusPct /= 2
hireBonus = base × bonusPct
```

期望模式下打断折算：`bonusPct × (1 - 0.5 × interruptProb)`。

当前加成区间（相对策划已 ×0.8）：见习 4~~16%，初级 5~~18%，中级 6~~20%，高级 8~~22%，大师 10~26%。

---

### 5.6 被雇佣分成（被动收入）

**配置**：`hiredBy.dailyLimit`（全局上限 6）、策略 `beHiredPerDay` + `selfOnlineProb`。

模拟假设：朋友圈雇主水平与自己相近。

```
baseMid = 四类订单收益中值的平均
每次被雇且上线打断：
  分成 = baseMid × bonusPct / 2
每日最多 min(beHiredPerDay, hiredBy.dailyLimit) 次
```

期望模式：`n × selfOnlineProb × (mid(bonusRange)/100 × baseMid) / 2`。

---

### 5.7 冒险

**配置**：`adventure.`*，开关 `modules.adventure`。

```
每次先扣 costGold（默认 10）
按事件权重随机一条（prob 为权重，总和不必等于 100）
金币事件走 earn()；负金币直接扣
体力恢复事件：stamina = min(max, stamina + ev.stamina)
```

**跳过条件**：`gold < costGold + goldReserve`。

当前事件池期望金币（含消耗）≈ **-1.5/次**（略负，防刷）。


| 事件       | 权重% | 金币         |
| -------- | --- | ---------- |
| 打招呼      | 25  | +10        |
| 捡到大量     | 20  | +30        |
| 捡到少量     | 10  | +15        |
| 被偷       | 15  | -20        |
| 阴天/晴天/雨天 | 各15 | 0（雨天+10体力） |


---

### 5.8 PK

**配置**：`pk.`*，开关 `modules.pk`。

```
消耗 pk.stamina 体力
50% 赢 +winGold，50% 输 -loseGold
```

期望净金币 = `winProb×winGold - (1-winProb)×loseGold`；默认 ±8 金币，体力 5 → 含体力折算后期望为负，防无限刷。

**跳过条件**：`gold < loseGold + goldReserve`。

---

### 5.9 生病与三档治疗

**配置**：`sick.`*，开关 `modules.sickness`。

每 `intervalDays` 天（默认 **21**）触发一次。玩家 **自动选总代价最低** 的档位：


| 档位  | 价格              | 效果                       | 总代价公式                           |
| --- | --------------- | ------------------------ | ------------------------------- |
| 低档  | `priceCheap` 50 | 当日 **所有** 金币收入 ×0.5      | `50 + 0.5 × 近7日日均收入`            |
| 中档  | `priceMid` 150  | 损失 `sickLostWork` 次行动点打工 | `150 + sickLostWork × 单次打工期望收入` |
| 高档  | `priceFast` 800 | 无 debuff                 | `800`                           |


```
incomeEst = 近7日总收入均值
perWork = evWorkIncome()   // 当前档位+订单的打工期望
在 gold >= 价格 + goldReserve 的档位中选 cost 最小
```

**付不起**：赊账低档（`sickDebt += priceCheap`），当日收益减半。

**还债**：`gold >= sickDebt + goldReserve` 时自动还清。

策略参数 `sickLostWork`：中档损失的打工次数（佛系/休闲 1、普通 0.5、肝帝/极端 0）。

---

### 5.10 洗护套装

**配置**：`washKit.`*，开关 `modules.washKit`。

策划设定：系统每日送 10 套，**1 套自用 + 9 套送好友**；自己平均每天收到好友洗护 **2~4 次**（模拟默认 **3~5**）。

```
每日额度 = selfPerDay + uniform(friendMin, friendMax)
使用阈值 = uniform(thresholdMin, thresholdMax)   // 默认 30~40
当 stamina <= 阈值 且 有剩余套数：体力回满，套数-1
```

在 `ensureStamina` 中优先于买食物触发。开启后食物支出通常接近 0。

---

### 5.11 装扮 SKU 池

**配置**：`outfit.`*，开关 `modules.outfits`。

四类：帽子、配饰（同价）、衣服、背景（同价）。各 B/A/S 三档（已去掉 C 级）。

**上架规则**（`buildSkuSchedule`）：

- 开服：`initialCounts` 款（默认 B12/A6/S2）在第 1 天在售
- 之后每 `releaseIntervalDays[档位]` 天上新 1 款（S 默认 45 天）
- 价格在四类间轮转取 `prices[category][grade]`

**购买决策**（按策略 `outfitProbs[C,B,A,S]`）：

蒙特卡洛：上新时以概率 `outfitProbs[g]` 加入想买队列；每日按队列顺序买，需 `gold >= price + reserve`。

期望模式：上新时 `pendingOutfitSpend += prob × price`；每日能花则花。

当前 S 定价：帽/配饰 3000，衣/背景 5000。

---

### 5.12 抽奖（核心金币回收）

**配置**：`gacha.`*，开关 `modules.gacha`。


| 参数           | 含义      | 默认         |
| ------------ | ------- | ---------- |
| `startDay`   | 开服第几天上线 | 90（第 3 个月） |
| `seasonDays` | 奖池轮换周期  | 90 天       |
| `price`      | 单抽价格    | 130        |


**赛季**：从 `startDay` 起每 `seasonDays` 天开启新一期；新期重置「本季大奖未中」状态。

**抽奖条件**：

```
day >= startDay
draws = min(gachaPerDay, floor((gold - gachaFloor) / price))
```

**奖池**（当前默认）：


| 奖品         | 权重%  | 返金币 |
| ---------- | ---- | --- |
| 终极大奖（限定外观） | 0.3  | 0   |
| 金币暴击       | 2    | 400 |
| 大金袋        | 6    | 150 |
| 小金袋        | 18   | 60  |
| 安慰金        | 25   | 20  |
| 谢谢惠顾       | 48.7 | 0   |


**重要行为**：中大奖后 **仍可继续抽**，仅本季大奖从奖池移除（小奖照抽）。

蒙特卡洛：每抽从当前奖池按权重 roll；中 `isGrand` 后 `seasonWon = true`，后续只 roll 非大奖池。

期望模式：每抽

```
evGold = seasonNoWinProb × evFull + (1 - seasonNoWinProb) × evNonGrand
seasonNoWinProb *= (1 - grandProb)
```

沉没率 ≈ `1 - evReturn/price`（全池期望返还约 33%）。

---

### 5.13 机制总开关

`modules.*`：关闭后该模块 **完全不参与** 模拟（用于单独评估某模块对经济的影响）。


| 键           | 模块     |
| ----------- | ------ |
| hire        | 主动雇佣加成 |
| hiredBy     | 被雇佣分成  |
| adventure   | 冒险     |
| pk          | PK     |
| sickness    | 生病     |
| outfits     | 装扮购买   |
| washKit     | 洗护套装   |
| scholarship | 奖学金    |
| gacha       | 抽奖     |


---

## 7. 玩家策略模型（`strategies[]`）

模拟器用 5 档 **玩家画像**，核心按 **日均行动点**（学习/打工）区分；冒险·PK·装扮·抽奖不占行动点。右侧结果区顶部有各档策略说明卡片。


| 策略   | 日均行动 | 打工偏好 | 冒险  | PK  | 目标职业 | 抽奖         |
| ---- | ---- | ---- | --- | --- | ---- | ---------- |
| 佛系   | 1    | 快单   | 0   | 0   | 大明星  | 不抽         |
| 休闲   | 2    | 快单   | 1   | 1   | 大明星  | 1次,起抽300   |
| 普通   | 3    | 稳单   | 2   | 3   | 画家   | 4次,起抽5000  |
| 肝帝   | 3.3  | 挂机单  | 5   | 6   | 武术家  | 8次,起抽6000  |
| 极端   | 4    | 挂机单  | 8   | 10  | 武术家  | 12次,起抽8000 |

`dailyActions` 支持小数（如 3.3）：期望模式下约 30% 的天数多 1 次行动，长期均值 ≈ 配置值；蒙特卡洛按概率随机取整。


**共同决策规则**（`engine.ts`）：

1. **毕业后行动**：下一档有属性缺口 且 `gold >= 进修费 + goldReserve` → 进修，否则打工
2. **未达见习门槛**：打工走小乞丐行（`tierIdx = -1`）
3. **冒险/PK**：金币低于 `goldReserve` 相关阈值则跳过
4. **治病**：自动选代价最低档；还债保留 `goldReserve`
5. **选课/进修课**：按目标职业缺口贪心

**策略专属参数**：


| 字段                           | 含义             |
| ---------------------------- | -------------- |
| `goldReserve`                | 金币安全线（默认 50）   |
| `outfitProbs`                | B/A/S 购买意愿 0~1 |
| `beHiredPerDay`              | 每日被雇佣次数        |
| `selfOnlineProb`             | 被雇时上线打断概率      |
| `sickLostWork`               | 选中档治病损失打工次数    |
| `gachaPerDay` / `gachaFloor` | 每日抽奖上限 / 起抽存量  |


---

## 8. 模拟模式

### 7.1 期望值模式（`rng = null`）

所有随机量取数学期望：区间收益用 `(min+max)/2`，奖学金/抽奖/装扮购买用概率加权。曲线平滑，适合调参对比。

### 7.2 蒙特卡洛模式（`runMonteCarlo`）

用 `mulberry32` 种子流真实抽样，默认 200 次。输出 P10/P50/P90 金币带、里程碑中位天数。

### 7.3 平衡仪表盘（`balance.ts`）

聚焦当前策略，6 项指标绿/黄/红：


| 指标               | 健康目标                   |
| ---------------- | ---------------------- |
| 前 30 天日均净收益      | ≥ 0                    |
| 第 7 天金币          | ≥ 500（注：毕业当天可能因进修消费偏低） |
| 后 30 天稳态日净       | 0 ~ 80                 |
| 全周期收支比           | 1.0 ~ 1.3              |
| 第 275~365 天金币日增速 | 趋近 0                   |
| 抽奖净沉没 / 总收入      | ≥ 15%                  |


---

## 9. 当前平衡快照（`DEFAULT_CONFIG` / snapshot）

最近一次平衡目标：**前期减压 + 后期压通胀**。


| 策略  | 365天期末金币(EV) | 稳态日净 | 收支比(约) |
| --- | ------------ | ---- | ------ |
| 佛系  | ~2.4w        | +132 | ~1.12  |
| 休闲  | ~5.7w        | +204 | ~1.20  |
| 普通  | ~7.2w        | +191 | ~1.14  |
| 肝帝  | ~3.0w        | −13  | ~1.02  |
| 极端  | ~0.8w        | −3   | ~1.02  |


**调参杠杆速查**：


| 想达到的效果  | 优先改什么                                                                       |
| ------- | --------------------------------------------------------------------------- |
| 前期更宽裕   | `tutorialGold`、`stages[].courses[].baseGold`、`training.cost`↓、`initialGold` |
| 后期少膨胀   | `payRows` 高档↓、`gacha.price`↑、`gachaPerDay`↑、`outfitProbs`↑、S 定价↑            |
| 体力更有压力  | 关 `modules.washKit` 或减 `friendMin/Max`                                      |
| 抽奖回收更强  | 降大奖概率、提单抽价、降 `gachaFloor`                                                   |
| 零消费囤币上限 | 将 `outfitProbs`/`gachaPerDay` 置 0；只能靠砍产出端                                         |


---

## 10. 收支记账与守恒

每日：

```
net = sum(income.*) - sum(expense.*)
finalGold = initialGold + 全周期 net
```

收入科目：`work, hire, hiredBy, course, scholarship, graduation, adventure, pk, gacha`

支出科目：`training, food, sickness, adventure, pk, outfit, gacha`

生病低档的「收益减半」通过 `earn()` 对所有当日金币收入 ×0.5 实现。

---

## 11. 模拟器简化与已知差异

相对真实 QQ 宠物，本工具做了以下简化：


| 项目     | 策划原文            | 模拟器处理                             |
| ------ | --------------- | --------------------------------- |
| 心情/清洁  | 每 2h -1         | **不计入收益**                         |
| 打工时间   | 60/120/240 分钟占用 | 仅影响订单类型选择，**不限制每日次数**（次数只看 4 行动点） |
| 每日雇佣次数 | 策划写 4 次打工=4 次雇佣 | 全局上限配为 **6**（`hire.dailyLimit`）   |
| 万象之主   | 无初/中级           | 仅见习小乞丐 + 高级 + 大师                  |
| 破产保护   | 未明确             | 用 `goldReserve`、治病赊账、小乞丐保底规避死局    |
| 洗护     | 10 套/天，1 自用     | 好友次数用 **3~5** 可调区间模拟              |


---

## 12. 给 AI 的改公式速查


| 要改的行为        | 文件           | 函数/位置                                         |
| ------------ | ------------ | --------------------------------------------- |
| 奖学金期望        | `engine.ts`  | `scholarshipGain`                             |
| 选课/进修课选择     | `engine.ts`  | `pickCourse`, `attrWeights`                   |
| 打工收入与雇佣      | `engine.ts`  | `doWork`, `hireEvFactor`                      |
| 自动选订单        | `engine.ts`  | `bestOrderKey`                                |
| 晋升判定         | `engine.ts`  | `checkPromotion`                              |
| 进修/打工决策      | `engine.ts`  | `doJobAction`                                 |
| 小乞丐_fallback | `engine.ts`  | `currentPayRow`, `FALLBACK_PAY_ROW`           |
| 被雇佣分成        | `engine.ts`  | `doHiredBy`                                   |
| 生病选档         | `engine.ts`  | `handleSickness`                              |
| 洗护           | `engine.ts`  | `maybeWash`                                   |
| 装扮上架         | `engine.ts`  | `buildSkuSchedule`, `handleOutfits`           |
| 抽奖赛季/奖池      | `engine.ts`  | `gachaNewSeason`, `doGacha`, `rollGachaPrize` |
| 平衡指标阈值       | `balance.ts` | `computeBalanceMetrics`                       |
| 所有默认数值       | `config.ts`  | `DEFAULT_CONFIG`                              |
| 玩家画像         | `config.ts`  | `strategies[]`                                |


---

## 13. 原始策划文档

完整策划表格（职业晋升表、各职业打工文案、原始课程表等）见项目外文件：

`../一、基础状态属性.md`（与 `pet-economy-sim` 同级目录）

模拟器内数值以 `public/config.snapshot.json` 为准；若与策划原文不一致，以 snapshot + 本 README 第 5 节「当前默认」为准。
import type { OrderKey, SimConfig, StageConfig, StrategyConfig } from '../sim/config';
import { medianDrawsToGrand, OUTFIT_CATEGORIES, OUTFIT_GRADES } from '../sim/config';
import { CellInput, Hint, NumField, Row, Section } from './ui';

const ORDER_NAMES: Record<OrderKey, string> = {
  kuai: '快单',
  wen: '稳单',
  guaji: '挂机单',
  du: '赌单',
};
const ORDER_KEYS: OrderKey[] = ['kuai', 'wen', 'guaji', 'du'];
const PAY_ROW_NAMES = ['见习', '初级', '中级', '高级', '大师', '万象·见习(彩蛋)'];

export function ConfigPanel({
  config,
  update,
}: {
  config: SimConfig;
  update: (fn: (draft: SimConfig) => void) => void;
}) {
  const MODULE_SWITCHES: { key: keyof SimConfig['modules']; name: string }[] = [
    { key: 'hire', name: '主动雇佣加成' },
    { key: 'hiredBy', name: '被雇佣分成' },
    { key: 'adventure', name: '冒险' },
    { key: 'pk', name: 'PK' },
    { key: 'sickness', name: '生病' },
    { key: 'outfits', name: '装扮购买' },
    { key: 'washKit', name: '洗护套装' },
    { key: 'scholarship', name: '奖学金' },
    { key: 'gacha', name: '抽奖' },
    { key: 'pay', name: '付费充值' },
  ];

  return (
    <div className="config-panel">
      <Section title="⓪ 机制开关" defaultOpen>
        <div className="switch-grid">
          {MODULE_SWITCHES.map((m) => (
            <label key={m.key} className="checkbox-field">
              <input
                type="checkbox"
                checked={config.modules[m.key]}
                onChange={(e) => update((d) => (d.modules[m.key] = e.target.checked))}
              />
              {m.name}
            </label>
          ))}
        </div>
        <Hint>关闭的机制完全不计入模拟，可用于单独评估每个模块对经济的影响。</Hint>
      </Section>

      <Section title="① 基础属性与体力" defaultOpen>
        <Row>
          <NumField
            label="体力上限"
            value={config.base.staminaMax}
            onChange={(v) => update((d) => (d.base.staminaMax = v))}
          />
          <NumField
            label="每日自然消耗"
            value={config.base.decayPerDay}
            suffix="点/天"
            onChange={(v) => update((d) => (d.base.decayPerDay = v))}
          />
        </Row>
        <Row>
          <NumField
            label="食物价格"
            value={config.base.foodCost}
            suffix="金币"
            onChange={(v) => update((d) => (d.base.foodCost = v))}
          />
          <NumField
            label="食物回体力"
            value={config.base.foodGain}
            suffix="点"
            onChange={(v) => update((d) => (d.base.foodGain = v))}
          />
        </Row>
        <Row>
          <NumField
            label="每日学习/打工上限"
            value={config.base.dailyActionLimit}
            suffix="次"
            onChange={(v) => update((d) => (d.base.dailyActionLimit = v))}
          />
          <NumField
            label="初始金币"
            value={config.base.initialGold}
            onChange={(v) => update((d) => (d.base.initialGold = v))}
          />
        </Row>
        <Row>
          <NumField
            label="学前班金币"
            value={config.base.tutorialGold}
            onChange={(v) => update((d) => (d.base.tutorialGold = v))}
          />
          <NumField
            label="学前班三维各加"
            value={config.base.tutorialAttr}
            onChange={(v) => update((d) => (d.base.tutorialAttr = v))}
          />
        </Row>
        <Hint>体力无自然恢复，1 点体力 ≈ {(config.base.foodCost / config.base.foodGain).toFixed(1)} 金币的隐性成本。</Hint>
      </Section>

      <Section title="② 成长线课程（小/中/大学）">
        {config.stages.map((stage, si) => (
          <div key={si} className="stage-block">
            <div className="stage-title">{stage.name}</div>
            <Row>
              <NumField
                label="毕业所需课程"
                value={stage.required}
                suffix="门"
                onChange={(v) => update((d) => (d.stages[si].required = v))}
              />
              <NumField
                label="毕业奖金"
                value={stage.graduationBonus}
                suffix="币"
                onChange={(v) => update((d) => (d.stages[si].graduationBonus = v))}
              />
            </Row>
            <Row>
              <NumField
                label="奖学金概率①"
                value={stage.scholarship.p1}
                step={0.05}
                onChange={(v) => update((d) => (d.stages[si].scholarship.p1 = v))}
              />
              <NumField
                label="金额①"
                value={stage.scholarship.amount1}
                onChange={(v) => update((d) => (d.stages[si].scholarship.amount1 = v))}
              />
            </Row>
            <Row>
              <NumField
                label="奖学金概率②"
                value={stage.scholarship.p2}
                step={0.05}
                onChange={(v) => update((d) => (d.stages[si].scholarship.p2 = v))}
              />
              <NumField
                label="金额②"
                value={stage.scholarship.amount2}
                onChange={(v) => update((d) => (d.stages[si].scholarship.amount2 = v))}
              />
            </Row>
            <StageCourseHint stage={stage} />
            <table className="mini-table">
              <thead>
                <tr>
                  <th>课程</th>
                  <th>武</th>
                  <th>智</th>
                  <th>魅</th>
                  <th>随机</th>
                  <th>体力</th>
                  <th>保底币</th>
                </tr>
              </thead>
              <tbody>
                {stage.courses.map((course, ci) => (
                  <tr key={ci}>
                    <td className="name-cell">{course.name}</td>
                    {(['wu', 'zhi', 'mei', 'random', 'stamina', 'baseGold'] as const).map(
                      (field) => (
                        <td key={field}>
                          <CellInput
                            value={course[field]}
                            onChange={(v) =>
                              update((d) => (d.stages[si].courses[ci][field] = v))
                            }
                          />
                        </td>
                      ),
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </Section>

      <Section title="③ 进修学院">
        <Row>
          <NumField
            label="单次学费"
            value={config.training.cost}
            suffix="金币"
            onChange={(v) => update((d) => (d.training.cost = v))}
          />
          <NumField
            label="体力消耗"
            value={config.training.stamina}
            suffix="点"
            onChange={(v) => update((d) => (d.training.stamina = v))}
          />
        </Row>
        <Row>
          <NumField
            label="奖学金概率①"
            value={config.training.scholarship.p1}
            step={0.05}
            onChange={(v) => update((d) => (d.training.scholarship.p1 = v))}
          />
          <NumField
            label="金额①"
            value={config.training.scholarship.amount1}
            onChange={(v) => update((d) => (d.training.scholarship.amount1 = v))}
          />
        </Row>
        <Row>
          <NumField
            label="奖学金概率②"
            value={config.training.scholarship.p2}
            step={0.05}
            onChange={(v) => update((d) => (d.training.scholarship.p2 = v))}
          />
          <NumField
            label="金额②"
            value={config.training.scholarship.amount2}
            onChange={(v) => update((d) => (d.training.scholarship.amount2 = v))}
          />
        </Row>
        <table className="mini-table">
          <thead>
            <tr>
              <th>课程</th>
              <th>武</th>
              <th>智</th>
              <th>魅</th>
            </tr>
          </thead>
          <tbody>
            {config.training.courses.map((course, ci) => (
              <tr key={ci}>
                <td className="name-cell">{course.name}</td>
                {(['wu', 'zhi', 'mei'] as const).map((field) => (
                  <td key={field}>
                    <CellInput
                      value={course[field]}
                      onChange={(v) => update((d) => (d.training.courses[ci][field] = v))}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <Hint>
          进修净成本 ≈ 学费 + 体力折算 − 奖学金期望 ={' '}
          {(
            config.training.cost +
            (config.training.stamina * config.base.foodCost) / config.base.foodGain -
            (config.training.scholarship.p1 * config.training.scholarship.amount1 +
              config.training.scholarship.p2 * config.training.scholarship.amount2)
          ).toFixed(0)}{' '}
          金币 / 3 属性点
        </Hint>
      </Section>

      <Section title="④ 职业晋升要求">
        <Row>
          <NumField
            label="属性上限"
            value={config.jobsCfg.attrCap}
            onChange={(v) => update((d) => (d.jobsCfg.attrCap = v))}
          />
        </Row>
        {config.jobsCfg.jobs.map((job, ji) => (
          <Section key={job.id} title={job.name} badge={`${job.tiers.length} 档`}>
            <table className="mini-table">
              <thead>
                <tr>
                  <th>档位</th>
                  <th>武≥</th>
                  <th>智≥</th>
                  <th>魅≥</th>
                  <th>经验次数</th>
                </tr>
              </thead>
              <tbody>
                {job.tiers.map((tier, ti) => (
                  <tr key={ti}>
                    <td className="name-cell">{tier.name}</td>
                    {(['wu', 'zhi', 'mei', 'workFromPrev'] as const).map((field) => (
                      <td key={field}>
                        <CellInput
                          value={tier[field]}
                          onChange={(v) =>
                            update((d) => (d.jobsCfg.jobs[ji].tiers[ti][field] = v))
                          }
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        ))}
      </Section>

      <Section title="⑤ 打工订单收益">
        <table className="mini-table">
          <thead>
            <tr>
              <th>订单</th>
              <th>时长(分)</th>
              <th>体力</th>
            </tr>
          </thead>
          <tbody>
            {ORDER_KEYS.map((key) => (
              <tr key={key}>
                <td className="name-cell">{ORDER_NAMES[key]}</td>
                <td>
                  <CellInput
                    value={config.jobsCfg.orderMeta[key].minutes}
                    onChange={(v) => update((d) => (d.jobsCfg.orderMeta[key].minutes = v))}
                  />
                </td>
                <td>
                  <CellInput
                    value={config.jobsCfg.orderMeta[key].stamina}
                    onChange={(v) => update((d) => (d.jobsCfg.orderMeta[key].stamina = v))}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <table className="mini-table">
          <thead>
            <tr>
              <th>档位</th>
              <th>快单</th>
              <th>稳min</th>
              <th>稳max</th>
              <th>挂min</th>
              <th>挂max</th>
              <th>赌min</th>
              <th>赌max</th>
            </tr>
          </thead>
          <tbody>
            {config.jobsCfg.payRows.map((row, ri) => (
              <tr key={ri}>
                <td className="name-cell">{PAY_ROW_NAMES[ri]}</td>
                <td>
                  <CellInput
                    value={row.kuai.min}
                    onChange={(v) =>
                      update((d) => {
                        d.jobsCfg.payRows[ri].kuai.min = v;
                        d.jobsCfg.payRows[ri].kuai.max = v;
                      })
                    }
                  />
                </td>
                {(['wen', 'guaji', 'du'] as const).flatMap((key) =>
                  (['min', 'max'] as const).map((mm) => (
                    <td key={`${key}-${mm}`}>
                      <CellInput
                        value={row[key][mm]}
                        onChange={(v) => update((d) => (d.jobsCfg.payRows[ri][key][mm] = v))}
                      />
                    </td>
                  )),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section title="⑥ 雇佣">
        <Row>
          <NumField
            label="每日可雇佣"
            value={config.hire.dailyLimit}
            suffix="次"
            onChange={(v) => update((d) => (d.hire.dailyLimit = v))}
          />
          <NumField
            label="被雇者上线概率"
            value={config.hire.interruptProb}
            step={0.05}
            onChange={(v) => update((d) => (d.hire.interruptProb = v))}
          />
          <NumField
            label="上线时雇员分增量"
            value={config.hire.interruptSplit}
            step={0.05}
            onChange={(v) => update((d) => (d.hire.interruptSplit = v))}
          />
        </Row>
        <table className="mini-table">
          <thead>
            <tr>
              <th>被雇者档位</th>
              <th>加成min%</th>
              <th>加成max%</th>
            </tr>
          </thead>
          <tbody>
            {config.hire.bonusByTier.map((range, ti) => (
              <tr key={ti}>
                <td className="name-cell">{PAY_ROW_NAMES[ti]}</td>
                <td>
                  <CellInput
                    value={range.min}
                    onChange={(v) => update((d) => (d.hire.bonusByTier[ti].min = v))}
                  />
                </td>
                <td>
                  <CellInput
                    value={range.max}
                    onChange={(v) => update((d) => (d.hire.bonusByTier[ti].max = v))}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Hint>
          主动雇佣：打工本金全归雇主；增量=本金×加成%。未上线则雇主拿全部增量；上线则增量按
          {Math.round(config.hire.interruptSplit * 100)}%:{Math.round((1 - config.hire.interruptSplit) * 100)}%
          分给被雇者与雇主（雇主另有全部本金）。
        </Hint>
        <div className="stage-title">被雇佣（被动收入）</div>
        <Row>
          <NumField
            label="每日可被雇佣上限"
            value={config.hiredBy.dailyLimit}
            suffix="次"
            onChange={(v) => update((d) => (d.hiredBy.dailyLimit = v))}
          />
        </Row>
        <table className="mini-table">
          <thead>
            <tr>
              <th>档位</th>
              <th>假设雇主本金（快单）</th>
            </tr>
          </thead>
          <tbody>
            {config.hiredBy.referenceBaseByTier.map((base, ti) => (
              <tr key={ti}>
                <td className="name-cell">{PAY_ROW_NAMES[ti]}</td>
                <td>
                  <CellInput
                    value={base}
                    onChange={(v) => update((d) => (d.hiredBy.referenceBaseByTier[ti] = v))}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Hint>
          被他人雇佣时若上线，分得「雇主本金×我的加成%×{Math.round(config.hire.interruptSplit * 100)}%」。本金默认各档快单固定收益；每日被雇佣次数与上线概率在策略区配置。
        </Hint>
      </Section>

      <Section title="⑦ 冒险">
        <Row>
          <NumField
            label="每次消耗金币"
            value={config.adventure.costGold}
            onChange={(v) => update((d) => (d.adventure.costGold = v))}
          />
          <NumField
            label="每次消耗体力"
            value={config.adventure.costStamina}
            onChange={(v) => update((d) => (d.adventure.costStamina = v))}
          />
        </Row>
        <table className="mini-table">
          <thead>
            <tr>
              <th>事件</th>
              <th>权重%</th>
              <th>金币±</th>
              <th>回体力</th>
            </tr>
          </thead>
          <tbody>
            {config.adventure.events.map((ev, ei) => (
              <tr key={ei}>
                <td className="name-cell">{ev.name}</td>
                {(['prob', 'gold', 'stamina'] as const).map((field) => (
                  <td key={field}>
                    <CellInput
                      value={ev[field]}
                      onChange={(v) => update((d) => (d.adventure.events[ei][field] = v))}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <AdventureEvHint config={config} />
      </Section>

      <Section title="⑧ PK">
        <Row>
          <NumField
            label="体力消耗"
            value={config.pk.stamina}
            onChange={(v) => update((d) => (d.pk.stamina = v))}
          />
          <NumField
            label="胜率"
            value={config.pk.winProb}
            step={0.05}
            onChange={(v) => update((d) => (d.pk.winProb = v))}
          />
        </Row>
        <Row>
          <NumField
            label="赢得金币"
            value={config.pk.winGold}
            onChange={(v) => update((d) => (d.pk.winGold = v))}
          />
          <NumField
            label="输掉金币"
            value={config.pk.loseGold}
            onChange={(v) => update((d) => (d.pk.loseGold = v))}
          />
        </Row>
        <Hint>
          单次 PK 净期望 ={' '}
          {(
            config.pk.winProb * config.pk.winGold -
            (1 - config.pk.winProb) * config.pk.loseGold -
            (config.pk.stamina * config.base.foodCost) / config.base.foodGain
          ).toFixed(1)}{' '}
          金币（含体力折算）。负值才能防刷。
        </Hint>
      </Section>

      <Section title="⑨ 生病（三档治疗）">
        <Row>
          <NumField
            label="生病间隔"
            value={config.sick.intervalDays}
            suffix="天"
            onChange={(v) => update((d) => (d.sick.intervalDays = v))}
          />
        </Row>
        <Row>
          <NumField
            label="低档(收益减半)"
            value={config.sick.priceCheap}
            suffix="金币"
            onChange={(v) => update((d) => (d.sick.priceCheap = v))}
          />
        </Row>
        <Row>
          <NumField
            label="中档(3h禁工)"
            value={config.sick.priceMid}
            suffix="金币"
            onChange={(v) => update((d) => (d.sick.priceMid = v))}
          />
        </Row>
        <Row>
          <NumField
            label="高档(立即可工)"
            value={config.sick.priceFast}
            suffix="金币"
            onChange={(v) => update((d) => (d.sick.priceFast = v))}
          />
        </Row>
        <Hint>
          玩家自动选总代价最低的档位：低档 = 药费 + 当日收入的一半；中档 = 药费 +
          损失打工次数×单次打工期望（损失次数按策略配置）；高档 = 仅药费。
        </Hint>
      </Section>

      <Section title="⑨½ 洗护套装">
        <Row>
          <NumField
            label="每日自用"
            value={config.washKit.selfPerDay}
            suffix="套"
            onChange={(v) => update((d) => (d.washKit.selfPerDay = v))}
          />
        </Row>
        <Row>
          <NumField
            label="好友赠洗min"
            value={config.washKit.friendMin}
            suffix="次/天"
            onChange={(v) => update((d) => (d.washKit.friendMin = v))}
          />
          <NumField
            label="max"
            value={config.washKit.friendMax}
            onChange={(v) => update((d) => (d.washKit.friendMax = v))}
          />
        </Row>
        <Row>
          <NumField
            label="每次恢复体力"
            value={config.washKit.staminaGain}
            suffix="点"
            onChange={(v) => update((d) => (d.washKit.staminaGain = v))}
          />
          <NumField
            label="使用阈值min"
            value={config.washKit.thresholdMin}
            suffix="体力"
            onChange={(v) => update((d) => (d.washKit.thresholdMin = v))}
          />
          <NumField
            label="max"
            value={config.washKit.thresholdMax}
            onChange={(v) => update((d) => (d.washKit.thresholdMax = v))}
          />
        </Row>
        <Hint>
          体力降到阈值区间时使用洗护，每次 +{config.washKit.staminaGain} 体力（上限{' '}
          {config.base.staminaMax}）。自用 {config.washKit.selfPerDay} 套/天，好友赠洗{' '}
          {config.washKit.friendMin}~{config.washKit.friendMax} 次/天。
        </Hint>
      </Section>

      <Section title="⑩ 装扮定价">
        <table className="mini-table">
          <thead>
            <tr>
              <th>类别</th>
              {OUTFIT_GRADES.map((g) => (
                <th key={g}>{g}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {OUTFIT_CATEGORIES.map((cat) => (
              <tr key={cat.key}>
                <td className="name-cell">{cat.name}</td>
                {OUTFIT_GRADES.map((_, gi) => (
                  <td key={gi}>
                    <CellInput
                      value={config.outfit.prices[cat.key][gi]}
                      onChange={(v) => update((d) => (d.outfit.prices[cat.key][gi] = v))}
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        <table className="mini-table">
          <thead>
            <tr>
              <th>档位</th>
              <th>开服在售款数</th>
              <th>上新间隔(天, 0=不上新)</th>
            </tr>
          </thead>
          <tbody>
            {OUTFIT_GRADES.map((g, gi) => (
              <tr key={g}>
                <td className="name-cell">{g} 级</td>
                <td>
                  <CellInput
                    value={config.outfit.initialCounts[gi]}
                    onChange={(v) => update((d) => (d.outfit.initialCounts[gi] = v))}
                  />
                </td>
                <td>
                  <CellInput
                    value={config.outfit.releaseIntervalDays[gi]}
                    onChange={(v) => update((d) => (d.outfit.releaseIntervalDays[gi] = v))}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Row>
          <NumField
            label="购买保留缓冲"
            value={config.outfit.reserve}
            suffix="金币"
            onChange={(v) => update((d) => (d.outfit.reserve = v))}
          />
        </Row>
        <Hint>
          SKU 价格在档位内按 帽子→衣服→配饰→背景 轮转取价。玩家对每档新品的购买意愿概率
          在策略区配置；想买但买不起的会排队，攒够（价格+缓冲）后购买。全套单价合计：
          {OUTFIT_GRADES.map(
            (g, gi) =>
              `${g}=${OUTFIT_CATEGORIES.reduce((s, c) => s + config.outfit.prices[c.key][gi], 0)}`,
          ).join('　')}
        </Hint>
      </Section>

      <Section title="⑪ 抽奖（金币回收）">
        <Row>
          <NumField
            label="单抽价格"
            value={config.gacha.price}
            suffix="金币"
            onChange={(v) => update((d) => (d.gacha.price = v))}
          />
          <NumField
            label="抽奖开始时间"
            value={config.gacha.startDay}
            suffix="天"
            onChange={(v) => update((d) => (d.gacha.startDay = Math.max(1, Math.round(v))))}
          />
        </Row>
        <Row>
          <NumField
            label="奖池轮换周期"
            value={config.gacha.seasonDays}
            suffix="天"
            onChange={(v) => update((d) => (d.gacha.seasonDays = v))}
          />
          <NumField
            label="终极大奖周期目标"
            value={config.gacha.targetGrandDays}
            suffix="天"
            onChange={(v) => update((d) => (d.gacha.targetGrandDays = Math.max(1, Math.round(v))))}
          />
        </Row>
        <table className="mini-table">
          <thead>
            <tr>
              <th>奖品</th>
              <th>概率%</th>
              <th>返金币</th>
            </tr>
          </thead>
          <tbody>
            {config.gacha.prizes.map((prize, pi) => (
              <tr key={pi}>
                <td className="name-cell">
                  {prize.isGrand ? '★ ' : ''}
                  {prize.name}
                </td>
                <td>
                  <CellInput
                    value={prize.prob}
                    step={0.1}
                    onChange={(v) => update((d) => (d.gacha.prizes[pi].prob = v))}
                  />
                </td>
                <td>
                  <CellInput
                    value={prize.gold}
                    onChange={(v) => update((d) => (d.gacha.prizes[pi].gold = v))}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <GachaEvHint config={config} />
      </Section>

      <Section title="⑫ 付费充值（抽奖补币）">
        <Row>
          <NumField
            label="兑换比例"
            value={config.pay.goldPerYuan}
            suffix="金币/元"
            onChange={(v) => update((d) => (d.pay.goldPerYuan = v))}
          />
        </Row>
        <Hint>
          1 元人民币 = {config.pay.goldPerYuan} 金币。玩家在金币不够继续抽奖时，按策略配置的充值上限自动补币（计入「付费充值」收入与右侧付费指标）。
        </Hint>
      </Section>

      <Section title="⑬ 玩家策略" defaultOpen>
        {config.strategies.map((strat, si) => (
          <StrategyEditor
            key={strat.id}
            strat={strat}
            config={config}
            onChange={(fn) => update((d) => fn(d.strategies[si]))}
          />
        ))}
      </Section>
    </div>
  );
}

function StageCourseHint({ stage }: { stage: StageConfig }) {
  const fixedCourses = stage.courses.filter((c) => c.baseGold > 0);
  const avgBase =
    fixedCourses.length > 0
      ? fixedCourses.reduce((s, c) => s + c.baseGold, 0) / fixedCourses.length
      : 0;
  const evSch =
    stage.scholarship.p1 * stage.scholarship.amount1 +
    stage.scholarship.p2 * stage.scholarship.amount2;
  const estPerLesson = avgBase + evSch;
  return (
    <Hint>
      毕业需 {stage.required} 门课。有保底的常规课 {fixedCourses.length} 门，平均保底{' '}
      {avgBase.toFixed(0)} 金币/门 + 奖学金期望 {evSch.toFixed(1)} ≈ 每门 {estPerLesson.toFixed(0)}{' '}
      金币。若本阶段全上完约 {Math.round(estPerLesson * stage.required)} 金币（不含公益夏令营，夏令营保底为
      0）。模拟器按<strong>目标职业属性缺口</strong>智能选课，单改一门若不被选到则曲线几乎不变；改整阶段或看右侧「课程保底」总账。
    </Hint>
  );
}

function GachaEvHint({ config }: { config: SimConfig }) {
  const total = config.gacha.prizes.reduce((s, p) => s + p.prob, 0) || 1;
  const evReturn = config.gacha.prizes.reduce((s, p) => s + (p.prob / total) * p.gold, 0);
  const grandProb = config.gacha.prizes
    .filter((p) => p.isGrand)
    .reduce((s, p) => s + p.prob, 0);
  const medianDraws = medianDrawsToGrand(config.gacha);
  const sinkRate = config.gacha.price > 0 ? 1 - evReturn / config.gacha.price : 0;
  const medianGold = medianDraws === Infinity ? Infinity : medianDraws * config.gacha.price;
  const medianYuan =
    medianGold === Infinity ? Infinity : Math.ceil(medianGold / config.pay.goldPerYuan);
  return (
    <Hint>
      概率合计 {total}%。单抽期望返还 {evReturn.toFixed(1)} 金币，沉没率{' '}
      {(sinkRate * 100).toFixed(0)}%。终极大奖概率 {((grandProb / total) * 100).toFixed(2)}%，
      中位约 {medianDraws === Infinity ? '∞' : medianDraws} 抽（≈
      {medianGold === Infinity ? '∞' : medianGold.toLocaleString()} 金币 / ¥
      {medianYuan === Infinity ? '∞' : medianYuan}）。设计目标：开抽后{' '}
      <strong>{config.gacha.targetGrandDays} 天内</strong>中大奖（右侧仪表盘对比模拟结果）。
      第 {config.gacha.startDay} 天起上线；奖池每 {config.gacha.seasonDays} 天轮换；
      中大奖后<strong>本季停抽攒钱</strong>，下季新奖池再继续追（肝党攒几季白嫖，氪党当季补币毕业）。
    </Hint>
  );
}

function AdventureEvHint({ config }: { config: SimConfig }) {
  const total = config.adventure.events.reduce((s, e) => s + e.prob, 0) || 1;
  const evGold = config.adventure.events.reduce((s, e) => s + (e.prob / total) * e.gold, 0);
  const evStamina = config.adventure.events.reduce((s, e) => s + (e.prob / total) * e.stamina, 0);
  const staminaValue = config.base.foodCost / config.base.foodGain;
  const net =
    evGold +
    evStamina * staminaValue -
    config.adventure.costGold -
    config.adventure.costStamina * staminaValue;
  return (
    <Hint>
      事件权重合计 {total}%。单次冒险净期望 = {net.toFixed(1)} 金币（含体力折算，目标：略小于
      0）。
    </Hint>
  );
}

function StrategyEditor({
  strat,
  config,
  onChange,
}: {
  strat: StrategyConfig;
  config: SimConfig;
  onChange: (fn: (s: StrategyConfig) => void) => void;
}) {
  return (
    <div className="strategy-block" style={{ borderLeftColor: strat.color }}>
      <div className="strategy-head">
        <label className="strategy-toggle">
          <input
            type="checkbox"
            checked={strat.enabled}
            onChange={(e) => onChange((s) => (s.enabled = e.target.checked))}
          />
          <span style={{ color: strat.color, fontWeight: 600 }}>{strat.name}</span>
        </label>
      </div>
      <Row>
        <NumField
          label="日均行动点"
          value={strat.dailyActions}
          step={0.1}
          suffix="次"
          onChange={(v) => onChange((s) => (s.dailyActions = v))}
        />
        <label className="num-field">
          <span className="num-label">打工偏好</span>
          <select
            value={strat.orderPref}
            onChange={(e) => onChange((s) => (s.orderPref = e.target.value as OrderKey | 'auto'))}
          >
            <option value="kuai">快单(1h)</option>
            <option value="wen">稳单(2h)</option>
            <option value="guaji">挂机单(4h)</option>
            <option value="du">赌单(4h)</option>
            <option value="auto">自动最优</option>
          </select>
        </label>
      </Row>
      <Row>
        <NumField
          label="每日冒险"
          value={strat.adventuresPerDay}
          suffix="次"
          onChange={(v) => onChange((s) => (s.adventuresPerDay = v))}
        />
        <NumField
          label="每日PK"
          value={strat.pksPerDay}
          suffix="次"
          onChange={(v) => onChange((s) => (s.pksPerDay = v))}
        />
      </Row>
      <Row>
        <label className="num-field">
          <span className="num-label">目标职业</span>
          <select
            value={strat.targetJobId}
            onChange={(e) => onChange((s) => (s.targetJobId = e.target.value))}
          >
            {config.jobsCfg.jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.name}
              </option>
            ))}
          </select>
        </label>
        <NumField
          label="金币安全线"
          value={strat.goldReserve}
          onChange={(v) => onChange((s) => (s.goldReserve = v))}
        />
      </Row>
      <Row>
        <NumField
          label="每日被雇佣"
          value={strat.beHiredPerDay}
          suffix="次"
          onChange={(v) => onChange((s) => (s.beHiredPerDay = v))}
        />
        <NumField
          label="上线打断概率"
          value={strat.selfOnlineProb}
          step={0.05}
          onChange={(v) => onChange((s) => (s.selfOnlineProb = v))}
        />
      </Row>
      <Row>
        <NumField
          label="150档损失打工"
          value={strat.sickLostWork}
          step={0.5}
          suffix="次"
          onChange={(v) => onChange((s) => (s.sickLostWork = v))}
        />
        <label className="checkbox-field">
          <input
            type="checkbox"
            checked={strat.useHire}
            onChange={(e) => onChange((s) => (s.useHire = e.target.checked))}
          />
          主动雇佣
        </label>
      </Row>
      <Row>
        <NumField
          label="每日抽奖上限"
          value={strat.gachaPerDay}
          suffix="次"
          onChange={(v) => onChange((s) => (s.gachaPerDay = v))}
        />
        <NumField
          label="起抽存量"
          value={strat.gachaFloor}
          suffix="金币"
          onChange={(v) => onChange((s) => (s.gachaFloor = v))}
        />
      </Row>
      <Row>
        <label className="checkbox-field">
          <input
            type="checkbox"
            checked={strat.rechargeForGacha}
            onChange={(e) => onChange((s) => (s.rechargeForGacha = e.target.checked))}
          />
          金币不足时为抽奖充值
        </label>
        <NumField
          label="日充值上限"
          value={strat.maxPayYuanPerDay}
          suffix="元"
          onChange={(v) => onChange((s) => (s.maxPayYuanPerDay = v))}
        />
        <NumField
          label="总充值上限"
          value={strat.maxPayYuanTotal}
          suffix="元"
          onChange={(v) => onChange((s) => (s.maxPayYuanTotal = v))}
        />
      </Row>
      <div className="outfit-probs">
        <span className="num-label">装扮购买意愿</span>
        {OUTFIT_GRADES.map((g, gi) => (
          <label key={g} className="outfit-prob-item">
            <span>{g}</span>
            <CellInput
              value={strat.outfitProbs[gi]}
              step={0.1}
              onChange={(v) => onChange((s) => (s.outfitProbs[gi] = v))}
            />
          </label>
        ))}
      </div>
    </div>
  );
}

import type {
  AttrKey,
  Course,
  JobDef,
  OrderKey,
  Range,
  Scholarship,
  SimConfig,
  StrategyConfig,
} from './config';
import { OUTFIT_CATEGORIES, OUTFIT_GRADES } from './config';

// ============ 随机数 ============

export type Rng = (() => number) | null; // null = 期望值模式

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const sampleRange = (rng: Rng, range: Range): number =>
  rng ? range.min + rng() * (range.max - range.min) : (range.min + range.max) / 2;

const sampleIntRange = (rng: Rng, min: number, max: number): number =>
  rng ? min + Math.floor(rng() * (max - min + 1)) : (min + max) / 2;

const rangeMid = (range: Range): number => (range.min + range.max) / 2;

/** 日均行动点（可小数）→ 当日整数次数；长期均值 ≈ target */
function resolveDailyActions(target: number, day: number, rng: Rng): number {
  const t = Math.max(0, target);
  const lo = Math.floor(t);
  const frac = t - lo;
  if (frac < 1e-9) return lo;
  if (rng) return lo + (rng() < frac ? 1 : 0);
  return lo + ((day * 7 + 3) % 10 < Math.round(frac * 10) ? 1 : 0);
}

// ============ 结果类型 ============

export interface IncomeBreakdown {
  course: number;
  scholarship: number;
  graduation: number;
  work: number;
  hire: number;
  hiredBy: number; // 被雇佣分成
  adventure: number;
  pk: number;
  gacha: number; // 抽奖金币返还
}

export interface ExpenseBreakdown {
  training: number;
  food: number;
  sickness: number;
  adventure: number;
  pk: number;
  outfit: number;
  gacha: number; // 抽奖花费
}

export const INCOME_KEYS: { key: keyof IncomeBreakdown; name: string; color: string }[] = [
  { key: 'work', name: '打工', color: '#16a34a' },
  { key: 'hire', name: '雇佣加成', color: '#0891b2' },
  { key: 'hiredBy', name: '被雇佣分成', color: '#0d9488' },
  { key: 'course', name: '课程保底', color: '#2563eb' },
  { key: 'scholarship', name: '奖学金', color: '#4f46e5' },
  { key: 'graduation', name: '毕业奖金', color: '#d97706' },
  { key: 'adventure', name: '冒险所得', color: '#9333ea' },
  { key: 'pk', name: 'PK所得', color: '#db2777' },
  { key: 'gacha', name: '抽奖返还', color: '#c026d3' },
];

export const EXPENSE_KEYS: { key: keyof ExpenseBreakdown; name: string; color: string }[] = [
  { key: 'training', name: '进修学费', color: '#ea580c' },
  { key: 'food', name: '食物(体力)', color: '#ca8a04' },
  { key: 'sickness', name: '治病', color: '#dc2626' },
  { key: 'adventure', name: '冒险消耗', color: '#7c3aed' },
  { key: 'pk', name: 'PK损失', color: '#e11d48' },
  { key: 'outfit', name: '装扮', color: '#0284c7' },
  { key: 'gacha', name: '抽奖', color: '#a21caf' },
];

export interface DayRecord {
  day: number;
  gold: number;
  wu: number;
  zhi: number;
  mei: number;
  tier: number; // -1 = 未毕业或未入职（小乞丐）
  income: IncomeBreakdown;
  expense: ExpenseBreakdown;
  net: number;
}

export interface Milestone {
  label: string;
  day: number;
}

export interface RunResult {
  days: DayRecord[];
  milestones: Milestone[];
  totalIncome: IncomeBreakdown;
  totalExpense: ExpenseBreakdown;
  finalGold: number;
  steadyNetPerDay: number;
  sicknessCount: number;
  sickTierCounts: [number, number, number, number]; // 低/中/高档选择次数 + 赊账次数
  outfitOwnedSpend: number; // 装扮总花费
  gachaDraws: number; // 总抽奖次数
  gachaGrandWins: number; // 抽中终极大奖次数（期望模式为期望值）
  affordDays: (number | null)[];
}

// ============ 模拟核心 ============

interface SimState {
  gold: number;
  stamina: number;
  attrs: Record<AttrKey, number>;
  phase: number; // -1 学前班未上, 0/1/2 = 小/中/大学, 3 = 已毕业
  coursesDone: number;
  tierIdx: number; // -1 = 未满足目标职业见习门槛（打工走小乞丐保底行）
  workCount: number;
  sickDebt: number;
  sicknessCount: number;
  hiresToday: number;
  halvedToday: boolean; // 50元档治病：当日所有收益减半
  lostWorkToday: number; // 150元档治病：当日损失的行动次数
  washesLeft: number; // 今日剩余洗护套装次数
  washThreshold: number;
  income: IncomeBreakdown;
  expense: ExpenseBreakdown;
}

const zeroIncome = (): IncomeBreakdown => ({
  course: 0,
  scholarship: 0,
  graduation: 0,
  work: 0,
  hire: 0,
  hiredBy: 0,
  adventure: 0,
  pk: 0,
  gacha: 0,
});
const zeroExpense = (): ExpenseBreakdown => ({
  training: 0,
  food: 0,
  sickness: 0,
  adventure: 0,
  pk: 0,
  outfit: 0,
  gacha: 0,
});

function addBreakdown<T extends { [K in keyof T]: number }>(total: T, day: T): void {
  for (const k of Object.keys(day) as (keyof T)[]) {
    (total[k] as number) += day[k];
  }
}

/** 装扮 SKU：上架日 + 价格 */
interface Sku {
  day: number;
  grade: number;
  price: number;
}

function buildSkuSchedule(cfg: SimConfig, totalDays: number): Sku[] {
  const skus: Sku[] = [];
  const cats = OUTFIT_CATEGORIES.map((c) => c.key);
  for (let g = 0; g < OUTFIT_GRADES.length; g++) {
    let idx = 0;
    for (let i = 0; i < cfg.outfit.initialCounts[g]; i++) {
      skus.push({ day: 1, grade: g, price: cfg.outfit.prices[cats[idx % 4]][g] });
      idx++;
    }
    const interval = cfg.outfit.releaseIntervalDays[g];
    if (interval > 0) {
      for (let day = interval; day <= totalDays; day += interval) {
        skus.push({ day, grade: g, price: cfg.outfit.prices[cats[idx % 4]][g] });
        idx++;
      }
    }
  }
  return skus.sort((a, b) => a.day - b.day);
}

export function runSim(
  cfg: SimConfig,
  strat: StrategyConfig,
  days: number,
  rng: Rng,
): RunResult {
  const job: JobDef =
    cfg.jobsCfg.jobs.find((j) => j.id === strat.targetJobId) ?? cfg.jobsCfg.jobs[0];
  const mods = cfg.modules;

  const st: SimState = {
    gold: cfg.base.initialGold,
    stamina: cfg.base.staminaMax,
    attrs: { wu: 0, zhi: 0, mei: 0 },
    phase: -1,
    coursesDone: 0,
    tierIdx: -1,
    workCount: 0,
    sickDebt: 0,
    sicknessCount: 0,
    hiresToday: 0,
    halvedToday: false,
    lostWorkToday: 0,
    washesLeft: 0,
    washThreshold: 0,
    income: zeroIncome(),
    expense: zeroExpense(),
  };

  const records: DayRecord[] = [];
  const milestones: Milestone[] = [];
  const totalIncome = zeroIncome();
  const totalExpense = zeroExpense();
  const affordDays: (number | null)[] = OUTFIT_GRADES.map(() => null);
  const sickTierCounts: [number, number, number, number] = [0, 0, 0, 0];
  const recentIncomes: number[] = []; // 近7日收入，用于治病决策

  // 装扮 SKU 上架表 + 购买队列
  const skus = buildSkuSchedule(cfg, days);
  let skuPtr = 0;
  const wantQueue: number[] = []; // MC 模式：想买的 SKU 价格队列
  let pendingOutfitSpend = 0; // EV 模式：期望购买额度（按意愿概率折算）

  const gradeSetPrice = (g: number): number =>
    OUTFIT_CATEGORIES.reduce((s, cat) => s + cfg.outfit.prices[cat.key][g], 0);

  // ---- 工具函数 ----

  /** 收入入账：50元档治病当日所有收益减半 */
  const earn = (key: keyof IncomeBreakdown, amount: number): void => {
    const v = st.halvedToday ? amount * 0.5 : amount;
    st.gold += v;
    st.income[key] += v;
  };

  const scholarshipGain = (s: Scholarship): number => {
    if (!mods.scholarship) return 0;
    if (!rng) return s.p1 * s.amount1 + s.p2 * s.amount2;
    const roll = rng();
    if (roll < s.p1) return s.amount1;
    if (roll < s.p1 + s.p2) return s.amount2;
    return 0;
  };

  const addAttr = (key: AttrKey, v: number): void => {
    st.attrs[key] = Math.min(cfg.jobsCfg.attrCap, st.attrs[key] + v);
  };

  /** 体力低于阈值时使用洗护套装回满（每日次数有限） */
  const maybeWash = (): void => {
    if (!mods.washKit) return;
    while (st.stamina <= st.washThreshold && st.washesLeft > 0) {
      if (st.washesLeft >= 1) {
        st.stamina = cfg.base.staminaMax;
        st.washesLeft -= 1;
      } else {
        // 期望模式下的小数套数：按比例回复
        st.stamina += st.washesLeft * (cfg.base.staminaMax - st.stamina);
        st.washesLeft = 0;
      }
    }
  };

  /** 体力不足时先用洗护、再买食物补足；extraGold 是本次行动还需预留的金币 */
  const ensureStamina = (cost: number, extraGold: number): boolean => {
    maybeWash();
    if (st.stamina >= cost) return true;
    const deficit = cost - st.stamina;
    const foods = Math.ceil(deficit / cfg.base.foodGain);
    const price = foods * cfg.base.foodCost;
    if (st.gold - extraGold < price) return false;
    st.gold -= price;
    st.expense.food += price;
    st.stamina = Math.min(cfg.base.staminaMax, st.stamina + foods * cfg.base.foodGain);
    return st.stamina >= cost;
  };

  const attrWeights = (): Record<AttrKey, number> => {
    const start = st.tierIdx + 1;
    for (let t = Math.max(0, start); t < job.tiers.length; t++) {
      const tier = job.tiers[t];
      const d: Record<AttrKey, number> = {
        wu: Math.max(0, tier.wu - st.attrs.wu),
        zhi: Math.max(0, tier.zhi - st.attrs.zhi),
        mei: Math.max(0, tier.mei - st.attrs.mei),
      };
      if (d.wu + d.zhi + d.mei > 0) return d;
    }
    return { wu: 1, zhi: 1, mei: 1 };
  };

  const pickCourse = <T extends { wu: number; zhi: number; mei: number; random?: number }>(
    courses: T[],
  ): T => {
    const w = attrWeights();
    const wAvg = (w.wu + w.zhi + w.mei) / 3;
    let best = courses[0];
    let bestScore = -Infinity;
    for (const course of courses) {
      const score =
        course.wu * w.wu +
        course.zhi * w.zhi +
        course.mei * w.mei +
        (course.random ?? 0) * wAvg * 0.9;
      if (score > bestScore) {
        bestScore = score;
        best = course;
      }
    }
    return best;
  };

  const applyCourseGain = (course: Course): void => {
    addAttr('wu', course.wu);
    addAttr('zhi', course.zhi);
    addAttr('mei', course.mei);
    if (course.random > 0) {
      if (rng) {
        const keys: AttrKey[] = ['wu', 'zhi', 'mei'];
        addAttr(keys[Math.floor(rng() * 3)], course.random);
        if (course.extraProb && rng() < course.extraProb) {
          addAttr(keys[Math.floor(rng() * 3)], course.extraAmount ?? 1);
        }
      } else {
        const ev = course.random / 3 + ((course.extraProb ?? 0) * (course.extraAmount ?? 1)) / 3;
        addAttr('wu', ev);
        addAttr('zhi', ev);
        addAttr('mei', ev);
      }
    }
  };

  const doStudy = (day: number): boolean => {
    if (st.phase === -1) {
      addAttr('wu', cfg.base.tutorialAttr);
      addAttr('zhi', cfg.base.tutorialAttr);
      addAttr('mei', cfg.base.tutorialAttr);
      earn('course', cfg.base.tutorialGold);
      st.phase = 0;
      st.coursesDone = 0;
      milestones.push({ label: '学前辅导课完成', day });
      return true;
    }
    const stage = cfg.stages[st.phase];
    const course = pickCourse(stage.courses);
    if (!ensureStamina(course.stamina, 0)) return false;
    st.stamina -= course.stamina;
    applyCourseGain(course);
    earn('course', course.baseGold);
    earn('scholarship', scholarshipGain(stage.scholarship));
    st.coursesDone++;
    if (st.coursesDone >= stage.required) {
      milestones.push({ label: `${stage.name}毕业`, day });
      if (stage.graduationBonus > 0) earn('graduation', stage.graduationBonus);
      st.phase++;
      st.coursesDone = 0;
      if (st.phase >= cfg.stages.length) {
        st.phase = 3;
        milestones.push({ label: `开启职业：${job.name}`, day });
        checkPromotion(day); // 毕业即检查见习门槛，未达标则先做小乞丐
      }
    }
    return true;
  };

  // payRows 第 5 行 = 小乞丐（无属性门槛的保底打工）
  const FALLBACK_PAY_ROW = Math.min(5, cfg.jobsCfg.payRows.length - 1);

  const currentPayRow = (): number =>
    st.tierIdx === -1 ? FALLBACK_PAY_ROW : job.tiers[st.tierIdx].payRow;

  /** payRow 5 是万象见习彩蛋行，雇佣加成按见习档（0）计算 */
  const hireTierOf = (payRow: number): number => (payRow > 4 ? 0 : payRow);

  const hireEvFactor = (payRow: number): number => {
    const range = cfg.hire.bonusByTier[hireTierOf(payRow)];
    return (rangeMid(range) / 100) * (1 - 0.5 * cfg.hire.interruptProb);
  };

  const bestOrderKey = (payRow: number, canHire: boolean): OrderKey => {
    const staminaValue = cfg.base.foodCost / cfg.base.foodGain;
    const hireFactor = canHire ? hireEvFactor(payRow) : 0;
    const row = cfg.jobsCfg.payRows[payRow];
    let best: OrderKey = 'kuai';
    let bestEv = -Infinity;
    for (const key of ['kuai', 'wen', 'guaji', 'du'] as OrderKey[]) {
      const ev =
        rangeMid(row[key]) * (1 + hireFactor) - cfg.jobsCfg.orderMeta[key].stamina * staminaValue;
      if (ev > bestEv) {
        bestEv = ev;
        best = key;
      }
    }
    return best;
  };

  /** 单次打工的期望毛收入（用于治病决策） */
  const evWorkIncome = (): number => {
    const payRow = currentPayRow();
    const canHire = mods.hire && strat.useHire;
    const key = strat.orderPref === 'auto' ? bestOrderKey(payRow, canHire) : strat.orderPref;
    return (
      rangeMid(cfg.jobsCfg.payRows[payRow][key]) * (1 + (canHire ? hireEvFactor(payRow) : 0))
    );
  };

  function checkPromotion(day: number): void {
    const next = job.tiers[st.tierIdx + 1];
    if (!next) return;
    const workOk = st.tierIdx === -1 || st.workCount >= next.workFromPrev;
    if (st.attrs.wu >= next.wu && st.attrs.zhi >= next.zhi && st.attrs.mei >= next.mei && workOk) {
      st.tierIdx++;
      st.workCount = 0;
      milestones.push({
        label: st.tierIdx === 0 ? `入职 ${next.name}` : `晋升 ${next.name}`,
        day,
      });
    }
  }

  const doWork = (day: number): boolean => {
    const payRow = currentPayRow();
    const canHire = mods.hire && strat.useHire && st.hiresToday < cfg.hire.dailyLimit;
    const orderKey: OrderKey =
      strat.orderPref === 'auto' ? bestOrderKey(payRow, canHire) : strat.orderPref;
    const meta = cfg.jobsCfg.orderMeta[orderKey];
    if (!ensureStamina(meta.stamina, 0)) return false;
    st.stamina -= meta.stamina;
    const base = sampleRange(rng, cfg.jobsCfg.payRows[payRow][orderKey]);
    let hireBonus = 0;
    if (canHire) {
      st.hiresToday++;
      const range = cfg.hire.bonusByTier[hireTierOf(payRow)];
      let pct = sampleRange(rng, range) / 100;
      if (rng) {
        if (rng() < cfg.hire.interruptProb) pct /= 2;
      } else {
        pct *= 1 - 0.5 * cfg.hire.interruptProb;
      }
      hireBonus = base * pct;
    }
    earn('work', base);
    earn('hire', hireBonus);
    st.workCount++;
    checkPromotion(day);
    return true;
  };

  const doTraining = (day: number): boolean => {
    if (!ensureStamina(cfg.training.stamina, cfg.training.cost)) return false;
    if (st.gold < cfg.training.cost) return false;
    st.stamina -= cfg.training.stamina;
    st.gold -= cfg.training.cost;
    st.expense.training += cfg.training.cost;
    const course = pickCourse(cfg.training.courses);
    addAttr('wu', course.wu);
    addAttr('zhi', course.zhi);
    addAttr('mei', course.mei);
    earn('scholarship', scholarshipGain(cfg.training.scholarship));
    checkPromotion(day);
    return true;
  };

  const doJobAction = (day: number): boolean => {
    const next = job.tiers[st.tierIdx + 1];
    if (next) {
      const deficit =
        Math.max(0, next.wu - st.attrs.wu) +
        Math.max(0, next.zhi - st.attrs.zhi) +
        Math.max(0, next.mei - st.attrs.mei);
      if (deficit > 0 && st.gold >= cfg.training.cost + strat.goldReserve) {
        if (doTraining(day)) return true;
      }
    }
    return doWork(day);
  };

  const doAdventure = (): boolean => {
    const adv = cfg.adventure;
    if (st.gold < adv.costGold + strat.goldReserve) return false;
    if (adv.costStamina > 0 && !ensureStamina(adv.costStamina, adv.costGold)) return false;
    st.gold -= adv.costGold;
    st.expense.adventure += adv.costGold;
    st.stamina -= adv.costStamina;
    const totalProb = adv.events.reduce((s, e) => s + e.prob, 0) || 1;
    if (rng) {
      let roll = rng() * totalProb;
      for (const ev of adv.events) {
        roll -= ev.prob;
        if (roll <= 0) {
          if (ev.gold >= 0) {
            earn('adventure', ev.gold);
          } else {
            st.gold += ev.gold;
            st.expense.adventure += -ev.gold;
          }
          st.stamina = Math.min(cfg.base.staminaMax, st.stamina + ev.stamina);
          break;
        }
      }
    } else {
      let evPos = 0;
      let evNeg = 0;
      let evStamina = 0;
      for (const ev of adv.events) {
        const p = ev.prob / totalProb;
        if (ev.gold >= 0) evPos += p * ev.gold;
        else evNeg += p * -ev.gold;
        evStamina += p * ev.stamina;
      }
      earn('adventure', evPos);
      st.gold -= evNeg;
      st.expense.adventure += evNeg;
      st.stamina = Math.min(cfg.base.staminaMax, st.stamina + evStamina);
    }
    return true;
  };

  const doPk = (): boolean => {
    if (st.gold < cfg.pk.loseGold + strat.goldReserve) return false;
    if (!ensureStamina(cfg.pk.stamina, 0)) return false;
    st.stamina -= cfg.pk.stamina;
    if (rng) {
      if (rng() < cfg.pk.winProb) {
        earn('pk', cfg.pk.winGold);
      } else {
        st.gold -= cfg.pk.loseGold;
        st.expense.pk += cfg.pk.loseGold;
      }
    } else {
      earn('pk', cfg.pk.winProb * cfg.pk.winGold);
      const lose = (1 - cfg.pk.winProb) * cfg.pk.loseGold;
      st.gold -= lose;
      st.expense.pk += lose;
    }
    return true;
  };

  /** 被雇佣分成：他人雇佣自己时，若上线打断则分得对方加成的一半 */
  const doHiredBy = (): void => {
    if (!mods.hiredBy || st.phase !== 3 || strat.beHiredPerDay <= 0) return;
    const payRow = currentPayRow();
    const row = cfg.jobsCfg.payRows[payRow];
    // 朋友圈水平与自己相近：雇主基础收益取自己档位四类订单的平均期望
    const baseMid =
      (rangeMid(row.kuai) + rangeMid(row.wen) + rangeMid(row.guaji) + rangeMid(row.du)) / 4;
    const range = cfg.hire.bonusByTier[hireTierOf(payRow)];
    const n = Math.min(strat.beHiredPerDay, cfg.hiredBy.dailyLimit);
    if (rng) {
      for (let i = 0; i < n; i++) {
        if (rng() < strat.selfOnlineProb) {
          const pct = sampleRange(rng, range) / 100;
          earn('hiredBy', (baseMid * pct) / 2);
        }
      }
    } else {
      earn('hiredBy', n * strat.selfOnlineProb * ((rangeMid(range) / 100) * baseMid) / 2);
    }
  };

  /** 生病：自动在三档治疗方案中选总代价（药费+预期收益损失）最低的 */
  const handleSickness = (): void => {
    st.sicknessCount++;
    const incomeEst = recentIncomes.length
      ? recentIncomes.reduce((a, b) => a + b, 0) / recentIncomes.length
      : 200;
    const perWork = evWorkIncome();
    const options = [
      { idx: 0, price: cfg.sick.priceCheap, cost: cfg.sick.priceCheap + 0.5 * incomeEst },
      { idx: 1, price: cfg.sick.priceMid, cost: cfg.sick.priceMid + strat.sickLostWork * perWork },
      { idx: 2, price: cfg.sick.priceFast, cost: cfg.sick.priceFast },
    ];
    const affordable = options.filter((o) => st.gold >= o.price + strat.goldReserve);
    if (affordable.length === 0) {
      // 付不起：先赊账最低档，当日仍按收益减半处理
      st.halvedToday = true;
      st.sickDebt += cfg.sick.priceCheap;
      sickTierCounts[3]++;
      return;
    }
    const pick = affordable.reduce((a, b) => (b.cost < a.cost ? b : a));
    st.gold -= pick.price;
    st.expense.sickness += pick.price;
    sickTierCounts[pick.idx]++;
    if (pick.idx === 0) {
      st.halvedToday = true;
    } else if (pick.idx === 1) {
      const f = strat.sickLostWork;
      st.lostWorkToday = rng ? Math.floor(f) + (rng() < f % 1 ? 1 : 0) : Math.floor(f);
    }
  };

  const paySickDebt = (): void => {
    if (st.sickDebt > 0 && st.gold >= st.sickDebt + strat.goldReserve) {
      st.gold -= st.sickDebt;
      st.expense.sickness += st.sickDebt;
      st.sickDebt = 0;
    }
  };

  // ---- 抽奖（中大奖后仍可持续抽，仅大奖不可重复至下期） ----
  const gachaPrizes = cfg.gacha.prizes;
  const gachaTotalWeight = gachaPrizes.reduce((s, p) => s + p.prob, 0) || 1;
  const gachaGrandProb =
    gachaPrizes.filter((p) => p.isGrand).reduce((s, p) => s + p.prob, 0) / gachaTotalWeight;
  const gachaEvReturn = gachaPrizes.reduce(
    (s, p) => s + (p.prob / gachaTotalWeight) * p.gold,
    0,
  );
  const nonGrandPrizes = gachaPrizes.filter((p) => !p.isGrand);
  const nonGrandWeight = nonGrandPrizes.reduce((s, p) => s + p.prob, 0) || 1;
  const nonGrandEvReturn = nonGrandPrizes.reduce(
    (s, p) => s + (p.prob / nonGrandWeight) * p.gold,
    0,
  );

  let gachaDraws = 0;
  let gachaGrandWins = 0;
  let grandMilestoneDone = false;
  let seasonWon = false; // 本季大奖已到手（仍可继续抽小奖）

  const rollGachaPrize = (): (typeof gachaPrizes)[number] => {
    const pool = seasonWon ? nonGrandPrizes : gachaPrizes;
    const total = pool.reduce((s, p) => s + p.prob, 0) || 1;
    let roll = rng!() * total;
    for (const prize of pool) {
      roll -= prize.prob;
      if (roll <= 0) return prize;
    }
    return pool[pool.length - 1];
  };
  let seasonNoWinProb = 1; // EV：本季尚未中大奖的概率
  let everNoWinProb = 1;

  const gachaNewSeason = (day: number): void => {
    const { startDay, seasonDays: len } = cfg.gacha;
    if (day < startDay || len <= 0) return;
    if ((day - startDay) % len === 0) {
      seasonWon = false;
      seasonNoWinProb = 1;
    }
  };

  const doGacha = (day: number): void => {
    if (!mods.gacha || day < cfg.gacha.startDay || strat.gachaPerDay <= 0 || cfg.gacha.price <= 0)
      return;
    const avail = Math.floor((st.gold - strat.gachaFloor) / cfg.gacha.price);
    const draws = Math.min(strat.gachaPerDay, Math.max(0, avail));
    if (draws <= 0) return;

    if (rng) {
      for (let i = 0; i < draws; i++) {
        st.gold -= cfg.gacha.price;
        st.expense.gacha += cfg.gacha.price;
        gachaDraws++;
        const prize = rollGachaPrize();
        if (prize.gold > 0) earn('gacha', prize.gold);
        if (prize.isGrand) {
          gachaGrandWins++;
          seasonWon = true;
          if (!grandMilestoneDone) {
            milestones.push({ label: '抽中终极大奖', day });
            grandMilestoneDone = true;
          }
        }
      }
    } else {
      for (let i = 0; i < draws; i++) {
        st.gold -= cfg.gacha.price;
        st.expense.gacha += cfg.gacha.price;
        gachaDraws++;
        const evGold =
          seasonNoWinProb * gachaEvReturn + (1 - seasonNoWinProb) * nonGrandEvReturn;
        earn('gacha', evGold);
        gachaGrandWins += seasonNoWinProb * gachaGrandProb;
        seasonNoWinProb *= 1 - gachaGrandProb;
        if (seasonNoWinProb < 1e-6) {
          seasonWon = true;
          seasonNoWinProb = 0;
        }
      }
      everNoWinProb *= Math.pow(1 - gachaGrandProb, draws);
      if (!grandMilestoneDone && 1 - everNoWinProb >= 0.5) {
        milestones.push({ label: '抽中终极大奖', day });
        grandMilestoneDone = true;
      }
    }
  };

  /** 装扮上架 + 购买（MC：意愿概率抽样进想买队列；EV：按概率折算成期望额度） */
  const handleOutfits = (day: number): void => {
    while (skuPtr < skus.length && skus[skuPtr].day <= day) {
      const sku = skus[skuPtr++];
      if (!mods.outfits) continue;
      const prob = strat.outfitProbs[sku.grade] ?? 0;
      if (prob <= 0) continue;
      if (rng) {
        if (rng() < prob) wantQueue.push(sku.price);
      } else {
        pendingOutfitSpend += prob * sku.price;
      }
    }
    if (!mods.outfits) return;
    if (rng) {
      while (wantQueue.length > 0 && st.gold >= wantQueue[0] + cfg.outfit.reserve) {
        const price = wantQueue.shift()!;
        st.gold -= price;
        st.expense.outfit += price;
      }
    } else if (pendingOutfitSpend > 0) {
      const pay = Math.min(pendingOutfitSpend, Math.max(0, st.gold - cfg.outfit.reserve));
      if (pay > 0) {
        st.gold -= pay;
        st.expense.outfit += pay;
        pendingOutfitSpend -= pay;
      }
    }
  };

  // ---- 主循环 ----

  for (let day = 1; day <= days; day++) {
    st.income = zeroIncome();
    st.expense = zeroExpense();
    st.hiresToday = 0;
    st.halvedToday = false;
    st.lostWorkToday = 0;

    // 当日洗护套装额度与使用阈值
    if (mods.washKit) {
      st.washesLeft =
        cfg.washKit.selfPerDay + sampleIntRange(rng, cfg.washKit.friendMin, cfg.washKit.friendMax);
      st.washThreshold = sampleRange(rng, {
        min: cfg.washKit.thresholdMin,
        max: cfg.washKit.thresholdMax,
      });
    } else {
      st.washesLeft = 0;
    }

    st.stamina = Math.max(0, st.stamina - cfg.base.decayPerDay);
    maybeWash();

    if (mods.sickness && cfg.sick.intervalDays > 0 && day % cfg.sick.intervalDays === 0) {
      handleSickness();
    }
    paySickDebt();

    const actions = resolveDailyActions(
      Math.min(strat.dailyActions, cfg.base.dailyActionLimit) - st.lostWorkToday,
      day,
      rng,
    );
    for (let i = 0; i < actions; i++) {
      const ok = st.phase === 3 ? doJobAction(day) : doStudy(day);
      if (!ok) break;
    }

    if (mods.adventure) {
      for (let i = 0; i < strat.adventuresPerDay; i++) {
        if (!doAdventure()) break;
      }
    }
    if (mods.pk) {
      for (let i = 0; i < strat.pksPerDay; i++) {
        if (!doPk()) break;
      }
    }

    doHiredBy();
    handleOutfits(day);
    gachaNewSeason(day);
    doGacha(day);
    paySickDebt();

    for (let g = 0; g < OUTFIT_GRADES.length; g++) {
      if (affordDays[g] === null && st.gold >= gradeSetPrice(g)) {
        affordDays[g] = day;
      }
    }

    const incomeSum = Object.values(st.income).reduce((a, b) => a + b, 0);
    const expenseSum = Object.values(st.expense).reduce((a, b) => a + b, 0);
    recentIncomes.push(incomeSum);
    if (recentIncomes.length > 7) recentIncomes.shift();

    addBreakdown(totalIncome, st.income);
    addBreakdown(totalExpense, st.expense);
    records.push({
      day,
      gold: st.gold,
      wu: st.attrs.wu,
      zhi: st.attrs.zhi,
      mei: st.attrs.mei,
      tier: st.phase === 3 ? st.tierIdx : -1,
      income: st.income,
      expense: st.expense,
      net: incomeSum - expenseSum,
    });
  }

  const tail = records.slice(-30);
  const steadyNetPerDay = tail.length
    ? tail.reduce((s, d) => s + d.net, 0) / tail.length
    : 0;

  return {
    days: records,
    milestones,
    totalIncome,
    totalExpense,
    finalGold: st.gold,
    steadyNetPerDay,
    sicknessCount: st.sicknessCount,
    sickTierCounts,
    outfitOwnedSpend: totalExpense.outfit,
    gachaDraws,
    gachaGrandWins,
    affordDays,
  };
}

// ============ 蒙特卡洛聚合 ============

export interface McResult {
  p10: number[];
  p50: number[];
  p90: number[];
  finalGolds: number[];
  milestoneMedianDays: { label: string; day: number; reachedRatio: number }[];
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

export function runMonteCarlo(
  cfg: SimConfig,
  strat: StrategyConfig,
  days: number,
  runs: number,
  baseSeed = 12345,
): McResult {
  const goldMatrix: number[][] = [];
  const milestoneDays = new Map<string, number[]>();
  const finalGolds: number[] = [];

  for (let i = 0; i < runs; i++) {
    const result = runSim(cfg, strat, days, mulberry32(baseSeed + i * 7919));
    goldMatrix.push(result.days.map((d) => d.gold));
    finalGolds.push(result.finalGold);
    for (const m of result.milestones) {
      if (!milestoneDays.has(m.label)) milestoneDays.set(m.label, []);
      milestoneDays.get(m.label)!.push(m.day);
    }
  }

  const p10: number[] = [];
  const p50: number[] = [];
  const p90: number[] = [];
  for (let d = 0; d < days; d++) {
    const col = goldMatrix.map((row) => row[d]).sort((a, b) => a - b);
    p10.push(percentile(col, 0.1));
    p50.push(percentile(col, 0.5));
    p90.push(percentile(col, 0.9));
  }

  const milestoneMedianDays = [...milestoneDays.entries()]
    .map(([label, arr]) => {
      const sorted = [...arr].sort((a, b) => a - b);
      return {
        label,
        day: Math.round(percentile(sorted, 0.5)),
        reachedRatio: arr.length / runs,
      };
    })
    .sort((a, b) => a.day - b.day);

  finalGolds.sort((a, b) => a - b);

  return { p10, p50, p90, finalGolds, milestoneMedianDays };
}

// ============ 一键全量计算 ============

export interface StrategyOutput {
  strategy: StrategyConfig;
  ev: RunResult;
  mc?: McResult;
}

export function computeAll(
  cfg: SimConfig,
  days: number,
  mcEnabled: boolean,
  mcRuns: number,
): StrategyOutput[] {
  return cfg.strategies
    .filter((s) => s.enabled)
    .map((strategy) => ({
      strategy,
      ev: runSim(cfg, strategy, days, null),
      mc: mcEnabled ? runMonteCarlo(cfg, strategy, days, mcRuns) : undefined,
    }));
}

// ============ 类型定义 ============

export type AttrKey = 'wu' | 'zhi' | 'mei';
export type OrderKey = 'kuai' | 'wen' | 'guaji' | 'du';

export interface Scholarship {
  p1: number; // 高额概率
  amount1: number;
  p2: number; // 低额概率
  amount2: number;
}

export interface Course {
  name: string;
  wu: number;
  zhi: number;
  mei: number;
  random: number; // 随机属性加成（夏令营）
  extraProb?: number; // 额外随机属性概率
  extraAmount?: number;
  stamina: number;
  baseGold: number;
}

export interface StageConfig {
  name: string;
  required: number; // 毕业所需课程数
  graduationBonus: number; // 毕业一次性奖金
  scholarship: Scholarship;
  courses: Course[];
}

export interface TrainingCourse {
  name: string;
  wu: number;
  zhi: number;
  mei: number;
}

export interface TrainingConfig {
  cost: number;
  stamina: number;
  scholarship: Scholarship;
  courses: TrainingCourse[];
}

export interface Range {
  min: number;
  max: number;
}

export type OrderRow = Record<OrderKey, Range>;

export interface OrderMeta {
  minutes: number;
  stamina: number;
}

export interface JobTier {
  name: string;
  wu: number; // 0 表示无要求
  zhi: number;
  mei: number;
  /** @deprecated 请用 worksToPromote；加载时会自动迁移 */
  workFromPrev?: number;
  /** 在本档累计打工此次数后，且下一档属性达标，方可晋升 */
  worksToPromote: number;
  payRow: number; // 指向 payRows 的索引
}

export interface JobDef {
  id: string;
  name: string;
  tiers: JobTier[];
}

export interface JobsConfig {
  attrCap: number; // 属性上限 500
  orderMeta: Record<OrderKey, OrderMeta>;
  // 0见习 1初级 2中级 3高级 4大师 5万象之主见习(彩蛋特殊行)
  payRows: OrderRow[];
  jobs: JobDef[];
}

export interface HireConfig {
  dailyLimit: number; // 每日主动雇佣次数上限
  /** 被雇佣者上线概率：增量收益（本金×加成%）由雇主与被雇者平分 */
  interruptProb: number;
  bonusByTier: Range[]; // 被雇佣者档位对应的加成%区间（见习8~28% … 大师24~44%）
  interruptSplit: number; // 上线时雇员分得增量部分的比例，默认 0.5
}

export interface HiredByConfig {
  dailyLimit: number; // 每日可被他人雇佣的次数上限
  /** 被动被雇时假设的雇主打工本金（各档快单固定收益） */
  referenceBaseByTier: [number, number, number, number, number];
}

export interface AdventureEvent {
  name: string;
  prob: number; // 百分比权重
  gold: number; // 金币变化（可为负）
  stamina: number; // 体力恢复
}

export interface AdventureConfig {
  costGold: number;
  costStamina: number;
  events: AdventureEvent[];
}

export interface PkConfig {
  stamina: number;
  winProb: number;
  winGold: number;
  loseGold: number;
}

export interface SickConfig {
  intervalDays: number;
  priceCheap: number; // 低档：当日所有收益减半
  priceMid: number; // 中档：3小时禁工（按策略配置损失打工次数）
  priceFast: number; // 高档：立刻可打工，无损失
}

export interface WashKitConfig {
  selfPerDay: number; // 每日自用套数
  friendMin: number; // 每日好友赠洗次数区间
  friendMax: number;
  thresholdMin: number; // 体力降到该区间内时使用
  thresholdMax: number;
  staminaGain: number; // 每次洗护恢复体力
}

export type OutfitCategory = 'hat' | 'clothes' | 'accessory' | 'background';
export const OUTFIT_CATEGORIES: { key: OutfitCategory; name: string }[] = [
  { key: 'hat', name: '帽子' },
  { key: 'clothes', name: '衣服' },
  { key: 'accessory', name: '配饰' },
  { key: 'background', name: '房间背景' },
];
export const OUTFIT_GRADES = ['B', 'A'] as const;

export interface OutfitConfig {
  prices: Record<OutfitCategory, [number, number]>; // B/A
  reserve: number; // 购买时保留的金币缓冲
  initialCounts: [number, number]; // 开服时每档在售款数
  releaseIntervalDays: [number, number]; // 每档上新间隔天数（0=不上新）
}

export interface GachaPrize {
  name: string;
  prob: number; // 百分比权重
  gold: number; // 金币返还（0 = 非金币奖品）
  isGrand?: boolean; // 终极大奖
}

export interface GachaConfig {
  price: number; // 单抽价格
  startDay: number; // 开服第几天上线抽奖（之前不参与模拟）
  seasonDays: number; // 奖池轮换周期（天），从 startDay 起算；抽中本期大奖后停抽直到下期上新；0=永久同一期
  targetGrandDays: number; // 设计目标：用户中位多少天抽到终极大奖
  prizes: GachaPrize[];
}

export interface PayConfig {
  goldPerYuan: number; // 1 元人民币兑换金币数
}

/** 各机制总开关：关闭后完全不计入模拟 */
export interface ModulesConfig {
  hire: boolean; // 主动雇佣加成
  hiredBy: boolean; // 被雇佣分成
  adventure: boolean;
  pk: boolean;
  sickness: boolean;
  outfits: boolean; // 装扮购买
  washKit: boolean; // 洗护套装
  scholarship: boolean; // 奖学金
  gacha: boolean; // 抽奖
  pay: boolean; // 付费充值（为抽奖补金币）
}

export interface BaseConfig {
  staminaMax: number;
  decayPerDay: number;
  foodCost: number;
  foodGain: number;
  initialGold: number;
  dailyActionLimit: number;
  tutorialGold: number;
  tutorialAttr: number;
}

export interface StrategyConfig {
  id: string;
  name: string;
  enabled: boolean;
  color: string;
  dailyActions: number;
  orderPref: OrderKey | 'auto';
  adventuresPerDay: number;
  pksPerDay: number;
  targetJobId: string;
  collectJobs: boolean; // 主职业满级后横向收集其他职业（属性继承，缺口进修）
  useHire: boolean;
  goldReserve: number; // 金币安全线
  outfitProbs: [number, number]; // 每档新品的购买意愿概率 B/A
  beHiredPerDay: number; // 每日实际被雇佣次数（≤全局上限）
  selfOnlineProb: number; // 被雇佣时上线打断（分得一半加成）的概率
  sickLostWork: number; // 选150元档治病时平均损失的打工次数
  gachaPerDay: number; // 每日最多抽奖次数
  gachaFloor: number; // 金币存量低于该值时不抽奖
  rechargeForGacha: boolean; // 金币不够时为继续抽奖而付费充值
  maxPayYuanPerDay: number; // 每日充值上限（元），0=不限
  maxPayYuanTotal: number; // 全周期充值上限（元），0=不限
}

export interface SimConfig {
  modules: ModulesConfig;
  base: BaseConfig;
  stages: StageConfig[];
  training: TrainingConfig;
  jobsCfg: JobsConfig;
  hire: HireConfig;
  hiredBy: HiredByConfig;
  adventure: AdventureConfig;
  pk: PkConfig;
  sick: SickConfig;
  washKit: WashKitConfig;
  outfit: OutfitConfig;
  gacha: GachaConfig;
  pay: PayConfig;
  strategies: StrategyConfig[];
}

/** 单期终极大奖中位所需抽数（50% 玩家） */
export function medianDrawsToGrand(gacha: GachaConfig): number {
  const total = gacha.prizes.reduce((s, p) => s + p.prob, 0) || 1;
  const grandProb =
    gacha.prizes.filter((p) => p.isGrand).reduce((s, p) => s + p.prob, 0) / total;
  if (grandProb <= 0) return Infinity;
  return Math.ceil(Math.log(0.5) / Math.log(1 - grandProb));
}

export interface SimSettings {
  days: number;
  mcEnabled: boolean;
  mcRuns: number;
  focusStrategyId: string;
}

// ============ 默认值 ============

const sch = (p1: number, a1: number, p2: number, a2: number): Scholarship => ({
  p1,
  amount1: a1,
  p2,
  amount2: a2,
});

const c = (
  name: string,
  wu: number,
  zhi: number,
  mei: number,
  stamina: number,
  baseGold: number,
): Course => ({ name, wu, zhi, mei, random: 0, stamina, baseGold });

const camp = (name: string, random: number, extraAmount: number, stamina: number): Course => ({
  name,
  wu: 0,
  zhi: 0,
  mei: 0,
  random,
  extraProb: 0.2,
  extraAmount,
  stamina,
  baseGold: 0,
});

const r = (min: number, max: number): Range => ({ min, max });
const fixed = (v: number): Range => ({ min: v, max: v });

const TIER_NAMES = ['见习', '初级', '中级', '高级', '大师'];

const dualJob = (
  id: string,
  name: string,
  a: AttrKey,
  b: AttrKey,
  reqs: [number, number][],
): JobDef => ({
  id,
  name,
  tiers: reqs.map(([ra, rb], i) => ({
    name: TIER_NAMES[i],
    wu: a === 'wu' ? ra : b === 'wu' ? rb : 0,
    zhi: a === 'zhi' ? ra : b === 'zhi' ? rb : 0,
    mei: a === 'mei' ? ra : b === 'mei' ? rb : 0,
    worksToPromote: [10, 18, 32, 48, 0][i],
    payRow: i,
  })),
});

const singleJob = (id: string, name: string, attr: AttrKey, reqs: number[]): JobDef => ({
  id,
  name,
  tiers: reqs.map((v, i) => ({
    name: TIER_NAMES[i],
    wu: attr === 'wu' ? v : 0,
    zhi: attr === 'zhi' ? v : 0,
    mei: attr === 'mei' ? v : 0,
    worksToPromote: [10, 18, 32, 48, 0][i],
    payRow: i,
  })),
});

export const DEFAULT_CONFIG: SimConfig = {
  modules: {
    hire: true,
    hiredBy: true,
    adventure: true,
    pk: true,
    sickness: true,
    outfits: true,
    washKit: true,
    scholarship: true,
    gacha: true,
    pay: true,
  },

  base: {
    staminaMax: 100,
    decayPerDay: 12,
    foodCost: 10,
    foodGain: 10,
    initialGold: 300,
    dailyActionLimit: 4,
    tutorialGold: 300,
    tutorialAttr: 1,
  },

  stages: [
    {
      name: '小学',
      required: 6,
      graduationBonus: 100,
      scholarship: sch(0.15, 20, 0.35, 10),
      courses: [
        c('蹦蹦跳跳体能课', 1, 0, 0, 10, 30),
        c('看图识世界课', 0, 1, 0, 10, 30),
        c('闪亮自我表达课', 0, 0, 1, 10, 30),
        camp('公益夏令营', 1, 1, 20),
      ],
    },
    {
      name: '中学',
      required: 8,
      graduationBonus: 200,
      scholarship: sch(0.15, 30, 0.35, 15),
      courses: [
        c('障碍挑战课', 2, 0, 0, 15, 40),
        c('机器人拆解课', 0, 2, 0, 15, 40),
        c('舞台表演课', 0, 0, 2, 15, 40),
        c('野外探险课', 1, 1, 0, 15, 40),
        c('星空观察课', 0, 1, 1, 15, 40),
        c('料理实验课', 0, 1, 1, 15, 40),
        camp('公益夏令营', 2, 1, 20),
      ],
    },
    {
      name: '大学',
      required: 10,
      graduationBonus: 300,
      scholarship: sch(0.1, 40, 0.3, 20),
      courses: [
        c('魅力穿搭课', 0, 0, 3, 15, 40),
        c('梦境编剧课', 0, 2, 1, 15, 40),
        c('武术身法课', 3, 0, 0, 15, 40),
        c('力量觉醒课', 2, 1, 0, 15, 40),
        c('爪爪算法课', 0, 3, 0, 15, 40),
        c('舞台导演课', 0, 1, 2, 15, 40),
        camp('公益夏令营', 3, 2, 20),
      ],
    },
  ],

  training: {
    cost: 100,
    stamina: 20,
    scholarship: sch(0.1, 40, 0.3, 20),
    courses: [
      { name: '梦境领航员特训', wu: 0, zhi: 3, mei: 0 },
      { name: '宗师格斗特训', wu: 3, zhi: 0, mei: 0 },
      { name: '巨星自我修养', wu: 0, zhi: 0, mei: 3 },
      { name: '灵犀演说特训', wu: 0, zhi: 2, mei: 1 },
      { name: '歌剧院首席带演', wu: 0, zhi: 1, mei: 2 },
      { name: '兵法模拟推演', wu: 2, zhi: 1, mei: 0 },
    ],
  },

  jobsCfg: {
    attrCap: 500,
    orderMeta: {
      kuai: { minutes: 60, stamina: 10 },
      wen: { minutes: 120, stamina: 15 },
      guaji: { minutes: 240, stamina: 20 },
      du: { minutes: 240, stamina: 20 },
    },
    // 平衡版：见习不变，高档位再压 ~10%（大师快140）；小乞丐略提垫前期
    payRows: [
      { kuai: fixed(100), wen: r(120, 200), guaji: r(140, 200), du: r(24, 240) },
      { kuai: fixed(120), wen: r(140, 240), guaji: r(160, 220), du: r(28, 280) },
      { kuai: fixed(140), wen: r(160, 280), guaji: r(180, 240), du: r(32, 320) },
      { kuai: fixed(160), wen: r(180, 320), guaji: r(200, 260), du: r(36, 360) },
      { kuai: fixed(180), wen: r(200, 360), guaji: r(220, 280), du: r(40, 400) },
      { kuai: fixed(90), wen: r(100, 180), guaji: r(120, 170), du: r(20, 220) },
    ],
    jobs: [
      dualJob('huajia', '🎨 画家', 'mei', 'zhi', [
        [24, 14],
        [42, 22],
        [74, 38],
        [130, 68],
        [220, 112],
      ]),
      dualJob('zhentan', '✍️ 侦探', 'zhi', 'wu', [
        [24, 14],
        [42, 22],
        [74, 38],
        [130, 68],
        [220, 112],
      ]),
      dualJob('fashi', '🔮 大魔法师', 'zhi', 'mei', [
        [22, 16],
        [38, 27],
        [66, 48],
        [116, 88],
        [192, 150],
      ]),
      dualJob('dachu', '🍳 大厨', 'wu', 'zhi', [
        [22, 16],
        [38, 27],
        [66, 48],
        [116, 88],
        [192, 150],
      ]),
      singleJob('wushu', '🥋 武术家', 'wu', [40, 68, 118, 210, 330]),
      singleJob('meng', '🌙 梦境旅人', 'zhi', [40, 68, 118, 210, 330]),
      singleJob('mingxing', '⭐ 大明星', 'mei', [40, 68, 118, 210, 330]),
      {
        id: 'wanxiang',
        name: '🌌 万象之主',
        tiers: [
          { name: '见习·小乞丐', wu: 0, zhi: 0, mei: 0, worksToPromote: 32, payRow: 5 },
          { name: '高级·万象宗师', wu: 72, zhi: 72, mei: 72, worksToPromote: 48, payRow: 3 },
          { name: '大师·万象之主', wu: 118, zhi: 118, mei: 118, worksToPromote: 0, payRow: 4 },
        ],
      },
    ],
  },

  hire: {
    dailyLimit: 6,
    interruptProb: 0.3,
    bonusByTier: [r(8, 28), r(12, 32), r(16, 36), r(20, 40), r(24, 44)],
    interruptSplit: 0.5,
  },

  hiredBy: {
    dailyLimit: 5,
    referenceBaseByTier: [40, 55, 70, 85, 100],
  },

  // ====== 以下为文档留白、由模拟器给出的建议值（全部可调） ======

  adventure: {
    costGold: 10,
    costStamina: 0,
    events: [
      { name: '打招呼', prob: 25, gold: 10, stamina: 0 },
      { name: '捡到大量金币', prob: 20, gold: 30, stamina: 0 },
      { name: '捡到少量金币', prob: 10, gold: 15, stamina: 0 },
      { name: '被偷金币', prob: 15, gold: -20, stamina: 0 },
      { name: '阴天（清洁+10）', prob: 15, gold: 0, stamina: 0 },
      { name: '晴天（心情+10）', prob: 15, gold: 0, stamina: 0 },
      { name: '雨天（体力+10）', prob: 15, gold: 0, stamina: 10 },
    ],
  },

  pk: {
    stamina: 5,
    winProb: 0.5,
    winGold: 8,
    loseGold: 8,
  },

  sick: {
    intervalDays: 21,
    priceCheap: 50,
    priceMid: 150,
    priceFast: 800,
  },

  washKit: {
    selfPerDay: 1,
    friendMin: 3,
    friendMax: 5,
    thresholdMin: 30,
    thresholdMax: 40,
    staminaGain: 30,
  },

  outfit: {
    prices: {
      hat: [250, 600],
      accessory: [250, 600],
      clothes: [400, 1000],
      background: [400, 1000],
    },
    reserve: 200,
    initialCounts: [12, 6],
    releaseIntervalDays: [14, 30],
  },

  pay: {
    goldPerYuan: 100,
  },

  gacha: {
    price: 130,
    startDay: 90,
    seasonDays: 90,
    targetGrandDays: 90,
    prizes: [
      { name: '终极大奖（限定外观）', prob: 0.3, gold: 0, isGrand: true },
      { name: '金币暴击 +400', prob: 2, gold: 400 },
      { name: '大金袋 +150', prob: 6, gold: 150 },
      { name: '小金袋 +60', prob: 18, gold: 60 },
      { name: '安慰金 +20', prob: 25, gold: 20 },
      { name: '谢谢惠顾（纪念碎片）', prob: 48.7, gold: 0 },
    ],
  },

  strategies: [
    {
      id: 'foxi',
      name: '佛系玩家',
      enabled: true,
      color: '#94a3b8',
      dailyActions: 1,
      orderPref: 'kuai',
      adventuresPerDay: 0,
      pksPerDay: 0,
      targetJobId: 'mingxing',
      collectJobs: false,
      useHire: false,
      goldReserve: 50,
      outfitProbs: [0.1, 0],
      beHiredPerDay: 1,
      selfOnlineProb: 0.2,
      sickLostWork: 1,
      gachaPerDay: 0,
      gachaFloor: 99999,
      rechargeForGacha: false,
      maxPayYuanPerDay: 0,
      maxPayYuanTotal: 0,
    },
    {
      id: 'casual',
      name: '休闲玩家',
      enabled: true,
      color: '#60a5fa',
      dailyActions: 2,
      orderPref: 'kuai',
      adventuresPerDay: 1,
      pksPerDay: 1,
      targetJobId: 'mingxing',
      collectJobs: true,
      useHire: true,
      goldReserve: 50,
      outfitProbs: [0.25, 0.08],
      beHiredPerDay: 2,
      selfOnlineProb: 0.3,
      sickLostWork: 1,
      gachaPerDay: 1,
      gachaFloor: 300,
      rechargeForGacha: true,
      maxPayYuanPerDay: 30,
      maxPayYuanTotal: 200,
    },
    {
      id: 'normal',
      name: '普通玩家',
      enabled: true,
      color: '#34d399',
      dailyActions: 3,
      orderPref: 'wen',
      adventuresPerDay: 2,
      pksPerDay: 3,
      targetJobId: 'huajia',
      collectJobs: true,
      useHire: true,
      goldReserve: 50,
      outfitProbs: [0.45, 0.25],
      beHiredPerDay: 3,
      selfOnlineProb: 0.5,
      sickLostWork: 0.5,
      gachaPerDay: 4,
      gachaFloor: 5000,
      rechargeForGacha: true,
      maxPayYuanPerDay: 68,
      maxPayYuanTotal: 500,
    },
    {
      id: 'grinder',
      name: '肝帝',
      enabled: true,
      color: '#fbbf24',
      dailyActions: 3.3,
      orderPref: 'guaji',
      adventuresPerDay: 5,
      pksPerDay: 6,
      targetJobId: 'wushu',
      collectJobs: true,
      useHire: true,
      goldReserve: 50,
      outfitProbs: [0.65, 0.5],
      beHiredPerDay: 4,
      selfOnlineProb: 0.7,
      sickLostWork: 0,
      gachaPerDay: 8,
      gachaFloor: 6000,
      rechargeForGacha: true,
      maxPayYuanPerDay: 128,
      maxPayYuanTotal: 800,
    },
    {
      id: 'hardcore',
      name: '极端情况',
      enabled: true,
      color: '#f87171',
      dailyActions: 4,
      orderPref: 'guaji',
      adventuresPerDay: 8,
      pksPerDay: 10,
      targetJobId: 'wushu',
      collectJobs: true,
      useHire: true,
      goldReserve: 50,
      outfitProbs: [0.85, 0.75],
      beHiredPerDay: 4,
      selfOnlineProb: 0.85,
      sickLostWork: 0,
      gachaPerDay: 12,
      gachaFloor: 8000,
      rechargeForGacha: true,
      maxPayYuanPerDay: 0,
      maxPayYuanTotal: 1500,
    },
  ],
};

export const DEFAULT_SETTINGS: SimSettings = {
  days: 365,
  mcEnabled: true,
  mcRuns: 200,
  focusStrategyId: 'normal',
};

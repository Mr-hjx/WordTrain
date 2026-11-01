/**
 * 业务常量（集中一处，禁止散落魔法数字）
 * 对应原工程 utils/util.js 顶部的常量区，数值必须逐字一致。
 */

/* ---------------- 存储键 ---------------- */
export const DB_KEY = 'kids_english_bank_v1'
export const RECORD_KEY = 'kids_english_records_v1'
export const SETTING_KEY = 'kids_english_setting_v1'
export const GEM_KEY = 'kids_english_gems_v1'
export const MEDAL_KEY = 'kids_english_medals_v1'
export const REWARD_KEY = 'kids_english_rewards_v1'
export const WRONG_KEY = 'kids_english_wrongbook_v1'
export const EXAM_KEY = 'kids_english_exam_v1'

/* ---------------- 题量 ---------------- */
/** 每天练习固定 5 道题 */
export const QUIZ_SIZE = 5
/** 每答对 1 题得 2 颗宝石 → 全对满堂 10 颗 */
export const GEM_PER_CORRECT = 2
/** 1 枚小奖牌 = 10 颗宝石 = 1 堂课全对 */
export const GEMS_PER_SMALL_MEDAL = 10
/** 2 小换 1 大 */
export const SMALL_PER_BIG = 2
/** 大奖牌门槛 = 20 颗 */
export const GEMS_PER_BIG_MEDAL = GEMS_PER_SMALL_MEDAL * SMALL_PER_BIG
/** 奖牌墙格数 */
export const SMALL_SLOTS = 20
export const BIG_SLOTS = 10
/** 错题重练固定 5 道 */
export const WRONG_QUIZ_SIZE = 5
/** 考试 10 道 */
export const EXAM_SIZE = 10

/* ---------------- 默认设置 ---------------- */
export const DEFAULT_SETTING = { voice: true, sound: true, questionCount: 10 }

/* ---------------- 上课日 ---------------- */
/** 周二 = 2，周五 = 5 */
export const CLASS_DAYS = [2, 5]

/* ---------------- 小奖牌名称池（20 枚） ---------------- */
export const SMALL_MEDAL_POOL = [
  { name: '小星星', emoji: '⭐', color: '#FFC442' },
  { name: '小火车头', emoji: '🚂', color: '#7C5CFF' },
  { name: '小火箭', emoji: '🚀', color: '#4DA6FF' },
  { name: '小恐龙', emoji: '🦖', color: '#2ED3B7' },
  { name: '小狮子', emoji: '🦁', color: '#FF9F43' },
  { name: '小企鹅', emoji: '🐧', color: '#4DA6FF' },
  { name: '小狐狸', emoji: '🦊', color: '#FF9F43' },
  { name: '小熊猫', emoji: '🐼', color: '#2ED3B7' },
  { name: '独角兽', emoji: '🦄', color: '#FF6B9D' },
  { name: '小博士', emoji: '🎓', color: '#5B3FD6' },
  { name: '小海豚', emoji: '🐬', color: '#4DA6FF' },
  { name: '小蝴蝶', emoji: '🦋', color: '#FF6B9D' },
  { name: '超级之星', emoji: '🌟', color: '#FFB109' },
  { name: '小勇士', emoji: '🛡️', color: '#5B3FD6' },
  { name: '小魔法师', emoji: '🧙', color: '#7C5CFF' },
  { name: '单词大王', emoji: '👑', color: '#F5A623' },
  { name: '小画家', emoji: '🎨', color: '#FF6B9D' },
  { name: '小音乐家', emoji: '🎵', color: '#2ED3B7' },
  { name: '小探险家', emoji: '🧭', color: '#FF9F43' },
  { name: '传奇英雄', emoji: '🏆', color: '#FF6B81' }
]

/* ---------------- 大奖牌名称池（10 枚） ---------------- */
export const BIG_MEDAL_POOL = [
  { name: '青铜勋章', emoji: '🥉', color: '#C68B5B' },
  { name: '白银勋章', emoji: '🥈', color: '#A8B4C4' },
  { name: '黄金勋章', emoji: '🥇', color: '#F5A623' },
  { name: '钻石勋章', emoji: '💠', color: '#4DA6FF' },
  { name: '彩虹勋章', emoji: '🌈', color: '#FF6B9D' },
  { name: '皇冠勋章', emoji: '👑', color: '#FFB109' },
  { name: '凤凰勋章', emoji: '🔥', color: '#FF6B81' },
  { name: '巨龙勋章', emoji: '🐲', color: '#2ED3B7' },
  { name: '魔法勋章', emoji: '🔮', color: '#7C5CFF' },
  { name: '传奇勋章', emoji: '🏆', color: '#F5A623' }
]

/* ---------------- 布鲁伊点赞图 ---------------- */
export const PRAISE_IMAGES = [
  '/static/praise/bluey-1.png',
  '/static/praise/bluey-2.png',
  '/static/praise/bluey-3.png',
  '/static/praise/bluey-4.png',
  '/static/praise/bluey-5.png'
]

/* ---------------- 语音朗读语速 ---------------- */
export const SPEECH_RATE = 0.8

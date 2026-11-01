/**
 * 全局业务类型定义
 */

/** 词条 */
export interface Word {
  id: string
  en: string
  zh: string
  emoji: string
  img?: string
}

/** 题库：按日期分组 { 'YYYY-MM-DD': Word[] } */
export type Bank = Record<string, Word[]>

/** 题型 */
export type QType = 'zh2en' | 'listen' | 'spell' | 'match'

/** 单选类题（zh2en / listen）—— options 是纯字符串数组 */
export interface ChoiceQuestion {
  type: 'zh2en' | 'listen'
  id: string
  wordId: string
  word: Word
  prompt: string
  audio?: string
  options: string[]
  answer: string
  emoji: string
}

/** 拼写题 */
export interface SpellTile {
  ch: string
  key: string
}

export interface SpellQuestion {
  type: 'spell'
  id: string
  wordId: string
  word: Word
  prompt: string
  hint: string
  emoji: string
  letters: string[]
  tiles: SpellTile[]
  answer: string
}

/** 连线题（一道题含 4 组配对） */
export interface MatchItem {
  id: string
  text: string
  emoji?: string
}

export interface MatchPair {
  id: string
  en: string
  zh: string
}

export interface MatchQuestion {
  type: 'match'
  id: string
  isGroup: true
  prompt: string
  left: MatchItem[]
  right: MatchItem[]
  pairs: MatchPair[]
  word: Word
  answer: string
}

export type Question = ChoiceQuestion | SpellQuestion | MatchQuestion

/** 学习记录 */
export interface LearnRecord {
  date: string
  mode: 'daily' | 'wrong' | 'exam'
  total: number
  correct: number
  rate: number
  gems: number
  at: number
  timeText?: string
}

/** 设置 */
export interface Setting {
  voice: boolean
  sound: boolean
  questionCount: number
}

/** 错题条目 */
export interface WrongItem {
  en: string
  zh: string
  emoji: string
  count: number
  firstAt: number
  lastAt: number
  /** 派生：友好日期 */
  lastText?: string
}

/** 错题本原始存储结构 */
export type WrongBook = Record<string, WrongItem>

/** 奖牌定义 + 墙状态 */
export interface Medal {
  index: number
  id: string
  type: 'small' | 'big'
  name: string
  emoji: string
  color: string
  need: number
  desc: string
  unlocked?: boolean
  time?: number
  timeText?: string
  progress?: number
}

export interface MedalWall {
  small: Medal[]
  big: Medal[]
}

export interface MedalStats {
  smallGot: number
  smallTotal: number
  bigGot: number
  bigTotal: number
}

export interface ClassProgress {
  gems: number
  intoClass: number
  need: number
  left: number
  percent: number
}

/** 一次宝石结算结果 */
export interface GemResult {
  before: number
  after: number
  gained: number
  newSmall: Medal[]
  newBig: Medal[]
}

/** 考试记录 */
export interface ExamTaken {
  at: number
  score: number
  total: number
  gems: number
  timeText?: string
  rate?: number
}

export interface ExamData {
  taken: ExamTaken[]
  paidFps: string[]
}

export interface ExamStats {
  times: number
  best: number
  perfect: number
  totalGems: number
}

/** 考试结算结果 */
export interface ExamResult {
  gems: number
  raw: number
  paid: number
  after: number
  dup: boolean
}

/** 错题重练词表 */
export interface WrongPracticePlan {
  words: Word[]
  wrongWords: WrongItem[]
  filled: number
}

/** 练习会话模式 */
export type SessionMode = 'daily' | 'wrong' | 'exam'

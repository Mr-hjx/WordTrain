import { describe, it, expect, beforeEach, vi } from 'vitest'

/* ---- 最小 uni / wx shim（node 环境，内存 KV） ---- */
const store: Record<string, unknown> = {}
;(globalThis as any).uni = {
  getStorageSync: (k: string) => (k in store ? store[k] : ''),
  setStorageSync: (k: string, v: unknown) => {
    store[k] = v
  },
  removeStorageSync: (k: string) => {
    delete store[k]
  },
  showToast: vi.fn(),
  vibrateShort: vi.fn()
}

import * as constants from '@/utils/constants'
import { buildQuestions, spellable } from '@/utils/questions'
import * as gems from '@/utils/gems'
import * as wrongbook from '@/utils/wrongbook'
import * as exam from '@/utils/exam'
import { guessEmoji, shuffle, todayStr, friendlyDate } from '@/utils/date'
import type { Word, Question } from '@/types'

let counter = 0
function W(en: string, zh: string): Word {
  return { id: 'w' + ++counter, en, zh, emoji: guessEmoji(en) }
}

const POOL: Word[] = [
  W('apple', '苹果'),
  W('banana', '香蕉'),
  W('cat', '小猫'),
  W('dog', '小狗'),
  W('milk', '牛奶'),
  W('red', '红色'),
  W('sun', '太阳'),
  W('ball', '球'),
  W('book', '书'),
  W('cake', '蛋糕')
]

beforeEach(() => {
  Object.keys(store).forEach((k) => delete store[k])
})

describe('常量：规则数值必须与业务一致', () => {
  it('每日 5 题 / 每题 2 宝石 / 小奖牌 10 宝石 / 2 小换 1 大', () => {
    expect(constants.QUIZ_SIZE).toBe(5)
    expect(constants.GEM_PER_CORRECT).toBe(2)
    expect(constants.GEMS_PER_SMALL_MEDAL).toBe(10)
    expect(constants.SMALL_PER_BIG).toBe(2)
    expect(constants.GEMS_PER_BIG_MEDAL).toBe(20)
    expect(constants.SMALL_SLOTS).toBe(20)
    expect(constants.BIG_SLOTS).toBe(10)
    expect(constants.EXAM_SIZE).toBe(10)
    expect(constants.WRONG_QUIZ_SIZE).toBe(5)
  })
})

describe('buildQuestions：题量必须凑满', () => {
  it('10 题请求要真的出 10 题（含连线题名额分配）', () => {
    const qs = buildQuestions(POOL, { count: 10 })
    expect(qs.length).toBe(10)
  })

  it('5 题请求出 5 题', () => {
    expect(buildQuestions(POOL, { count: 5 }).length).toBe(5)
  })

  it('单题型模式只出该题型', () => {
    const qs = buildQuestions(POOL, { count: 4, types: ['spell'] })
    expect(qs.every((q) => q.type === 'spell')).toBe(true)
  })

  it('空词表返回空数组', () => {
    expect(buildQuestions([], { count: 5 })).toEqual([])
  })

  it('线上题每道含 4 组配对', () => {
    const qs = buildQuestions(POOL, { count: 2, types: ['match'] })
    expect(qs.length).toBeGreaterThan(0)
    const m = qs[0] as any
    expect(m.type).toBe('match')
    expect(m.pairs.length).toBe(4)
    expect(m.left.length).toBe(4)
    expect(m.right.length).toBe(4)
  })
})

describe('题型结构：历史 bug 复现点', () => {
  it('zh2en / listen 的 options 是纯字符串数组（不是对象）', () => {
    const qs = buildQuestions(POOL, { count: 10 })
    const choices = qs.filter((q) => q.type === 'zh2en' || q.type === 'listen') as any[]
    expect(choices.length).toBeGreaterThan(0)
    choices.forEach((q) => {
      expect(Array.isArray(q.options)).toBe(true)
      q.options.forEach((o: unknown) => expect(typeof o).toBe('string'))
      expect(q.options).toContain(q.answer)
    })
  })

  it('spell 的 tiles 数 = 答案长度 + 2 个干扰字母，且槽位数 = 答案长度', () => {
    const qs = buildQuestions(POOL, { count: 10, types: ['spell'] })
    expect(qs.length).toBeGreaterThan(0)
    qs.forEach((q) => {
      const s = q as any
      expect(s.tiles.length).toBe(s.letters.length + 2)
      s.tiles.forEach((t: any) => expect(typeof t.ch).toBe('string'))
    })
  })

  it('spellable 只接受 3-12 位纯字母', () => {
    expect(spellable('cat')).toBe(true)
    expect(spellable('abcd')).toBe(true)
    expect(spellable('ab')).toBe(false)
    expect(spellable('ice cream')).toBe(false)
    expect(spellable('a1b')).toBe(false)
  })
})

describe('宝石与奖牌', () => {
  it('加 10 颗宝石点亮第 1 枚小奖牌，累计 20 颗时大奖牌也亮', () => {
    gems.addGems(10)
    expect(gems.getGems()).toBe(10)
    let st = gems.medalStats()
    expect(st.smallGot).toBe(1)
    expect(st.bigGot).toBe(0)

    gems.addGems(10)
    expect(gems.getGems()).toBe(20)
    st = gems.medalStats()
    expect(st.smallGot).toBe(2)
    expect(st.bigGot).toBe(1)
  })

  it('settleMedals 幂等：重复结算不会重复点亮', () => {
    gems.addGems(30)
    const before = gems.medalStats().smallGot
    gems.settleMedals(30)
    expect(gems.medalStats().smallGot).toBe(before)
  })

  it('classProgress 反映距下一枚小奖牌还差多少', () => {
    gems.addGems(14)
    const cp = gems.classProgress()
    expect(cp.intoClass).toBe(4)
    expect(cp.left).toBe(6)
    expect(cp.percent).toBe(40)
  })
})

describe('错题本', () => {
  it('按英文小写去重，重复错累加次数', () => {
    expect(wrongbook.addWrongWords({ en: 'apple', zh: '苹果' })).toBe(1)
    expect(wrongbook.addWrongWords({ en: 'Apple', zh: '苹果' })).toBe(0)
    expect(wrongbook.wrongCount()).toBe(1)
    expect(wrongbook.getWrongList()[0].count).toBe(2)
  })

  it('答对 1 次即移出', () => {
    wrongbook.addWrongWords([{ en: 'apple' }, { en: 'dog' }])
    expect(wrongbook.wrongCount()).toBe(2)
    expect(wrongbook.removeWrongWords('APPLE')).toBe(1)
    expect(wrongbook.wrongCount()).toBe(1)
    expect(wrongbook.getWrongBook().dog).toBeTruthy()
  })

  it('重练不足 5 道时用已学单词补齐（排除已在错题里的）', () => {
    // 造一个题库（直接写存储键）
    const bank: any = {}
    POOL.forEach((w) => {
      const d = '2026-01-0' + ((counter % 9) + 1)
      if (!bank[d]) bank[d] = []
      bank[d].push(w)
    })
    store[constants.DB_KEY] = bank

    wrongbook.addWrongWords([{ en: 'apple', zh: '苹果' }, { en: 'dog', zh: '小狗' }])
    const plan = wrongbook.buildWrongPracticeWords()
    expect(plan.words.length).toBe(5)
    expect(plan.filled).toBe(3)
    // 补齐的词不能是错题里的
    const ens = plan.words.map((w) => w.en.toLowerCase())
    expect(new Set(ens).size).toBe(ens.length)
  })
})

describe('考试', () => {
  it('8/9/10 题分别得 8/9/10 宝石，7 题及以下 0', () => {
    expect(exam.examGems(10)).toBe(10)
    expect(exam.examGems(9)).toBe(9)
    expect(exam.examGems(8)).toBe(8)
    expect(exam.examGems(7)).toBe(0)
    expect(exam.examGems(0)).toBe(0)
  })

  it('题面指纹与顺序无关', () => {
    const a = [{ answer: 'apple', type: 'zh2en' }, { answer: 'dog', type: 'listen' }] as Question[]
    const b = [{ answer: 'dog', type: 'listen' }, { answer: 'apple', type: 'zh2en' }] as Question[]
    expect(exam.examFingerprint(a)).toBe(exam.examFingerprint(b))
    expect(exam.examFingerprint(a)).toBe('apple|zh2en,dog|listen')
  })

  it('同一套题只发一次宝石', () => {
    const qs = buildQuestions(POOL, { count: 10 })
    const r1 = exam.saveExamResult(qs, 10)
    expect(r1.paid).toBe(10)
    expect(r1.dup).toBe(false)

    const r2 = exam.saveExamResult(qs, 10)
    expect(r2.paid).toBe(0)
    expect(r2.dup).toBe(true)
    expect(gems.getGems()).toBe(10)
  })

  it('已学词不足 4 个时不能开考', () => {
    expect(exam.buildExamQuestions().ok).toBe(false)
  })
})

describe('工具函数', () => {
  it('shuffle 不丢元素', () => {
    const a = [1, 2, 3, 4, 5]
    const b = shuffle(a)
    expect(b.sort()).toEqual(a)
    expect(a).toEqual([1, 2, 3, 4, 5]) // 不改原数组
  })

  it('todayStr 格式 YYYY-MM-DD', () => {
    expect(todayStr()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('friendlyDate 输出 M月D日 周X', () => {
    expect(friendlyDate('2026-01-05')).toBe('1月5日 周一')
    expect(friendlyDate('2026-01-06')).toBe('1月6日 周二')
  })

  it('guessEmoji 命中词典 / 兜底稳定', () => {
    expect(guessEmoji('apple')).toBe('🍎')
    expect(guessEmoji('apples')).toBe('🍎')
    expect(guessEmoji('zzzzz')).toBe(guessEmoji('zzzzz'))
  })
})

describe('今日词表回退（修复「题目为空」）', () => {
  beforeEach(() => {
    Object.keys(store).forEach((k) => delete store[k])
  })

  /** 用给定题库初始化，返回 useBank 的只读视图 */
  async function freshBank(bank: Record<string, Word[]>) {
    const { useBank } = await import('@/composables/useBank')
    store[constants.DB_KEY] = bank
    const b = useBank()
    b.reload()
    return b
  }

  it('今天有词时直接返回今天的词，不触发回退', async () => {
    const t = todayStr()
    const b = await freshBank({ [t]: [W('apple', '苹果'), W('banana', '香蕉')] })
    expect(b.todayWords.value.map((w) => w.en)).toEqual(['apple', 'banana'])
    expect(b.todayWordsFallback.value).toBe(false)
    expect(b.todayWordsDate.value).toBe(t)
  })

  it('今天无词时回退到最近一次录入的日期（核心修复点）', async () => {
    // 只有历史日期的词，今天没有
    const b = await freshBank({
      '2026-01-05': [W('apple', '苹果'), W('banana', '香蕉'), W('cat', '小猫'), W('dog', '小狗')]
    })
    expect(b.todayWords.value.length).toBe(4)
    expect(b.todayWords.value.map((w) => w.en)).toContain('apple')
    expect(b.todayWordsFallback.value).toBe(true)
    expect(b.todayWordsDate.value).toBe('2026-01-05')
  })

  it('回退后的词表能正常出满 5 道题（不再出现空态）', async () => {
    const b = await freshBank({
      '2026-01-05': [
        W('apple', '苹果'),
        W('banana', '香蕉'),
        W('cat', '小猫'),
        W('dog', '小狗'),
        W('milk', '牛奶'),
        W('sun', '太阳'),
        W('ball', '球'),
        W('book', '书')
      ]
    })
    const qs = buildQuestions(b.todayWords.value, { count: constants.QUIZ_SIZE })
    expect(qs.length).toBe(constants.QUIZ_SIZE)
  })

  it('题库完全为空时返回空数组（仍走空态，但不会误判为有词）', async () => {
    const b = await freshBank({})
    expect(b.todayWords.value).toEqual([])
    expect(b.todayWordsFallback.value).toBe(false)
    expect(b.todayWordsDate.value).toBe('')
  })

  it('多个历史日期时，取最近的那个', async () => {
    const b = await freshBank({
      '2026-01-01': [W('cat', '小猫')],
      '2026-03-20': [W('apple', '苹果'), W('dog', '小狗')]
    })
    expect(b.todayWordsDate.value).toBe('2026-03-20')
    expect(b.todayWords.value.map((w) => w.en)).toEqual(['apple', 'dog'])
  })
})

describe('题型分配：不允许相邻同类型', () => {
  const MANY: Word[] = [
    W('apple', '苹果'),
    W('banana', '香蕉'),
    W('orange', '橙子'),
    W('grape', '葡萄'),
    W('cat', '猫'),
    W('dog', '狗'),
    W('bird', '鸟'),
    W('fish', '鱼'),
    W('milk', '牛奶'),
    W('bread', '面包'),
    W('cake', '蛋糕'),
    W('water', '水')
  ]

  it('连做 200 轮，5 道题里绝不允许出现相邻同类型', () => {
    for (let i = 0; i < 200; i++) {
      const qs = buildQuestions(MANY, { count: constants.QUIZ_SIZE })
      expect(qs.length).toBe(constants.QUIZ_SIZE)
      for (let k = 1; k < qs.length; k++) {
        expect(qs[k].type).not.toBe(qs[k - 1].type)
      }
    }
  })

  it('连做 200 轮，连线题每轮不超过 2 道（防止占比虚高）', () => {
    for (let i = 0; i < 200; i++) {
      const qs = buildQuestions(MANY, { count: constants.QUIZ_SIZE })
      const matchCount = qs.filter((q) => q.type === 'match').length
      expect(matchCount).toBeLessThanOrEqual(2)
    }
  })

  it('4 个词（最小可用词表）也能凑满 5 题且不重样相邻', () => {
    const tiny = [W('apple', '苹果'), W('banana', '香蕉'), W('cat', '猫'), W('dog', '狗')]
    const qs = buildQuestions(tiny, { count: constants.QUIZ_SIZE })
    expect(qs.length).toBe(constants.QUIZ_SIZE)
    for (let k = 1; k < qs.length; k++) {
      expect(qs[k].type).not.toBe(qs[k - 1].type)
    }
  })

  it('200 轮里题型分布均衡：三种单选类各占约 1/3，连线类明显更少', () => {
    const tally: Record<string, number> = {}
    const ROUNDS = 200
    for (let i = 0; i < ROUNDS; i++) {
      buildQuestions(MANY, { count: constants.QUIZ_SIZE }).forEach((q) => {
        tally[q.type] = (tally[q.type] || 0) + 1
      })
    }
    const total = ROUNDS * constants.QUIZ_SIZE
    const singles = ['zh2en', 'listen', 'spell'].map((t) => (tally[t] || 0) / total)
    // 每种单选类应至少占 18%（均衡下接近 25-29%）
    singles.forEach((r) => expect(r).toBeGreaterThan(0.18))
    // 连线类约每轮 1 道（≈20%），不应超过 25%
    expect((tally.match || 0) / total).toBeLessThan(0.25)
    expect((tally.match || 0) / total).toBeGreaterThan(0.1)
  })

  it('只指定单一题型时不会死循环（退化场景）', () => {
    const qs = buildQuestions(MANY, { count: constants.QUIZ_SIZE, types: ['zh2en'] })
    expect(qs.length).toBe(constants.QUIZ_SIZE)
    qs.forEach((q) => expect(q.type).toBe('zh2en'))
  })
})

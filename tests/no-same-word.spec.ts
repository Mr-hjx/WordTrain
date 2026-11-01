import { describe, it, expect } from 'vitest'
import { buildQuestions } from '../src/utils/questions'

const words = [['apple','苹果'],['banana','香蕉'],['cat','猫'],['dog','狗'],['egg','鸡蛋'],['fish','鱼'],['milk','牛奶'],['red','红色'],['sun','太阳'],['ball','球']]
  .map((p, i) => ({ id: 'w' + i, en: p[0], zh: p[1], emoji: '🍎' }))
const few = words.slice(0, 4)

describe('同一轮不重复考同一个词', () => {
  it('10 词出 5 题：每题单词互不相同', () => {
    for (let r = 0; r < 300; r++) {
      const qs = buildQuestions(words, { count: 5 })
      const ids = qs.map(q => (q as any).word?.id)
      expect(new Set(ids).size).toBe(ids.length)
    }
  })
  it('10 词出 10 题（考试）：尽量不重复，且不允许相邻同词', () => {
    let minUniq = 99
    for (let r = 0; r < 300; r++) {
      const qs = buildQuestions(words, { count: 10 })
      for (let i = 1; i < qs.length; i++) {
        expect((qs[i] as any).word?.id).not.toBe((qs[i - 1] as any).word?.id)
      }
      minUniq = Math.min(minUniq, new Set(qs.map(q => (q as any).word?.id)).size)
    }
    console.log('10 题场景最少不同词数:', minUniq)
    expect(minUniq).toBeGreaterThanOrEqual(7)
  })
  it('4 词出 5 题：允许复用但不相邻同词', () => {
    for (let r = 0; r < 300; r++) {
      const qs = buildQuestions(few, { count: 5 })
      for (let i = 1; i < qs.length; i++) {
        expect((qs[i] as any).word?.id).not.toBe((qs[i - 1] as any).word?.id)
      }
      expect(qs.length).toBeGreaterThan(0)
    }
  })
})

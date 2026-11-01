import { describe, it, expect } from 'vitest'
import { buildQuestions } from '../src/utils/questions'

const words = [['apple','苹果'],['banana','香蕉'],['cat','猫'],['dog','狗'],['egg','鸡蛋'],['fish','鱼'],['milk','牛奶'],['red','红色'],['sun','太阳'],['ball','球']]
  .map((p, i) => ({ id: 'w' + i, en: p[0], zh: p[1], emoji: '🍎' }))

describe('buildQuestions 重复题排查', () => {
  it('500 轮内不允许出现两道完全相同的题（同词同型）', () => {
    let worst = 0
    for (let r = 0; r < 500; r++) {
      const qs = buildQuestions(words, { count: 5 })
      const keys = qs.map(q => q.type + ':' + (q as any).word?.id)
      const uniq = new Set(keys)
      worst = Math.max(worst, keys.length - uniq.size)
      expect(qs.length).toBe(5)
    }
    console.log('500 轮最大重复数:', worst)
    expect(worst).toBe(0)
  })
  it('500 轮内不允许相邻两道同型', () => {
    let worst = 0
    for (let r = 0; r < 500; r++) {
      const qs = buildQuestions(words, { count: 5 })
      for (let i = 1; i < qs.length; i++) {
        if (qs[i].type === qs[i - 1].type) worst++
      }
    }
    console.log('500 轮相邻同型次数:', worst)
    expect(worst).toBe(0)
  })
})

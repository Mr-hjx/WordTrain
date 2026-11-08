import { describe, it, expect } from 'vitest'
import { parseWordPairs } from '../src/utils/parseWords'

describe('parseWordPairs 批量粘贴解析', () => {
  it('用户给的连续无分隔示例（含多词短语）', () => {
    const r = parseWordPairs(
      'wash洗 my我的 your你的 pass传递 stone石头 feather羽毛 hard坚硬的 soft柔软的 thank you谢谢'
    )
    expect(r.pairs).toHaveLength(9)
    expect(r.pairs[0]).toEqual({ en: 'wash', zh: '洗' })
    expect(r.pairs[3]).toEqual({ en: 'pass', zh: '传递' })
    expect(r.pairs[8]).toEqual({ en: 'thank you', zh: '谢谢' })
    expect(r.invalid).toHaveLength(0)
  })

  it('逐行 + 空格分隔', () => {
    const r = parseWordPairs('apple 苹果\nbanana 香蕉\ncat 小猫')
    expect(r.pairs).toEqual([
      { en: 'apple', zh: '苹果' },
      { en: 'banana', zh: '香蕉' },
      { en: 'cat', zh: '小猫' }
    ])
  })

  it('中文在前的写法', () => {
    const r = parseWordPairs('苹果 apple\n香蕉 banana')
    expect(r.pairs).toEqual([
      { en: 'apple', zh: '苹果' },
      { en: 'banana', zh: '香蕉' }
    ])
  })

  it('逗号/顿号分隔同样有效', () => {
    const r = parseWordPairs('wash洗，my我的、your你的;pass传递')
    expect(r.pairs.map((p) => p.en)).toEqual(['wash', 'my', 'your', 'pass'])
    expect(r.pairs[0].zh).toBe('洗')
  })

  it('一个词多个释义（顿号保留）', () => {
    const r = parseWordPairs('wash洗、洗涤 my我的')
    expect(r.pairs[0]).toEqual({ en: 'wash', zh: '洗、洗涤' })
    expect(r.pairs[1]).toEqual({ en: 'my', zh: '我的' })
  })

  it('带连字符与撇号的词', () => {
    const r = parseWordPairs("ice-cream冰淇淋 don't不要")
    expect(r.pairs).toEqual([
      { en: 'ice-cream', zh: '冰淇淋' },
      { en: "don't", zh: '不要' }
    ])
  })

  it('缺少释义的片段进 invalid', () => {
    const r = parseWordPairs('apple苹果\nbanana')
    expect(r.pairs).toHaveLength(1)
    expect(r.invalid).toEqual([{ text: 'banana', reason: '缺少中文释义' }])
  })

  it('批内重复只保留首次出现的释义', () => {
    const r = parseWordPairs('apple苹果 apple果实\nApple苹果')
    expect(r.pairs).toEqual([{ en: 'apple', zh: '苹果' }])
    expect(r.duplicates).toEqual(['apple', 'Apple'])
  })

  it('纯中文不产出词条', () => {
    expect(parseWordPairs('').pairs).toHaveLength(0)
    const r = parseWordPairs('你好 世界')
    expect(r.pairs).toHaveLength(0)
    expect(r.invalid).toHaveLength(1)
    expect(r.invalid[0].reason).toBe('缺少英文')
  })

  it('多余空白与结尾标点不污染结果', () => {
    const r = parseWordPairs('  apple   苹果 。 \n\n  cat 小猫，  ')
    expect(r.pairs).toEqual([
      { en: 'apple', zh: '苹果' },
      { en: 'cat', zh: '小猫' }
    ])
  })
})

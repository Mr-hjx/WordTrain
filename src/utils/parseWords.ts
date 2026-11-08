/**
 * 批量粘贴文本解析
 *
 * 支持无分隔符的连续粘贴，例如：
 *   wash洗 my我的 your你的 pass传递 thank you谢谢
 * 也支持换行 / 逗号 / 顿号 / 竖线 分隔，以及「中文在前」（洗 wash）的写法。
 */

export interface WordPair {
  en: string
  zh: string
}

export interface ParseResult {
  /** 成功识别的词条（已去重，保留首次出现的释义） */
  pairs: WordPair[]
  /** 识别失败的片段 */
  invalid: { text: string; reason: string }[]
  /** 批内重复的英文（已被丢弃） */
  duplicates: string[]
}

type Kind = 'en' | 'zh' | 'sep' | 'nl'

/** 英文字符（含连字符、撇号，支持 ice-cream / don't） */
const RE_EN = /[A-Za-z'’\-]/
/** 中日韩统一表意文字 */
const RE_ZH = /[\u3400-\u4dbf\u4e00-\u9fff]/

function classify(ch: string): Kind {
  if (ch === '\n' || ch === '\r') return 'nl'
  if (RE_EN.test(ch)) return 'en'
  if (RE_ZH.test(ch)) return 'zh'
  return 'sep'
}

function trimZh(s: string): string {
  // 去掉首尾空白与收尾的标点（逗号/顿号/分号/斜杠等）
  return s.replace(/^[\s,，、;；/|]+/, '').replace(/[\s,，、;；/|.。!！?？:：]+$/, '').trim()
}

function trimEn(s: string): string {
  return s.replace(/\s+/g, ' ').trim()
}

/**
 * 解析文本为词条列表
 */
export function parseWordPairs(text: string): ParseResult {
  const pairs: WordPair[] = []
  const invalid: { text: string; reason: string }[] = []
  const duplicates: string[] = []
  const seen = new Set<string>()

  // 当前累积中的词条
  let enParts: string[] = []
  let enRun = ''
  let zhParts = ''
  /** 中文在前的写法：释义已配给当前英文，后继中文属于下一个词条 */
  let zhSealed = false

  const reset = () => {
    enParts = []
    enRun = ''
    zhParts = ''
    zhSealed = false
  }

  /** 把当前英文 run 收进 enParts（单词间保留单空格） */
  const pushRun = () => {
    if (enRun) {
      enParts.push(enRun)
      enRun = ''
    }
  }

  const flush = () => {
    const en = trimEn(enParts.join(' '))
    const zh = trimZh(zhParts)

    if (en && zh) {
      const key = en.toLowerCase()
      if (seen.has(key)) {
        duplicates.push(en)
      } else {
        seen.add(key)
        pairs.push({ en, zh })
      }
    } else if (en && !zh) {
      invalid.push({ text: en, reason: '缺少中文释义' })
    } else if (!en && zh) {
      invalid.push({ text: zh, reason: '缺少英文' })
    }
    reset()
  }

  for (const ch of text) {
    const kind = classify(ch)

    if (kind === 'en') {
      if (!enRun) {
        if (zhParts && enParts.length) {
          // 上一个词条已完整，这里是新词的英文
          pushRun()
          flush()
        } else if (zhParts) {
          // 中文在前：这份释义配给即将出现的英文
          zhSealed = true
        }
      }
      enRun += ch
      continue
    }

    // 非英文字符，英文 run 到此结束
    pushRun()

    if (kind === 'nl') {
      flush()
      continue
    }

    if (kind === 'zh') {
      // 上一对已完整，这里的中文属于下一个词条
      if (zhSealed) flush()
      zhParts += ch
      continue
    }

    // 分隔符：中英文都已有内容时，视为释义内部的连接符（保留「洗、洗涤」这种写法）
    if (zhParts && enParts.length) {
      zhParts += ch.trim() === '' ? ' ' : ch
    }
  }

  pushRun()
  flush()

  return { pairs, invalid, duplicates }
}

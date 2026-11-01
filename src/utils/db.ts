/**
 * 题库读写（纯数据层，不含响应式）
 */

import type { Bank, Word } from '@/types'
import { DB_KEY } from './constants'
import { readRaw, writeRawWithToast, writeRaw } from './storage'
import { friendlyDate, todayStr, isToday, guessEmoji } from './date'

export function getBankRaw(): Bank {
  return readRaw<Bank>(DB_KEY, {})
}

export function saveBank(bank: Bank): boolean {
  return writeRawWithToast(DB_KEY, bank)
}

export function getWordsByDate(dateStr: string): Word[] {
  const bank = getBankRaw()
  return bank[dateStr] || []
}

export function setWordsByDate(dateStr: string, words: Word[]): boolean {
  const bank = getBankRaw()
  if (!words || words.length === 0) delete bank[dateStr]
  else bank[dateStr] = words
  return saveBank(bank)
}

/** 追加词条（自动去重：英文相同则视为同一个词），返回新增数量 */
export function appendWords(dateStr: string, words: Partial<Word>[]): number {
  const bank = getBankRaw()
  const list = bank[dateStr] || []
  let added = 0
  words.forEach((w) => {
    const en = (w.en || '').trim()
    if (!en) return
    const exist = list.some((x) => x.en.toLowerCase() === en.toLowerCase())
    if (!exist) {
      list.push({
        id: 'w_' + Date.now() + '_' + Math.floor(Math.random() * 10000),
        en,
        zh: (w.zh || '').trim(),
        emoji: w.emoji || guessEmoji(en),
        img: w.img || ''
      })
      added++
    }
  })
  bank[dateStr] = list
  writeRaw(DB_KEY, bank)
  return added
}

export function removeWord(dateStr: string, id: string): void {
  const bank = getBankRaw()
  const list = bank[dateStr] || []
  bank[dateStr] = list.filter((w) => w.id !== id)
  if (bank[dateStr].length === 0) delete bank[dateStr]
  writeRaw(DB_KEY, bank)
}

/** 所有有词条的日期（倒序） */
export function allDates(): string[] {
  const bank = getBankRaw()
  return Object.keys(bank)
    .filter((d) => bank[d] && bank[d].length > 0)
    .sort()
    .reverse()
}

export function totalWordCount(): number {
  const bank = getBankRaw()
  return Object.keys(bank).reduce((sum, k) => sum + (bank[k] ? bank[k].length : 0), 0)
}

/** 按日期分组（首页列表用） */
export function groupedByDate(): { date: string; friendly: string; isToday: boolean; words: Word[] }[] {
  const bank = getBankRaw()
  return Object.keys(bank)
    .filter((d) => bank[d] && bank[d].length > 0)
    .sort()
    .reverse()
    .map((d) => ({
      date: d,
      friendly: friendlyDate(d),
      isToday: isToday(d),
      words: bank[d]
    }))
}

/** 全部已学单词（跨日期去重，用于给错题重练补题 / 考试抽题） */
export function getAllLearnedWords(): Word[] {
  const bank = getBankRaw()
  const map: Record<string, Word> = {}
  Object.keys(bank).forEach((date) => {
    ;(bank[date] || []).forEach((w) => {
      if (!w || !w.en) return
      const key = String(w.en).trim().toLowerCase()
      if (!key) return
      if (!map[key]) {
        map[key] = { id: w.id || 'w_' + key, en: w.en, zh: w.zh || '', emoji: w.emoji || guessEmoji(w.en) }
      }
    })
  })
  return Object.keys(map).map((k) => map[k])
}

/** 最近一次录入的日期（无则返回今天） */
export function latestDate(): string {
  const list = allDates()
  return list.length ? list[0] : todayStr()
}

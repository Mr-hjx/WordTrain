/**
 * 错题本（纯数据层）
 *
 * 存储结构：{ [en 小写]: { en, zh, emoji, count, firstAt, lastAt } }
 * 注意是**以英文小写为 key 的对象**，不是数组——按 key 天然去重。
 */

import type { WrongBook, WrongItem, Word, WrongPracticePlan } from '@/types'
import { WRONG_KEY, WRONG_QUIZ_SIZE } from './constants'
import { readRaw, writeRaw } from './storage'
import { guessEmoji, sample, shuffle } from './date'
import { getAllLearnedWords } from './db'

export function getWrongBook(): WrongBook {
  return readRaw<WrongBook>(WRONG_KEY, {})
}

export function saveWrongBook(book: WrongBook): boolean {
  return writeRaw(WRONG_KEY, book)
}

/** 把答错的单词加入错题本，返回本次新增词数（已存在的不算新增） */
export function addWrongWords(input: Partial<Word> | Partial<Word>[]): number {
  const list = Array.isArray(input) ? input : [input]
  const book = getWrongBook()
  const now = Date.now()
  let added = 0

  list.forEach((w) => {
    if (!w || !w.en) return
    const en = String(w.en).trim()
    if (!en) return
    const key = en.toLowerCase()
    if (book[key]) {
      book[key].count = (book[key].count || 1) + 1
      book[key].lastAt = now
      if (!book[key].zh && w.zh) book[key].zh = w.zh
      if (!book[key].emoji && w.emoji) book[key].emoji = w.emoji
    } else {
      book[key] = {
        en,
        zh: w.zh || '',
        emoji: w.emoji || guessEmoji(en),
        count: 1,
        firstAt: now,
        lastAt: now
      }
      added++
    }
  })

  writeRaw(WRONG_KEY, book)
  return added
}

/** 从错题本移除单词（重练答对后调用），返回实际移除数量 */
export function removeWrongWords(input: string | string[]): number {
  const list = (Array.isArray(input) ? input : [input])
    .filter((x) => x)
    .map((x) => String(x).trim().toLowerCase())
  if (!list.length) return 0

  const book = getWrongBook()
  let removed = 0
  list.forEach((key) => {
    if (book[key]) {
      delete book[key]
      removed++
    }
  })
  writeRaw(WRONG_KEY, book)
  return removed
}

export function clearWrongBook(): void {
  saveWrongBook({})
}

/** 错题列表（按最近出错时间倒序） */
export function getWrongList(): WrongItem[] {
  const book = getWrongBook()
  const list = Object.keys(book).map((k) => {
    const it = { ...book[k] }
    const d = new Date(it.lastAt || Date.now())
    it.lastText = d.getMonth() + 1 + '月' + d.getDate() + '日'
    return it
  })
  list.sort((a, b) => (b.lastAt || 0) - (a.lastAt || 0))
  return list
}

export function wrongCount(): number {
  return Object.keys(getWrongBook()).length
}

/**
 * 构造错题重练的词表
 * 优先用错题；不足 WRONG_QUIZ_SIZE 道时，用「已学单词」补齐（排除已在错题里的）
 */
export function buildWrongPracticeWords(): WrongPracticePlan {
  const wrongs = getWrongList()
  const wrongKeys = wrongs.map((w) => String(w.en).toLowerCase())

  const words: Word[] = wrongs.map((w, i) => ({
    id: 'wrong_' + (w.firstAt || i) + '_' + w.en,
    en: w.en,
    zh: w.zh,
    emoji: w.emoji,
    _count: w.count
  })) as Word[]
  let filled = 0

  if (words.length < WRONG_QUIZ_SIZE) {
    const learned = getAllLearnedWords().filter((w) => wrongKeys.indexOf(String(w.en).toLowerCase()) === -1)
    const need = WRONG_QUIZ_SIZE - words.length
    const extra = sample(learned, Math.min(need, learned.length))
    extra.forEach((w) => {
      words.push({ ...w, id: 'fill_' + w.en })
      filled++
    })
  }

  return {
    words: shuffle(words).slice(0, WRONG_QUIZ_SIZE),
    wrongWords: wrongs,
    filled
  }
}

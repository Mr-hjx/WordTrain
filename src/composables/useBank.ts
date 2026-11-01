/**
 * 题库状态
 */

import { computed } from 'vue'
import { singletonRef } from './singleton'
import type { Bank, Word } from '@/types'
import * as db from '@/utils/db'

const _bank = singletonRef<Bank>({})
const _version = singletonRef(0)

export function useBank() {
  /** 响应式题库 */
  const bank = _bank

  /** 按日期倒序分组（首页列表） */
  const groups = computed(() => {
    void _version.value
    return db.groupedByDate()
  })

  /** 所有有词条的日期 */
  const dates = computed(() => {
    void _version.value
    return db.allDates()
  })

  /** 总词数 */
  const totalWords = computed(() => {
    void _version.value
    return db.totalWordCount()
  })

  /**
   * 今日词表
   *
   * ⚠️ 今天没有录入内容时，**回退到最近一次有词的日期**。
   * 否则 todayWords=[] → buildQuestions 返回 [] → 练习页渲染「题目为空」空态。
   * 孩子的课程是每周二 / 周五，非上课日打开 App 必然会命中这个场景。
   * 用 `todayWordsFallback` 暴露是否发生了回退，供页面提示来源日期。
   */
  const todayWords = computed(() => {
    void _version.value
    const today = new Date()
    const key =
      today.getFullYear() +
      '-' +
      String(today.getMonth() + 1).padStart(2, '0') +
      '-' +
      String(today.getDate()).padStart(2, '0')
    const todays = _bank.value[key]
    if (todays && todays.length) return todays
    // 回退：取最近一次有词的日期
    const latest = db.latestDate()
    const fallback = _bank.value[latest]
    return fallback && fallback.length ? fallback : []
  })

  /** 今日词表是否来自「最近一次录入」的回退（true 时页面应提示来源） */
  const todayWordsFallback = computed(() => {
    void _version.value
    const today = new Date()
    const key =
      today.getFullYear() +
      '-' +
      String(today.getMonth() + 1).padStart(2, '0') +
      '-' +
      String(today.getDate()).padStart(2, '0')
    const todays = _bank.value[key]
    if (todays && todays.length) return false
    return todayWords.value.length > 0
  })

  /** 今日词表实际来源的日期键（无词时返回空串） */
  const todayWordsDate = computed(() => {
    void _version.value
    const today = new Date()
    const key =
      today.getFullYear() +
      '-' +
      String(today.getMonth() + 1).padStart(2, '0') +
      '-' +
      String(today.getDate()).padStart(2, '0')
    const todays = _bank.value[key]
    if (todays && todays.length) return key
    const latest = db.latestDate()
    return _bank.value[latest] && _bank.value[latest].length ? latest : ''
  })

  /** 全部已学单词（去重）—— 响应式，随 reload() 自动刷新 */
  const allLearnedWords = computed(() => {
    void _version.value
    return db.getAllLearnedWords()
  })

  /** 全部已学单词（去重）—— 非响应式版本，供一次性查询 */
  function allLearned(): Word[] {
    return db.getAllLearnedWords()
  }

  /** 从磁盘重读 */
  function reload() {
    _bank.value = db.getBankRaw()
    _version.value++
  }

  function touch() {
    reload()
  }

  function appendWords(dateStr: string, words: Partial<Word>[]): number {
    const n = db.appendWords(dateStr, words)
    reload()
    return n
  }

  function setWordsByDate(dateStr: string, words: Word[]): boolean {
    const ok = db.setWordsByDate(dateStr, words)
    reload()
    return ok
  }

  function removeWord(dateStr: string, id: string): void {
    db.removeWord(dateStr, id)
    reload()
  }

  function getWordsByDate(dateStr: string): Word[] {
    return db.getWordsByDate(dateStr)
  }

  return {
    bank,
    groups,
    dates,
    totalWords,
    todayWords,
    todayWordsFallback,
    todayWordsDate,
    allLearnedWords,
    allLearned,
    reload,
    touch,
    appendWords,
    setWordsByDate,
    removeWord,
    getWordsByDate
  }
}

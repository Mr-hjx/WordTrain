/**
 * 错题本状态
 */

import { computed } from 'vue'
import { singletonRef } from './singleton'
import type { WrongItem, Word, WrongPracticePlan } from '@/types'
import * as wb from '@/utils/wrongbook'

const _list = singletonRef<WrongItem[]>([])

export function useWrongBook() {
  const wrongList = _list

  const count = computed(() => _list.value.length)
  const isEmpty = computed(() => _list.value.length === 0)

  function reload() {
    _list.value = wb.getWrongList()
  }

  /** 加入错题，返回新增数量 */
  function add(input: Partial<Word> | Partial<Word>[]): number {
    const n = wb.addWrongWords(input)
    reload()
    return n
  }

  /** 移除错题（重练连续答对 1 次即移出） */
  function remove(input: string | string[]): number {
    const n = wb.removeWrongWords(input)
    reload()
    return n
  }

  function clear() {
    wb.clearWrongBook()
    reload()
  }

  /** 生成本轮重练词表（不足 5 道用已学单词补齐） */
  function buildPracticeWords(): WrongPracticePlan {
    return wb.buildWrongPracticeWords()
  }

  return { wrongList, count, isEmpty, reload, add, remove, clear, buildPracticeWords }
}

export { wb as wrongbookApi }

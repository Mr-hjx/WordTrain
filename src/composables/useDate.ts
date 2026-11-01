/**
 * 日期相关响应式状态
 */

import { computed } from 'vue'
import { singletonRef } from './singleton'
import { todayStr, friendlyDate, classDayInfo, isClassDay } from '@/utils/date'

/** 今天（YYYY-MM-DD）。跨天时由 refreshDate() 刷新 */
const _today = singletonRef(todayStr())

export function useDate() {
  const today = _today
  const todayFriendly = computed(() => friendlyDate(_today.value))
  const classInfo = computed(() => classDayInfo())
  const onClassDay = computed(() => isClassDay())

  function refreshDate() {
    _today.value = todayStr()
  }

  return { today, todayFriendly, classInfo, onClassDay, refreshDate }
}

export { todayStr, friendlyDate, classDayInfo, isClassDay }

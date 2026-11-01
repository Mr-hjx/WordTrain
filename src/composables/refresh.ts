/**
 * 全局刷新：把磁盘里的真实数据同步回所有模块级 ref。
 * App.onShow 与各页面 onShow 都可调用，保证多端/HMR 后内存与磁盘不漂移。
 */

import { useDate } from './useDate'
import { useBank } from './useBank'
import { useGems } from './useGems'
import { useMedals } from './useMedals'
import { useWrongBook } from './useWrongBook'
import { useRecords } from './useRecords'
import { useExam } from './useExam'

export function refreshAll(): void {
  useDate().refreshDate()
  useBank().reload()
  useGems().reload()
  useMedals().reload()
  useWrongBook().reload()
  useRecords().reload()
  useExam().reload()
}

/**
 * 学习记录 + 设置（纯数据层）
 */

import type { LearnRecord, Setting } from '@/types'
import { RECORD_KEY, SETTING_KEY, DEFAULT_SETTING } from './constants'
import { readRaw, writeRaw } from './storage'

export function getRecords(): LearnRecord[] {
  return readRaw<LearnRecord[]>(RECORD_KEY, [])
}

export function addRecord(rec: LearnRecord): void {
  const list = getRecords()
  list.unshift(rec)
  if (list.length > 200) list.length = 200
  writeRaw(RECORD_KEY, list)
}

/** 记录列表（带友好时间） */
export function getRecordList(limit?: number): LearnRecord[] {
  return getRecords()
    .slice(0, limit || 20)
    .map((it) => {
      const dt = new Date(it.at)
      return {
        ...it,
        timeText:
          dt.getMonth() + 1 + '月' + dt.getDate() + '日 ' +
          (dt.getHours() < 10 ? '0' : '') + dt.getHours() + ':' +
          (dt.getMinutes() < 10 ? '0' : '') + dt.getMinutes()
      }
    })
}

export function getSetting(): Setting {
  const s = readRaw<Partial<Setting>>(SETTING_KEY, {})
  return Object.assign({}, DEFAULT_SETTING, s)
}

export function setSetting(obj: Partial<Setting>): Setting {
  const s = Object.assign(getSetting(), obj)
  writeRaw(SETTING_KEY, s)
  return s
}

/** 连续练习天数（按录入/练习记录里的日期去重，从今天往前数） */
export function streakDays(): number {
  const dates = Array.from(new Set(getRecords().map((r) => r.date))).sort().reverse()
  if (!dates.length) return 0
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  let streak = 0
  const cursor = new Date(today)
  for (let i = 0; i < dates.length; i++) {
    const d = new Date(String(dates[i]).replace(/-/g, '/'))
    d.setHours(0, 0, 0, 0)
    const diff = Math.round((cursor.getTime() - d.getTime()) / 86400000)
    if (diff === 0 || diff === 1) {
      streak++
      cursor.setTime(d.getTime())
    } else {
      break
    }
  }
  return streak
}

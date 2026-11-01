/**
 * 学习记录 + 设置状态
 */

import { computed } from 'vue'
import { singletonRef } from './singleton'
import type { LearnRecord, Setting, SessionMode } from '@/types'
import * as rec from '@/utils/records'

const _records = singletonRef<LearnRecord[]>([])
const _setting = singletonRef<Setting>({ voice: true, sound: true, questionCount: 10 })

export function useRecords() {
  const records = _records
  const setting = _setting

  const streak = computed(() => {
    void _records.value
    return rec.streakDays()
  })

  const todayCount = computed(() => {
    const today = new Date()
    const key =
      today.getFullYear() +
      '-' +
      String(today.getMonth() + 1).padStart(2, '0') +
      '-' +
      String(today.getDate()).padStart(2, '0')
    return _records.value.filter((r) => r.date === key).length
  })

  function reload() {
    _records.value = rec.getRecordList(50)
    _setting.value = rec.getSetting()
  }

  function add(input: {
    date: string
    mode: SessionMode
    total: number
    correct: number
    rate: number
    gems: number
  }) {
    rec.addRecord({ ...input, at: Date.now() })
    reload()
  }

  function updateSetting(obj: Partial<Setting>) {
    rec.setSetting(obj)
    reload()
  }

  function toggleVoice() {
    updateSetting({ voice: !_setting.value.voice })
  }

  return { records, setting, streak, todayCount, reload, add, updateSetting, toggleVoice }
}

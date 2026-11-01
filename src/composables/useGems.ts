/**
 * 宝石状态
 */

import { computed } from 'vue'
import { singletonRef } from './singleton'
import type { GemResult } from '@/types'
import * as gems from '@/utils/gems'

const _gems = singletonRef(0)
const _lastResult = singletonRef<GemResult | null>(null)

export function useGems() {
  const gemCount = _gems

  /** 本堂课进度（距下一枚小奖牌） */
  const progress = computed(() => {
    const gems = _gems.value
    const into = gems % 10
    return {
      gems,
      intoClass: into,
      need: 10,
      left: 10 - into,
      percent: Math.round((into / 10) * 100)
    }
  })

  const lastResult = _lastResult

  function reload() {
    _gems.value = gems.getGems()
  }

  /** 加宝石并返回结算明细（含新点亮的奖牌） */
  function add(n: number): GemResult {
    const res = gems.addGems(n)
    _gems.value = res.after
    _lastResult.value = res
    return res
  }

  function reset() {
    gems.resetGemsAndMedals()
    reload()
  }

  return { gemCount, progress, lastResult, reload, add, reset }
}

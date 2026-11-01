/**
 * 奖牌墙状态
 */

import { computed } from 'vue'
import { singletonRef } from './singleton'
import type { Medal } from '@/types'
import * as gemsUtil from '@/utils/gems'

const _small = singletonRef<Medal[]>([])
const _big = singletonRef<Medal[]>([])
/** 最近一次新点亮的奖牌（用于弹出庆祝框） */
const _pending = singletonRef<{ small: Medal[]; big: Medal[] }>({ small: [], big: [] })

export function useMedals() {
  const smallMedals = _small
  const bigMedals = _big
  const pendingNew = _pending

  const stats = computed(() => ({
    smallGot: _small.value.filter((m) => m.unlocked).length,
    smallTotal: _small.value.length,
    bigGot: _big.value.filter((m) => m.unlocked).length,
    bigTotal: _big.value.length
  }))

  function reload() {
    const wall = gemsUtil.getMedalWall()
    _small.value = wall.small
    _big.value = wall.big
  }

  /** 由宝石结算结果驱动的刷新：同时记录本次新点亮的奖牌 */
  function applyNew(res: { newSmall: Medal[]; newBig: Medal[] } | null | undefined) {
    reload()
    _pending.value = {
      small: (res && res.newSmall) || [],
      big: (res && res.newBig) || []
    }
  }

  function clearPending() {
    _pending.value = { small: [], big: [] }
  }

  return { smallMedals, bigMedals, stats, pendingNew, reload, applyNew, clearPending }
}

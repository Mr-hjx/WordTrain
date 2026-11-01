/**
 * 宝石 + 奖牌结算（纯数据层）
 *
 * 规则：
 *  - 每答对 1 题得 2 颗宝石
 *  - 每 10 颗宝石点亮 1 枚小奖牌（20 格）
 *  - 每 20 颗宝石点亮 1 枚大奖牌（10 格），即 2 小换 1 大
 *  - 幂等：settleMedals 不会重复点亮已点亮的奖牌
 */

import type { GemResult, Medal, MedalWall, MedalStats, ClassProgress } from '@/types'
import {
  GEM_KEY,
  MEDAL_KEY,
  GEMS_PER_SMALL_MEDAL,
  GEMS_PER_BIG_MEDAL,
  SMALL_PER_BIG,
  SMALL_SLOTS,
  BIG_SLOTS,
  SMALL_MEDAL_POOL,
  BIG_MEDAL_POOL
} from './constants'
import { readRaw, writeRaw } from './storage'
import { friendlyDate, todayStr } from './date'

interface MedalMap {
  small: Record<number, number>
  big: Record<number, number>
}

export function getGems(): number {
  return Number(readRaw<unknown>(GEM_KEY, 0)) || 0
}

export function setGems(n: number): void {
  writeRaw(GEM_KEY, Math.max(0, n))
}

export function getMedalMap(): MedalMap {
  const v = readRaw<MedalMap | null>(MEDAL_KEY, null)
  if (v && v.small) return v
  return { small: {}, big: {} }
}

function saveMedalMap(map: MedalMap): void {
  writeRaw(MEDAL_KEY, map)
}

function buildSmall(i: number): Medal {
  const p = SMALL_MEDAL_POOL[i % SMALL_MEDAL_POOL.length]
  return {
    index: i,
    id: 's' + i,
    type: 'small',
    name: p.name,
    emoji: p.emoji,
    color: p.color,
    need: (i + 1) * GEMS_PER_SMALL_MEDAL,
    desc: '攒到 ' + (i + 1) * GEMS_PER_SMALL_MEDAL + ' 颗宝石（完成 ' + (i + 1) + ' 堂课）'
  }
}

function buildBig(i: number): Medal {
  const p = BIG_MEDAL_POOL[i % BIG_MEDAL_POOL.length]
  return {
    index: i,
    id: 'b' + i,
    type: 'big',
    name: p.name,
    emoji: p.emoji,
    color: p.color,
    need: (i + 1) * GEMS_PER_BIG_MEDAL,
    desc:
      '攒到 ' + (i + 1) * GEMS_PER_BIG_MEDAL + ' 颗宝石（集满 ' + (i + 1) * SMALL_PER_BIG + ' 枚小奖牌）'
  }
}

/** 按当前宝石总数结算奖牌点亮情况（幂等） */
export function settleMedals(gems: number): { newSmall: Medal[]; newBig: Medal[] } {
  const map = getMedalMap()
  const newSmall: Medal[] = []
  const newBig: Medal[] = []

  const smallShould = Math.floor(gems / GEMS_PER_SMALL_MEDAL)
  for (let i = 0; i < Math.min(smallShould, SMALL_SLOTS); i++) {
    if (!map.small[i]) {
      map.small[i] = Date.now()
      newSmall.push(buildSmall(i))
    }
  }

  const bigShould = Math.floor(gems / GEMS_PER_BIG_MEDAL)
  for (let i = 0; i < Math.min(bigShould, BIG_SLOTS); i++) {
    if (!map.big[i]) {
      map.big[i] = Date.now()
      newBig.push(buildBig(i))
    }
  }

  if (newSmall.length || newBig.length) saveMedalMap(map)
  return { newSmall, newBig }
}

/** 累加宝石，并结算新点亮的奖牌 */
export function addGems(n: number): GemResult {
  const before = getGems()
  const after = Math.max(0, before + (n || 0))
  writeRaw(GEM_KEY, after)
  return Object.assign({ before, after, gained: after - before }, settleMedals(after))
}

/** 奖牌墙数据 */
export function getMedalWall(): MedalWall {
  const map = getMedalMap()
  const gems = getGems()

  const small: Medal[] = []
  for (let i = 0; i < SMALL_SLOTS; i++) {
    const m = buildSmall(i)
    const ts = map.small[i]
    m.unlocked = !!ts
    m.time = ts || 0
    m.timeText = ts ? friendlyDate(todayStr(new Date(ts))) : ''
    m.progress = m.unlocked
      ? 100
      : Math.min(100, Math.round(((gems % GEMS_PER_SMALL_MEDAL) / GEMS_PER_SMALL_MEDAL) * 100))
    small.push(m)
  }

  const big: Medal[] = []
  for (let i = 0; i < BIG_SLOTS; i++) {
    const m = buildBig(i)
    const ts = map.big[i]
    m.unlocked = !!ts
    m.time = ts || 0
    m.timeText = ts ? friendlyDate(todayStr(new Date(ts))) : ''
    m.progress = m.unlocked
      ? 100
      : Math.min(100, Math.round(((gems % GEMS_PER_BIG_MEDAL) / GEMS_PER_BIG_MEDAL) * 100))
    big.push(m)
  }

  return { small, big }
}

export function medalStats(): MedalStats {
  const wall = getMedalWall()
  return {
    smallGot: wall.small.filter((m) => m.unlocked).length,
    smallTotal: SMALL_SLOTS,
    bigGot: wall.big.filter((m) => m.unlocked).length,
    bigTotal: BIG_SLOTS
  }
}

/** 当前课堂进度：距离下一枚小奖牌还差几颗宝石 */
export function classProgress(): ClassProgress {
  const gems = getGems()
  const intoClass = gems % GEMS_PER_SMALL_MEDAL
  return {
    gems,
    intoClass,
    need: GEMS_PER_SMALL_MEDAL,
    left: GEMS_PER_SMALL_MEDAL - intoClass,
    percent: Math.round((intoClass / GEMS_PER_SMALL_MEDAL) * 100)
  }
}

/** 重置全部宝石与奖牌（调试/家长清档用） */
export function resetGemsAndMedals(): void {
  setGems(0)
  saveMedalMap({ small: {}, big: {} })
}

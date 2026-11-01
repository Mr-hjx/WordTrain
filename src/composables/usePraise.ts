/**
 * 布鲁伊点赞弹窗
 *
 * 规则：
 * - 5 张图随机轮换，**不连续重复**（避免同一次练习里连着两张一样）
 * - **图片加载完成后再弹出**，避免出现「先看到空框、图片才慢慢出来」的闪烁
 * - 从图片显示那一刻起计时，停留 duration（默认 2000ms）后自动关闭
 */

import { ref } from 'vue'
import { PRAISE_IMAGES } from '@/utils/constants'

const visible = ref(false)
const currentImg = ref(0)
const lastImg = ref(-1)
/** 连击数（用于文案升级） */
const combo = ref(0)

const PRAISES = [
  '太棒啦！',
  '答对咯～',
  '你真厉害！',
  '好样的！',
  '继续加油！',
  '这个也会啦！',
  '布鲁伊给你点赞 👍',
  '超级棒！'
]

const praiseText = ref(PRAISES[0])

/** 随机取一张与上次不同的图 */
function pickImage(): number {
  if (PRAISE_IMAGES.length <= 1) return 0
  let idx = lastImg.value
  let guard = 0
  while (idx === lastImg.value && guard < 20) {
    idx = Math.floor(Math.random() * PRAISE_IMAGES.length)
    guard++
  }
  lastImg.value = idx
  return idx
}

/* ---------------- 图片预加载 ---------------- */
/** 已确认加载完成的图片下标 */
const loadedSet = new Set<number>()
/** 正在加载中的 Promise 缓存，避免同时重复预加载同一张 */
const loadingMap = new Map<number, Promise<void>>()

/**
 * 预加载指定图片，返回 Promise。
 * 平台不支持 Image 构造器（极少数小程序环境）时直接 resolve，降级为「立即弹出」。
 */
function preload(index: number): Promise<void> {
  if (loadedSet.has(index)) return Promise.resolve()

  const cached = loadingMap.get(index)
  if (cached) return cached

  const src = PRAISE_IMAGES[index]
  const p = new Promise<void>((resolve) => {
    // #ifdef H5
    const img = new Image()
    img.onload = () => {
      loadedSet.add(index)
      loadingMap.delete(index)
      resolve()
    }
    img.onerror = () => {
      // 加载失败不阻塞弹窗，直接放行（避免整块卡住）
      loadingMap.delete(index)
      resolve()
    }
    img.src = src
    // #endif

    // #ifndef H5
    uni.getImageInfo({
      src,
      success: () => {
        loadedSet.add(index)
        loadingMap.delete(index)
        resolve()
      },
      fail: () => {
        loadingMap.delete(index)
        resolve()
      }
    })
    // #endif
  })

  loadingMap.set(index, p)
  return p
}

let hideTimer: ReturnType<typeof setTimeout> | null = null
/** 递增令牌：丢弃过期的异步弹出（连点/快速答对时只保留最后一次） */
let showToken = 0

export function usePraise() {
  /**
   * 显示点赞弹窗
   * @param comboCount 连击数
   * @param duration 图片显示后的停留时长（默认 2000ms）
   */
  function show(comboCount?: number, duration = 2000) {
    if (typeof comboCount === 'number') combo.value = comboCount

    const idx = pickImage()
    currentImg.value = idx
    praiseText.value = PRAISES[Math.floor(Math.random() * PRAISES.length)]

    // 立刻清掉上一次的计时任务，防止旧 timer 提前把新弹窗关掉
    if (hideTimer) {
      clearTimeout(hideTimer)
      hideTimer = null
    }

    const token = ++showToken

    // 关键：等图片就绪后再显示，计时也从此刻开始
    preload(idx).then(() => {
      if (token !== showToken) return // 已被更新的调用取代
      visible.value = true
      hideTimer = setTimeout(() => {
        visible.value = false
        hideTimer = null
      }, duration)
    })
  }

  function hide() {
    showToken++ // 作废尚未弹出的异步任务
    visible.value = false
    if (hideTimer) {
      clearTimeout(hideTimer)
      hideTimer = null
    }
  }

  /** 应用启动时预热全部图片（统一走预加载，避免重复下载） */
  function warmup() {
    PRAISE_IMAGES.forEach((_, i) => {
      preload(i)
    })
  }

  return { visible, currentImg, praiseText, combo, show, hide, warmup, images: PRAISE_IMAGES }
}

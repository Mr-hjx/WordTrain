/**
 * 语音朗读
 *
 * 平台差异用条件编译处理：
 *  - 微信小程序：官方「同声传译」插件 WechatSI.textToSpeech → InnerAudioContext 播放
 *  - H5：三级降级
 *      1) 浏览器原生 speechSynthesis —— 但必须先校验 getVoices() 非空，
 *         否则 Linux/精简 Windows/国内 Chrome 会「API 存在但发不出声」(synthesis-failed)
 *      2) 在线 TTS 音频池 —— 有道 dictvoice，直接播 mp3，覆盖无语音包环境
 *      3) 全部失败 → 给出准确原因
 *  - 其它端：降级为提示
 */

import { ref } from 'vue'
import { SPEECH_RATE } from '@/utils/constants'

const speaking = ref(false)

/* ---------------- 微信小程序 ---------------- */

// #ifdef MP-WEIXIN
let audioCtx: any = null

function mpSpeak(text: string, lang: string): boolean {
  let plugin: any = null
  try {
    // eslint-disable-next-line no-undef
    plugin = requirePlugin('WechatSI')
  } catch {
    plugin = null
  }
  if (!plugin || !plugin.textToSpeech) {
    uni.showToast({ title: '语音插件未配置', icon: 'none' })
    return false
  }

  speaking.value = true
  plugin.textToSpeech({
    lang: lang || 'en_US',
    tts: true,
    content: text,
    success(res: { filename: string }) {
      if (audioCtx) {
        audioCtx.destroy()
        audioCtx = null
      }
      audioCtx = uni.createInnerAudioContext()
      audioCtx.src = res.filename
      audioCtx.play()
      audioCtx.onEnded(() => {
        speaking.value = false
        if (audioCtx) {
          audioCtx.destroy()
          audioCtx = null
        }
      })
      audioCtx.onError(() => {
        speaking.value = false
        uni.showToast({ title: '播放失败', icon: 'none' })
      })
    },
    fail() {
      speaking.value = false
      uni.showToast({ title: '语音合成失败', icon: 'none' })
    }
  })
  return true
}
// #endif

/* ---------------- H5 ---------------- */

// #ifdef H5

/** 在线 TTS 音频地址池（按顺序尝试） */
function onlineTtsUrls(text: string, lang: string): string[] {
  const q = encodeURIComponent(text)
  const isEn = !lang || lang.toLowerCase().startsWith('en')
  const urls: string[] = []
  if (isEn) {
    // 有道词典发音：type=2 美音 / type=1 英音
    urls.push(`https://dict.youdao.com/dictvoice?audio=${q}&type=2`)
    urls.push(`https://dict.youdao.com/dictvoice?audio=${q}&type=1`)
  } else {
    urls.push(`https://dict.youdao.com/dictvoice?audio=${q}&le=zh`)
  }
  return urls
}

/** 已探测过原生能力的标记：null = 未探测 */
let nativeOk: boolean | null = null
let nativeProbeTimer: number | null = null

/**
 * 真实探测原生 speechSynthesis 是否可用。
 * 关键：Chromium 系下 getVoices() 首次调用常为空（异步加载），
 * 所以用 voiceschanged 事件 + 超时轮询双重判定。
 */
function probeNativeVoices(cb: (ok: boolean) => void) {
  const synth = (window as any).speechSynthesis
  if (!synth) {
    nativeOk = false
    cb(false)
    return
  }

  const finish = (ok: boolean) => {
    if (nativeProbeTimer !== null) {
      clearTimeout(nativeProbeTimer)
      nativeProbeTimer = null
    }
    synth.onvoiceschanged = null
    nativeOk = ok
    cb(ok)
  }

  const check = () => {
    try {
      if (synth.getVoices().length > 0) {
        finish(true)
        return true
      }
    } catch {
      /* ignore */
    }
    return false
  }

  if (check()) return

  // 等待 voiceschanged（Chromium 异步注入语音包）
  try {
    synth.onvoiceschanged = () => {
      if (check()) finish(true)
    }
  } catch {
    /* ignore */
  }

  // 兜底：最多等 600ms，仍为空则判定不可用
  nativeProbeTimer = setTimeout(() => {
    if (check()) finish(true)
    else finish(false)
  }, 600) as unknown as number
}

/** 原生朗读 */
function nativeSpeak(text: string, lang: string): boolean {
  const synth = (window as any).speechSynthesis
  if (!synth) return false
  try {
    synth.cancel()
    const u = new (window as any).SpeechSynthesisUtterance(text)
    u.lang = (lang || 'en_US').replace('_', '-')
    u.rate = SPEECH_RATE
    u.pitch = 1.05
    let started = false
    u.onstart = () => {
      started = true
      speaking.value = true
    }
    u.onend = () => {
      speaking.value = false
    }
    u.onerror = () => {
      speaking.value = false
      // 原生失败 → 记住它不可用，下次直接走在线
      if (!started) nativeOk = false
    }
    synth.speak(u)
    return true
  } catch {
    return false
  }
}

/** 在线 TTS 音频播放 */
let onlineAudio: HTMLAudioElement | null = null
/** 音频缓存：同一文本不重复请求 */
const audioCache = new Map<string, string>()

function onlineSpeak(text: string, lang: string): boolean {
  const urls = onlineTtsUrls(text, lang)
  if (!urls.length) return false

  const cacheKey = urls[0]
  const cached = audioCache.get(cacheKey)

  const play = (src: string, tryIdx: number) => {
    try {
      if (onlineAudio) {
        onlineAudio.pause()
        onlineAudio = null
      }
      const a = new Audio()
      a.preload = 'auto'
      // 注意：不能设 crossOrigin='anonymous'！
      // 有道 dictvoice 不返回 CORS 头，设了会导致音频加载失败（ERR_FAILED）。
      // 纯播放场景不需要读取音频数据，无需 CORS。
      a.src = src
      onlineAudio = a

      a.onplay = () => {
        speaking.value = true
      }
      a.onended = () => {
        speaking.value = false
      }
      a.onerror = () => {
        speaking.value = false
        if (tryIdx + 1 < urls.length) {
          play(urls[tryIdx + 1], tryIdx + 1)
        } else {
          uni.showToast({ title: '朗读播放失败，请检查网络', icon: 'none' })
        }
      }

      const p = a.play()
      if (p && typeof p.catch === 'function') {
        p.catch(() => {
          // 自动播放被拦截，交给上层手势触发（调用方本就是点击）
          speaking.value = false
        })
      }
      // 播放成功则缓存（此处仅记录 URL，浏览器自身会缓存请求）
      audioCache.set(cacheKey, src)
      return true
    } catch {
      return false
    }
  }

  return play(cached || urls[0], 0)
}

function h5Speak(text: string, lang: string): boolean {
  if (typeof window === 'undefined') {
    uni.showToast({ title: '当前环境不支持朗读', icon: 'none' })
    return false
  }

  // 已确知原生不可用 → 直接在线
  if (nativeOk === false) {
    return onlineSpeak(text, lang)
  }

  // 已确知原生可用 → 直接原生
  if (nativeOk === true) {
    return nativeSpeak(text, lang)
  }

  // 首次：先探测，需等待时先播在线音频（保证即时出声），并异步修正标记
  const hasSynth = !!(window as any).speechSynthesis
  if (!hasSynth) {
    nativeOk = false
    return onlineSpeak(text, lang)
  }

  // 快速路径：同步拿到语音包 → 直接用原生
  try {
    const synth = (window as any).speechSynthesis
    if (synth.getVoices && synth.getVoices().length > 0) {
      nativeOk = true
      return nativeSpeak(text, lang)
    }
  } catch {
    /* ignore */
  }

  // 语音包为空：启动探测（用于后续调用），本次先走在线音频保证立即有声
  probeNativeVoices(() => {
    /* 结果仅用于下次调用；本次已由在线音频兜底 */
  })
  return onlineSpeak(text, lang)
}
// #endif

/* ---------------- 统一入口 ---------------- */

export function speak(text: string, lang = 'en_US'): boolean {
  if (!text) return false

  // #ifdef MP-WEIXIN
  return mpSpeak(text, lang)
  // #endif

  // #ifdef H5
  return h5Speak(text, lang)
  // #endif

  // #ifndef MP-WEIXIN || H5
  uni.showToast({ title: '当前端暂不支持朗读', icon: 'none' })
  return false
  // #endif
}

/** 当前平台是否有可用 TTS 引擎（H5 下只要在线 TTS 可达即视为可用） */
export function hasTTSEngine(): boolean {
  // #ifdef MP-WEIXIN
  try {
    // eslint-disable-next-line no-undef
    const plugin = requirePlugin('WechatSI')
    return !!(plugin && plugin.textToSpeech)
  } catch {
    return false
  }
  // #endif

  // #ifdef H5
  // 在线 TTS 兜底始终可用（除非断网），所以只要在浏览器里就返回 true
  return typeof window !== 'undefined' && typeof (window as any).Audio !== 'undefined'
  // #endif

  // #ifndef MP-WEIXIN || H5
  return false
  // #endif
}

export function useSpeech() {
  return { speaking, speak, hasTTSEngine }
}

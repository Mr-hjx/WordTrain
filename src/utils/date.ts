/**
 * 纯函数工具：日期、数组、emoji、鼓励语
 * 与原工程 utils/util.js 保持完全一致的输出。
 */

const pad2 = (n: number): string => (n < 10 ? '0' + n : '' + n)

/** 返回 YYYY-MM-DD */
export function todayStr(d?: number | string | Date): string {
  const date = d !== undefined && d !== null ? new Date(d) : new Date()
  return date.getFullYear() + '-' + pad2(date.getMonth() + 1) + '-' + pad2(date.getDate())
}

/** 返回 M月D日 星期X */
export function friendlyDate(dateStr: string): string {
  const d = new Date(String(dateStr).replace(/-/g, '/'))
  const week = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][d.getDay()]
  return d.getMonth() + 1 + '月' + d.getDate() + '日 ' + week
}

export function isToday(dateStr: string): boolean {
  return dateStr === todayStr()
}

/** 上课日：周二 = 2，周五 = 5 */
export function isClassDay(d?: string | Date): boolean {
  const day = (d ? new Date(d) : new Date()).getDay()
  return day === 2 || day === 5
}

/** 距离下一个上课日还有几天（返回数字，保持原语义） */
export function daysToNextClass(): number {
  const day = new Date().getDay()
  const targets = [2, 5]
  for (let i = 0; i <= 7; i++) {
    const d = (day + i) % 7
    if (targets.indexOf(d) > -1) return i
  }
  return 0
}

/** 上课日贴心文案（把 daysToNextClass 的数字包成结构化信息） */
export function classDayInfo(): { isClassDay: boolean; days: number; text: string } {
  const on = isClassDay()
  if (on) return { isClassDay: true, days: 0, text: '今天是上课日，快练一练吧！' }
  const days = daysToNextClass()
  if (days === 0) return { isClassDay: false, days: 0, text: '今天就是上课日哦～' }
  if (days === 1) return { isClassDay: false, days: 1, text: '明天就是上课日啦' }
  return { isClassDay: false, days, text: '距离下次上课还有 ' + days + ' 天' }
}

/* ---------------- 数组 ---------------- */

export function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const t = a[i]
    a[i] = a[j]
    a[j] = t
  }
  return a
}

export function sample<T>(arr: T[], n: number): T[] {
  return shuffle(arr).slice(0, n)
}

/* ---------------- emoji 猜测 ---------------- */

const EMOJI_MAP: Record<string, string> = {
  apple: '🍎', banana: '🍌', orange: '🍊', grape: '🍇', pear: '🍐',
  cat: '🐱', dog: '🐶', pig: '🐷', duck: '🦆', bird: '🐦',
  fish: '🐟', rabbit: '🐰', bear: '🐻', monkey: '🐵', tiger: '🐯',
  lion: '🦁', elephant: '🐘', panda: '🐼', cow: '🐮', horse: '🐴',
  sheep: '🐑', frog: '🐸', bee: '🐝', butterfly: '🦋', mouse: '🐭',
  zebra: '🦓', giraffe: '🦒', penguin: '🐧', chicken: '🐔', snake: '🐍',
  sun: '☀️', moon: '🌙', star: '⭐', cloud: '☁️', rain: '🌧️',
  snow: '❄️', tree: '🌳', flower: '🌸', grass: '🌿', leaf: '🍃',
  car: '🚗', bus: '🚌', bike: '🚲', train: '🚂', plane: '✈️',
  boat: '⛵', ship: '🚢', rocket: '🚀', ball: '⚽', book: '📖',
  pen: '🖊️', pencil: '✏️', ruler: '📏', bag: '🎒', cup: '🥤',
  milk: '🥛', bread: '🍞', cake: '🍰', egg: '🥚', rice: '🍚',
  water: '💧', candy: '🍬', ice: '🧊', hat: '🎩', shoe: '👟',
  shirt: '👕', sock: '🧦', hand: '✋', eye: '👁️', ear: '👂',
  nose: '👃', mouth: '👄', foot: '🦶', hair: '💇', face: '😊',
  red: '🔴', blue: '🔵', green: '🟢', yellow: '🟡', black: '⚫',
  white: '⚪', pink: '🩷', one: '1️⃣', two: '2️⃣', three: '3️⃣',
  four: '4️⃣', five: '5️⃣', six: '6️⃣', seven: '7️⃣', eight: '8️⃣',
  nine: '9️⃣', ten: '🔟', mom: '👩', dad: '👨', baby: '👶',
  boy: '👦', girl: '👧', happy: '😄', sad: '😢', big: '🐘',
  small: '🐜', hot: '🔥', cold: '🧊',
  'ice cream': '🍦', birthday: '🎂', balloon: '🎈', gift: '🎁',
  house: '🏠', school: '🏫', park: '🏞️', zoo: '🦓', clock: '🕐',
  door: '🚪', window: '🪟', chair: '🪑', table: '🪑', bed: '🛏️',
  phone: '📱', computer: '💻', music: '🎵', song: '🎶', toy: '🧸'
}

const EMOJI_POOL = [
  '🌈', '⭐', '🎈', '🍭', '🎨', '🧩', '🎪', '🍀',
  '🦄', '🐳', '🌻', '🍩', '🎁', '🎯', '🪁', '🧁'
]

export function guessEmoji(en: string): string {
  const key = (en || '').trim().toLowerCase()
  if (EMOJI_MAP[key]) return EMOJI_MAP[key]
  if (key.endsWith('s') && EMOJI_MAP[key.slice(0, -1)]) return EMOJI_MAP[key.slice(0, -1)]
  if (key.endsWith('es') && EMOJI_MAP[key.slice(0, -2)]) return EMOJI_MAP[key.slice(0, -2)]
  let sum = 0
  for (let i = 0; i < key.length; i++) sum += key.charCodeAt(i)
  return EMOJI_POOL[sum % EMOJI_POOL.length]
}

/* ---------------- 鼓励语 ---------------- */

export function praise(rate: number): { text: string; emoji: string; stars: number } {
  if (rate >= 1) return { text: '太厉害啦！全部答对！', emoji: '🏆', stars: 3 }
  if (rate >= 0.8) return { text: '真棒！快要全对了！', emoji: '🌟', stars: 3 }
  if (rate >= 0.6) return { text: '做得不错，再接再厉！', emoji: '😃', stars: 2 }
  if (rate >= 0.4) return { text: '有进步，我们再来一次！', emoji: '💪', stars: 1 }
  return { text: '没关系，多练几遍就记住啦！', emoji: '🌱', stars: 1 }
}

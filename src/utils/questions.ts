/**
 * 题型生成引擎（纯函数，不依赖存储）
 *
 * 关键规则（不可改动，否则会回归历史 bug）：
 * 1. 连线题（match）一次消耗 4 个词、只产出 1 道题。按题型均分时
 *    必须先算出「连线题占几道」，再从剩余名额分给单选类题型，
 *    否则 ceil(count/4) 这种粗暴均分会永远凑不满 count（10 题只出 9 题）。
 * 2. zh2en / listen 的 options 是**纯字符串数组**，不是对象数组。
 * 3. makeSpell 返回 tiles 里含 2 个干扰字母，tiles 长度 = 答案长度 + 2。
 */

import type { Word, Question, ChoiceQuestion, SpellQuestion, MatchQuestion } from '@/types'
import { shuffle, sample } from './date'

const LETTER_POOL = 'abcdefghijklmnopqrstuvwxyz'.split('')

/** 该单词是否适合做拼写题：纯字母、长度 3-12 */
export function spellable(en: string): boolean {
  return /^[a-zA-Z]{3,12}$/.test((en || '').trim())
}

/** 便于直接用 uni-app 内置的随机 id（不依赖存储层） */
function uid(prefix: string): string {
  return prefix + Date.now() + '_' + Math.floor(Math.random() * 100000)
}

/** 看中文选英文 */
export function makeZh2En(word: Word, all: Word[]): ChoiceQuestion | null {
  if (!word.zh) return null
  const distractors = sample(
    all.filter((w) => w.en.toLowerCase() !== word.en.toLowerCase()),
    3
  ).map((w) => w.en)
  const opts = shuffle([word.en].concat(distractors))
  return {
    type: 'zh2en',
    id: 'q_' + word.id + '_zh2en',
    wordId: word.id,
    word,
    prompt: word.zh,
    options: opts,
    answer: word.en,
    emoji: word.emoji
  }
}

/** 听音选词 */
export function makeListen(word: Word, all: Word[]): ChoiceQuestion {
  const distractors = sample(
    all.filter((w) => w.en.toLowerCase() !== word.en.toLowerCase()),
    3
  ).map((w) => w.en)
  const opts = shuffle([word.en].concat(distractors))
  return {
    type: 'listen',
    id: 'q_' + word.id + '_listen',
    wordId: word.id,
    word,
    prompt: '听一听，选出正确的单词',
    audio: word.en,
    options: opts,
    answer: word.en,
    emoji: word.emoji
  }
}

/** 字母拼单词 */
export function makeSpell(word: Word): SpellQuestion | null {
  const en = (word.en || '').trim()
  if (!spellable(en)) return null
  const letters = en.toLowerCase().split('')
  const extras = sample(
    LETTER_POOL.filter((c) => letters.indexOf(c) === -1),
    2
  )
  const tiles = shuffle(
    letters.map((c, i) => ({ ch: c, key: 't' + i })).concat(extras.map((c, i) => ({ ch: c, key: 'x' + i })))
  )
  return {
    type: 'spell',
    id: 'q_' + word.id + '_spell',
    wordId: word.id,
    word,
    prompt: '把字母排排队，拼出这个单词',
    hint: word.zh,
    emoji: word.emoji,
    letters,
    tiles,
    answer: en.toLowerCase()
  }
}

/** 连线题（单组，一次性生成整组） */
export function makeMatchGroup(words: Word[]): MatchQuestion | null {
  const list = words.slice(0, 4)
  if (list.length < 2) return null
  const left = shuffle(list.map((w) => ({ id: w.id, text: w.en, emoji: w.emoji })))
  const right = shuffle(list.map((w) => ({ id: w.id, text: w.zh || w.en, emoji: w.emoji })))
  return {
    type: 'match',
    id: uid('q_match_'),
    isGroup: true,
    prompt: '把单词和它的意思连起来',
    left,
    right,
    pairs: list.map((w) => ({ id: w.id, en: w.en, zh: w.zh })),
    word: list[0],
    answer: list.map((w) => w.en).join(',')
  }
}

export interface BuildOpts {
  count?: number
  types?: Question['type'][]
}

/**
 * 把题目按「相邻不同型」的要求交错排列，并尽量让各类型数量均衡。
 *
 * 为什么要这么做：原先「生成 pool → 直接 shuffle → 取前 N」的写法，
 * 实测连续 2 道同类型约占 50%，家长会看到「连着好几道都是连线题」。
 * 这里改成贪心交错：每轮从「剩余最多、且与上一题不同型」的类型里取一道。
 */
function interleaveByType(pool: Question[], count: number): Question[] {
  // 按类型分桶
  const buckets = new Map<string, Question[]>()
  pool.forEach((q) => {
    const arr = buckets.get(q.type) || []
    arr.push(q)
    buckets.set(q.type, arr)
  })
  // 每个桶内部先打乱，保证同类题目顺序随机
  buckets.forEach((arr) => {
    const s = shuffle(arr)
    arr.length = 0
    arr.push(...s)
  })

  const out: Question[] = []
  let lastType = ''
  let lastWord = ''

  while (out.length < count) {
    const remaining = [...buckets.entries()].filter(([, arr]) => arr.length > 0)
    if (!remaining.length) break

    // 分层约束，逐级放宽（保证不死循环）：
    // ① 与上一题不同型且不同词 → ② 仅不同型 → ③ 任意
    const wordOf = (q: Question) => String(q.word?.id || q.id)
    const all = remaining.flatMap(([, arr]) => arr)
    let pick: Question | undefined =
      all.find((q) => q.type !== lastType && wordOf(q) !== lastWord) ||
      all.find((q) => q.type !== lastType) ||
      all[0]

    // 同一约束档内随机挑一个，避免固定顺序
    const tier = all.filter(
      (q) =>
        q.type === pick!.type &&
        (pick!.type !== lastType ? true : true) &&
        wordOf(q) === wordOf(pick!)
    )
    pick = sample(tier.length ? tier : [pick!], 1)[0]

    const arr = buckets.get(pick.type)!
    arr.splice(arr.indexOf(pick), 1)
    out.push(pick)
    lastType = pick.type
    lastWord = wordOf(pick)
  }

  return out
}

/**
 * 生成练习题
 * @param words 词表
 * @param opts  { count, types }
 */
export function buildQuestions(words: Word[], opts?: BuildOpts): Question[] {
  const options = opts || {}
  const count = options.count || 10
  const valid = (words || []).filter((w) => w && w.en)
  if (valid.length === 0) return []

  const types = options.types && options.types.length ? options.types : (['zh2en', 'listen', 'spell', 'match'] as const)
  const typeList = types as Question['type'][]

  const singleTypes = typeList.filter((t) => t !== 'match')
  const hasMatch = typeList.indexOf('match') > -1

  // 连线题最多能出几道（每道要 4 个不重复的词）
  const maxMatchByWords = Math.floor(valid.length / 4)
  const matchQuota = hasMatch ? Math.min(maxMatchByWords, Math.max(1, Math.round(count / typeList.length))) : 0

  // 剩余名额分给单选类题型
  const restCount = count - matchQuota
  const perSingle = singleTypes.length ? Math.max(1, Math.ceil(restCount / singleTypes.length)) : 0

  const pool: Question[] = []
  const usedIds: Record<string, boolean> = {}

  // 1) 先生成连线题（每道占 4 个词，且不与其它连线题重复用词）
  if (matchQuota > 0) {
    for (let m = 0; m < matchQuota; m++) {
      const free = valid.filter((w) => !usedIds[w.en.toLowerCase()])
      if (free.length < 4) break
      const group = sample(free, 4)
      if (group.length < 2) break

      group.forEach((w) => {
        usedIds[String(w.en).toLowerCase()] = true
      })

      pool.push({
        type: 'match',
        id: uid('q_match_'),
        isGroup: true,
        prompt: '把单词和它的意思连起来',
        left: shuffle(group.map((w) => ({ id: w.id, text: w.en, emoji: w.emoji }))),
        right: shuffle(group.map((w) => ({ id: w.id, text: w.zh || w.en, emoji: w.emoji }))),
        pairs: group.map((w) => ({ id: w.id, en: w.en, zh: w.zh })),
        word: group[0],
        answer: group.map((w) => w.en).join(',')
      })
    }
  }

  // 2) 生成单选类题目
  //
  // ⚠️ 关键：同一轮里每个单词尽量只出一道题（家长反馈「每道题都是 big」）。
  // 做法：先把所有单选题位（zh2en×n、listen×n、spell×n）摊开打乱，
  // 再按一个循环词队依次取词——每个词在本轮没用过才允许出，全用光了才清空重来。
  // 这样词表 ≥ 题数时，5 道题一定是 5 个不同的单词。
  const slots: Question['type'][] = []
  singleTypes.forEach((t) => {
    for (let k = 0; k < perSingle; k++) slots.push(t)
  })
  const shuffledSlots = shuffle(slots)

  // 连线题已占用的词优先排除；不够时放开限制
  const freeWords = valid.filter((w) => !usedIds[w.en.toLowerCase()])
  const wordQueue = freeWords.length >= shuffledSlots.length ? shuffle(freeWords) : shuffle(valid)

  const usedInRound = new Set<string>()
  let ptr = 0
  shuffledSlots.forEach((type) => {
    let w: Word | undefined
    // 第一优先：本轮没用过的词
    for (let k = 0; k < wordQueue.length; k++) {
      const cand = wordQueue[ptr % wordQueue.length]
      ptr++
      if (!usedInRound.has(cand.en.toLowerCase())) {
        w = cand
        break
      }
    }
    if (!w) {
      // 词全部用光（词表小于题数），清空标记允许第二轮复用
      usedInRound.clear()
      w = wordQueue[ptr++ % wordQueue.length]
    }
    if (!w) return
    usedInRound.add(w.en.toLowerCase())

    let q: Question | null = null
    if (type === 'zh2en') q = makeZh2En(w, valid)
    else if (type === 'listen') q = makeListen(w, valid)
    else if (type === 'spell') q = makeSpell(w)
    if (q) pool.push(q)
  })

  // 3) 按「相邻不同型」交错排列后取前 count 题
  //    若 pool 不足（词表太小），就返回现有全部
  const arranged = interleaveByType(pool, Math.min(count, pool.length))
  return arranged.length ? arranged : shuffle(pool).slice(0, count)
}

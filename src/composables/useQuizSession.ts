/**
 * 练习会话状态机 —— 主链路核心
 *
 * 支持三种模式：daily（每日 5 题）/ wrong（错题重练 5 题）/ exam（考试 10 题）
 *
 * ⚠️ 关键行为约束（历史 bug 复现点，勿改）：
 *  1. 连线题答错**不锁题、不推进**：抖动提示 + 记入错题本 + 削弱连击，
 *     但孩子可以立刻重选正确答案；同一道题内对同一个词的重复误触只计一次。
 *  2. 连线题整道题只在**全部配对完成**时加一次分（不是每对加一次）。
 *  3. 拼写题的槽位按**答案长度**渲染，不是按 tile 数量（tiles 含 2 个干扰字母）。
 */

import { computed, ref } from 'vue'
import type { Question, Word, SessionMode, MatchQuestion, SpellQuestion } from '@/types'
import { QUIZ_SIZE, GEM_PER_CORRECT } from '@/utils/constants'
import { buildQuestions } from '@/utils/questions'
import { useGems } from './useGems'
import { useMedals } from './useMedals'
import { useRecords } from './useRecords'
import { useWrongBook } from './useWrongBook'
import { usePraise } from './usePraise'
import { shuffle } from '@/utils/date'

export interface MatchSelection {
  side: 'left' | 'right'
  id: string
  text: string
}

interface MatchState {
  /** 已配对成功的 pair id 集合 */
  done: Record<string, boolean>
  /** 当前选中项 */
  sel: MatchSelection | null
  /** 抖动中的卡片 key: 'L_<id>' / 'R_<id>' */
  shaking: Record<string, boolean>
  /** 本题内已误触过的词（避免重复计入错题） */
  mistakes: Record<string, boolean>
}

export function useQuizSession() {
  /* ---------------- 全局依赖 ---------------- */
  const { add: addGems } = useGems()
  const { applyNew: applyNewMedals } = useMedals()
  const { add: addRecord } = useRecords()
  const wrongBook = useWrongBook()
  const praise = usePraise()

  /* ---------------- 会话状态 ---------------- */
  const mode = ref<SessionMode>('daily')
  const questions = ref<Question[]>([])
  const index = ref(0)
  const correct = ref(0)
  const combo = ref(0)
  const maxCombo = ref(0)
  const gemsEarned = ref(0)
  const locked = ref(false)
  /** 当前题是否已判定（答对/答错），用于禁用重复点击 */
  const answered = ref(false)
  /** 上一次选择的对错，用于渲染反馈条 */
  const lastCorrect = ref<boolean | null>(null)
  /** 记录本轮需从错题本移出的词（重练答对 1 次即移出） */
  const clearedWrong: string[] = []
  /** 本轮答错的词（用于错题本） */
  const missedWords: Word[] = []

  /** 拍照用的会话快照：题目列表（供结算页复用） */
  const sessionQuestions = ref<Question[]>([])

  const total = computed(() => questions.value.length)
  const current = computed<Question | undefined>(() => questions.value[index.value])
  const isLast = computed(() => index.value >= total.value - 1)
  const finished = computed(() => index.value >= total.value && total.value > 0)

  /* ---------------- 连线题状态 ---------------- */
  const match = ref<MatchState>({ done: {}, sel: null, shaking: {}, mistakes: {} })
  const matchHint = ref('')

  /* ---------------- 拼写题状态 ---------------- */
  /**
   * 槽位：长度为答案长度；每格存 tiles 中的索引（null = 空）
   * 用索引而非对象，避免渲染出 [object Object]
   */
  const spellSlots = ref<(number | null)[]>([])
  /** 已被使用的 tile 索引（每个 tile 只能用一次） */
  const spellUsed = ref<Record<number, boolean>>({})

  let hintTimer: ReturnType<typeof setTimeout> | null = null

  /* ================= 开局 ================= */

  function resetRuntime() {
    index.value = 0
    correct.value = 0
    combo.value = 0
    maxCombo.value = 0
    gemsEarned.value = 0
    locked.value = false
    answered.value = false
    lastCorrect.value = null
    clearedWrong.length = 0
    missedWords.length = 0
    resetMatch()
    resetSpell()
  }

  function resetMatch() {
    match.value = { done: {}, sel: null, shaking: {}, mistakes: {} }
    matchHint.value = ''
  }

  function resetSpell() {
    spellSlots.value = []
    spellUsed.value = {}
    const q = current.value
    if (q && q.type === 'spell') {
      spellSlots.value = new Array((q as SpellQuestion).letters.length).fill(null)
    }
  }

  /** 每日练习：用某天（或指定）词表出 5 题 */
  function startDaily(words: Word[]) {
    mode.value = 'daily'
    const qs = buildQuestions(words, { count: QUIZ_SIZE })
    questions.value = qs
    sessionQuestions.value = qs
    resetRuntime()
    afterJump()
    return qs.length
  }

  /** 错题重练：错题不足 5 道时用已学单词补齐 */
  function startWrong() {
    mode.value = 'wrong'
    const plan = wrongBook.buildPracticeWords()
    // 当作每日练习的出题方式，但题量固定 5，且记录哪些词来自错题
    const qs = buildQuestions(plan.words, { count: QUIZ_SIZE })
    questions.value = qs
    sessionQuestions.value = qs
    resetRuntime()
    afterJump()
    return { count: qs.length, wrongCount: plan.wrongWords.length, filled: plan.filled }
  }

  /** 考试：传入考卷 */
  function startExam(qs: Question[]) {
    mode.value = 'exam'
    questions.value = qs
    sessionQuestions.value = qs
    resetRuntime()
    afterJump()
    return qs.length
  }

  /** 切题后重置与当前题目类型相关的临时状态 */
  function afterJump() {
    locked.value = false
    answered.value = false
    lastCorrect.value = null
    resetMatch()
    resetSpell()
    // 听力题自动朗读
    const q = current.value
    if (q && q.type === 'listen') {
      // 交给页面调用 speak（需要拿到 speaking 状态一致体验）
      // 这里只发信号，实际朗读由页面 watch(current) 处理
    }
  }

  /* ================= 计分 ================= */

  function recordMissed(w: Word | undefined | null) {
    if (!w || !w.en) return
    const key = String(w.en).toLowerCase()
    if (missedWords.some((x) => String(x.en).toLowerCase() === key)) return
    missedWords.push(w)
  }

  /** 答错处理：削弱连击 + 记错题，但**不锁定页面** */
  function markWrong(q: Question | undefined, silent = false) {
    combo.value = 0
    if (!q) return
    if (q.type === 'match') {
      // 连线题：整组的词都算错（值一次），但只在整题结束/离开时才真正落库
      ;(q as MatchQuestion).pairs.forEach((p) => {
        recordMissed({ id: p.id, en: p.en, zh: p.zh, emoji: '' })
      })
    } else {
      recordMissed(q.word)
    }
    if (!silent) {
      // 反馈条由页面渲染
    }
  }

  /** 答对处理：加分 + 连击 + 点赞弹窗 */
  function markCorrect(q: Question | undefined) {
    if (!q) return
    correct.value++
    combo.value++
    if (combo.value > maxCombo.value) maxCombo.value = combo.value

    // 每日/错题重练：答对立即加 2 颗宝石（逐题加，顶部宝石栏实时跳动）
    // 考试：不逐题加，最后按总分一次性结算
    if (mode.value !== 'exam') {
      gemsEarned.value += GEM_PER_CORRECT
    }

    // 错题重练：答对 1 次即移出错题本
    if (mode.value === 'wrong' && q.word && q.word.en) {
      clearedWrong.push(String(q.word.en).toLowerCase())
    }

    praise.show(combo.value)
  }

  /* ================= 单选类题（zh2en / listen） ================= */

  function pickChoice(option: string) {
    const q = current.value
    if (!q || (q.type !== 'zh2en' && q.type !== 'listen')) return
    if (locked.value || answered.value) return

    // ⚠️ options 是纯字符串数组，必须做大小写无关的字符串比较
    const isRight = String(option).toLowerCase() === String(q.answer).toLowerCase()
    locked.value = true
    answered.value = true
    lastCorrect.value = isRight

    if (isRight) {
      markCorrect(q)
    } else {
      markWrong(q)
    }
  }

  /* ================= 拼写题 ================= */

  function spellPick(tileIndex: number) {
    const q = current.value
    if (!q || q.type !== 'spell') return
    if (locked.value || answered.value) return
    if (spellUsed.value[tileIndex]) return
    const next = spellSlots.value.indexOf(null)
    if (next === -1) return

    const slots = spellSlots.value.slice()
    slots[next] = tileIndex
    spellSlots.value = slots
    spellUsed.value = { ...spellUsed.value, [tileIndex]: true }

    // 填满即自动判定
    if (slots.indexOf(null) === -1) {
      submitSpell()
    }
  }

  /** 撤回最后一格（点已填槽位） */
  function spellUndo(slotIndex: number) {
    if (locked.value || answered.value) return
    const tileIndex = spellSlots.value[slotIndex]
    if (tileIndex === null || tileIndex === undefined) return
    const slots = spellSlots.value.slice()
    slots[slotIndex] = null
    spellSlots.value = slots
    const used = { ...spellUsed.value }
    delete used[tileIndex]
    spellUsed.value = used
  }

  function submitSpell() {
    const q = current.value
    if (!q || q.type !== 'spell') return
    const spelling = spellSlots.value.map((i) => (i === null ? '' : q.tiles[i].ch)).join('')
    const isRight = spelling === q.answer
    locked.value = true
    answered.value = true
    lastCorrect.value = isRight
    if (isRight) markCorrect(q)
    else markWrong(q)
  }

  /** 清空重填（答错后允许孩子再试一次；答题模式下不阻塞） */
  function spellClear() {
    answered.value = false
    locked.value = false
    lastCorrect.value = null
    spellSlots.value = new Array((current.value as SpellQuestion)?.letters.length || 0).fill(null)
    spellUsed.value = {}
  }

  /* ================= 连线题 ================= */

  function matchPick(side: 'left' | 'right', id: string, text: string) {
    const q = current.value
    if (!q || q.type !== 'match') return
    if (match.value.done[id]) return

    // 首次点击：选中
    if (!match.value.sel) {
      match.value.sel = { side, id, text }
      return
    }

    const sel = match.value.sel
    // 点同一侧 → 换选
    if (sel.side === side) {
      match.value.sel = { side, id, text }
      return
    }

    // 左右各一：判定
    const leftItem = side === 'left' ? { id, text } : { id: sel.id, text: sel.text }
    const rightItem = side === 'right' ? { id, text } : { id: sel.id, text: sel.text }
    const ok = leftItem.id === rightItem.id

    if (ok) {
      match.value.done[leftItem.id] = true
      match.value.sel = null
      // 整组连完才加一次分
      if (Object.keys(match.value.done).length === (q as MatchQuestion).pairs.length) {
        locked.value = true
        answered.value = true
        lastCorrect.value = true
        markCorrect(q)
      }
      return
    }

    /* ---- 误触：抖动提示 + 进错题本 + 不阻塞 ---- */
    const leftId = leftItem.id
    const rightId = rightItem.id
    match.value.shaking = { ['L_' + leftId]: true, ['R_' + rightId]: true }
    match.value.sel = null
    combo.value = 0

    // 同一题内同一组误触只记一次错题，避免抖动一次数量就涨
    const mkey = leftId + '_' + rightId
    if (!match.value.mistakes[mkey]) {
      match.value.mistakes[mkey] = true
      const pair = (q as MatchQuestion).pairs.find((p) => p.id === leftId)
      if (pair) recordMissed({ id: pair.id, en: pair.en, zh: pair.zh, emoji: '' })
    }

    if (hintTimer) clearTimeout(hintTimer)
    matchHint.value = '💭 不太对哦，再试一次～'
    // #ifdef MP-WEIXIN || APP-PLUS
    uni.vibrateShort({ fail: () => {} })
    // #endif
    setTimeout(() => {
      match.value.shaking = {}
    }, 520)
    hintTimer = setTimeout(() => {
      matchHint.value = ''
    }, 1500)
  }

  /* ================= 推进 ================= */

  /** 进入下一题（答对后自动调用 / 答错后孩子点按钮调用） */
  function next() {
    if (index.value >= total.value) return
    index.value++
    afterJump()
  }

  /**
   * 结束本轮：结算宝石 + 落库错题 + 写学习记录
   * @returns 结算明细
   */
  function finish() {
    const qs = sessionQuestions.value
    const t = qs.length || 1
    const rate = correct.value / t

    // 落库错题（每日/错题重练；考试也记）
    if (missedWords.length) wrongBook.add(missedWords)

    // 错题重练：答对的移出错题本
    if (mode.value === 'wrong' && clearedWrong.length) {
      wrongBook.remove(clearedWrong)
    }

    let gemResult: { before: number; after: number; gained: number; newSmall: unknown[]; newBig: unknown[] } | null = null

    if (mode.value !== 'exam' && gemsEarned.value > 0) {
      const r = addGems(gemsEarned.value)
      gemResult = r as unknown as typeof gemResult
      applyNewMedals(r as never)
    }

    addRecord({
      date: new Date().toISOString().slice(0, 10),
      mode: mode.value,
      total: t,
      correct: correct.value,
      rate,
      gems: mode.value === 'exam' ? 0 : gemsEarned.value
    })

    return {
      total: t,
      correct: correct.value,
      rate,
      maxCombo: maxCombo.value,
      gems: mode.value === 'exam' ? 0 : gemsEarned.value,
      gemResult,
      questions: qs
    }
  }

  return {
    /* 状态 */
    mode,
    questions,
    sessionQuestions,
    index,
    total,
    current,
    correct,
    combo,
    maxCombo,
    gemsEarned,
    locked,
    answered,
    lastCorrect,
    isLast,
    finished,
    /* 连线 */
    match,
    matchHint,
    /* 拼写 */
    spellSlots,
    spellUsed,
    /* 动作 */
    startDaily,
    startWrong,
    startExam,
    pickChoice,
    spellPick,
    spellUndo,
    spellClear,
    matchPick,
    next,
    finish,
    resetRuntime
  }
}

/** 会话单例：练习页与结算页共享同一份状态 */
let sessionSingleton: ReturnType<typeof useQuizSession> | null = null
export function useQuizSessionSingleton() {
  if (!sessionSingleton) sessionSingleton = useQuizSession()
  return sessionSingleton
}

export { shuffle }

/**
 * 考试数据层（纯数据）
 *
 * 规则：
 *  - 固定 10 题，题目全部来自「已学过的内容」
 *  - 全对 10 宝石 / 对 9 得 9 / 对 8 得 8 / 8 以下 0 宝石
 *  - 不限次数，但同一批题（题面指纹）已发过宝石的不再重复发放
 */

import type { Question, ExamData, ExamResult, ExamStats, ExamTaken } from '@/types'
import { EXAM_KEY, EXAM_SIZE } from './constants'
import { readRaw, writeRaw } from './storage'
import { buildQuestions } from './questions'
import { getAllLearnedWords } from './db'
import { addGems, getGems } from './gems'

export function getExamData(): ExamData {
  const d = readRaw<Partial<ExamData>>(EXAM_KEY, {})
  return {
    taken: d.taken || [],
    paidFps: d.paidFps || []
  }
}

export function saveExamData(d: ExamData): boolean {
  return writeRaw(EXAM_KEY, d)
}

/** 生成考卷：从已学单词池抽 10 题 */
export function buildExamQuestions(): { questions: Question[]; poolSize: number; ok: boolean } {
  const pool = getAllLearnedWords()
  if (pool.length < 4) {
    return { questions: [], poolSize: pool.length, ok: false }
  }
  const types: Question['type'][] = ['zh2en', 'listen', 'spell', 'match']
  const questions = buildQuestions(pool, { count: EXAM_SIZE, types })
  return {
    questions: questions.slice(0, EXAM_SIZE),
    poolSize: pool.length,
    ok: questions.length > 0
  }
}

/** 按得分换算宝石：只有答对 8 题及以上才有宝石，数量 = 答对题数 */
export function examGems(score: number, total?: number): number {
  const t = total || EXAM_SIZE
  const s = Math.max(0, Math.min(score, t))
  return s >= 8 ? s : 0
}

/**
 * 题面指纹：答案排序后拼接，保证同套题无论顺序如何指纹一致。
 * ⚠️ 格式必须逐字保持，改动会导致历史去重失效。
 */
export function examFingerprint(questions: Question[]): string {
  return questions
    .map((q) => (q.answer || '') + '|' + q.type)
    .sort()
    .join(',')
}

/** 该题面指纹是否已经发过宝石 */
export function examAlreadyPaid(fp: string): boolean {
  const d = getExamData()
  return d.paidFps.indexOf(fp) > -1
}

/**
 * 记录一次考试，并按规则发放宝石
 * @returns { gems, raw, paid, after, dup }
 */
export function saveExamResult(questions: Question[], score: number): ExamResult {
  const total = questions.length || EXAM_SIZE
  const raw = examGems(score, total)
  const fp = examFingerprint(questions)
  const d = getExamData()
  const dup = d.paidFps.indexOf(fp) > -1
  const paid = dup ? 0 : raw

  let after = getGems()
  if (paid > 0) {
    const res = addGems(paid)
    after = res.after
    d.paidFps.push(fp)
    if (d.paidFps.length > 50) d.paidFps = d.paidFps.slice(-50)
  }

  d.taken.unshift({
    at: Date.now(),
    score,
    total,
    gems: paid
  })
  if (d.taken.length > 50) d.taken = d.taken.slice(0, 50)
  saveExamData(d)

  return { gems: paid, raw, paid, after, dup }
}

/** 考试历史（带友好时间） */
export function getExamHistory(limit?: number): ExamTaken[] {
  const d = getExamData()
  const list = d.taken.slice(0, limit || 10).map((x) => ({ ...x }))
  list.forEach((it) => {
    const dt = new Date(it.at)
    it.timeText =
      dt.getMonth() + 1 + '月' + dt.getDate() + '日 ' +
      (dt.getHours() < 10 ? '0' : '') + dt.getHours() + ':' +
      (dt.getMinutes() < 10 ? '0' : '') + dt.getMinutes()
    it.rate = it.total ? Math.round((it.score / it.total) * 100) : 0
  })
  return list
}

export function examStats(): ExamStats {
  const d = getExamData()
  const taken = d.taken || []
  const best = taken.reduce((m, x) => Math.max(m, x.score || 0), 0)
  const perfect = taken.filter((x) => x.score === x.total && x.total > 0).length
  return {
    times: taken.length,
    best,
    perfect,
    totalGems: taken.reduce((s, x) => s + (x.gems || 0), 0)
  }
}

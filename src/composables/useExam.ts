/**
 * 考试状态
 */

import { computed } from 'vue'
import { singletonRef } from './singleton'
import type { Question, ExamResult, ExamTaken, ExamStats } from '@/types'
import * as exam from '@/utils/exam'

const _current = singletonRef<Question[]>([])
const _history = singletonRef<ExamTaken[]>([])
const _stats = singletonRef<ExamStats>({ times: 0, best: 0, perfect: 0, totalGems: 0 })
const _lastResult = singletonRef<ExamResult | null>(null)
const _lastScore = singletonRef(0)
const _poolSize = singletonRef(0)

export function useExam() {
  const currentQuestions = _current
  const history = _history
  const stats = _stats

  const canStart = computed(() => _stats.value.times >= 0 && _poolSize.value >= 4)
  const poolSize = _poolSize
  const lastResult = _lastResult
  const lastScore = _lastScore

  function reload() {
    _history.value = exam.getExamHistory(10)
    _stats.value = exam.examStats()
    _poolSize.value = exam.buildExamQuestions().poolSize
  }

  /** 生成新考卷（不入库，仅确定题目） */
  function start(): { ok: boolean; poolSize: number } {
    const res = exam.buildExamQuestions()
    _current.value = res.questions
    _poolSize.value = res.poolSize
    return { ok: res.ok, poolSize: res.poolSize }
  }

  /** 结算：按得分发宝石（同套题只发一次） */
  function finish(score: number): ExamResult {
    const r = exam.saveExamResult(_current.value, score)
    _lastResult.value = r
    _lastScore.value = score
    reload()
    return r
  }

  return {
    currentQuestions,
    history,
    stats,
    canStart,
    poolSize,
    lastResult,
    lastScore,
    reload,
    start,
    finish
  }
}

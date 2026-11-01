<template>
  <view class="practice-page">
    <!-- ============ 顶部：宝石栏 + 进度 ============ -->
    <view class="prac-top">
      <GemBar ref="gemBarRef" theme="light" @wall="goMedals" />

      <view class="prac-progress">
        <view class="pp-rounds">
          <view
            v-for="(q, i) in session.questions.value"
            :key="q.id"
            class="pp-dot"
            :class="{
              'is-done': i < session.index.value,
              'is-cur': i === session.index.value
            }"
          >
            <text v-if="i < session.index.value" class="pp-dot-inner">✓</text>
            <text v-else class="pp-dot-inner">{{ i + 1 }}</text>
          </view>
        </view>

        <view class="pp-meta">
          <text class="pp-count">{{ Math.min(session.index.value + 1, session.total.value) }}/{{ session.total.value }}</text>
          <view v-if="session.combo.value >= 2" class="pp-combo beat">
            <text class="ppc-icon">🔥</text>
            <text class="ppc-num">{{ session.combo.value }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- ============ 题目区 ============ -->
    <view class="prac-main" v-if="q">
      <!-- 题型提示 -->
      <view class="type-row">
        <text class="type-pill">{{ typeName }}</text>
        <text v-if="modeLabel" class="mode-pill" :class="'mode-' + session.mode.value">{{ modeLabel }}</text>
      </view>

      <!-- ---------- 连线题 ---------- -->
      <view v-if="q.type === 'match'" class="qarea qarea-match">
        <text class="q-stem">把单词和它的意思连起来</text>

        <view class="match-wrap">
          <view class="match-col">
            <view
              v-for="it in (q as any).left"
              :key="'L_' + it.id"
              class="mcard"
              :class="{
                sel: session.match.value.sel && session.match.value.sel.side === 'left' && session.match.value.sel.id === it.id,
                done: session.match.value.done[it.id],
                shake: session.match.value.shaking['L_' + it.id]
              }"
              @tap="session.matchPick('left', it.id, it.text)"
            >
              <text class="mcard-text">{{ it.text }}</text>
              <text v-if="session.match.value.done[it.id]" class="mcard-tick">✓</text>
            </view>
          </view>

          <view class="match-col">
            <view
              v-for="it in (q as any).right"
              :key="'R_' + it.id"
              class="mcard mcard-zh"
              :class="{
                sel: session.match.value.sel && session.match.value.sel.side === 'right' && session.match.value.sel.id === it.id,
                done: session.match.value.done[it.id],
                shake: session.match.value.shaking['R_' + it.id]
              }"
              @tap="session.matchPick('right', it.id, it.text)"
            >
              <text class="mcard-text">{{ it.text }}</text>
              <text v-if="session.match.value.done[it.id]" class="mcard-tick">✓</text>
            </view>
          </view>
        </view>

        <view class="match-hint" :class="{ show: !!session.matchHint.value }">
          <text>{{ session.matchHint.value }}</text>
        </view>
      </view>

      <!-- ---------- 拼写题 ---------- -->
      <view v-else-if="q.type === 'spell'" class="qarea qarea-spell">
        <view class="spell-top">
          <text class="spell-emoji">{{ (q as any).emoji }}</text>
          <text class="spell-hint">{{ (q as any).hint }}</text>
        </view>

        <text class="q-stem-sm">把字母排排队，拼出这个单词</text>

        <view class="slots">
          <view
            v-for="(s, i) in session.spellSlots.value"
            :key="i"
            class="slot"
            :class="{ filled: s !== null }"
            @tap="session.spellUndo(i)"
          >
            <text class="slot-ch">{{ s === null ? '' : (q as any).tiles[s].ch }}</text>
          </view>
        </view>

        <view class="tiles">
          <view
            v-for="(t, i) in (q as any).tiles"
            :key="t.key"
            class="tile"
            :class="{ used: session.spellUsed.value[i] }"
            @tap="session.spellPick(i)"
          >
            <text class="tile-ch">{{ t.ch }}</text>
          </view>
        </view>
      </view>

      <!-- ---------- 听音选词 / 看中文选英文 ---------- -->
      <view v-else class="qarea qarea-choice">
        <view class="choice-top">
          <text v-if="q.type === 'zh2en'" class="choice-emoji">{{ (q as any).emoji }}</text>
          <text class="choice-prompt" :class="{ big: q.type === 'zh2en' }">{{ (q as any).prompt }}</text>
          <view v-if="q.type === 'listen'" class="speak-btn" :class="{ playing: speaking }" @tap="playAudio">
            <text class="sb-icon">{{ speaking ? '🔊' : '🔈' }}</text>
            <text class="sb-text">{{ speaking ? '播放中' : '点我再听一次' }}</text>
          </view>
        </view>

        <view class="options">
          <view
            v-for="(o, i) in (q as any).options"
            :key="i"
            class="opt"
            :class="optClass(o)"
            @tap="session.pickChoice(o)"
          >
            <text class="opt-idx">{{ ['A', 'B', 'C', 'D'][i] }}</text>
            <text class="opt-text">{{ o }}</text>
            <text v-if="isOptRight(o)" class="opt-tick">✓</text>
            <text v-else-if="isOptDim(o)" class="opt-tick">✕</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 空态 -->
    <view v-else class="prac-main prac-empty">
      <text class="pe-emoji">🤔</text>
      <text class="pe-text">题目为空，请返回重新开始</text>
      <button class="btn btn-primary" @tap="backHome">返回首页</button>
    </view>

    <!-- ============ 底部：反馈 + 下一题 ============ -->
    <view class="prac-foot">
      <!-- 反馈条 -->
      <view class="feedback" :class="fbClass">
        <text class="fb-icon">{{ fbIcon }}</text>
        <text class="fb-text">{{ fbText }}</text>
      </view>

      <button
        class="btn next-btn"
        :class="session.answered.value ? 'btn-primary' : 'btn-ghost'"
        :disabled="!session.answered.value"
        @tap="onNext"
      >
        {{ nextLabel }}
      </button>
    </view>

    <!-- 点赞弹窗 -->
    <PraisePopup />
  </view>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { onLoad, onUnload } from '@dcloudio/uni-app'
import GemBar from '@/components/GemBar.vue'
import PraisePopup from '@/components/PraisePopup.vue'
import { useQuizSessionSingleton } from '@/composables/useQuizSession'
import { useSpeech } from '@/composables/useSpeech'
import { useWrongBook } from '@/composables/useWrongBook'
import { useBank } from '@/composables/useBank'

const session = useQuizSessionSingleton()
const { speaking, speak } = useSpeech()
const { buildPracticeWords } = useWrongBook()
const { todayWords } = useBank()

const gemBarRef = ref<InstanceType<typeof GemBar> | null>(null)

const q = computed(() => session.current.value)

const TYPE_NAMES: Record<string, string> = {
  zh2en: '看中文选英文',
  listen: '听音选词',
  spell: '字母拼单词',
  match: '连线配对'
}
const typeName = computed(() => (q.value ? TYPE_NAMES[q.value.type] || '' : ''))

const modeLabel = computed(() => {
  const m = session.mode.value
  return m === 'exam' ? '考试' : m === 'wrong' ? '错题重练' : ''
})

/* ---------------- 单选类：选项样式 ---------------- */
function optClass(o: string) {
  if (!session.answered.value) return {}
  const cur = q.value
  if (!cur || (cur.type !== 'zh2en' && cur.type !== 'listen')) return {}
  const isAnswer = String(o).toLowerCase() === String(cur.answer).toLowerCase()
  if (isAnswer) return { right: true }
  return { dim: true }
}

/** 该项是否为正确答案（已作答后） */
function isOptRight(o: string): boolean {
  const c = optClass(o) as { right?: boolean }
  return !!c.right
}

/** 该项是否为被排除项（已作答后） */
function isOptDim(o: string): boolean {
  const c = optClass(o) as { dim?: boolean }
  return !!c.dim
}

/* ---------------- 反馈条 ---------------- */
const fbClass = computed(() => {
  if (!session.answered.value) return 'fb-idle'
  return session.lastCorrect.value ? 'fb-right' : 'fb-wrong'
})

const fbIcon = computed(() => {
  if (!session.answered.value) return '💡'
  return session.lastCorrect.value ? '🎉' : '💭'
})

const fbText = computed(() => {
  if (!session.answered.value) {
    const cur = q.value
    if (!cur) return ''
    if (cur.type === 'listen') return '先点上面的按钮听一听吧'
    if (cur.type === 'match') return '点左边再点右边，配对成功就变绿啦'
    if (cur.type === 'spell') return '点字母填进格子，填满自动判定'
    return '选出正确的答案吧'
  }
  const cur = q.value
  if (session.lastCorrect.value) {
    const combo = session.combo.value
    if (combo >= 5) return `太厉害了！连对 ${combo} 题 🔥`
    if (combo >= 3) return `连对 ${combo} 题，好棒！`
    return '答对啦，+2 颗宝石 💎'
  }
  // 答错：给出正确答案提示（幼儿友好，不打击）
  if (cur && (cur.type === 'zh2en' || cur.type === 'listen')) return `正确答案是「${(cur as any).answer}」`
  if (cur && cur.type === 'spell') return `正确拼写是「${(cur as any).answer}」`
  if (cur && cur.type === 'match') return '有点小失误，已经记进错题本啦'
  return '再试一次吧'
})

const nextLabel = computed(() => {
  if (!session.answered.value) return '请先作答'
  if (session.isLast.value) return session.mode.value === 'exam' ? '交卷 📝' : '完成，去开宝箱 🎁'
  return '下一题 →'
})

/* ---------------- 听力自动朗读 ---------------- */
function playAudio() {
  const cur = q.value
  if (cur && cur.type === 'listen') speak((cur as any).audio || (cur as any).answer)
}

watch(
  () => session.index.value,
  () => {
    const cur = q.value
    if (cur && cur.type === 'listen') {
      setTimeout(() => speak((cur as any).audio || (cur as any).answer), 260)
    }
  }
)

/* ---------------- 宝石栏跳动 ---------------- */
watch(
  () => session.gemsEarned.value,
  (n, old) => {
    if (n > (old || 0) && session.mode.value !== 'exam') {
      gemBarRef.value?.bumpTo(n)
    }
  }
)

/* ---------------- 推进 ---------------- */
function onNext() {
  if (!session.answered.value) return
  if (session.isLast.value) {
    session.next() // index → total，标记结束
    const report = session.finish()
    if (session.mode.value === 'exam') {
      // 考试结束 → 考试页结算
      uni.redirectTo({ url: '/pages/exam/index?done=1' })
    } else {
      // 每日 / 错题 → 开宝箱
      uni.redirectTo({ url: '/pages/chest/index' })
    }
    void report
    return
  }
  session.next()
}

function backHome() {
  uni.switchTab({ url: '/pages/home/index' })
}

function goMedals() {
  uni.navigateTo({ url: '/pages/medals/index' })
}

/* ---------------- 入场 ---------------- */
onLoad((opts) => {
  const mode = (opts && (opts as any).mode) || 'daily'
  // 若从首页/错题本/考试页已准备好题目，这里只需确认；否则兜底自建
  if (mode === 'wrong' && !session.questions.value.length) {
    session.startWrong()
  } else if (mode === 'daily' && !session.questions.value.length) {
    // todayWords 已内置「今日无词 → 回退最近一次录入」的逻辑
    session.startDaily(todayWords.value)
  }
  // 兜底：仍无题（题库为空）时，给出准确原因并退回首页，避免停在空态
  if (mode !== 'exam' && !session.questions.value.length) {
    uni.showToast({ title: '还没有可练习的单词，先去录入吧', icon: 'none' })
    setTimeout(() => {
      uni.switchTab({ url: '/pages/home/index' })
    }, 900)
  }
  void buildPracticeWords
})

onUnload(() => {
  // 离开时如果还有未落库的错题（比如中途退出），也保存下来
  // 正常流程已在 finish() 落库；这里仅做兜底，避免孩子中途退出丢错题
})
</script>

<style lang="scss" scoped>
/*
 * 一屏布局：flex 纵向，main 占满剩余空间且 overflow hidden。
 * 目标设备 iPhone SE 375×667，四种题型都不得出现滚动条。
 */
.practice-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background: var(--bg);
}

/* ---------- 顶部 ---------- */
.prac-top {
  flex-shrink: 0;
  padding: 8px 0 8px;
  background: var(--grad-brand);
}

.prac-progress {
  display: flex;
  align-items: center;
  padding: 8px 14px 0;
}

.pp-rounds {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.pp-dot {
  flex: 1;
  height: 26px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.18);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.24s ease, transform 0.24s ease;
}

.pp-dot.is-done {
  background: var(--mint);
}

.pp-dot.is-cur {
  background: var(--card);
  transform: scale(1.06);
}

.pp-dot-inner {
  font-size: 14px;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.85);
}

.pp-dot.is-cur .pp-dot-inner {
  color: var(--primary-dark);
}

.pp-meta {
  display: flex;
  align-items: center;
  margin-left: 10px;
  flex-shrink: 0;
}

.pp-count {
  font-size: 14px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.9);
}

.pp-combo {
  display: flex;
  align-items: center;
  margin-left: 8px;
  padding: 2px 7px;
  background: rgba(255, 255, 255, 0.22);
  border-radius: 999px;
}

.ppc-icon {
  font-size: 14px;
}

.ppc-num {
  margin-left: 2px;
  font-size: 14px;
  font-weight: 800;
  color: #fff;
}

/* ---------- 题目主体 ---------- */
.prac-main {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  padding: 10px 14px 0;
  overflow: hidden;
}

.type-row {
  display: flex;
  align-items: center;
  gap: 7px;
  flex-shrink: 0;
}

.type-pill {
  padding: 3px 10px;
  background: var(--primary-light);
  color: var(--primary-dark);
  font-size: 14px;
  font-weight: 700;
  border-radius: 999px;
}

.mode-pill {
  padding: 3px 10px;
  font-size: 14px;
  font-weight: 700;
  border-radius: 999px;
}

.mode-pill.mode-wrong {
  background: var(--coral-light);
  color: var(--coral-ink);
}

.mode-pill.mode-exam {
  background: var(--mint-light);
  color: var(--mint-ink);
}

.qarea {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

/* ================= 连线题 ================= */
.qarea-match {
  padding-top: 8px;
}

.q-stem {
  display: block;
  text-align: center;
  font-size: 16px;
  font-weight: 700;
  color: var(--ink);
  flex-shrink: 0;
}

.match-wrap {
  flex: 1;
  min-height: 0;
  display: flex;
  gap: 10px;
  margin-top: 10px;
}

.match-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  justify-content: center;
}

.mcard {
  flex: 1;
  max-height: 58px;
  min-height: 42px;
  background: var(--card);
  border-radius: 14px;
  border: 2px solid transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 8px;
  box-shadow: var(--sh-1);
  transition: border-color 0.18s ease, background 0.18s ease, transform 0.18s ease;
}

.mcard:active {
  transform: scale(0.97);
}

.mcard-text {
  font-size: 15px;
  font-weight: 700;
  color: var(--ink);
  text-align: center;
}

.mcard-zh .mcard-text {
  font-size: 14px;
  color: var(--ink-2);
}

.mcard.sel {
  border-color: var(--primary);
  background: var(--primary-soft);
  transform: scale(1.03);
}

.mcard.done {
  background: var(--mint-light);
  border-color: var(--mint);
}

.mcard.done .mcard-text {
  color: var(--mint-ink);
}

.mcard.shake {
  animation: shakeCartoon 0.52s ease;
}

.mcard-tick {
  position: absolute;
  margin-left: 74px;
  margin-top: -18px;
  font-size: 14px;
  color: var(--mint-ink);
  font-weight: 800;
}

.match-hint {
  flex-shrink: 0;
  height: 0;
  opacity: 0;
  overflow: hidden;
  transition: height 0.24s ease, opacity 0.24s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.match-hint.show {
  height: 30px;
  opacity: 1;
}

.match-hint text {
  font-size: 14px;
  font-weight: 700;
  color: var(--coral-ink);
}

/* ================= 拼写题 ================= */
.qarea-spell {
  justify-content: center;
  padding-bottom: 6px;
}

.spell-top {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
}

.spell-emoji {
  font-size: 38px;
  line-height: 1;
}

.spell-hint {
  margin-top: 6px;
  font-size: 19px;
  font-weight: 700;
  color: var(--ink);
  letter-spacing: 0.5px;
}

.q-stem-sm {
  display: block;
  margin-top: 5px;
  text-align: center;
  font-size: 14px;
  color: var(--ink-3);
  flex-shrink: 0;
}

.slots {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 6px;
  margin-top: 14px;
  flex-shrink: 0;
}

.slot {
  width: 34px;
  height: 42px;
  border-radius: 10px;
  background: var(--card);
  border: 2px dashed var(--line-strong);
  display: flex;
  align-items: center;
  justify-content: center;
}

.slot.filled {
  border-style: solid;
  border-color: var(--primary);
  background: var(--primary-soft);
}

.slot-ch {
  font-size: 22px;
  font-weight: 800;
  color: var(--primary-dark);
  text-transform: lowercase;
}

.tiles {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  margin-top: 16px;
  flex-shrink: 0;
}

.tile {
  min-width: 40px;
  height: 46px;
  padding: 0 8px;
  border-radius: 12px;
  background: var(--card);
  box-shadow: var(--sh-1);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.14s ease, opacity 0.14s ease;
}

.tile:active {
  transform: scale(0.92);
}

.tile.used {
  opacity: 0;
  pointer-events: none;
}

.tile-ch {
  font-size: 22px;
  font-weight: 800;
  color: var(--ink);
  text-transform: lowercase;
}

/* ================= 选择题 ================= */
.qarea-choice {
  padding-top: 6px;
}

.choice-top {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
}

.choice-emoji {
  font-size: 40px;
  line-height: 1;
}

.choice-prompt {
  margin-top: 6px;
  font-size: 16px;
  font-weight: 700;
  color: var(--ink-2);
  text-align: center;
}

.choice-prompt.big {
  font-size: 28px;
  color: var(--ink);
  letter-spacing: 1px;
}

.speak-btn {
  display: flex;
  align-items: center;
  margin-top: 10px;
  padding: 7px 16px;
  background: var(--grad-brand);
  border-radius: 999px;
  box-shadow: var(--sh-accent);
}

.speak-btn:active {
  transform: scale(0.95);
}

.speak-btn.playing {
  animation: beat 0.6s ease infinite;
}

.sb-icon {
  font-size: 17px;
}

.sb-text {
  margin-left: 6px;
  font-size: 14px;
  font-weight: 700;
  color: #fff;
}

.options {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  justify-content: center;
  margin-top: 10px;
  padding-bottom: 4px;
}

.opt {
  flex: 1;
  max-height: 56px;
  min-height: 44px;
  display: flex;
  align-items: center;
  padding: 0 12px;
  background: var(--card);
  border-radius: 15px;
  border: 2px solid transparent;
  box-shadow: var(--sh-1);
  transition: border-color 0.18s ease, background 0.18s ease, transform 0.14s ease;
}

.opt:active {
  transform: scale(0.98);
}

.opt-idx {
  width: 26px;
  height: 26px;
  border-radius: 8px;
  background: var(--primary-soft);
  color: var(--primary-dark);
  font-size: 14px;
  font-weight: 800;
  text-align: center;
  line-height: 26px;
  flex-shrink: 0;
}

.opt-text {
  flex: 1;
  min-width: 0;
  margin-left: 10px;
  font-size: 18px;
  font-weight: 700;
  color: var(--ink);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.opt.right {
  border-color: var(--mint);
  background: var(--mint-light);
}

.opt.right .opt-idx {
  background: var(--mint);
  color: var(--ink-on-accent);
}

.opt.right .opt-text {
  color: var(--mint-ink);
}

.opt.dim {
  opacity: 0.5;
}

.opt-tick {
  font-size: 17px;
  font-weight: 800;
  color: var(--mint-ink);
  flex-shrink: 0;
}

.opt.dim .opt-tick {
  color: var(--ink-3);
}

/* ---------- 空态 ---------- */
.prac-empty {
  align-items: center;
  justify-content: center;
}

.pe-emoji {
  font-size: 42px;
}

.pe-text {
  margin: 10px 0 16px;
  font-size: 15px;
  color: var(--ink-2);
}

/* ================= 底部 ================= */
.prac-foot {
  flex-shrink: 0;
  padding: 8px 14px calc(10px + env(safe-area-inset-bottom));
  background: var(--bg);
}

.feedback {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 36px;
  border-radius: 12px;
  margin-bottom: 8px;
  transition: background 0.2s ease;
}

.feedback.fb-idle {
  background: var(--card-2);
}

.feedback.fb-right {
  background: var(--mint-light);
}

.feedback.fb-wrong {
  background: var(--coral-light);
}

.fb-icon {
  font-size: 15px;
  margin-right: 6px;
}

.fb-text {
  font-size: 14px;
  font-weight: 700;
}

.fb-idle .fb-text {
  color: var(--ink-2);
}

.fb-right .fb-text {
  color: var(--mint-ink);
}

.fb-wrong .fb-text {
  color: var(--coral-ink);
}

.next-btn {
  width: 100%;
  height: 50px;
  font-size: 17px;
}

.next-btn[disabled] {
  background: var(--line);
  color: var(--ink-3);
  box-shadow: none;
}
</style>

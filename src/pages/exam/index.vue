<template>
  <view class="exam-page">
    <!-- ============ 结算视图（从练习页交卷回来） ============ -->
    <scroll-view v-if="done" class="ex-body" scroll-y>
      <view class="hero pop-in">
        <view class="hero-emoji star-in">{{ heroEmoji }}</view>
        <text class="hero-text">{{ heroText }}</text>
        <text class="hero-score">{{ lastScore }} / 10 题</text>
      </view>

      <view class="gem-card">
        <view class="gc-left">
          <text class="gc-title">本次获得</text>
          <view class="gc-gems">
            <text class="gc-num">+{{ gemsPaid }}</text>
            <text class="gc-icon">💎</text>
          </view>
        </view>
        <view v-if="isDup" class="gc-dup">
          <text class="gcd-text">同套题已领过</text>
          <text class="gcd-raw">按规则应得 {{ gemsRaw }}</text>
        </view>
      </view>

      <view v-if="missedCount" class="tip-card">
        <text class="tc-icon">📕</text>
        <view class="tc-body">
          <text class="tc-title">有 {{ missedCount }} 个单词需要巩固</text>
          <text class="tc-sub">已经放进错题本啦</text>
        </view>
        <text class="tc-go" @tap="goWrongbook">去看看 ›</text>
      </view>

      <view class="actions">
        <button class="btn btn-primary act-main" @tap="takeExam">再考一次 📝</button>
        <button class="btn btn-ghost act-sub" @tap="goHome">回到首页</button>
      </view>

      <view class="bottom-space"></view>
    </scroll-view>

    <!-- ============ 考试首页 ============ -->
    <scroll-view v-else class="ex-body" scroll-y>
      <!-- 顶部卡片 -->
      <view class="intro-card">
        <text class="ic-emoji floaty">📝</text>
        <text class="ic-title">英语小测验</text>
        <text class="ic-sub">10 道题，全部来自你学过的单词</text>

        <view class="ic-rules">
          <view class="icr-row">
            <text class="icr-badge perfect">全对</text>
            <text class="icr-text">得 10 颗宝石</text>
          </view>
          <view class="icr-row">
            <text class="icr-badge good">对 9 题</text>
            <text class="icr-text">得 9 颗宝石</text>
          </view>
          <view class="icr-row">
            <text class="icr-badge good">对 8 题</text>
            <text class="icr-text">得 8 颗宝石</text>
          </view>
          <view class="icr-row">
            <text class="icr-badge bad">8 题以下</text>
            <text class="icr-text">下轮再来，加油！</text>
          </view>
        </view>
      </view>

      <!-- 统计 -->
      <view class="stats-row">
        <view class="st-box">
          <text class="stb-num">{{ stats.times }}</text>
          <text class="stb-label">考试次数</text>
        </view>
        <view class="st-box">
          <text class="stb-num">{{ stats.best }}</text>
          <text class="stb-label">最好成绩</text>
        </view>
        <view class="st-box">
          <text class="stb-num stb-gem">{{ stats.totalGems }}</text>
          <text class="stb-label">累计夺得宝石</text>
        </view>
      </view>

      <!-- 开始按钮 -->
      <button class="btn btn-primary start-btn" :disabled="!canStart" @tap="takeExam">
        {{ canStart ? '开始考试 📝' : poolHint }}
      </button>
      <text v-if="!canStart" class="pool-tip">{{ poolHint }}</text>

      <!-- 历史 -->
      <view class="sec-head" v-if="history.length">
        <text class="sec-title">考试记录</text>
      </view>

      <view v-if="history.length" class="hist-list">
        <view v-for="(h, i) in history" :key="i" class="hist-item">
          <view class="hi-score" :class="scoreClass(h.score)">
            <text class="his-num">{{ h.score }}</text>
            <text class="his-total">/{{ h.total }}</text>
          </view>
          <view class="hi-body">
            <text class="hi-main">{{ scoreText(h.score) }}</text>
            <text class="hi-time">{{ h.timeText }}</text>
          </view>
          <view class="hi-gems">
            <text class="hig-num">+{{ h.gems }}</text>
            <text class="hig-icon">💎</text>
          </view>
        </view>
      </view>

      <view v-else class="empty-box">
        <text class="eb-emoji">🌱</text>
        <text class="eb-text">还没有考试记录，先考一次试试吧</text>
      </view>

      <view class="bottom-space"></view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { useExam } from '@/composables/useExam'
import { useWrongBook } from '@/composables/useWrongBook'
import { useQuizSessionSingleton } from '@/composables/useQuizSession'
import { refreshAll } from '@/composables/refresh'

const { currentQuestions, history, stats, poolSize, lastResult, lastScore, reload, start } = useExam()
const { count: wrongCount } = useWrongBook()
const session = useQuizSessionSingleton()

const done = ref(false)

const canStart = computed(() => poolSize.value >= 4)

const poolHint = computed(() => {
  const n = poolSize.value
  if (n >= 4) return ''
  return `至少要学过 4 个单词才能考试（现在 ${n} 个）`
})

const missedCount = computed(() => wrongCount.value)
const gemsPaid = computed(() => lastResult.value?.paid ?? 0)
const gemsRaw = computed(() => lastResult.value?.raw ?? 0)
const isDup = computed(() => !!lastResult.value?.dup)

const heroEmoji = computed(() => {
  const s = lastScore.value
  if (s === 10) return '🏆'
  if (s >= 9) return '🌟'
  if (s >= 8) return '😃'
  if (s >= 6) return '💪'
  return '🌱'
})

const heroText = computed(() => {
  const s = lastScore.value
  if (s === 10) return '全对！太厉害啦！'
  if (s >= 9) return '差一点点就全对！'
  if (s >= 8) return '考得不错，继续加油！'
  if (s >= 6) return '有进步，再来一次吧'
  return '没关系，多练几遍就记住啦'
})

function scoreClass(s: number) {
  if (s >= 9) return 'is-top'
  if (s >= 8) return 'is-good'
  return 'is-low'
}

function scoreText(s: number) {
  if (s === 10) return '全部答对 🎉'
  if (s >= 8) return `答对 ${s} 题`
  return `答对 ${s} 题，再练一练`
}

function takeExam() {
  reload()
  if (poolSize.value < 4) {
    uni.showToast({ title: '学过的单词还不够哦', icon: 'none' })
    return
  }
  const r = start()
  if (!r.ok || !currentQuestions.value.length) {
    uni.showToast({ title: '出题失败，多学几个词再试试', icon: 'none' })
    return
  }
  done.value = false
  session.startExam(currentQuestions.value)
  uni.navigateTo({ url: '/pages/practice/index?mode=exam' })
}

function goHome() {
  uni.switchTab({ url: '/pages/home/index' })
}
function goWrongbook() {
  uni.navigateTo({ url: '/pages/wrongbook/index' })
}

onLoad((opts) => {
  reload()
  if (opts && (opts as any).done) {
    done.value = true
  }
})

onShow(() => {
  reload()
  // 从练习页 redirect 回来时带 done=1（onLoad 只在首次触发，这里补一次）
  const pages = getCurrentPages()
  const cur: any = pages[pages.length - 1]
  if (cur && cur.options && cur.options.done) done.value = true
})
</script>

<style lang="scss" scoped>
.exam-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background: var(--bg);
}

.ex-body {
  flex: 1;
  min-height: 0;
  padding: 14px 14px 0;
}

/* ================= 结算 ================= */
.hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: var(--card);
  border-radius: 22px;
  padding: 22px 16px 18px;
  box-shadow: var(--sh-1);
}

.hero-emoji {
  font-size: 54px;
  line-height: 1;
}

.hero-text {
  margin-top: 10px;
  font-size: 19px;
  font-weight: 800;
  color: var(--ink);
  text-align: center;
}

.hero-score {
  margin-top: 6px;
  font-size: 26px;
  font-weight: 800;
  color: var(--primary);
  letter-spacing: 1px;
}

.gem-card {
  margin-top: 12px;
  background: linear-gradient(130deg, #fffdf5 0%, var(--sun-light) 100%);
  border: 2px solid #ffe08a;
  border-radius: 18px;
  padding: 15px 17px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.gc-title {
  display: block;
  font-size: 14px;
  color: var(--sun-ink);
  font-weight: 700;
}

.gc-gems {
  display: flex;
  align-items: baseline;
  margin-top: 3px;
}

.gc-num {
  font-size: 32px;
  font-weight: 800;
  color: var(--sun-ink);
  line-height: 1;
}

.gc-icon {
  font-size: 17px;
  margin-left: 4px;
}

.gc-dup {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
}

.gcd-text {
  font-size: 14px;
  font-weight: 700;
  color: var(--sun-ink);
}

.gcd-raw {
  margin-top: 2px;
  font-size: 14px;
  color: var(--sun-ink);
}

.tip-card {
  display: flex;
  align-items: center;
  margin-top: 12px;
  background: var(--card);
  border-radius: 16px;
  padding: 13px 14px;
  box-shadow: var(--sh-1);
}

.tc-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.tc-body {
  flex: 1;
  min-width: 0;
  margin-left: 10px;
}

.tc-title {
  display: block;
  font-size: 14px;
  font-weight: 700;
  color: var(--ink);
}

.tc-sub {
  display: block;
  margin-top: 2px;
  font-size: 14px;
  color: var(--ink-3);
}

.tc-go {
  font-size: 14px;
  font-weight: 700;
  color: var(--primary);
}

.actions {
  margin-top: 18px;
}

.act-main {
  width: 100%;
  height: 50px;
  font-size: 17px;
}

.act-sub {
  width: 100%;
  height: 44px;
  margin-top: 10px;
  font-size: 14px;
}

/* ================= 考试首页 ================= */
.intro-card {
  background: var(--grad-brand);
  border-radius: 22px;
  padding: 20px 18px 18px;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: var(--sh-accent);
}

.ic-emoji {
  font-size: 46px;
  line-height: 1;
}

.ic-title {
  margin-top: 10px;
  font-size: 22px;
  font-weight: 800;
  color: #fff;
  letter-spacing: 1px;
}

.ic-sub {
  margin-top: 5px;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.82);
  text-align: center;
}

.ic-rules {
  width: 100%;
  margin-top: 15px;
  background: rgba(255, 255, 255, 0.14);
  border-radius: 14px;
  padding: 11px 13px;
}

.icr-row {
  display: flex;
  align-items: center;
  padding: 3px 0;
}

.icr-badge {
  width: 62px;
  text-align: center;
  padding: 2px 0;
  border-radius: 7px;
  font-size: 14px;
  font-weight: 800;
  flex-shrink: 0;
}

.icr-badge.perfect {
  background: #ffd469;
  color: #402a00;
}
.icr-badge.good {
  background: #7df0da;
  color: #06342b;
}
.icr-badge.bad {
  background: rgba(255, 255, 255, 0.92);
  color: #3b2490;
}

.icr-text {
  margin-left: 10px;
  font-size: 14px;
  color: #fff;
  font-weight: 600;
}

/* ---------- 统计 ---------- */
.stats-row {
  display: flex;
  gap: 10px;
  margin-top: 12px;
}

.st-box {
  flex: 1;
  background: var(--card);
  border-radius: 15px;
  padding: 13px 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: var(--sh-1);
}

.stb-num {
  font-size: 21px;
  font-weight: 800;
  color: var(--primary);
  line-height: 1.1;
}

.stb-num.stb-gem {
  color: var(--sun);
}

.stb-label {
  margin-top: 3px;
  font-size: 14px;
  color: var(--ink-3);
  text-align: center;
}

.start-btn {
  width: 100%;
  height: 52px;
  margin-top: 16px;
  font-size: 17px;
}

.start-btn[disabled] {
  background: var(--line);
  color: var(--ink-3);
  box-shadow: none;
}

.pool-tip {
  display: block;
  margin-top: 9px;
  text-align: center;
  font-size: 14px;
  color: var(--ink-3);
}

/* ---------- 历史 ---------- */
.sec-head {
  margin: 20px 0 10px;
  padding: 0 2px;
}

.sec-title {
  font-size: 16px;
  font-weight: 800;
  color: var(--ink);
}

.hist-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.hist-item {
  display: flex;
  align-items: center;
  background: var(--card);
  border-radius: 15px;
  padding: 11px 13px;
  box-shadow: var(--sh-1);
}

.hi-score {
  width: 52px;
  height: 40px;
  border-radius: 12px;
  display: flex;
  align-items: baseline;
  justify-content: center;
  flex-shrink: 0;
}

.hi-score.is-top {
  background: var(--sun-light);
}
.hi-score.is-good {
  background: var(--mint-light);
}
.hi-score.is-low {
  background: var(--card-2);
}

.his-num {
  font-size: 20px;
  font-weight: 800;
  line-height: 1.5;
}

.hi-score.is-top .his-num {
  color: var(--sun-ink);
}
.hi-score.is-good .his-num {
  color: var(--mint-ink);
}
.hi-score.is-low .his-num {
  color: var(--ink-3);
}

.his-total {
  font-size: 14px;
  color: var(--ink-3);
}

.hi-body {
  flex: 1;
  min-width: 0;
  margin-left: 11px;
}

.hi-main {
  display: block;
  font-size: 14px;
  font-weight: 700;
  color: var(--ink);
}

.hi-time {
  display: block;
  margin-top: 2px;
  font-size: 14px;
  color: var(--ink-3);
}

.hi-gems {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.hig-num {
  font-size: 15px;
  font-weight: 800;
  color: var(--sun);
}

.hig-icon {
  font-size: 14px;
  margin-left: 3px;
}

.empty-box {
  margin-top: 30px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.eb-emoji {
  font-size: 40px;
}

.eb-text {
  margin-top: 10px;
  font-size: 14px;
  color: var(--ink-3);
}

.bottom-space {
  height: 20px;
}
</style>

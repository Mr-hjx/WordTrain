<template>
  <view class="chest-page">
    <!-- ============ 阶段一：开宝箱 ============ -->
    <view v-if="!opened" class="stage-open">
      <text class="open-title">{{ mode === 'wrong' ? '错题巩固完成！' : '本堂课结束啦！' }}</text>
      <text class="open-sub">点一下宝箱，看看收获了什么～</text>

      <view class="chest-box" @tap="open">
        <view class="chest-glow glow-pulse"></view>
        <view class="chest-emoji chest-shake">🎁</view>
      </view>

      <view class="open-hint">
        <text class="oh-text">👆 点宝箱打开</text>
      </view>
    </view>

    <!-- ============ 阶段二：结算 ============ -->
    <scroll-view v-else class="stage-result" scroll-y>
      <!-- 战果头部 -->
      <view class="hero pop-in">
        <view class="hero-emoji star-in">{{ hero.emoji }}</view>
        <text class="hero-text">{{ hero.text }}</text>

        <view class="hero-stats">
          <view class="hs-item">
            <text class="hs-num">{{ correct }}/{{ total }}</text>
            <text class="hs-label">答对题数</text>
          </view>
          <view class="hs-divider"></view>
          <view class="hs-item">
            <text class="hs-num hs-gem">+{{ gems }}</text>
            <text class="hs-label">获得宝石</text>
          </view>
          <view class="hs-divider"></view>
          <view class="hs-item">
            <text class="hs-num">{{ maxCombo }}</text>
            <text class="hs-label">最高连对</text>
          </view>
        </view>
      </view>

      <!-- 星光 -->
      <view class="stars-row">
        <text v-for="i in 3" :key="i" class="star" :class="{ on: i <= hero.stars }">⭐</text>
      </view>

      <!-- 新点亮的奖牌 -->
      <view v-if="newSmall.length || newBig.length" class="medal-sec">
        <text class="ms-title">🎉 点亮新奖牌啦</text>

        <view v-for="m in newBig" :key="m.id" class="medal-card big medal-light">
          <text class="mc-emoji">{{ m.emoji }}</text>
          <view class="mc-body">
            <text class="mc-name">{{ m.name }}</text>
            <text class="mc-desc">{{ m.desc }}</text>
          </view>
          <text class="mc-tag">大奖牌</text>
        </view>

        <view v-for="m in newSmall" :key="m.id" class="medal-card small medal-light">
          <text class="mc-emoji">{{ m.emoji }}</text>
          <view class="mc-body">
            <text class="mc-name">{{ m.name }}</text>
            <text class="mc-desc">{{ m.desc }}</text>
          </view>
          <text class="mc-tag">小奖牌</text>
        </view>
      </view>

      <!-- 本堂课进度 -->
      <view class="progress-card">
        <view class="pc-head">
          <text class="pc-title">本堂课进度</text>
          <text class="pc-num">{{ progress.intoClass }}/{{ progress.need }} 💎</text>
        </view>
        <view class="pc-bar-wrap">
          <view class="pc-bar" :style="{ width: progress.percent + '%' }"></view>
        </view>
        <text class="pc-tip">再攒 {{ progress.left }} 颗宝石，就能点亮下一枚小奖牌啦</text>
      </view>

      <!-- 错题提示 -->
      <view v-if="missedCount" class="wrong-tip">
        <text class="wt-icon">📕</text>
        <view class="wt-body">
          <text class="wt-title">有 {{ missedCount }} 个单词还不太熟</text>
          <text class="wt-sub">已自动放进错题本，随时可以再练一次</text>
        </view>
        <text class="wt-go" @tap="goWrongbook">去看看 ›</text>
      </view>
      <view v-else class="allright-tip">
        <text class="at-icon">🌟</text>
        <text class="at-text">全部答对，太厉害啦！</text>
      </view>

      <!-- 操作 -->
      <view class="actions">
        <button class="btn btn-primary act-main" @tap="goHome">回到首页</button>
        <view class="act-row">
          <button class="btn btn-ghost act-mini" @tap="goMedals">我的奖牌</button>
          <button class="btn btn-ghost act-mini" @tap="practiceAgain">再练一次</button>
        </view>
      </view>

      <view class="bottom-space"></view>
    </scroll-view>

    <!-- 彩带 -->
    <view v-if="opened" class="confetti-box">
      <view v-for="i in 14" :key="i" class="confetti" :style="confettiStyle(i)"></view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { useQuizSessionSingleton } from '@/composables/useQuizSession'
import { useMedals } from '@/composables/useMedals'
import { useGems } from '@/composables/useGems'
import { useWrongBook } from '@/composables/useWrongBook'
import { useBank } from '@/composables/useBank'
import { praise } from '@/utils/date'

const session = useQuizSessionSingleton()
const { pendingNew } = useMedals()
const { progress } = useGems()
const { count: wrongCount } = useWrongBook()
const { todayWords } = useBank()

const opened = ref(false)
/** 结算快照（开箱瞬间冻结，避免后续依赖被重置） */
const snapshot = ref({
  total: 0,
  correct: 0,
  rate: 0,
  gems: 0,
  maxCombo: 0,
  missed: 0
})

const mode = computed(() => session.mode.value)
const total = computed(() => snapshot.value.total)
const correct = computed(() => snapshot.value.correct)
const gems = computed(() => snapshot.value.gems)
const maxCombo = computed(() => snapshot.value.maxCombo)

const hero = computed(() => praise(snapshot.value.rate))

const newSmall = computed(() => pendingNew.value.small)
const newBig = computed(() => pendingNew.value.big)

const missedCount = computed(() => snapshot.value.missed)

const CONFETTI_COLORS = ['#FFC442', '#7C5CFF', '#2ED3B7', '#FF6B81', '#4DA6FF', '#FF9F43']

function confettiStyle(i: number) {
  const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length]
  const left = (i * 7.3) % 100
  const delay = (i % 7) * 0.18
  const duration = 1.6 + (i % 5) * 0.32
  return {
    left: left + '%',
    background: color,
    animationDelay: delay + 's',
    animationDuration: duration + 's'
  }
}

function open() {
  opened.value = true
}

function goHome() {
  uni.switchTab({ url: '/pages/home/index' })
}
function goMedals() {
  uni.navigateTo({ url: '/pages/medals/index' })
}
function goWrongbook() {
  uni.navigateTo({ url: '/pages/wrongbook/index' })
}

function practiceAgain() {
  if (mode.value === 'wrong') {
    const r = session.startWrong()
    if (!r.count) {
      uni.showToast({ title: '错题本空啦，太棒了！', icon: 'none' })
      return
    }
  } else {
    session.startDaily(todayWords.value)
  }
  uni.redirectTo({ url: '/pages/practice/index?mode=' + mode.value })
}

onLoad(() => {
  // 冻结结算数据（session.finish() 已在练习页调用过）
  snapshot.value = {
    total: session.total.value,
    correct: session.correct.value,
    rate: session.total.value ? session.correct.value / session.total.value : 0,
    gems: session.gemsEarned.value,
    maxCombo: session.maxCombo.value,
    missed: wrongCount.value
  }
})
</script>

<style lang="scss" scoped>
.chest-page {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background: linear-gradient(170deg, #f8f6ff 0%, #efeaff 100%);
}

/* ================= 开箱阶段 ================= */
.stage-open {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0 24px;
}

.open-title {
  font-size: 25px;
  font-weight: 800;
  color: var(--ink);
  letter-spacing: 1px;
}

.open-sub {
  margin-top: 8px;
  font-size: 14px;
  color: var(--ink-2);
}

.chest-box {
  position: relative;
  margin-top: 40px;
  width: 170px;
  height: 170px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chest-glow {
  position: absolute;
  width: 170px;
  height: 170px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 196, 66, 0.55) 0%, rgba(255, 196, 66, 0) 70%);
}

.chest-emoji {
  font-size: 104px;
  line-height: 1;
  position: relative;
}

.open-hint {
  margin-top: 34px;
}

.oh-text {
  font-size: 15px;
  font-weight: 700;
  color: var(--primary);
}

/* ================= 结算阶段 ================= */
.stage-result {
  flex: 1;
  min-height: 0;
  padding: 14px 14px 0;
}

.hero {
  background: #fff;
  border-radius: 22px;
  padding: 20px 16px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 8px 26px rgba(124, 92, 255, 0.12);
}

.hero-emoji {
  font-size: 52px;
  line-height: 1;
}

.hero-text {
  margin-top: 8px;
  font-size: 19px;
  font-weight: 800;
  color: var(--ink);
  text-align: center;
}

.hero-stats {
  display: flex;
  align-items: center;
  width: 100%;
  margin-top: 16px;
  padding: 12px 0;
  background: #f8f7ff;
  border-radius: 14px;
}

.hs-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.hs-num {
  font-size: 21px;
  font-weight: 800;
  color: var(--primary);
  line-height: 1.1;
}

.hs-num.hs-gem {
  color: var(--sun);
}

.hs-label {
  margin-top: 2px;
  font-size: 12px;
  color: var(--ink-3);
}

.hs-divider {
  width: 1px;
  height: 24px;
  background: var(--line);
}

.stars-row {
  display: flex;
  justify-content: center;
  gap: 6px;
  margin-top: 12px;
}

.star {
  font-size: 24px;
  opacity: 0.25;
  filter: grayscale(1);
}

.star.on {
  opacity: 1;
  filter: none;
}

/* ---------- 新奖牌 ---------- */
.medal-sec {
  margin-top: 16px;
}

.ms-title {
  display: block;
  font-size: 15px;
  font-weight: 800;
  color: var(--ink);
  margin-bottom: 9px;
  padding-left: 2px;
}

.medal-card {
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 16px;
  padding: 12px 14px;
  margin-bottom: 9px;
  box-shadow: 0 4px 16px rgba(124, 92, 255, 0.09);
}

.medal-card.big {
  background: linear-gradient(120deg, #fffbee 0%, #fff4d6 100%);
  border: 2px solid #ffe08a;
}

.mc-emoji {
  font-size: 32px;
  line-height: 1;
  flex-shrink: 0;
}

.mc-body {
  flex: 1;
  min-width: 0;
  margin-left: 11px;
}

.mc-name {
  display: block;
  font-size: 15px;
  font-weight: 800;
  color: var(--ink);
}

.mc-desc {
  display: block;
  margin-top: 2px;
  font-size: 12px;
  color: var(--ink-3);
}

.mc-tag {
  font-size: 12px;
  font-weight: 700;
  padding: 2px 7px;
  border-radius: 999px;
  background: #ede8ff;
  color: var(--primary-dark);
  flex-shrink: 0;
}

.medal-card.big .mc-tag {
  background: #ffe08a;
  color: #8a5b00;
}

/* ---------- 进度 ---------- */
.progress-card {
  margin-top: 8px;
  background: #fff;
  border-radius: 18px;
  padding: 14px 16px;
  box-shadow: 0 4px 16px rgba(124, 92, 255, 0.07);
}

.pc-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.pc-title {
  font-size: 14px;
  font-weight: 700;
  color: var(--ink);
}

.pc-num {
  font-size: 14px;
  font-weight: 800;
  color: var(--sun);
}

.pc-bar-wrap {
  margin-top: 10px;
  height: 9px;
  background: #f0edfa;
  border-radius: 999px;
  overflow: hidden;
}

.pc-bar {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #ffe08a 0%, #ffc442 100%);
  transition: width 0.6s ease;
}

.pc-tip {
  display: block;
  margin-top: 8px;
  font-size: 12px;
  color: var(--ink-3);
}

/* ---------- 错题提示 ---------- */
.wrong-tip,
.allright-tip {
  display: flex;
  align-items: center;
  margin-top: 12px;
  background: #fff;
  border-radius: 16px;
  padding: 13px 14px;
  box-shadow: 0 3px 14px rgba(124, 92, 255, 0.06);
}

.allright-tip {
  justify-content: center;
}

.at-icon {
  font-size: 20px;
  margin-right: 7px;
}

.at-text {
  font-size: 14px;
  font-weight: 700;
  color: #d98a00;
}

.wt-icon {
  font-size: 24px;
  flex-shrink: 0;
}

.wt-body {
  flex: 1;
  min-width: 0;
  margin-left: 10px;
}

.wt-title {
  display: block;
  font-size: 14px;
  font-weight: 700;
  color: var(--ink);
}

.wt-sub {
  display: block;
  margin-top: 2px;
  font-size: 12px;
  color: var(--ink-3);
}

.wt-go {
  font-size: 13px;
  font-weight: 700;
  color: var(--primary);
  flex-shrink: 0;
}

/* ---------- 操作 ---------- */
.actions {
  margin-top: 18px;
}

.act-main {
  width: 100%;
  height: 50px;
  font-size: 17px;
}

.act-row {
  display: flex;
  gap: 10px;
  margin-top: 10px;
}

.act-mini {
  flex: 1;
  height: 44px;
  font-size: 14px;
}

.bottom-space {
  height: 20px;
}

/* ---------- 彩带 ---------- */
.confetti-box {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  pointer-events: none;
  overflow: hidden;
}

.confetti {
  position: absolute;
  top: -12px;
  width: 7px;
  height: 13px;
  border-radius: 2px;
  animation-name: confettiFall;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
}

@keyframes confettiFall {
  0% {
    transform: translateY(-20px) rotate(0deg);
    opacity: 0;
  }
  10% {
    opacity: 1;
  }
  100% {
    transform: translateY(105vh) rotate(560deg);
    opacity: 0.9;
  }
}
</style>

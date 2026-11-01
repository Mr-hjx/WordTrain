<template>
  <view class="home-page">
    <!-- 顶部：宝石栏 -->
    <view class="home-top">
      <GemBar theme="light" @wall="goMedals" />
    </view>

    <!-- 主体滚动区 -->
    <scroll-view class="home-body" scroll-y>
      <!-- 今日卡片 -->
      <view class="today-card fade-up">
        <view class="tc-head">
          <view class="tc-left">
            <text class="tc-date">{{ todayFriendly }}</text>
            <text class="tc-tip">{{ classInfo.text }}</text>
          </view>
          <view class="tc-emoji floaty">🚂</view>
        </view>

        <view class="tc-stats">
          <view class="tc-stat">
            <text class="tcs-num">{{ todayWords.length }}</text>
            <text class="tcs-label">{{ todayWordsFallback ? '可练习单词' : '今日单词' }}</text>
          </view>
          <view class="tc-divider"></view>
          <view class="tc-stat">
            <text class="tcs-num">{{ totalWords }}</text>
            <text class="tcs-label">累计学过</text>
          </view>
          <view class="tc-divider"></view>
          <view class="tc-stat">
            <text class="tcs-num">{{ streak }}</text>
            <text class="tcs-label">连续练习</text>
          </view>
        </view>

        <!-- 今天没录入，但回退到了最近一次内容 -->
        <view v-if="todayWordsFallback" class="tc-fallback">
          <text class="tcf-text">今天还没录入新内容，先练习 {{ fallbackDateText }} 的单词吧</text>
        </view>

        <!-- 未录入今日内容 -->
        <view v-if="!todayWords.length" class="tc-empty">
          <text class="tce-text">今天还没有录入单词哦</text>
          <button class="btn btn-primary tc-btn" @tap="goInput">去录入今天的单词</button>
        </view>

        <!-- 已录入：预览 + 开始 -->
        <view v-else class="tc-ready">
          <view class="word-chips">
            <view v-for="w in todayWords.slice(0, 6)" :key="w.id" class="wchip">
              <text class="wchip-emoji">{{ w.emoji }}</text>
              <text class="wchip-en">{{ w.en }}</text>
            </view>
            <view v-if="todayWords.length > 6" class="wchip wchip-more">
              <text class="wchip-en">+{{ todayWords.length - 6 }}</text>
            </view>
          </view>
          <button class="btn btn-primary tc-btn" @tap="startDaily">
            {{ todayWordsFallback ? '开始练习 🎯' : '开始今天的练习 🎯' }}
          </button>
        </view>
      </view>

      <!-- 快捷入口 -->
      <view class="quick-grid">
        <view class="qcard" @tap="goInput">
          <view class="qcard-emoji" style="background: var(--primary-soft)">✍️</view>
          <text class="qcard-title">录入单词</text>
          <text class="qcard-sub">把今天的课堂内容记进来</text>
        </view>
        <view class="qcard" @tap="goWrongbook">
          <view class="qcard-emoji" style="background: var(--coral-light)">📕</view>
          <text class="qcard-title">错题本</text>
          <text class="qcard-sub">{{ wrongCount ? wrongCount + ' 个待巩固' : '暂时没有错题' }}</text>
        </view>
        <view class="qcard" @tap="goMedals">
          <view class="qcard-emoji" style="background: var(--sun-light)">🏅</view>
          <text class="qcard-title">我的奖牌</text>
          <text class="qcard-sub">{{ medalText }}</text>
        </view>
        <view class="qcard" @tap="switchExam">
          <view class="qcard-emoji" style="background: var(--mint-light)">📝</view>
          <text class="qcard-title">英语小测验</text>
          <text class="qcard-sub">10 道题，全对 10 宝石</text>
        </view>
      </view>

      <!-- 学习记录 -->
      <view class="sec">
        <view class="sec-head">
          <text class="sec-title">学习记录</text>
          <text class="sec-more" v-if="records.length">{{ records.length }} 条</text>
        </view>

        <view v-if="!records.length" class="empty-box">
          <text class="eb-emoji">🌱</text>
          <text class="eb-text">还没有练习记录，从今天的单词开始吧</text>
        </view>

        <view v-else class="rec-list">
          <view v-for="(r, i) in records.slice(0, 8)" :key="i" class="rec-item">
            <view class="rec-badge" :class="modeClass(r.mode)">
              {{ modeLabel(r.mode) }}
            </view>
            <view class="rec-body">
              <text class="rec-main">答对 {{ r.correct }}/{{ r.total }} 题</text>
              <text class="rec-time">{{ r.timeText }}</text>
            </view>
            <view class="rec-gems">
              <text class="rg-num">+{{ r.gems }}</text>
              <text class="rg-icon">💎</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 词库 -->
      <view class="sec" v-if="groups.length">
        <view class="sec-head">
          <text class="sec-title">我的词库</text>
          <text class="sec-more">{{ groups.length }} 天</text>
        </view>
        <view v-for="g in groups.slice(0, 5)" :key="g.date" class="bank-group">
          <view class="bg-head">
            <text class="bg-date">{{ g.friendly }}</text>
            <text v-if="g.isToday" class="bg-today">今天</text>
            <text class="bg-count">{{ g.words.length }} 词</text>
          </view>
          <view class="bg-words">
            <text v-for="w in g.words" :key="w.id" class="bg-word">{{ w.en }}</text>
          </view>
        </view>
      </view>

      <view class="bottom-space"></view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import GemBar from '@/components/GemBar.vue'
import { useBank } from '@/composables/useBank'
import { useDate } from '@/composables/useDate'
import { useRecords } from '@/composables/useRecords'
import { useWrongBook } from '@/composables/useWrongBook'
import { useMedals } from '@/composables/useMedals'
import { useQuizSessionSingleton } from '@/composables/useQuizSession'
import { refreshAll } from '@/composables/refresh'

const { todayWords, todayWordsFallback, todayWordsDate, totalWords, groups } = useBank()
const { todayFriendly, classInfo } = useDate()
const { records, streak } = useRecords()
const { count: wrongCount } = useWrongBook()
const { stats } = useMedals()
const session = useQuizSessionSingleton()

const medalText = computed(() => `小奖牌 ${stats.value.smallGot}/${stats.value.smallTotal}`)

/** 回退来源日期的友好文案，如「10月12日 周一」 */
const fallbackDateText = computed(() => {
  const k = todayWordsDate.value
  if (!k) return '上次'
  const [y, m, d] = k.split('-').map((s) => parseInt(s, 10))
  if (!y || !m || !d) return '上次'
  const week = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][new Date(y, m - 1, d).getDay()]
  return `${m}月${d}日 ${week}`
})

onShow(() => refreshAll())

function goInput() {
  uni.navigateTo({ url: '/pages/input/index' })
}
function goWrongbook() {
  uni.navigateTo({ url: '/pages/wrongbook/index' })
}
function goMedals() {
  uni.navigateTo({ url: '/pages/medals/index' })
}
function switchExam() {
  uni.switchTab({ url: '/pages/exam/index' })
}

function startDaily() {
  const n = session.startDaily(todayWords.value)
  if (!n) {
    uni.showToast({ title: '单词太少，先多录入几个吧', icon: 'none' })
    return
  }
  uni.navigateTo({ url: '/pages/practice/index?mode=daily' })
}

function modeLabel(m: string) {
  return m === 'exam' ? '考试' : m === 'wrong' ? '错题' : '每日'
}
function modeClass(m: string) {
  return m === 'exam' ? 'is-exam' : m === 'wrong' ? 'is-wrong' : 'is-daily'
}
</script>

<style lang="scss" scoped>
.home-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--bg);
}

.home-top {
  padding: 4px 0 6px;
  background: var(--grad-brand-soft);
  border-bottom: 1px solid var(--line);
  flex-shrink: 0;
}

.home-body {
  flex: 1;
  min-height: 0;
  padding: 0 14px;
}

/* ---------- 今日卡片 ---------- */
.today-card {
  margin-top: 12px;
  background: var(--card);
  border-radius: 20px;
  padding: 16px;
  box-shadow: var(--sh-1);
}

.tc-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
}

.tc-date {
  display: block;
  font-size: 20px;
  font-weight: 800;
  color: var(--ink);
}

.tc-tip {
  display: block;
  margin-top: 3px;
  font-size: 14px;
  color: var(--ink-2);
}

.tc-emoji {
  font-size: 34px;
  line-height: 1;
}

.tc-stats {
  display: flex;
  align-items: center;
  margin-top: 14px;
  padding: 12px 0;
  background: var(--card-2);
  border-radius: 14px;
}

.tc-stat {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.tcs-num {
  font-size: 22px;
  font-weight: 800;
  color: var(--primary);
  line-height: 1.1;
}

.tcs-label {
  margin-top: 2px;
  font-size: 14px;
  color: var(--ink-3);
}

.tc-divider {
  width: 1px;
  height: 24px;
  background: var(--line);
}

.tc-empty,
.tc-ready {
  margin-top: 14px;
}

/* 今日无词、回退到上次内容时的提示条 */
.tc-fallback {
  margin-top: 12px;
  padding: 8px 12px;
  border-radius: 10px;
  background: var(--sun-light);
  border: 1px solid rgba(255, 196, 66, 0.32);
}

.tcf-text {
  display: block;
  text-align: center;
  font-size: 14px;
  line-height: 1.5;
  color: var(--sun-ink);
}

.tce-text {
  display: block;
  text-align: center;
  font-size: 14px;
  color: var(--ink-2);
  margin-bottom: 10px;
}

.tc-btn {
  width: 100%;
  height: 48px;
  font-size: 16px;
}

.word-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-bottom: 12px;
}

.wchip {
  display: flex;
  align-items: center;
  padding: 5px 10px;
  background: var(--primary-soft);
  border-radius: 999px;
}

.wchip-emoji {
  font-size: 14px;
  margin-right: 4px;
}

.wchip-en {
  font-size: 14px;
  font-weight: 700;
  color: var(--primary-dark);
}

.wchip-more {
  background: var(--primary-light);
}

/* ---------- 快捷入口 ---------- */
.quick-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-top: 12px;
}

.qcard {
  width: calc(50% - 5px);
  background: var(--card);
  border-radius: 18px;
  padding: 14px;
  box-shadow: var(--sh-1);
}

.qcard:active {
  transform: scale(0.97);
}

.qcard-emoji {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.qcard-title {
  display: block;
  margin-top: 9px;
  font-size: 15px;
  font-weight: 700;
  color: var(--ink);
}

.qcard-sub {
  display: block;
  margin-top: 2px;
  font-size: 14px;
  color: var(--ink-3);
}

/* ---------- 区块 ---------- */
.sec {
  margin-top: 20px;
}

.sec-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  padding: 0 2px;
}

.sec-title {
  font-size: 17px;
  font-weight: 800;
  color: var(--ink);
}

.sec-more {
  font-size: 14px;
  color: var(--ink-3);
}

.empty-box {
  background: var(--card);
  border-radius: 16px;
  padding: 28px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.eb-emoji {
  font-size: 30px;
}

.eb-text {
  margin-top: 8px;
  font-size: 14px;
  color: var(--ink-3);
  text-align: center;
}

/* ---------- 记录 ---------- */
.rec-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rec-item {
  display: flex;
  align-items: center;
  background: var(--card);
  border-radius: 14px;
  padding: 11px 13px;
  box-shadow: var(--sh-1);
}

.rec-badge {
  width: 42px;
  height: 24px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 700;
  flex-shrink: 0;
}

.rec-badge.is-daily {
  background: var(--primary-soft);
  color: var(--primary-ink);
}
.rec-badge.is-wrong {
  background: var(--coral-light);
  color: var(--coral-ink);
}
.rec-badge.is-exam {
  background: var(--mint-light);
  color: var(--mint-ink);
}

.rec-body {
  flex: 1;
  min-width: 0;
  margin-left: 10px;
}

.rec-main {
  display: block;
  font-size: 14px;
  font-weight: 700;
  color: var(--ink);
}

.rec-time {
  display: block;
  margin-top: 2px;
  font-size: 14px;
  color: var(--ink-3);
}

.rec-gems {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.rg-num {
  font-size: 15px;
  font-weight: 800;
  color: var(--sun);
}

.rg-icon {
  font-size: 14px;
  margin-left: 3px;
}

/* ---------- 词库 ---------- */
.bank-group {
  background: var(--card);
  border-radius: 14px;
  padding: 12px 13px;
  margin-bottom: 8px;
}

.bg-head {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}

.bg-date {
  font-size: 14px;
  font-weight: 700;
  color: var(--ink);
}

.bg-today {
  margin-left: 6px;
  padding: 1px 6px;
  background: var(--primary);
  color: #fff;
  font-size: 14px;
  border-radius: 6px;
}

.bg-count {
  margin-left: auto;
  font-size: 14px;
  color: var(--ink-3);
}

.bg-words {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.bg-word {
  padding: 3px 9px;
  background: var(--card-2);
  border-radius: 999px;
  font-size: 14px;
  color: var(--ink-2);
}

.bottom-space {
  height: 20px;
}
</style>

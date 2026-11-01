<template>
  <view class="mine-page">
    <scroll-view class="m-body" scroll-y>
      <!-- ============ 头像区 ============ -->
      <view class="profile">
        <view class="avatar-ring">
          <view class="avatar">🚂</view>
        </view>
        <text class="pf-name">单词小火车</text>
        <text class="pf-slogan">{{ classInfo.text }}</text>

        <view class="pf-stats">
          <view class="pfs-item">
            <text class="pfs-num">{{ gemCount }}</text>
            <text class="pfs-label">宝石</text>
          </view>
          <view class="pfs-divider"></view>
          <view class="pfs-item">
            <text class="pfs-num">{{ medalStats.smallGot }}</text>
            <text class="pfs-label">小奖牌</text>
          </view>
          <view class="pfs-divider"></view>
          <view class="pfs-item">
            <text class="pfs-num">{{ medalStats.bigGot }}</text>
            <text class="pfs-label">大奖牌</text>
          </view>
          <view class="pfs-divider"></view>
          <view class="pfs-item">
            <text class="pfs-num">{{ streak }}</text>
            <text class="pfs-label">连续天数</text>
          </view>
        </view>
      </view>

      <!-- ============ 分组：学习 ============ -->
      <view class="cell-group">
        <view class="group-title">学习</view>

        <view class="cell" @tap="goWrongbook">
          <view class="cell-icon" style="background: #ffe9ed">📕</view>
          <view class="cell-body">
            <text class="cell-title">我的错题本</text>
            <text class="cell-value">{{ wrongCount ? `${wrongCount} 个待巩固` : '暂无错题' }}</text>
          </view>
          <view v-if="wrongCount" class="cell-badge">{{ wrongCount }}</view>
          <text class="cell-arrow">›</text>
        </view>

        <view class="cell" @tap="goMedals">
          <view class="cell-icon" style="background: #fff6e0">🏅</view>
          <view class="cell-body">
            <text class="cell-title">我的奖牌墙</text>
            <text class="cell-value">小 {{ medalStats.smallGot }}/{{ medalStats.smallTotal }} · 大 {{ medalStats.bigGot }}/{{ medalStats.bigTotal }}</text>
          </view>
          <text class="cell-arrow">›</text>
        </view>

        <view class="cell" @tap="switchExam">
          <view class="cell-icon" style="background: #e0fbf5">📝</view>
          <view class="cell-body">
            <text class="cell-title">英语小测验</text>
            <text class="cell-value">已考 {{ examStats.times }} 次 · 最好 {{ examStats.best }} 分</text>
          </view>
          <text class="cell-arrow">›</text>
        </view>

        <view class="cell" @tap="goInput">
          <view class="cell-icon" style="background: #eef0ff">✍️</view>
          <view class="cell-body">
            <text class="cell-title">录入单词</text>
            <text class="cell-value">共 {{ totalWords }} 个单词</text>
          </view>
          <text class="cell-arrow">›</text>
        </view>
      </view>

      <!-- ============ 分组：设置 ============ -->
      <view class="cell-group">
        <view class="group-title">设置</view>

        <view class="cell">
          <view class="cell-icon" style="background: #f0edfa">🔊</view>
          <view class="cell-body">
            <text class="cell-title">语音朗读</text>
            <text class="cell-value">听力题自动朗读单词</text>
          </view>
          <switch
            class="cell-switch"
            :checked="setting.voice"
            color="#7C5CFF"
            @change="onVoiceChange"
          />
        </view>

        <view class="cell">
          <view class="cell-icon" style="background: #f0edfa">✨</view>
          <view class="cell-body">
            <text class="cell-title">音效反馈</text>
            <text class="cell-value">答对时播放提示音</text>
          </view>
          <switch
            class="cell-switch"
            :checked="setting.sound"
            color="#7C5CFF"
            @change="onSoundChange"
          />
        </view>
      </view>

      <!-- ============ 分组：关于 ============ -->
      <view class="cell-group">
        <view class="group-title">关于</view>

        <view class="cell" @tap="showAbout">
          <view class="cell-icon" style="background: #f0edfa">ℹ️</view>
          <view class="cell-body">
            <text class="cell-title">关于单词小火车</text>
            <text class="cell-value">幼儿英语每日趣味练习 · v1.0.0</text>
          </view>
          <text class="cell-arrow">›</text>
        </view>

        <view class="cell" @tap="confirmReset">
          <view class="cell-icon" style="background: #ffe9ed">🧹</view>
          <view class="cell-body">
            <text class="cell-title cell-danger">清空学习数据</text>
            <text class="cell-value">宝石、奖牌、错题本全部重置</text>
          </view>
          <text class="cell-arrow">›</text>
        </view>
      </view>

      <text class="footer-note">坚持每天练一练，单词记得更牢 💪</text>

      <view class="bottom-space"></view>
    </scroll-view>

    <!-- 清空学习数据 二次确认弹窗 -->
    <ConfirmDialog
      v-model:visible="resetVisible"
      title="清空学习数据？"
      content="宝石、奖牌、错题本都会重置为初始状态，不可恢复。"
      confirm-text="全部重置"
      @confirm="doReset"
    />
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useGems } from '@/composables/useGems'
import { useMedals } from '@/composables/useMedals'
import { useWrongBook } from '@/composables/useWrongBook'
import { useBank } from '@/composables/useBank'
import { useExam } from '@/composables/useExam'
import { useRecords } from '@/composables/useRecords'
import { useDate } from '@/composables/useDate'
import { refreshAll } from '@/composables/refresh'

const { gemCount, reset } = useGems()
const { stats: medalStats } = useMedals()
const { count: wrongCount, clear: clearWrong } = useWrongBook()
const { totalWords } = useBank()
const { stats: examStats } = useExam()
const { setting, streak, updateSetting } = useRecords()
const { classInfo } = useDate()

onShow(() => refreshAll())

function goWrongbook() {
  uni.navigateTo({ url: '/pages/wrongbook/index' })
}
function goMedals() {
  uni.navigateTo({ url: '/pages/medals/index' })
}
function goInput() {
  uni.navigateTo({ url: '/pages/input/index' })
}
function switchExam() {
  uni.switchTab({ url: '/pages/exam/index' })
}

function onVoiceChange(e: any) {
  updateSetting({ voice: !!e.detail.value })
}
function onSoundChange(e: any) {
  updateSetting({ sound: !!e.detail.value })
}

function showAbout() {
  uni.showModal({
    title: '单词小火车',
    content:
      '给小朋友的英语单词练习小工具。\n\n家长录入课堂单词，孩子通过 4 种趣味题型练习：听音选词、看中文选英文、字母拼单词、连线配对。\n\n答对得宝石，宝石可以点亮奖牌 🏅',
    showCancel: false,
    confirmText: '知道啦'
  })
}

function confirmReset() {
  resetVisible.value = true
}

/** 二次确认弹窗 */
const resetVisible = ref(false)

function doReset() {
  reset()
  clearWrong()
  uni.showToast({ title: '已重置', icon: 'success' })
}
</script>

<style lang="scss" scoped>
.mine-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background: var(--bg);
}

.m-body {
  flex: 1;
  min-height: 0;
  padding: 0 14px;
}

/* ================= 头像区 ================= */
.profile {
  margin-top: 16px;
  background: linear-gradient(150deg, #8f73ff 0%, #6b4dff 100%);
  border-radius: 22px;
  padding: 22px 18px 18px;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 10px 30px rgba(107, 77, 255, 0.24);
}

.avatar-ring {
  width: 78px;
  height: 78px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.24);
  border: 3px solid rgba(255, 255, 255, 0.55);
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar {
  font-size: 40px;
  line-height: 1;
}

.pf-name {
  margin-top: 11px;
  font-size: 20px;
  font-weight: 800;
  color: #fff;
  letter-spacing: 1px;
}

.pf-slogan {
  margin-top: 4px;
  font-size: 12.5px;
  color: rgba(255, 255, 255, 0.82);
}

.pf-stats {
  display: flex;
  align-items: center;
  width: 100%;
  margin-top: 16px;
  padding: 11px 0;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 14px;
}

.pfs-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.pfs-num {
  font-size: 19px;
  font-weight: 800;
  color: #fff;
  line-height: 1.1;
}

.pfs-label {
  margin-top: 2px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.78);
}

.pfs-divider {
  width: 1px;
  height: 22px;
  background: rgba(255, 255, 255, 0.25);
}

/* ================= van-cell 风格 ================= */
.cell-group {
  margin-top: 16px;
}

.group-title {
  font-size: 12.5px;
  font-weight: 700;
  color: var(--ink-3);
  padding: 0 4px 8px;
  letter-spacing: 0.5px;
}

.cell {
  display: flex;
  align-items: center;
  background: #fff;
  padding: 13px 14px;
  border-bottom: 1px solid #f6f4ff;
}

.cell-group > .cell:first-of-type {
  border-top-left-radius: 16px;
  border-top-right-radius: 16px;
}

.cell-group > .cell:last-of-type {
  border-bottom: none;
  border-bottom-left-radius: 16px;
  border-bottom-right-radius: 16px;
}

.cell:active {
  background: #faf9ff;
}

.cell-icon {
  width: 36px;
  height: 36px;
  border-radius: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  flex-shrink: 0;
}

.cell-body {
  flex: 1;
  min-width: 0;
  margin-left: 11px;
}

.cell-title {
  display: block;
  font-size: 15px;
  font-weight: 700;
  color: var(--ink);
}

.cell-title.cell-danger {
  color: #d94b64;
}

.cell-value {
  display: block;
  margin-top: 2px;
  font-size: 12px;
  color: var(--ink-3);
}

.cell-badge {
  min-width: 20px;
  height: 20px;
  padding: 0 6px;
  margin-right: 6px;
  background: #ff6b81;
  color: #fff;
  font-size: 12px;
  font-weight: 700;
  border-radius: 999px;
  text-align: center;
  line-height: 20px;
  flex-shrink: 0;
}

.cell-arrow {
  font-size: 19px;
  color: #cfc9e2;
  flex-shrink: 0;
  line-height: 1;
}

.cell-switch {
  transform: scale(0.82);
  flex-shrink: 0;
}

/* ================= 底部 ================= */
.footer-note {
  display: block;
  margin-top: 22px;
  text-align: center;
  font-size: 12px;
  color: var(--ink-3);
}

.bottom-space {
  height: 24px;
}
</style>

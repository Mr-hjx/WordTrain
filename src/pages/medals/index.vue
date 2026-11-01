<template>
  <view class="medals-page">
    <!-- 头部战果 -->
    <view class="m-head">
      <view class="mh-gems">
        <text class="mg-num">{{ gemCount }}</text>
        <text class="mg-icon">💎</text>
      </view>
      <text class="mh-title">我的奖牌墙</text>
      <text class="mh-sub">每 10 颗宝石点亮 1 枚小奖牌 · 每 2 枚小奖牌换 1 枚大奖牌</text>

      <view class="mh-stats">
        <view class="ms-box">
          <text class="msb-num">{{ stats.smallGot }}<text class="msb-total">/{{ stats.smallTotal }}</text></text>
          <text class="msb-label">小奖牌</text>
        </view>
        <view class="ms-divider"></view>
        <view class="ms-box">
          <text class="msb-num">{{ stats.bigGot }}<text class="msb-total">/{{ stats.bigTotal }}</text></text>
          <text class="msb-label">大奖牌</text>
        </view>
        <view class="ms-divider"></view>
        <view class="ms-box">
          <text class="msb-num msb-next">{{ progress.left }}</text>
          <text class="msb-label">还差宝石</text>
        </view>
      </view>

      <view class="mh-bar-wrap">
        <view class="mh-bar" :style="{ width: progress.percent + '%' }"></view>
      </view>
    </view>

    <!-- tab -->
    <view class="tabs">
      <view class="tab" :class="{ active: tab === 'small' }" @tap="tab = 'small'">
        <text class="tab-text">小奖牌 {{ stats.smallGot }}/{{ stats.smallTotal }}</text>
      </view>
      <view class="tab" :class="{ active: tab === 'big' }" @tap="tab = 'big'">
        <text class="tab-text">大奖牌 {{ stats.bigGot }}/{{ stats.bigTotal }}</text>
      </view>
    </view>

    <!-- 奖牌网格 -->
    <scroll-view class="m-body" scroll-y>
      <view class="grid">
        <view
          v-for="m in list"
          :key="m.id"
          class="medal-cell"
          :class="{ unlocked: m.unlocked }"
          @tap="showDetail(m)"
        >
          <view
            class="cell-emoji-wrap"
            :style="m.unlocked ? { background: m.color + '22', borderColor: m.color } : {}"
          >
            <text class="cell-emoji">{{ m.unlocked ? m.emoji : '🔒' }}</text>
          </view>
          <text class="cell-name">{{ m.name }}</text>

          <!-- 未点亮：进度条 -->
          <view v-if="!m.unlocked" class="cell-progress">
            <view class="cp-bar" :style="{ width: m.progress + '%' }"></view>
          </view>
          <text v-else class="cell-time">{{ m.timeText }}</text>
        </view>
      </view>

      <view class="m-tip">
        <text class="mt-text">💡 点亮规则</text>
        <text class="mt-line">· 每答对 1 道题得 2 颗宝石（一堂课 5 题 = 10 颗）</text>
        <text class="mt-line">· 每集满 10 颗宝石点亮 1 枚小奖牌，共 20 枚</text>
        <text class="mt-line">· 每集满 20 颗宝石（2 枚小奖牌）点亮 1 枚大奖牌，共 10 枚</text>
      </view>

      <view class="bottom-space"></view>
    </scroll-view>

    <!-- 详情弹窗 -->
    <view v-if="detail" class="modal" @tap="detail = null">
      <view class="modal-box pop-in" @tap.stop>
        <view
          class="modal-emoji-wrap"
          :style="{ background: detail.color + '22', borderColor: detail.color }"
        >
          <text class="modal-emoji">{{ detail.unlocked ? detail.emoji : '🔒' }}</text>
        </view>
        <text class="modal-name">{{ detail.name }}</text>
        <text class="modal-type">{{ detail.type === 'big' ? '大奖牌' : '小奖牌' }}</text>
        <text class="modal-desc">{{ detail.unlocked ? '🎉 已点亮 · ' + detail.timeText : detail.desc }}</text>
        <button class="btn btn-primary modal-btn" @tap="detail = null">知道啦</button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useMedals } from '@/composables/useMedals'
import { useGems } from '@/composables/useGems'
import { refreshAll } from '@/composables/refresh'
import type { Medal } from '@/types'

const { smallMedals, bigMedals, stats, reload } = useMedals()
const { gemCount, progress } = useGems()

const tab = ref<'small' | 'big'>('small')
const detail = ref<Medal | null>(null)

const list = computed(() => (tab.value === 'small' ? smallMedals.value : bigMedals.value))

function showDetail(m: Medal) {
  detail.value = m
}

onShow(() => {
  refreshAll()
  reload()
})
</script>

<style lang="scss" scoped>
.medals-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background: var(--bg);
}

/* ---------- 头部 ---------- */
.m-head {
  flex-shrink: 0;
  padding: 14px 16px 16px;
  background: var(--grad-brand);
}

.mh-gems {
  display: flex;
  align-items: center;
  justify-content: center;
}

.mg-num {
  font-size: 42px;
  font-weight: 800;
  color: #fff;
  line-height: 1;
  letter-spacing: 1px;
}

.mg-icon {
  font-size: 24px;
  margin-left: 6px;
}

.mh-title {
  display: block;
  margin-top: 6px;
  text-align: center;
  font-size: 17px;
  font-weight: 800;
  color: #fff;
}

.mh-sub {
  display: block;
  margin-top: 5px;
  text-align: center;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.75);
  line-height: 1.6;
}

.mh-stats {
  display: flex;
  align-items: center;
  margin-top: 14px;
  padding: 10px 0;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 14px;
}

.ms-box {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.msb-num {
  font-size: 19px;
  font-weight: 800;
  color: #fff;
  line-height: 1.1;
}

.msb-num.msb-next {
  color: #ffe08a;
}

.msb-total {
  font-size: 12px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.6);
}

.msb-label {
  margin-top: 2px;
  font-size: 12px;
  color: rgba(255, 255, 255, 0.75);
}

.ms-divider {
  width: 1px;
  height: 22px;
  background: rgba(255, 255, 255, 0.25);
}

.mh-bar-wrap {
  margin-top: 12px;
  height: 8px;
  background: rgba(255, 255, 255, 0.12);
  border-radius: 999px;
  overflow: hidden;
}

.mh-bar {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #ffe08a 0%, #ffc442 100%);
  transition: width 0.5s ease;
}

/* ---------- tabs ---------- */
.tabs {
  flex-shrink: 0;
  display: flex;
  background: var(--card);
  padding: 0 14px;
  box-shadow: var(--sh-1);
}

.tab {
  flex: 1;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 3px solid transparent;
}

.tab.active {
  border-bottom-color: var(--primary);
}

.tab-text {
  font-size: 14px;
  font-weight: 700;
  color: var(--ink-3);
}

.tab.active .tab-text {
  color: var(--primary-dark);
}

/* ---------- 网格 ---------- */
.m-body {
  flex: 1;
  min-height: 0;
  padding: 14px 14px 0;
}

.grid {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.medal-cell {
  width: calc(25% - 7.5px);
  background: var(--card);
  border-radius: 14px;
  padding: 10px 6px 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: var(--sh-1);
}

.medal-cell:active {
  transform: scale(0.96);
}

.cell-emoji-wrap {
  width: 46px;
  height: 46px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--card-2);
  border: 2px solid var(--line-strong);
}

.medal-cell.unlocked .cell-emoji-wrap {
  box-shadow: 0 3px 12px rgba(255, 196, 66, 0.32);
}

.cell-emoji {
  font-size: 24px;
  line-height: 1;
}

.cell-name {
  margin-top: 6px;
  font-size: 12px;
  font-weight: 700;
  color: var(--ink-2);
  text-align: center;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  max-width: 100%;
}

.medal-cell:not(.unlocked) .cell-name {
  color: var(--ink-3);
}

.cell-progress {
  width: 100%;
  height: 5px;
  margin-top: 5px;
  background: var(--primary-soft);
  border-radius: 999px;
  overflow: hidden;
}

.cp-bar {
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, rgba(155, 125, 255, 0.45) 0%, var(--primary) 100%);
}

.cell-time {
  margin-top: 5px;
  font-size: 12px;
  color: var(--ink-3);
}

/* ---------- 规则 ---------- */
.m-tip {
  margin-top: 18px;
  background: var(--card);
  border-radius: 16px;
  padding: 14px 16px;
}

.mt-text {
  display: block;
  font-size: 13px;
  font-weight: 800;
  color: var(--ink);
  margin-bottom: 7px;
}

.mt-line {
  display: block;
  font-size: 12px;
  color: var(--ink-2);
  line-height: 1.9;
}

.bottom-space {
  height: 20px;
}

/* ---------- 弹窗 ---------- */
.modal {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  background: var(--mask);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 800;
}

.modal-box {
  width: 76%;
  max-width: 300px;
  background: var(--card);
  border-radius: 22px;
  padding: 22px 18px 18px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.modal-emoji-wrap {
  width: 74px;
  height: 74px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--card-2);
  border: 3px solid var(--line-strong);
}

.modal-emoji {
  font-size: 38px;
  line-height: 1;
}

.modal-name {
  margin-top: 12px;
  font-size: 19px;
  font-weight: 800;
  color: var(--ink);
}

.modal-type {
  margin-top: 3px;
  padding: 2px 9px;
  background: var(--primary-light);
  color: var(--primary-dark);
  font-size: 12px;
  font-weight: 700;
  border-radius: 999px;
}

.modal-desc {
  margin-top: 10px;
  font-size: 12.5px;
  color: var(--ink-2);
  text-align: center;
  line-height: 1.6;
}

.modal-btn {
  width: 100%;
  height: 44px;
  margin-top: 16px;
  font-size: 15px;
}
</style>

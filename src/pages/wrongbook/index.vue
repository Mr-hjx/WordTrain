<template>
  <view class="wb-page">
    <!-- 头部统计 -->
    <view class="wb-head">
      <view class="wh-left">
        <text class="wh-num">{{ count }}</text>
        <text class="wh-label">个待巩固</text>
      </view>
      <text class="wh-emoji">📕</text>
    </view>

    <!-- 主体 -->
    <scroll-view class="wb-body" scroll-y>
      <view v-if="isEmpty" class="empty-box">
        <text class="eb-emoji">🎉</text>
        <text class="eb-title">错题本是空的</text>
        <text class="eb-text">继续保持！答错的单词会自动收进来</text>
      </view>

      <view v-else class="list">
        <view v-for="(it, i) in wrongList" :key="it.en" class="wb-item fade-up" :style="{ animationDelay: i * 0.03 + 's' }">
          <text class="wi-emoji">{{ it.emoji }}</text>
          <view class="wi-body">
            <view class="wi-line1">
              <text class="wi-en">{{ it.en }}</text>
              <text class="wi-count">错 {{ it.count }} 次</text>
            </view>
            <text class="wi-zh">{{ it.zh || '—' }}</text>
          </view>
          <view class="wi-actions">
            <text class="wi-speak" @tap="playIt(it)">🔈</text>
            <text class="wi-del" @tap="delOne(it.en)">移除</text>
          </view>
        </view>
      </view>

      <view v-if="!isEmpty" class="tips">
        <text class="tip-title">💡 错题重练怎么玩</text>
        <text class="tip-line">· 每轮固定 5 道题，错题不足 5 个时用学过的词补齐</text>
        <text class="tip-line">· 答对 1 次就会从错题本里移出啦</text>
      </view>

      <view class="bottom-space"></view>
    </scroll-view>

    <!-- 底部操作 -->
    <view class="wb-foot">
      <button
        class="btn btn-primary foot-btn"
        :disabled="isEmpty || !canPractice"
        @tap="startPractice"
      >
        {{ footText }}
      </button>
      <text v-if="isEmpty" class="foot-clear" @tap="clearAll">清空错题本</text>
    </view>

    <!-- 移除/清空 二次确认弹窗 -->
    <ConfirmDialog
      v-model:visible="dialogVisible"
      :title="dialogTitle"
      :content="dialogContent"
      :confirm-text="dialogAction === 'del' ? '移除' : '全部清空'"
      @confirm="onDialogConfirm"
    />
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useWrongBook } from '@/composables/useWrongBook'
import { useBank } from '@/composables/useBank'
import { useQuizSessionSingleton } from '@/composables/useQuizSession'
import { useSpeech } from '@/composables/useSpeech'
import { refreshAll } from '@/composables/refresh'
import type { WrongItem } from '@/types'

const { wrongList, count, isEmpty, remove, clear, reload } = useWrongBook()
const { allLearned } = useBank()
const session = useQuizSessionSingleton()
const { speak } = useSpeech()

/** 错题不足 5 时需要用学过的词补齐；一个词都没有则无法练习 */
const canPractice = computed(() => wrongList.value.length > 0 && (wrongList.value.length >= 5 || allLearned().length > 0))

const footText = computed(() => {
  if (isEmpty.value) return '暂时没有错题'
  if (!canPractice.value) return '需要至少 1 个错题和足够的词库'
  const n = wrongList.value.length
  return n >= 5 ? `开始重练这 ${5} 道题 🎯` : `开始重练（错题 ${n} 个 + 补齐 ${5 - n} 个）`
})

function playIt(it: WrongItem) {
  speak(it.en)
}

/** 移除/清空 二次确认弹窗状态 */
const dialogVisible = ref(false)
/** 'del' 移除单个 | 'clear' 清空全部 */
const dialogAction = ref<'del' | 'clear'>('del')
const pendingEn = ref('')

const dialogTitle = computed(() => (dialogAction.value === 'del' ? '移出这个错题？' : '清空错题本？'))
const dialogContent = computed(() =>
  dialogAction.value === 'del' ? '移出后如果再答错会重新收录。' : '全部错题将被清空，不可恢复。'
)

function delOne(en: string) {
  pendingEn.value = en
  dialogAction.value = 'del'
  dialogVisible.value = true
}

function clearAll() {
  dialogAction.value = 'clear'
  dialogVisible.value = true
}

function onDialogConfirm() {
  if (dialogAction.value === 'del') {
    remove(pendingEn.value)
    uni.showToast({ title: '已移出错题本', icon: 'none' })
  } else {
    clear()
    uni.showToast({ title: '已清空', icon: 'none' })
  }
}

function startPractice() {
  const r = session.startWrong()
  if (!r.count) {
    uni.showToast({ title: '暂时没有可练的题', icon: 'none' })
    return
  }
  uni.navigateTo({ url: '/pages/practice/index?mode=wrong' })
}

onShow(() => {
  refreshAll()
  reload()
})
</script>

<style lang="scss" scoped>
.wb-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background: var(--bg);
}

/* ---------- 头部 ---------- */
.wb-head {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: linear-gradient(140deg, #c2495f 0%, #96354a 100%);
}

.wh-left {
  display: flex;
  align-items: baseline;
}

.wh-num {
  font-size: 40px;
  font-weight: 800;
  color: #fff;
  line-height: 1;
  letter-spacing: 1px;
}

.wh-label {
  margin-left: 7px;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.85);
}

.wh-emoji {
  font-size: 36px;
  line-height: 1;
}

/* ---------- 列表 ---------- */
.wb-body {
  flex: 1;
  min-height: 0;
  padding: 14px 14px 0;
}

.empty-box {
  margin-top: 40px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.eb-emoji {
  font-size: 48px;
}

.eb-title {
  margin-top: 12px;
  font-size: 17px;
  font-weight: 800;
  color: var(--ink);
}

.eb-text {
  margin-top: 6px;
  font-size: 13px;
  color: var(--ink-3);
}

.list {
  display: flex;
  flex-direction: column;
  gap: 9px;
}

.wb-item {
  display: flex;
  align-items: center;
  background: var(--card);
  border-radius: 15px;
  padding: 12px 13px;
  box-shadow: var(--sh-1);
}

.wi-emoji {
  font-size: 26px;
  line-height: 1;
  flex-shrink: 0;
}

.wi-body {
  flex: 1;
  min-width: 0;
  margin-left: 11px;
}

.wi-line1 {
  display: flex;
  align-items: center;
}

.wi-en {
  font-size: 16px;
  font-weight: 800;
  color: var(--ink);
}

.wi-count {
  margin-left: 8px;
  padding: 1px 7px;
  background: var(--coral-light);
  color: var(--coral-ink);
  font-size: 12px;
  font-weight: 700;
  border-radius: 999px;
}

.wi-zh {
  display: block;
  margin-top: 2px;
  font-size: 12.5px;
  color: var(--ink-3);
}

.wi-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.wi-speak,
.wi-del {
  padding: 5px 7px;
  font-size: 13px;
  border-radius: 9px;
  background: var(--card-2);
}

.wi-del {
  color: var(--coral-ink);
}

/* ---------- 提示 ---------- */
.tips {
  margin-top: 16px;
  background: var(--card);
  border-radius: 16px;
  padding: 14px 16px;
}

.tip-title {
  display: block;
  font-size: 13px;
  font-weight: 800;
  color: var(--ink);
  margin-bottom: 7px;
}

.tip-line {
  display: block;
  font-size: 12px;
  color: var(--ink-2);
  line-height: 1.9;
}

.bottom-space {
  height: 16px;
}

/* ---------- 底部 ---------- */
.wb-foot {
  flex-shrink: 0;
  padding: 9px 14px calc(10px + env(safe-area-inset-bottom));
  background: var(--bg);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.foot-btn {
  width: 100%;
  height: 50px;
  font-size: 16px;
}

.foot-btn[disabled] {
  background: var(--line);
  color: var(--ink-3);
  box-shadow: none;
}

.foot-clear {
  margin-top: 10px;
  font-size: 12px;
  color: var(--ink-3);
}
</style>

<template>
  <view class="input-page">
    <!-- 顶部：添加区（固定不滚动，优先级最高） -->
    <view class="top-bar">
      <!-- 手动添加 -->
      <view class="add-box">
        <view class="add-row">
          <input
            class="add-input"
            v-model="enInput"
            placeholder="英文，如 apple"
            placeholder-class="ph"
            @confirm="addOne"
          />
          <input
            class="add-input"
            v-model="zhInput"
            placeholder="中文，如 苹果"
            placeholder-class="ph"
            @confirm="addOne"
          />
        </view>
        <button class="btn btn-primary add-btn" @click="addOne">+ 添加单词</button>
      </view>

      <!-- 批量粘贴（可折叠） -->
      <view class="bulk-toggle" @click="showBulk = !showBulk">
        <text class="bt-text">批量粘贴</text>
        <text class="bt-arrow">{{ showBulk ? '▲' : '▼' }}</text>
      </view>
      <view v-if="showBulk" class="bulk-box">
        <textarea
          class="bulk-area"
          v-model="bulkText"
          placeholder="apple 苹果&#10;banana 香蕉&#10;cat 小猫"
          placeholder-class="ph"
          :maxlength="-1"
        />
        <button class="btn btn-mint bulk-btn" @click="addBulk">批量添加</button>
      </view>
    </view>

    <!-- 已录入列表 -->
    <scroll-view class="word-scroll" scroll-y>
      <view class="sec-head">
        <text class="sec-title">已录入 {{ allWords.length }} 个单词</text>
        <text v-if="allWords.length" class="sec-clear" @click="confirmClear">清空</text>
      </view>

      <view v-if="!allWords.length" class="empty-box">
        <text class="eb-emoji">📝</text>
        <text class="eb-text">还没有录入，在上方添加第一个单词吧</text>
      </view>

      <view v-else class="word-list">
        <view v-for="w in allWords" :key="w.id" class="word-item">
          <text class="wi-emoji">{{ w.emoji }}</text>
          <view class="wi-body">
            <text class="wi-en">{{ w.en }}</text>
            <text class="wi-zh">{{ w.zh || '—' }}</text>
          </view>
          <button class="wi-del-btn" @click.stop="delWord(w.id)">删除</button>
        </view>
      </view>
      <view class="bottom-space"></view>
    </scroll-view>

    <!-- 底部：开始练习 -->
    <view class="foot">
      <button class="btn btn-primary foot-btn" :disabled="allWords.length < 4" @click="startPractice">
        {{ allWords.length < 4 ? `再录入 ${4 - allWords.length} 个就能练习啦` : '去练习 🎯' }}
      </button>
    </view>

    <!-- 删除/清空 二次确认弹窗 -->
    <ConfirmDialog
      v-model:visible="dialogVisible"
      :title="dialogTitle"
      :content="dialogContent"
      :confirm-text="dialogConfirmText"
      @confirm="onDialogConfirm"
    />
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { useBank } from '@/composables/useBank'
import { useQuizSessionSingleton } from '@/composables/useQuizSession'
import { todayStr } from '@/utils/date'

const { appendWords, setWordsByDate, removeWord, reload, dates, getWordsByDate, allLearnedWords } = useBank()
const session = useQuizSessionSingleton()

const showBulk = ref(false)
const enInput = ref('')
const zhInput = ref('')
const bulkText = ref('')

/** 全部已录入单词（响应式，删除/添加后自动刷新） */
const allWords = allLearnedWords

function addOne() {
  const en = enInput.value.trim()
  if (!en) {
    uni.showToast({ title: '请填写英文', icon: 'none' })
    return
  }
  const n = appendWords(todayStr(), [{ en, zh: zhInput.value.trim() }])
  if (!n) {
    uni.showToast({ title: '这个单词已经在列表里啦', icon: 'none' })
  } else {
    uni.showToast({ title: '已添加', icon: 'success' })
  }
  enInput.value = ''
  zhInput.value = ''
}

function addBulk() {
  const raw = bulkText.value.trim()
  if (!raw) {
    uni.showToast({ title: '请先粘贴内容', icon: 'none' })
    return
  }
  const lines = raw.split(/\n+/).map((l) => l.trim()).filter(Boolean)
  const list: { en: string; zh: string }[] = []

  lines.forEach((line) => {
    const m = line.split(/[\s,，\t]+/).filter(Boolean)
    if (!m.length) return
    const en = m[0]
    const zh = m.slice(1).join(' ')
    if (!/^[a-zA-Z]/.test(en)) return
    list.push({ en, zh })
  })

  if (!list.length) {
    uni.showToast({ title: '没识别出单词，检查下格式', icon: 'none' })
    return
  }

  const n = appendWords(todayStr(), list)
  bulkText.value = ''
  showBulk.value = false
  uni.showToast({ title: `成功添加 ${n} 个`, icon: 'success' })
}

/** 删除/清空 二次确认弹窗状态 */
const dialogVisible = ref(false)
/** 'del' 删除单个单词 | 'clear' 清空全部 */
const dialogAction = ref<'del' | 'clear'>('del')
const pendingWordId = ref('')

const dialogTitle = computed(() => (dialogAction.value === 'del' ? '删除这个单词？' : '清空全部单词？'))
const dialogContent = computed(() =>
  dialogAction.value === 'del' ? '删除后不可恢复，确认删除吗？' : `将删除全部 ${allWords.value.length} 个单词，不可恢复。`
)
const dialogConfirmText = computed(() => (dialogAction.value === 'del' ? '删除' : '全部清空'))

function delWord(id: string) {
  pendingWordId.value = id
  dialogAction.value = 'del'
  dialogVisible.value = true
}

function confirmClear() {
  dialogAction.value = 'clear'
  dialogVisible.value = true
}

function onDialogConfirm() {
  if (dialogAction.value === 'del') {
    for (const d of dates.value) {
      const list = getWordsByDate(d)
      if (list.some((w) => w.id === pendingWordId.value)) {
        removeWord(d, pendingWordId.value)
        uni.showToast({ title: '已删除', icon: 'none' })
        return
      }
    }
  } else {
    dates.value.forEach((d: string) => setWordsByDate(d, []))
    uni.showToast({ title: '已清空', icon: 'none' })
  }
}

function startPractice() {
  reload()
  const list = allLearnedWords.value
  if (list.length < 4) {
    uni.showToast({ title: '至少需要 4 个单词', icon: 'none' })
    return
  }
  const n = session.startDaily(list)
  if (!n) {
    uni.showToast({ title: '出题失败，再多加几个词吧', icon: 'none' })
    return
  }
  uni.navigateTo({ url: '/pages/practice/index?mode=daily' })
}

onLoad(() => {
  reload()
})
</script>

<style lang="scss" scoped>
.input-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background: var(--bg);
}

/* ---------- 顶部添加区 ---------- */
.top-bar {
  flex-shrink: 0;
  padding: 10px 14px 6px;
  background: var(--bg);
}

.add-box {
  background: #fff;
  border-radius: 16px;
  padding: 13px;
  box-shadow: 0 2px 12px rgba(124, 92, 255, 0.06);
}

.add-row {
  display: flex;
  gap: 9px;
}

.add-input {
  flex: 1;
  height: 42px;
  padding: 0 12px;
  background: #f8f7ff;
  border-radius: 12px;
  font-size: 14px;
  color: var(--ink);
}

.add-btn {
  width: 100%;
  height: 42px;
  margin-top: 10px;
  font-size: 15px;
}

/* 批量折叠 */
.bulk-toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 4px 6px;
}

.bt-text {
  font-size: 13px;
  font-weight: 700;
  color: var(--ink-2);
}

.bt-arrow {
  font-size: 12px;
  color: var(--ink-3);
}

.bulk-box {
  background: #fff;
  border-radius: 16px;
  padding: 13px;
}

.bulk-area {
  width: 100%;
  height: 90px;
  padding: 11px 12px;
  background: #f8f7ff;
  border-radius: 12px;
  font-size: 14px;
  color: var(--ink);
  line-height: 1.7;
}

.bulk-btn {
  width: 100%;
  height: 42px;
  margin-top: 10px;
  font-size: 15px;
}

/* ---------- 列表 ---------- */
.word-scroll {
  flex: 1;
  min-height: 0;
  padding: 0 14px;
}

.sec-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 10px 0 8px;
  padding: 0 2px;
}

.sec-title {
  font-size: 15px;
  font-weight: 800;
  color: var(--ink);
}

.sec-clear {
  font-size: 13px;
  color: #d94b64;
  padding: 4px 8px;
}

.empty-box {
  background: #fff;
  border-radius: 16px;
  padding: 36px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.eb-emoji {
  font-size: 32px;
}

.eb-text {
  margin-top: 10px;
  font-size: 13px;
  color: var(--ink-3);
  text-align: center;
}

.word-list {
  background: #fff;
  border-radius: 16px;
  padding: 4px 0;
}

.word-item {
  display: flex;
  align-items: center;
  padding: 11px 13px;
  border-bottom: 1px solid #f6f4ff;
}

.word-item:last-child {
  border-bottom: none;
}

.wi-emoji {
  font-size: 22px;
  flex-shrink: 0;
}

.wi-body {
  flex: 1;
  min-width: 0;
  margin-left: 10px;
}

.wi-en {
  display: block;
  font-size: 15px;
  font-weight: 700;
  color: var(--ink);
}

.wi-zh {
  display: block;
  margin-top: 1px;
  font-size: 12px;
  color: var(--ink-3);
}

/* 删除按钮：用 button 元素 + @click.stop 保证事件可靠 */
.wi-del-btn {
  flex-shrink: 0;
  height: 32px;
  line-height: 32px;
  padding: 0 14px;
  margin-left: 8px;
  background: #fff0f3;
  border-radius: 8px;
  font-size: 13px;
  color: #d94b64;
  border: none;
}

.wi-del-btn::after {
  border: none;
}

.ph {
  color: #b9b4cc;
}

.bottom-space {
  height: 16px;
}

/* ---------- 底部 ---------- */
.foot {
  flex-shrink: 0;
  padding: 9px 14px calc(10px + env(safe-area-inset-bottom));
  background: var(--bg);
}

.foot-btn {
  width: 100%;
  height: 50px;
  font-size: 16px;
}

.foot-btn[disabled] {
  background: #eae7f5;
  color: #a9a4bc;
  box-shadow: none;
}
</style>

<template>
  <view class="gembar" :class="theme">
    <!-- 宝石余额 -->
    <view class="gem-pill" :class="{ pop: popping }" id="gemPill">
      <view class="gem-icon">💎</view>
      <view class="gem-num">{{ displayGems }}</view>
    </view>

    <!-- 本堂课进度（每 10 颗点亮一枚小奖牌） -->
    <view class="medal-progress" @tap="openWall">
      <view class="mp-emoji" :class="{ glow: percent >= 100 }">🎖</view>
      <view class="mp-body">
        <view class="mp-text">本堂课 {{ intoClass }}/{{ need }} 颗 · 还差 {{ left }} 颗得奖牌</view>
        <view class="mp-bar-wrap">
          <view class="mp-bar" :style="{ width: percent + '%' }"></view>
        </view>
      </view>
    </view>

    <!-- 奖牌墙入口 -->
    <view class="wall-btn" @tap="openWall">
      <text class="wb-icon">🏅</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useGems } from '@/composables/useGems'

const props = withDefaults(
  defineProps<{
    /** 外部传入宝石数；不传(-1)则用全局状态 */
    gems?: number
    /** light：深色背景上用 / dark：浅色背景上用 */
    theme?: 'light' | 'dark'
  }>(),
  { gems: -1, theme: 'light' }
)

const emit = defineEmits<{ (e: 'wall'): void; (e: 'change', gems: number): void }>()

const { gemCount, progress } = useGems()

const popping = ref(false)
/** 动画过程中显示的过渡值 */
const animValue = ref<number | null>(null)

const displayGems = computed(() => (animValue.value === null ? props.gems >= 0 ? props.gems : gemCount.value : animValue.value))

const intoClass = computed(() => progress.value.intoClass)
const need = computed(() => progress.value.need)
const left = computed(() => progress.value.left)
const percent = computed(() => progress.value.percent)

let timer: ReturnType<typeof setInterval> | null = null

/** 带动画地把宝石数滚到新值（供练习页调用） */
function bumpTo(target: number) {
  const from = displayGems.value
  const to = Math.max(0, target)
  if (to === from) {
    animValue.value = null
    return
  }
  const total = Math.abs(to - from)
  const frames = Math.min(10, Math.max(1, total))
  let i = 0
  if (timer) clearInterval(timer)
  popping.value = true
  timer = setInterval(() => {
    i++
    animValue.value = from + Math.round((to - from) * (i / frames))
    if (i >= frames) {
      if (timer) clearInterval(timer)
      timer = null
      animValue.value = null
      setTimeout(() => (popping.value = false), 180)
      emit('change', to)
    }
  }, 55)
}

function openWall() {
  emit('wall')
}

// 外部直接改 gems 时同步（保持与原组件 observer 行为一致）
watch(
  () => props.gems,
  () => {
    animValue.value = null
  }
)

defineExpose({ bumpTo })
</script>

<style lang="scss" scoped>
.gembar {
  display: flex;
  align-items: center;
  padding: 0 14px;
}

/* ---------- 宝石余额 ---------- */
.gem-pill {
  display: flex;
  align-items: center;
  height: 30px;
  padding: 0 11px 0 7px;
  border-radius: 15px;
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
  flex-shrink: 0;
}

.gem-pill.pop {
  transform: scale(1.22);
}

.light .gem-pill {
  background: rgba(255, 255, 255, 0.2);
}

.dark .gem-pill {
  background: var(--primary-light);
}

.gem-icon {
  font-size: 17px;
  margin-right: 4px;
  line-height: 1;
}

.gem-num {
  font-size: 16px;
  font-weight: 800;
  letter-spacing: 0.5px;
  min-width: 15px;
}

.light .gem-num {
  color: #fff;
}

.dark .gem-num {
  color: var(--primary-dark);
}

/* ---------- 奖牌进度 ---------- */
.medal-progress {
  flex: 1;
  display: flex;
  align-items: center;
  margin-left: 8px;
  padding: 3px 8px;
  border-radius: 15px;
  min-width: 0;
}

.light .medal-progress {
  background: rgba(255, 255, 255, 0.14);
}

.dark .medal-progress {
  background: var(--card-2);
}

.mp-emoji {
  font-size: 18px;
  line-height: 1;
  margin-right: 5px;
  flex-shrink: 0;
}

.mp-emoji.glow {
  animation: glowPulse 1.6s ease-in-out infinite;
}

.mp-body {
  flex: 1;
  min-width: 0;
}

.mp-text {
  font-size: 14px;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.light .mp-text {
  color: rgba(255, 255, 255, 0.92);
}

.dark .mp-text {
  color: var(--ink-2);
}

.mp-bar-wrap {
  margin-top: 3px;
  height: 5px;
  border-radius: 5px;
  overflow: hidden;
}

.light .mp-bar-wrap {
  background: rgba(255, 255, 255, 0.12);
}

.dark .mp-bar-wrap {
  background: rgba(255, 255, 255, 0.14);
}

.mp-bar {
  height: 100%;
  border-radius: 5px;
  background: linear-gradient(90deg, #ffe08a 0%, #ffc442 100%);
  transition: width 0.4s ease;
}

/* ---------- 奖牌墙入口 ---------- */
.wall-btn {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 7px;
  flex-shrink: 0;
}

.light .wall-btn {
  background: rgba(255, 255, 255, 0.2);
}

.dark .wall-btn {
  background: var(--primary-light);
}

.wb-icon {
  font-size: 16px;
  line-height: 1;
}

@keyframes glowPulse {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.16);
  }
}
</style>

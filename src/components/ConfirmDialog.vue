<template>
  <view v-if="visible" class="cd-mask" @click.stop="close">
    <view class="cd-card" @click.stop>
      <!-- 警示图标 -->
      <view class="cd-icon-wrap" :class="{ 'cd-icon-danger': danger }">
        <text class="cd-icon">🗑️</text>
      </view>

      <!-- 文案 -->
      <text class="cd-title">{{ title }}</text>
      <text v-if="content" class="cd-content">{{ content }}</text>

      <!-- 按钮 -->
      <view class="cd-btns">
        <button class="cd-btn cd-cancel" @click="close">{{ cancelText }}</button>
        <button class="cd-btn cd-confirm" :class="{ 'cd-confirm-danger': danger }" @click="ok">
          {{ confirmText }}
        </button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    visible: boolean
    title: string
    content?: string
    confirmText?: string
    cancelText?: string
    /** 危险操作（红色确认按钮），默认 true */
    danger?: boolean
  }>(),
  {
    content: '',
    confirmText: '确定删除',
    cancelText: '再想想',
    danger: true
  }
)

const emit = defineEmits<{
  (e: 'update:visible', v: boolean): void
  (e: 'confirm'): void
  (e: 'cancel'): void
}>()

function close() {
  emit('update:visible', false)
  emit('cancel')
}
function ok() {
  emit('update:visible', false)
  emit('confirm')
}
</script>

<style lang="scss" scoped>
.cd-mask {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 34px;
  background: var(--mask);
  backdrop-filter: blur(3px);
  animation: cd-fade 0.18s ease-out;
}

@keyframes cd-fade {
  from { opacity: 0; }
  to { opacity: 1; }
}

.cd-card {
  width: 100%;
  background: var(--card);
  border-radius: 22px;
  padding: 26px 20px 18px;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: var(--sh-3);
  animation: cd-pop 0.26s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes cd-pop {
  from {
    opacity: 0;
    transform: scale(0.82) translateY(14px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

/* 图标 */
.cd-icon-wrap {
  width: 58px;
  height: 58px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--card-2);
  margin-bottom: 13px;
}

.cd-icon-danger {
  background: var(--coral-light);
}

.cd-icon {
  font-size: 28px;
  line-height: 1;
}

/* 文案 */
.cd-title {
  font-size: 17px;
  font-weight: 800;
  color: var(--ink, #2d2a3f);
  text-align: center;
  line-height: 1.4;
}

.cd-content {
  margin-top: 7px;
  font-size: 14px;
  color: var(--ink-2, var(--ink-2));
  text-align: center;
  line-height: 1.65;
}

/* 按钮 */
.cd-btns {
  display: flex;
  gap: 10px;
  width: 100%;
  margin-top: 20px;
}

.cd-btn {
  flex: 1;
  height: 44px;
  line-height: 44px;
  border-radius: 14px;
  font-size: 15px;
  font-weight: 700;
  padding: 0;
  margin: 0;
  border: none;
}

.cd-btn::after {
  border: none;
}

.cd-btn:active {
  transform: scale(0.96);
}

.cd-cancel {
  background: var(--card-2);
  color: var(--ink-2, var(--ink-2));
}

.cd-confirm {
  background: linear-gradient(135deg, #9b7bff 0%, #7c5cff 100%);
  color: #fff;
  box-shadow: var(--sh-1);
}

.cd-confirm-danger {
  background: linear-gradient(135deg, #ff7d92 0%, #ff5c76 100%);
  box-shadow: 0 5px 14px rgba(255, 92, 118, 0.32);
}
</style>

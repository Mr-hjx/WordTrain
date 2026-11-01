<template>
  <view v-if="visible" class="praise-mask">
    <view class="praise-box praise-in">
      <image class="praise-img" :src="images[currentImg]" mode="aspectFit" :fade-in="false" />
      <view class="praise-text">{{ praiseText }}</view>
      <view v-if="combo >= 3" class="praise-combo beat">连对 {{ combo }} 题 🔥</view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { usePraise } from '@/composables/usePraise'

const { visible, currentImg, praiseText, combo, images } = usePraise()
</script>

<style lang="scss" scoped>
.praise-mask {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  z-index: 900;
  display: flex;
  align-items: center;
  justify-content: center;
  /* 不拦截点击：答对后孩子还要继续操作 */
  pointer-events: none;
  background: rgba(43, 37, 64, 0.06);
}

.praise-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 14px 22px 16px;
  border-radius: 24px;
  background: linear-gradient(160deg, #fffef8 0%, #fff6e0 100%);
  box-shadow: 0 12px 44px rgba(124, 92, 255, 0.28);
  border: 3px solid #ffe08a;
  max-width: 78%;
}

.praise-img {
  width: 128px;
  height: 128px;
  display: block;
}

.praise-text {
  margin-top: 6px;
  font-size: 21px;
  font-weight: 800;
  color: #b8740a;
  letter-spacing: 1px;
  text-align: center;
}

.praise-combo {
  margin-top: 4px;
  font-size: 14px;
  font-weight: 700;
  color: #ff6b81;
}
</style>

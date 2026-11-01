<script setup lang="ts">
import { onLaunch, onShow } from '@dcloudio/uni-app'
import { useBank } from '@/composables/useBank'
import { usePraise } from '@/composables/usePraise'
import { refreshAll } from '@/composables/refresh'
import { todayStr } from '@/composables/useDate'
import { DB_KEY } from '@/utils/constants'

onLaunch(() => {
  // 预热点赞图片：等孩子答对时直接秒出，不会有「先空框后出图」的观感
  usePraise().warmup()

  // 首次启动：仅当存储中**从不存在**题库 key 时，才写入示例内容。
  // ⚠️ 不能用「词库为空」判断：家长清空/删光单词后刷新，
  //    若按空判断会把示例词重新塞回来，看起来就像数据被重置。
  const { appendWords } = useBank()
  const existed = (() => {
    try {
      const raw = uni.getStorageSync(DB_KEY)
      return raw !== '' && raw !== null && raw !== undefined
    } catch {
      return false
    }
  })()
  if (!existed) {
    appendWords(todayStr(), [
      { en: 'apple', zh: '苹果' },
      { en: 'banana', zh: '香蕉' },
      { en: 'cat', zh: '小猫' },
      { en: 'dog', zh: '小狗' },
      { en: 'milk', zh: '牛奶' },
      { en: 'red', zh: '红色' },
      { en: 'sun', zh: '太阳' },
      { en: 'ball', zh: '球' },
    ])
  }
})

onShow(() => {
  // 从磁盘重读一次，防止 HMR / 多端切换后内存与磁盘漂移
  refreshAll()
})
</script>

<style lang="scss">
@import '@/styles/variables.scss';
@import '@/styles/base.scss';
@import '@/styles/animations.scss';
</style>

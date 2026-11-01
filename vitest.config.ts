import { defineConfig } from 'vitest/config'
import { fileURLToPath, URL } from 'node:url'

/**
 * vitest 专用配置：**不加载** vite-plugin-uni。
 *
 * 单测只覆盖纯逻辑层（utils/*、composables 里不依赖 uni 生命周期的部分），
 * 不需要 uni 的编译链。加载 uni() 插件会让 vitest 去解析 vue/compiler-sfc 并失败。
 */
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '~@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/**/*.spec.ts'],
    reporters: 'default'
  }
})

/**
 * 状态层基元：模块级单例 ref
 *
 * 为什么不用 Pinia：本工程是纯本地、单用户、无网络的幼儿练习应用，
 * 状态总量小且完全由本地存储驱动。用模块级单例 ref + 几个 refresh() 函数
 * 就能获得与 Pinia 等价的「跨组件自动同步」效果，且零额外依赖。
 *
 * 约定：所有 useXxx() 返回的是**同一个 ref 实例**，
 * 因此任意组件读到的都是同一份数据，写入后所有组件自动更新。
 */

import { ref, type Ref } from 'vue'

/** 创建一个模块级单例 ref（每个模块只会有一个实例） */
export function singletonRef<T>(initial: T): Ref<T> {
  return ref(initial) as Ref<T>
}

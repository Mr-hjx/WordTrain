/**
 * uni-app / 微信全局类型补充
 */

/** 微信小程序插件（条件编译下仅 MP-WEIXIN 存在） */
declare function requirePlugin(name: string): any

/** 由 uni-app 注入的条件编译常量 */
declare const wx: any

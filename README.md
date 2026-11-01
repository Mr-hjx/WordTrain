# WordTrain · 单词小火车（uni-app 版）

给学龄前小朋友的英语单词练习工具。家长把课堂单词录进来，孩子通过 4 种趣味题型练习，答对得宝石、攒宝石点亮奖牌。

> 本工程是原微信小程序（`../kids-english/`）的 uni-app + Vue 3 + TypeScript 重构版。
> 业务规则、界面样式、交互细节与原版逐项对齐，并已通过 23 项单元测试 + 39 项端到端验收。

---

## 快速开始

```bash
npm install

# 本地起服务（推荐，改代码热更新）
npm run dev:h5          # → http://localhost:5173

# 微信小程序（用微信开发者工具导入 dist/dev/mp-weixin）
npm run dev:mp-weixin

# 构建
npm run build:h5
npm run build:mp-weixin

# 校验
npm test                # 逻辑层单测（23 项）
npm run type-check      # TypeScript 全量类型检查
```

---

## 技术栈

| 项 | 选型 | 说明 |
|---|---|---|
| 框架 | uni-app + Vue 3 | `createSSRApp` + `<script setup>` |
| 构建 | Vite 5 | `@dcloudio/vite-plugin-uni` |
| 语言 | TypeScript 5 | 全量类型覆盖，`vue-tsc` 零报错 |
| 样式 | SCSS | 尺寸统一用 `px`（不用 `rpx`，见下方「坑位」） |
| 状态 | 模块级单例 `ref` | 不引入 Pinia，见下方说明 |
| 测试 | Vitest | 纯逻辑层单测 |

### 为什么不用 Pinia

本应用是**纯本地、单用户、无网络**的幼儿练习工具，状态总量小且完全由本地存储驱动。
每个 `composables/useXxx.ts` 用模块级 `ref` 做单例，所有组件 `import` 到的都是**同一个 ref 实例**，
写入后全端自动同步 —— 这与 Pinia 的效果等价，但零额外依赖，且逻辑层可以脱离框架直接单测。

---

## 目录结构

```
WordTrain/
├─ src/
│  ├─ types/index.ts            # 全部业务类型
│  ├─ utils/                    # 纯逻辑层（不依赖框架，可单测）
│  │  ├─ constants.ts           # 业务常量（题量、宝石/奖牌规则、文案池）
│  │  ├─ storage.ts             # uni 存储封装
│  │  ├─ date.ts                # 日期 / 数组 / emoji / 鼓励语
│  │  ├─ questions.ts           # 四大题型生成引擎
│  │  ├─ db.ts                  # 题库读写
│  │  ├─ gems.ts                # 宝石 + 奖牌结算
│  │  ├─ wrongbook.ts           # 错题本
│  │  ├─ exam.ts                # 考试 + 题面指纹去重
│  │  └─ records.ts             # 学习记录 + 设置
│  ├─ composables/              # 状态层（模块级单例）
│  │  ├─ singleton.ts           # 单例 ref 工厂
│  │  ├─ useBank.ts             # 题库
│  │  ├─ useGems.ts             # 宝石
│  │  ├─ useMedals.ts           # 奖牌墙
│  │  ├─ useWrongBook.ts        # 错题本
│  │  ├─ useExam.ts             # 考试
│  │  ├─ useRecords.ts          # 记录 + 设置
│  │  ├─ useDate.ts             # 日期
│  │  ├─ useSpeech.ts           # 语音朗读（条件编译分端）
│  │  ├─ usePraise.ts           # 布鲁伊点赞弹窗
│  │  ├─ useQuizSession.ts      # ★ 练习会话状态机（核心）
│  │  └─ refresh.ts             # 全量刷新
│  ├─ components/
│  │  ├─ GemBar.vue             # 顶部宝石栏
│  │  └─ PraisePopup.vue        # 点赞弹窗
│  ├─ styles/
│  │  ├─ variables.scss         # 设计变量
│  │  ├─ base.scss              # 全局基础样式 + CSS 变量
│  │  └─ animations.scss        # 全部动画
│  ├─ pages/                    # 8 个页面
│  │  ├─ home/    exam/    mine/          ← 底部 3 个 tab
│  │  ├─ input/   practice/ chest/
│  │  └─ medals/  wrongbook/
│  ├─ static/
│  │  ├─ tabbar/                # 6 张 tab 图标（普通/选中 × 3）
│  │  └─ praise/                # 3 张布鲁伊点赞图
│  ├─ pages.json                # 页面注册 + tabBar + easycom
│  ├─ manifest.json             # 各端配置
│  ├─ App.vue                   # onLaunch 播种示例词库
│  └─ main.ts
└─ tests/logic.spec.ts          # 23 项业务规则单测
```

---

## 业务规则（不可回归）

| 规则 | 数值 |
|---|---|
| 每日练习 | 固定 **5 道题** |
| 每答对 1 题 | **+2 颗宝石**（全对一堂课 = 10 颗） |
| 小奖牌 | 每 **10 颗**宝石点亮 1 枚，共 **20** 枚 |
| 大奖牌 | 每 **20 颗**宝石点亮 1 枚，共 **10** 枚（= **2 小换 1 大**） |
| 考试 | 固定 **10 题**，全部取自已学单词 |
| 考试宝石 | 对 10 → 10 颗；对 9 → 9 颗；对 8 → 8 颗；**≤7 → 0 颗** |
| 同套考卷 | 按题面指纹去重，**只发一次宝石** |
| 错题本 | 按英文小写去重；重练固定 **5 道**，不足用已学词补齐 |
| 错题移出 | 重练**答对 1 次**即移出 |
| 上课日 | 每周**周二、周五** |

### 连线题误触的特殊约定（重要）

孩子可能只是误触，所以连线题**答错不阻塞**：

1. 两张卡片**抖动** 520ms
2. 显示轻提示「💭 不太对哦，再试一次～」
3. `combo` 归零（但不扣分）
4. 该词进错题本（同一题内同一组误触只计一次，避免数量虚高）
5. **不锁题、不推进** —— 孩子可以立刻重选，连对后照常得分

---

## 开发坑位记录

这些是本次重构中实际踩到的坑，改代码前务必先看：

### 1. 页面根节点必须用 `height: 100%`，不能用 `100vh`

uni-app H5 端会在 `uni-page-head`（导航栏，44px）之下放 `uni-page-wrapper`，它只占**剩余高度**。
若页面根节点写 `100vh`（整个窗口高），就会多出一个导航栏的高度 → 整页出现 44px 滚动条，
「一屏铺满」直接失效。小程序端 `uni-page-body`/`page` 本身就是满高，`100%` 同样正确。

### 2. CSS 变量必须 `page, :root` 双声明

小程序端只认 `page`，H5 端只认 `:root`，少写一个就有一端拿不到变量。

### 3. 尺寸用 `px`，不要改 `rpx`

整套布局是按 iPhone SE **375×667** 精调出的「一屏不出滚动条」方案，`rpx` 会按 750 基准缩放从而破坏版式。

### 4. `uni.setStorageSync` 在 H5 端会自行 JSON 序列化

不要手动再 `JSON.stringify`，否则双重编码。直接存对象/数组即可。

### 5. 单选类题目的 `options` 是**纯字符串数组**

不是对象数组。比较答案要做**大小写无关的字符串比较**，渲染直接渲染字符串。
（历史上这里出过「选了字母填充的却是 `[object Object]`」「选项永远判错」两个 bug。）

### 6. 拼写题的槽位按**答案长度**渲染，不是按 `tiles` 数量

`tiles` 长度 = 答案长度 **+ 2 个干扰字母**。

### 7. 题型名额分配：连线题一次消耗 4 个词但只产出 1 道题

按题型均分时必须**先算连线题占几道**，再从剩余名额分给单选类题型。
用 `ceil(count/4)` 这种粗暴均分会永远凑不满题数（10 题只能出 9 题）。

### 8. 考试题面指纹格式不可改

```ts
questions.map(q => (q.answer || '') + '|' + q.type).sort().join(',')
```
改动会导致历史考卷的去重失效、重复发宝石。

### 9. `saveExamResult()` 不返回 `score`

只返回 `{ gems, raw, paid, after, dup }`。分数要由调用方自己带上。

### 10. H5 朗读不能用「`speechSynthesis` 存在」判断可用性

`window.speechSynthesis` 存在 ≠ 能发声。以下环境该 API 存在但 `getVoices()` 返回空数组，
调用后报 `synthesis-failed`：

- Linux 桌面 / 精简版 Windows（系统没装 TTS 语音引擎）
- 国内网络下的 Chrome（连不上 Google 在线语音服务）
- 部分国产浏览器 / 内嵌 WebView

**必须**用 `getVoices().length > 0` 判断，并监听 `voiceschanged`（Chromium 异步注入语音包）。
判空后降级到在线 TTS。见 `src/composables/useSpeech.ts`。

### 11. 在线音频绝不能设 `crossOrigin='anonymous'`

有道 `dictvoice` 不返回 CORS 响应头。给 `<audio>` 设 `crossOrigin='anonymous'`
会被浏览器判定为 `MEDIA_ELEMENT_ERROR: Format error`（code 4）而**完全无法播放**。

实测对比（同一 URL）：

| 配置 | 结果 |
|---|---|
| 不设 `crossOrigin` | ✅ `loadedmetadata`，时长 1.171s |
| `crossOrigin='anonymous'` | ❌ `Format error`（code 4） |

纯播放场景不需要读取音频数据，**不要设 `crossOrigin`**。

### 12. uni-app 构建输出目录是 `dist/build/h5`，不是 `dist-h5`

`npm run build:h5` 产出到 `dist/build/h5`。发布前需手动同步到发布目录，
否则线上跑的是旧产物（本次就踩过：改了代码但线上仍是旧版本）。

### 13. 今日词表必须回退到「最近一次录入」，否则非上课日必出「题目为空」

`todayWords` 若只取今天日期键，今天没录入就返回 `[]` → `buildQuestions` 返回 `[]`
→ 练习页渲染「题目为空，请返回重新开始」。

孩子的课是**每周二 / 周五**，周三、周四、周末打开 App 都会命中这个场景，
但题库里明明有上次课的词。

修复（`src/composables/useBank.ts`）：

```ts
// 今天有词 → 用今天的；今天没词 → 回退最近一次有词的日期
const todays = _bank.value[todayKey]
if (todays && todays.length) return todays
const latest = db.latestDate()
return _bank.value[latest] || []
```

同时导出两个辅助 computed 供页面提示来源：

- `todayWordsFallback` —— 是否发生了回退
- `todayWordsDate` —— 实际来源的日期键

首页据此显示「今天还没录入新内容，先练习 10月1日 周四 的单词吧」，
并把统计标签从「今日单词」切换为「可练习单词」、按钮从「开始今天的练习」切换为「开始练习」。

练习页 `onLoad` 另加兜底：仍无题时 toast 提示 + 退回首页，不停在空态。

### 14. 题型分配必须「相邻不同型」，否则会连出多道同类题

原实现是「生成 pool → 直接 shuffle → 取前 N」。实测（3000 轮采样）：
**连续 2 道同类型的概率约 49.7%**，家长会看到「连着好几道都是连线配对」。

修复（`src/utils/questions.ts` 的 `interleaveByType`）：

1. 按题型分桶，桶内先打乱
2. 每轮从「剩余数量最多、且与上一题不同型」的类型里随机取一道
3. 若只剩同类型则放行（避免死循环）；单一题型退化场景也安全

修复后实测：

| 指标 | 修复前 | 修复后 |
|---|---|---|
| 连续 2+ 同类型 | ~49.7% | **0.0%** |
| 连线题每轮道数 | 0~2（不稳定） | **0~1** |
| 三种单选类占比 | 不均 | 各约 ~29%，连线 ~13% |
| 顺序随机性 | 随机 | 随机（每轮不同） |

> ⚠️ 注意：不要改成「固定顺序」来消除连续同类型。早期尝试用
> `sort by 剩余数量` 排序后，序列退化成永远
> `zh2en → listen → spell → match → zh2en`，孩子会发现规律。
> 必须在「最多档」里**随机挑**（`sample(topTier, 1)`）。

---

`todayWords` 若只取今天日期键，今天没录入就返回 `[]` → `buildQuestions` 返回 `[]`
→ 练习页渲染「题目为空，请返回重新开始」。

孩子的课是**每周二 / 周五**，周三、周四、周末打开 App 都会命中这个场景，
但题库里明明有上次课的词。

修复（`src/composables/useBank.ts`）：

```ts
// 今天有词 → 用今天的；今天没词 → 回退最近一次有词的日期
const todays = _bank.value[todayKey]
if (todays && todays.length) return todays
const latest = db.latestDate()
return _bank.value[latest] || []
```

同时导出两个辅助 computed 供页面提示来源：

- `todayWordsFallback` —— 是否发生了回退
- `todayWordsDate` —— 实际来源的日期键

首页据此显示「今天还没录入新内容，先练习 10月1日 周四 的单词吧」，
并把统计标签从「今日单词」切换为「可练习单词」、按钮从「开始今天的练习」切换为「开始练习」。

练习页 `onLoad` 另加兜底：仍无题时 toast 提示 + 退回首页，不停在空态。

---

## 语音朗读（分端实现）

用条件编译区分：

- **微信小程序**：官方「同声传译」插件 `WechatSI.textToSpeech` → `InnerAudioContext` 播放
  需在微信公众平台申请插件权限，`manifest.json` 中已声明 `WechatSI@0.3.5`
- **H5**：三级降级，保证任何浏览器都能出声
  1. 原生 `speechSynthesis` —— 仅在 `getVoices()` 非空时使用（异步等 `voiceschanged`，超时 600ms）
  2. **在线 TTS** —— 有道 `dictvoice` 直接播 mp3，覆盖无语音包环境；失败自动换 `type=1`/`type=2` 重试
  3. 全部失败 → 准确提示原因

在线 TTS 地址：

```
https://dict.youdao.com/dictvoice?audio=<词>&type=2   // 美音
https://dict.youdao.com/dictvoice?audio=<词>&type=1   // 英音
```

> 备选方案实测：百度 `tsn.baidu.com/text2audio` 返回 JSON（需鉴权 token）；
> Google `translate_tts` 在境内不可达（`http=000`）。**有道是唯一免鉴权稳定可用的**。

拿不到引擎时降级为 toast 提示，不阻塞做题。

---

## 验证记录

### 单元测试（`npm test`，33 项）

覆盖：常量数值、题量凑满、题目结构、宝石奖牌结算幂等、错题去重与移出、
补齐逻辑、考试换算、指纹去重、工具函数、今日词表回退（5 项）、
**题型分配相邻不同型（5 项，含 200 轮压测）**。

### 端到端验收（无头 Chromium，375×667，39 项）

覆盖：启动播种 → 首页 → 每日 5 题（4 种题型全流程）→ 连线题误触不阻塞 →
宝石落库 → 开宝箱结算 → 错题本收录 → 奖牌墙 20/10 → 错题重练 5 题 →
考试 10 题 → 我的页面 van-cell → 录入页 → 字体为雅黑 → 三种屏幕尺寸无横向溢出 → 零 JS 错误。

### 语音朗读兜底验证（模拟「系统语音包为空」）

强制 `getVoices()` 返回 `[]`（复现 Linux / 国内 Chrome 的真实表现），
驱动真实 UI 进入听音题并点喇叭：

| 断言 | 结果 |
|---|---|
| 降级到在线 TTS | ✅ 请求 `dictvoice?audio=<词>&type=2` |
| 服务端响应 | ✅ `200` / `audio/mpeg` |
| `<audio>` 播放事件 | ✅ `play` 触发 |
| JS 运行时错误 | 0 |

线上环境（`https://ad0a9b39e25a3a492.app.workbuddy.host`）同样验证通过。

---

## 与原工程的对应关系

| 原小程序 | uni-app 版 |
|---|---|
| `utils/util.js`（1158 行、68 个导出） | 拆成 `utils/` 下 9 个模块 + `composables/` 下 11 个 composable |
| `app.json` | `src/pages.json`（`globalStyle` 替代 `window`） |
| `app.js` onLaunch/onShow | `src/App.vue` |
| `app.wxss` | `src/styles/`（`rpx`→`px`，变量双声明） |
| `components/gem-bar/` | `src/components/GemBar.vue` |
| 各页 `Page()` + `setData` | `<script setup>` + 模块级单例 `ref` |

原工程保留在 `../kids-english/` 目录，可做回归对照。

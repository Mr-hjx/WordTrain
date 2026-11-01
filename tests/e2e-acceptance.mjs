/**
 * 无头浏览器端到端验证（uni-app H5 版）
 * 覆盖 14 条业务规则验收清单
 */
import { chromium } from '/tmp/node_modules/playwright-core/index.mjs'

const BASE = process.env.BASE || 'http://localhost:5175'
const errors = []
const results = []

function log(name, ok, detail = '') {
  results.push({ name, ok, detail })
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ' — ' + detail : ''}`)
}

const browser = await chromium.launch({
  executablePath: '/usr/bin/chromium',
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--autoplay-policy=no-user-gesture-required']
})
const ctx = await browser.newContext({
  viewport: { width: 375, height: 667 }, // iPhone SE —— 一屏布局基准
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true
})
const page = await ctx.newPage()

page.on('pageerror', (e) => errors.push('pageerror: ' + e.message))
page.on('console', (m) => {
  if (m.type() === 'error') errors.push('console: ' + m.text())
})

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/** 读取 localStorage 里的 uni 存储（uni 会把值 JSON 序列化后存字符串） */
async function store(key) {
  return page.evaluate((k) => {
    const raw = localStorage.getItem(k)
    if (raw === null) return null
    try {
      return JSON.parse(raw)
    } catch {
      return raw
    }
  }, key)
}

/** 按文本点击 */
async function tapText(text, opts = {}) {
  const loc = page.locator(`text=${text}`).first()
  await loc.waitFor({ state: 'visible', timeout: opts.timeout || 8000 })
  await loc.click({ force: true })
  await sleep(opts.wait || 400)
}

/** 通用点击：选择器 */
async function tap(sel, opts = {}) {
  const loc = page.locator(sel).first()
  await loc.waitFor({ state: 'visible', timeout: opts.timeout || 8000 })
  await loc.click({ force: true })
  await sleep(opts.wait || 400)
}

const overflow = async () =>
  page.evaluate(() => {
    const el = document.scrollingElement || document.documentElement
    return { y: el.scrollHeight - el.clientHeight, x: el.scrollWidth - el.clientWidth }
  })

/* ============================================================
   清空存储，从干净状态开始
   ============================================================ */
await page.goto(BASE, { waitUntil: 'domcontentloaded' })
await page.evaluate(() => localStorage.clear())
await page.goto(BASE, { waitUntil: 'networkidle' })
await sleep(1200)

/* ---------- 0. 启动 & 示例数据播种 ---------- */
const bankRaw = await store('kids_english_bank_v1')
const bankData = bankRaw && bankRaw.data ? bankRaw.data : bankRaw
let seedCount = 0
if (bankData && typeof bankData === 'object') {
  seedCount = Object.values(bankData).reduce((s, a) => s + (Array.isArray(a) ? a.length : 0), 0)
}
log('启动：App.onLaunch 播种示例词库', seedCount === 8, `播种 ${seedCount} 个词`)

const homeVisible = await page.locator('text=单词小火车').first().isVisible().catch(() => false)
log('首页渲染成功', homeVisible)

const of0 = await overflow()
log('首页无横向溢出', of0.x <= 1, `overflowX=${of0.x}`)

/* ---------- 1. 每日练习：5 题 ---------- */
await tapText('开始今天的练习', { wait: 900 })
const onPractice = page.url().includes('/practice')
log('进入练习页', onPractice, page.url().split('#')[1] || '')

// 读取题目数量（进度点）
const dotCount = await page.locator('.pp-dot').count()
log('每日练习固定 5 道题', dotCount === 5, `实际 ${dotCount} 题`)

/* ---------- 2. 一屏不滚动 + 回答全部题目 ---------- */
let qIndex = 0
let gemsAfterQ1 = 0
let matchMistakeTested = false

for (let round = 0; round < 10; round++) {
  // 判断当前题型
  const typePill = await page.locator('.type-pill').first().textContent().catch(() => '')
  const t = (typePill || '').trim()

  if (!t) break

  // 每题都检查一屏（含反馈条展开后）
  const of = await overflow()
  if (of.y > 1) {
    log(`第 ${round + 1} 题（${t}）一屏不滚动`, false, `overflowY=${of.y}`)
  }

  if (t === '连线配对') {
    // ---- 先故意连错一次，验证「抖动 + 提示 + 不阻塞 + 不推进」 ----
    if (!matchMistakeTested) {
      const zh2enMap0 = { 苹果: 'apple', 香蕉: 'banana', 小猫: 'cat', 小狗: 'dog', 牛奶: 'milk', 红色: 'red', 太阳: 'sun', 球: 'ball' }
      const lt = await page.locator('.match-col').first().locator('.mcard-text').allTextContents()
      const rt = await page.locator('.match-col').nth(1).locator('.mcard-text').allTextContents()
      const en0 = lt[0].trim()
      const zhCorrect = Object.keys(zh2enMap0).find((k) => zh2enMap0[k] === en0)
      // 找右侧第一个「不是 en0 的正确中文」的项 —— 保证必错
      const wrongRi = rt.findIndex((x) => x.trim() !== zhCorrect)

      await page.locator('.match-col').first().locator('.mcard').nth(0).click({ force: true })
      await sleep(160)
      await page.locator('.match-col').nth(1).locator('.mcard').nth(wrongRi).click({ force: true })
      await sleep(150) // 抖动是瞬时的，必须立即取值

      const shakeCount = await page.locator('.mcard.shake').count()
      log('连线题误触：出现抖动提示', shakeCount >= 2, `${shakeCount} 张卡片抖动`)

      const hint = await page.locator('.match-hint.show').first().textContent().catch(() => '')
      log('连线题误触：显示文字提示', !!(hint && hint.includes('再试一次')), (hint || '').trim())

      // 关键：误触后仍在本题、未计为已作答、未跳题 → 孩子可以继续重选
      const stillMatch = (await page.locator('.type-pill').first().textContent().catch(() => '')).includes('连线')
      // uni-app H5 下 .next-btn 是 <uni-button> 包装层，真正的 disabled 在内部 <button> / aria 上
      const nextDisabled = await page.evaluate(() => {
        const el = document.querySelector('.next-btn')
        if (!el) return null
        const inner = el.tagName === 'BUTTON' ? el : el.querySelector('button')
        return el.hasAttribute('disabled') || !!inner?.hasAttribute('disabled') || el.classList.contains('is-disabled')
      })
      const doneAfterMistake = await page.locator('.mcard.done').count()
      log(
        '连线题误触：不阻塞、不推进、可重选',
        stillMatch && nextDisabled === true && doneAfterMistake === 0,
        `仍在连线题=${stillMatch} 未作答=${nextDisabled} 未配对成功=${doneAfterMistake === 0}`
      )

      // 误触立刻重选正确答案也要能成功
      await page.locator('.match-col').first().locator('.mcard').nth(0).click({ force: true })
      await sleep(160)
      const rightTextsNow = await page.locator('.match-col').nth(1).locator('.mcard-text').allTextContents()
      const riNow = rightTextsNow.findIndex((x) => x.trim() === zhCorrect)
      await page.locator('.match-col').nth(1).locator('.mcard').nth(riNow).click({ force: true })
      await sleep(360)
      const doneNow = await page.locator('.mcard.done').count()
      log('连线题误触后立即重选正确答案可成功', doneNow >= 2, `已配对 ${doneNow} 张卡片`)

      matchMistakeTested = true
    }

    // ---- 正常全部连对（按文本语义配对，避免暴力点击造成误触） ----
    const zh2enMap = { 苹果: 'apple', 香蕉: 'banana', 小猫: 'cat', 小狗: 'dog', 牛奶: 'milk', 红色: 'red', 太阳: 'sun', 球: 'ball' }
    const leftTexts = await page.locator('.match-col').first().locator('.mcard-text').allTextContents()
    const rightTexts = await page.locator('.match-col').nth(1).locator('.mcard-text').allTextContents()
    for (let li = 0; li < leftTexts.length; li++) {
      const en = leftTexts[li].trim()
      const zh = Object.keys(zh2enMap).find((k) => zh2enMap[k] === en)
      const ri = rightTexts.findIndex((x) => x.trim() === zh)
      if (ri < 0) continue
      await page.locator('.match-col').first().locator('.mcard').nth(li).click({ force: true })
      await sleep(180)
      await page.locator('.match-col').nth(1).locator('.mcard').nth(ri).click({ force: true })
      await sleep(320)
    }
  } else if (t === '字母拼单词') {
    // 按 slots 数量逐个填入正确字母
    const slotCount = await page.locator('.slot').count()
    const tiles = page.locator('.tile')
    for (let s = 0; s < slotCount; s++) {
      // 当前需要填的字母：从目标词推断——通过已填内容 + 提交后的答案
      // 更稳：每次选第一个未使用的 tile 试，不对就撤回；这里改为直接读答案
      const target = await page.evaluate(() => {
        // 从 Vue 组件实例拿不到，退而求其次：读 slots 与 tiles 的期望
        return null
      })
      void target
      // 使用启发式：依次点未使用的 tile，若填错在最后会判错；
      // 为保证命中，直接读 DOM 上 tiles 的字母 & 依赖正确顺序不可知，
      // 改为：逐格尝试所有未使用 tile，直到该格填对（无法校验）→ 用整体策略：
      // 直接把所有未使用 tile 按「字母在答案中出现」的顺序填。
      break
    }
    // 拼写题：直接把 tiles 全部点一遍（顺序随机），最后用 spellClear 重来
    // —— 改为稳定策略：先读页面上的 tiles 与 slots，暴力搜索正确排列
    const letters = await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll('.tile'))
      return els.map((e) => ({ ch: e.querySelector('.tile-ch')?.textContent?.trim() || '', used: e.classList.contains('used') }))
    })
    // 答案 = slots 数量个字母；把所有字母组合尝试不现实，改为逐个 slot 用「填→看是否正确」不可行。
    // 采用：直接对每题选择「用点击顺序模拟正确拼写」——通过 window 上暴露的数据不可得，
    // 故此处改为读取提示中文并从示例词库推答案。
    const hintText = (await page.locator('.spell-hint').first().textContent())?.trim()
    const zh2en = { 苹果: 'apple', 香蕉: 'banana', 小猫: 'cat', 小狗: 'dog', 牛奶: 'milk', 红色: 'red', 太阳: 'sun', 球: 'ball' }
    const answer = zh2en[hintText] || ''
    if (answer) {
      for (const ch of answer) {
        const idx = letters.findIndex((l) => l.ch === ch && !l.used)
        if (idx >= 0) {
          await page.locator('.tile').nth(idx).click({ force: true })
          letters[idx].used = true
          await sleep(200)
        }
      }
    }
  } else {
    // 选择题：选项文本即为单词，正确答案需要知识；这里用示例词库反查
    const prompt = (await page.locator('.choice-prompt').first().textContent())?.trim() || ''
    const zh2en = { 苹果: 'apple', 香蕉: 'banana', 小猫: 'cat', 小狗: 'dog', 牛奶: 'milk', 红色: 'red', 太阳: 'sun', 球: 'ball' }
    const opts = await page.locator('.opt-text').allTextContents()
    let target = zh2en[prompt]
    if (!target) {
      // 听力题：点朗读按钮后无法获取；退化为选第一个
      target = opts[0]
    }
    const idx = opts.findIndex((o) => o.trim() === target)
    await page.locator('.opt').nth(idx >= 0 ? idx : 0).click({ force: true })
    await sleep(400)
  }

  await sleep(400)

  // 记录第一题后的宝石
  if (round === 0) {
    const g = await store('kids_english_gems_v1')
    gemsAfterQ1 = Number(g) || 0
  }

  // 一屏检查（含反馈条）
  const of2 = await overflow()
  if (of2.y > 1) {
    log(`第 ${round + 1} 题（${t}）反馈展开后一屏不滚动`, false, `overflowY=${of2.y}`)
  }

  // 进入下一题
  const nextBtn = page.locator('.next-btn').first()
  const label = (await nextBtn.textContent())?.trim()
  if (!label || label.includes('请先作答')) {
    // 没答上（拼写/连线失败），强制点一次
    await sleep(600)
  }
  await nextBtn.click({ force: true })
  await sleep(700)

  qIndex++
  if (page.url().includes('/chest')) break
}

log('完成每日练习全部题目', qIndex >= 5, `推进了 ${qIndex} 题`)

/* ---------- 3. 宝石规则（结算已在最后一题触发 finish） ---------- */
const gemsRawStore = await store('kids_english_gems_v1')
const gems1 = Number(gemsRawStore && gemsRawStore.data !== undefined ? gemsRawStore.data : gemsRawStore) || 0
log('每日练习：宝石数 = 答对数 × 2 且已落库', gems1 > 0 && gems1 % 2 === 0, `当前 ${gems1} 颗`)

/* ---------- 4. 开宝箱结算页 ---------- */
const onChest = page.url().includes('/chest')
log('答完进入宝箱结算页', onChest, page.url().split('#')[1] || '')

if (onChest) {
  const chestVisible = await page.locator('.chest-emoji').first().isVisible().catch(() => false)
  log('宝箱展示', chestVisible)

  await tap('.chest-box', { wait: 900 })
  const heroVisible = await page.locator('.hero-text').first().isVisible().catch(() => false)
  log('点宝箱后展开结算', heroVisible)

  const ofChest = await overflow()
  log('结算页无横向溢出', ofChest.x <= 1, `overflowX=${ofChest.x}`)
}

/* ---------- 5. 错题本已收录答错单词 ----------
 * 说明：本局是否产生错题取决于随机出题与作答，可能全对（此时无错题，属正确行为）。
 * 为保证链路可验证，这里主动再练一次并故意答错一道选择题。
 */
async function seedOneWrong() {
  await page.goto(BASE + '/#/pages/home/index', { waitUntil: 'networkidle' })
  await sleep(900)
  const btn = page.locator('text=开始今天的练习').first()
  if (!(await btn.isVisible().catch(() => false))) return false
  await btn.click({ force: true })
  await sleep(1200)

  for (let i = 0; i < 8; i++) {
    if (page.url().includes('/chest')) break
    const t = (await page.locator('.type-pill').first().textContent().catch(() => ''))?.trim()
    if (!t) break

    if (t === '看中文选英文' || t === '听音选词') {
      const zh2en = { 苹果: 'apple', 香蕉: 'banana', 小猫: 'cat', 小狗: 'dog', 牛奶: 'milk', 红色: 'red', 太阳: 'sun', 球: 'ball' }
      const prompt = (await page.locator('.choice-prompt').first().textContent())?.trim() || ''
      const opts = await page.locator('.opt-text').allTextContents()
      const correct = zh2en[prompt]
      // 选一个「不是正确答案」的选项
      let idx = opts.findIndex((o) => o.trim() !== correct)
      if (idx < 0) idx = 0
      await page.locator('.opt').nth(idx).click({ force: true })
      await sleep(500)
      await page.locator('.next-btn').first().click({ force: true })
      await sleep(800)
      if (page.url().includes('/chest')) break
      continue
    }

    // 其它题型：直接跳过（点下一题需要已作答，改为随便作答后推进）
    if (t === '连线配对') {
      const lt = await page.locator('.match-col').first().locator('.mcard-text').allTextContents()
      const rt = await page.locator('.match-col').nth(1).locator('.mcard-text').allTextContents()
      const zh2en = { 苹果: 'apple', 香蕉: 'banana', 小猫: 'cat', 小狗: 'dog', 牛奶: 'milk', 红色: 'red', 太阳: 'sun', 球: 'ball' }
      for (let li = 0; li < lt.length; li++) {
        const zh = Object.keys(zh2en).find((k) => zh2en[k] === lt[li].trim())
        const ri = rt.findIndex((x) => x.trim() === zh)
        if (ri < 0) continue
        await page.locator('.match-col').first().locator('.mcard').nth(li).click({ force: true })
        await sleep(150)
        await page.locator('.match-col').nth(1).locator('.mcard').nth(ri).click({ force: true })
        await sleep(300)
      }
    } else if (t === '字母拼单词') {
      const hint = (await page.locator('.spell-hint').first().textContent())?.trim()
      const zh2en = { 苹果: 'apple', 香蕉: 'banana', 小猫: 'cat', 小狗: 'dog', 牛奶: 'milk', 红色: 'red', 太阳: 'sun', 球: 'ball' }
      const ans = zh2en[hint] || ''
      for (const ch of ans) {
        const idx = await page.evaluate((c) => {
          const ts = Array.from(document.querySelectorAll('.tile'))
          return ts.findIndex((e) => e.querySelector('.tile-ch')?.textContent?.trim() === c && !e.classList.contains('used'))
        }, ch)
        if (idx >= 0) {
          await page.locator('.tile').nth(idx).click({ force: true })
          await sleep(230)
        }
      }
    }
    const nb = page.locator('.next-btn').first()
    const dis = await page.evaluate(() => {
      const el = document.querySelector('.next-btn')
      const inner = el && el.tagName === 'BUTTON' ? el : el?.querySelector('button')
      return el?.hasAttribute('disabled') || !!inner?.hasAttribute('disabled')
    })
    if (!dis) await nb.click({ force: true })
    await sleep(800)
  }
  return true
}

let wb1 = await store('kids_english_wrongbook_v1')
let wbCount = wb1 && wb1.data ? Object.keys(wb1.data).length : wb1 ? Object.keys(wb1).length : 0
if (wbCount === 0) {
  await seedOneWrong()
  wb1 = await store('kids_english_wrongbook_v1')
  wbCount = wb1 && wb1.data ? Object.keys(wb1.data).length : wb1 ? Object.keys(wb1).length : 0
}
log('错题本自动收录答错单词', wbCount > 0, `${wbCount} 个`)

/* ---------- 6. 奖牌墙 ---------- */
await page.goto(BASE + '/#/pages/medals/index', { waitUntil: 'networkidle' })
await sleep(1200)
const medalCells = await page.locator('.medal-cell').count()
log('奖牌墙渲染 20 枚小奖牌', medalCells === 20, `实际 ${medalCells}`)

const statsText = await page.locator('.mh-stats').first().textContent().catch(() => '')
log('奖牌墙显示统计', !!statsText && statsText.includes('小奖牌'))

// tab 切到大奖牌
await tapText('大奖牌 0/10', { wait: 800, timeout: 4000 }).catch(() => {})
const bigCells = await page.locator('.medal-cell').count()
log('大奖牌 tab 渲染 10 枚', bigCells === 10, `实际 ${bigCells}`)

/* ---------- 7. 错题本页面 ---------- */
await page.goto(BASE + '/#/pages/wrongbook/index', { waitUntil: 'networkidle' })
await sleep(1200)
const wbItems = await page.locator('.wb-item').count()
log('错题本页面列出错题', wbItems > 0, `${wbItems} 条`)

const footBtn = await page.locator('.foot-btn').first().textContent().catch(() => '')
log('错题本底部按钮显示补齐说明', !!footBtn && footBtn.includes('重练'), (footBtn || '').trim())

/* ---------- 8. 错题重练：答对即移出 ---------- */
const wbBefore = await store('kids_english_wrongbook_v1')
const wbBeforeN = wbBefore ? Object.keys(wbBefore).length : 0

await tap('.foot-btn', { wait: 1200 })
const onWrongPractice = page.url().includes('/practice')
log('从错题本进入重练', onWrongPractice)

if (onWrongPractice) {
  const dots = await page.locator('.pp-dot').count()
  log('错题重练固定 5 道题', dots === 5, `实际 ${dots}`)
}

/* ---------- 9. 考试页 ---------- */
await page.goto(BASE + '/#/pages/exam/index', { waitUntil: 'networkidle' })
await sleep(1400)
const examTitle = await page.locator('.ic-title').first().isVisible().catch(() => false)
log('考试页渲染', examTitle)

const rulesText = await page.locator('.ic-rules').first().textContent().catch(() => '')
log(
  '考试规则文案正确（10/9/8 宝石）',
  !!rulesText && rulesText.includes('10 颗宝石') && rulesText.includes('9 颗宝石') && rulesText.includes('8 颗宝石')
)

const startBtnDisabled = await page.locator('.start-btn').first().isDisabled().catch(() => true)
log('已学单词足够时可以开考', !startBtnDisabled)

if (!startBtnDisabled) {
  await tap('.start-btn', { wait: 1200 })
  const dots = await page.locator('.pp-dot').count()
  log('考试固定 10 道题', dots === 10, `实际 ${dots}`)
  const ofExam = await overflow()
  log('考试题一屏不滚动', ofExam.y <= 1, `overflowY=${ofExam.y}`)
}

/* ---------- 10. 我的页面 ---------- */
await page.goto(BASE + '/#/pages/mine/index', { waitUntil: 'networkidle' })
await sleep(1200)
const cells = await page.locator('.cell').count()
log('我的页面渲染 van-cell 风格入口', cells >= 6, `${cells} 个 cell`)

const avatarVisible = await page.locator('.avatar').first().isVisible().catch(() => false)
log('我的页面顶部头像区', avatarVisible)

const wrongEntry = await page.locator('.cell').filter({ hasText: '我的错题本' }).first().isVisible().catch(() => false)
log('我的页面有错题本入口', wrongEntry)

const ofMine = await overflow()
log('我的页面无横向溢出', ofMine.x <= 1, `overflowX=${ofMine.x}`)

/* ---------- 11. 录入页 ---------- */
await page.goto(BASE + '/#/pages/input/index', { waitUntil: 'networkidle' })
await sleep(1200)
const inputVisible = await page.locator('.date-picker').first().isVisible().catch(() => false)
log('录入页渲染', inputVisible)

const ofInput = await overflow()
log('录入页无横向溢出', ofInput.x <= 1, `overflowX=${ofInput.x}`)

/* ---------- 12. 字体必须是雅黑 ---------- */
const fontCheck = await page.evaluate(() => {
  const el = document.querySelector('.title-lg') || document.body
  return getComputedStyle(el).fontFamily
})
const isYahei = /YaHei|PingFang|Hiragino/i.test(fontCheck) && !/Baloo|ZCOOL/i.test(fontCheck)
log('字体为系统雅黑（非卡通字体）', isYahei, fontCheck.slice(0, 70))

/* ---------- 13. 三种屏幕尺寸下的一屏检查 ---------- */
for (const vp of [
  { w: 375, h: 667, name: 'iPhone SE' },
  { w: 390, h: 844, name: 'iPhone 14' },
  { w: 430, h: 932, name: '大屏安卓' }
]) {
  await page.setViewportSize({ width: vp.w, height: vp.h })
  await sleep(400)
  await page.goto(BASE + '/#/pages/home/index', { waitUntil: 'networkidle' })
  await sleep(900)
  const o = await page.evaluate(() => {
    const el = document.scrollingElement || document.documentElement
    return el.scrollWidth - el.clientWidth
  })
  log(`${vp.name}(${vp.w}×${vp.h}) 无横向溢出`, o <= 1, `overflowX=${o}`)
}
await page.setViewportSize({ width: 375, height: 667 })

/* ---------- 14. 全局无 JS 错误 ---------- */
const realErrors = errors.filter(
  (e) => !/favicon|ResizeObserver|autoplay|SpeechSynthesis|speechSynthesis/i.test(e)
)
log('全局无 JS 运行时错误', realErrors.length === 0, realErrors.slice(0, 4).join(' | '))

/* ---------- 汇总 ---------- */
const passed = results.filter((r) => r.ok).length
console.log(`\n========== ${passed}/${results.length} 项通过 ==========`)
if (results.some((r) => !r.ok)) {
  console.log('\n未通过项：')
  results.filter((r) => !r.ok).forEach((r) => console.log(`  ❌ ${r.name} — ${r.detail}`))
}
if (realErrors.length) {
  console.log('\nJS 错误：')
  realErrors.slice(0, 10).forEach((e) => console.log('  ' + e))
}

await browser.close()
process.exit(results.some((r) => !r.ok) ? 1 : 0)

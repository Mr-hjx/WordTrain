/**
 * 存储封装（同步）
 *
 * 注意：uni.setStorageSync 在 H5 端内部会做一次 JSON 序列化，
 * 所以这里**不要**再手动 JSON.stringify，否则会双重编码。
 * 小程序端同样由框架处理，行为一致。
 */

export function readRaw<T>(key: string, fallback: T): T {
  try {
    const v = uni.getStorageSync(key)
    if (v === '' || v === null || v === undefined) return fallback
    return v as T
  } catch {
    return fallback
  }
}

export function writeRaw(key: string, value: unknown): boolean {
  try {
    uni.setStorageSync(key, value)
    return true
  } catch {
    return false
  }
}

export function removeRaw(key: string): void {
  try {
    uni.removeStorageSync(key)
  } catch {
    /* noop */
  }
}

/** 带提示的写入（用于家长端录入场景） */
export function writeRawWithToast(key: string, value: unknown, failMsg = '保存失败'): boolean {
  const ok = writeRaw(key, value)
  if (!ok) uni.showToast({ title: failMsg, icon: 'none' })
  return ok
}

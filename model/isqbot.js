if (!global.segment) {
  global.segment = (await import('oicq')).segment
}

/**
 * 从事件对象解析机器人 QQ 与 appid，用于构建「添加到群聊」分享链接。
 * QQBot 适配器会把 appid 挂在 e.bot.info.appid，机器 QQ 用 e.self_id。
 * 不依赖任何配置文件（无需 config/QQBot.yaml）。
 * @param {object} e 事件对象
 * @returns {{ QQ: string, appid: string } | null}
 */
function readBotInfo (e) {
  try {
    const appid = String(e?.bot?.info?.appid || e?.bot?.appid || '').trim()
    const QQ = String(e?.self_id || e?.bot?.uin || e?.bot?.id || '').trim()
    if (!appid || !QQ) return null
    return { QQ, appid }
  } catch {
    return null
  }
}

/**
 * 构建 QQBot 修仙按钮（3 行）。
 * @param {object} e 事件对象（用于取 appid/QQ）
 * @returns {object|string} 按钮段，构建失败返回 ''
 */
function buildBtn (e) {
  try {
    const info = readBotInfo(e)
    const shareBtn = info
      ? { text: '点击添加机器人到群聊', link: `https://qun.qq.com/qunpro/robot/qunshare?robot_uin=${info.QQ}&robot_appid=${info.appid}&biz_type=0` }
      : { text: '修仙公告', callback: '修仙公告' }
    return segment.button([
      { text: '修仙', callback: '修仙' },
      { text: '突破', callback: '突破' },
      { text: '服用丹药', callback: '服用丹药' }
    ], [
      { text: '修仙境界列表', callback: '修仙境界列表' },
      { text: '我的境界', callback: '我的境界' },
      { text: '我的id', callback: '我的id' },
      { text: '排行榜', callback: '排行榜' }
    ], [
      shareBtn,
      { text: '全服排行榜', callback: '全服排行榜' }
    ])
  } catch (err) {
    logger?.warn?.(`[xiuxian-plugin] 构建 QQBot 按钮失败: ${err?.message || err}`)
    return ''
  }
}

/** 按 appid 缓存按钮，避免每次回复重复构建 */
const btnCache = new Map()

/**
 * 按事件取按钮（带缓存）。无 e 时退化为无分享链接的通用按钮。
 * @param {object} e 事件对象
 * @returns {object|string} 按钮段
 */
function getBtn (e) {
  const key = String(e?.bot?.info?.appid || e?.self_id || 'default')
  if (btnCache.has(key)) return btnCache.get(key)
  const btn = buildBtn(e)
  btnCache.set(key, btn)
  return btn
}

// 兼容性：无事件参数时给一个不带分享链接的按钮
const btn = buildBtn(null)

let isqbot = {
  btn,
  getBtn,
  buildBtn,
  readBotInfo
}

export default isqbot

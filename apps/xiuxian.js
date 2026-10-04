import fs from 'fs'
import xiuxiandb from '../model/xiuxiandb.js'
import isqbot from '../model/isqbot.js'
import configControl from '../lib/config.js'

const levelname = ['凡人', '练气期', '筑基期', '金丹期', '元婴期', '化神期', '合体期', '大乘期', '渡劫期', '人仙境', '地仙境', '天仙境', '金仙境', '大罗金仙境', '准仙帝', '仙帝', '天人五衰境', '圣人', '大帝', '神境【预告】/ 魔境【预告】', '神魔合一境【预告】', '道祖']
const level_exp = [0, 50, 100, 150, 200, 250, 300, 350, 400/* 炼气 */, 460, 520, 580, 640, 700, 760, 820, 880, 940/* 筑基 */, 1010, 1080, 1150, 1220, 1290, 1360, 1430, 1500, 1570/* 金丹 */, 1650, 1730, 1810, 1890, 1970, 2050, 2130, 2210, 2290/* 元婴 */, 2380, 2470, 2560, 2650, 2740, 2830, 2920, 3010, 3100/* 化神 */, 3200, 3300, 3400, 3500, 3600, 3700, 3800, 3900, 4000/* 合体 */, 4100, 4200, 4300, 4400, 4500, 4600, 4700, 4800, 4900/* 大乘 */, 5000, 5100, 5200, 5300, 5400, 5500, 5600, 5700, 5800/* 渡劫 */, 6000, 6200, 6400, 6600/* 人仙 */, 6900, 7200, 7500, 7800/* 地仙 */, 8150, 8500, 8850, 9200/* 天仙 */, 9600, 10000, 10400, 10800/* 金仙 */, 11200, 11600, 12000, 12400/* 大罗金仙 */, 13000, 13800/* 准仙帝 */, 14600, 15500/* 仙帝 */, 16500, 17500, 18500, 19500, 20500/* 天人五衰 */, 21500, 22500, 23500, 24500, 25500, 26500, 27500, 28500, 29500, 30500/* 圣人 */]
let btn

/** 读取配置（每次取缓存，锅巴修改后立即可见） */
function cfg () {
  return configControl.get()
}


/**
 * 把当前群加入用户的 group_id 记录（逗号分隔）。
 * 统一处理 QQBot 等场景下 group_id 为空、以及数据库旧记录 group_id 为 null 的情况，
 * 避免 `null.includes` 抛错（原 wind-plugin 的 QQBot 报错根因）。
 * @param {object} user_data 用户记录
 * @param {string} group_id 当前群号
 * @returns {string} 归一化后的 group_id 字符串
 */
function ensureUserGroup (user_data, group_id) {
  if (!user_data) return String(group_id || '')
  const current = typeof user_data.group_id === 'string' ? user_data.group_id : ''
  const gid = group_id === undefined || group_id === null ? '' : String(group_id)
  if (gid && !current.split(',').includes(gid)) {
    user_data.group_id = current ? `${current},${gid}` : gid
  } else {
    user_data.group_id = current
  }
  return user_data.group_id
}

/** 是否 QQBot 官方端 */
function isQQBot (e) {
  const adapter = e?.bot?.adapter
  const name = String(
    e?.adapter || adapter?.name || adapter?.id || (typeof adapter === 'string' ? adapter : '') || ''
  ).toLowerCase()
  return name.includes('qqbot')
}

/** 排行榜 QQBot 端最多显示人数（避免消息过长） */
const QQBot_RANK_LIMIT = 10

/**
 * 从事件 bot 的本地缓存（群成员 Map / 好友 Map）按 user_id 解析昵称与头像。
 * QQBot 的 user_id 为 openid 长串，取不到时回退为空，由调用方再决定显示内容。
 * @param {object} e 事件对象
 * @param {string} user_id 用户 id
 * @returns {{ name: string, avatar: string }}
 */
function resolveMember (e, user_id) {
  const uid = String(user_id || '')
  let info = null
  try {
    const groupId = e?.group_id ? String(e.group_id) : ''
    const gml = e?.bot?.gml?.get?.(groupId)
    if (gml?.get) info = gml.get(uid)
    if (!info && e?.bot?.fl?.get) info = e.bot.fl.get(uid)
  } catch {
    info = null
  }
  const name = info?.card || info?.nickname || info?.nick || info?.name || ''
  const avatar = info?.avatar || ''
  return { name: String(name || ''), avatar: String(avatar || '') }
}

/**
 * 排行榜头像 URL：
 * 1. 优先本地缓存里的 avatar；
 * 2. QQBot 的 openid 用官方 qqapp 头像接口 `q.qlogo.cn/qqapp/{appid}/{openid}/0`；
 * 3. 纯数字 QQ 用 `q2.qlogo.cn/headimg_dl?dst_uin=`；
 * 都取不到返回空串（调用方不显示头像）。
 * @param {object} e 事件对象
 * @param {string} user_id 用户 id
 * @returns {string} 头像 URL，取不到返回 ''
 */
function resolveAvatar (e, user_id) {
  const cached = resolveMember(e, user_id).avatar
  if (cached) return cached
  const uid = String(user_id || '')
  if (!uid) return ''

  // QQBot：user_id 形如 "botid:openid"，用 appid + openid 取官方头像
  if (isQQBot(e)) {
    const appid = String(e?.bot?.info?.appid || e?.bot?.appid || '').trim()
    const openid = uid.includes(':') ? uid.split(':').slice(1).join(':') : uid
    if (appid && openid) {
      return `https://q.qlogo.cn/qqapp/${appid}/${openid}/0`
    }
    return ''
  }

  if (/^\d{4,12}$/.test(uid)) {
    return `http://q2.qlogo.cn/headimg_dl?dst_uin=${uid}&spec=100`
  }
  return ''
}

export class xiuxian extends plugin {// 修炼
  constructor () {
    super({
      /** 功能名称 */
      name: '轻量修炼',
      /** 功能描述 */
      dsc: '轻量修仙',
      event: 'message',
      /** 优先级，数字越小等级越高 */
      priority: -999,
      rule: [
        {
          /** 命令正则匹配 */
          reg: '^#?(我的境界|查看境界)$',
          /** 执行方法 */
          fnc: 'view'
        },
        {
          /** 命令正则匹配 */
          reg: '^#?(修炼|修仙|服用丹药)$',
          /** 执行方法 */
          fnc: 'xiuxian'
        },
        {
          /** 命令正则匹配 */
          reg: '^#?突破$',
          /** 执行方法 */
          fnc: 'break'
        },
        {
          /** 命令正则匹配 */
          reg: '^#?(修仙|修炼)?境界列表$',
          /** 执行方法 */
          fnc: 'list'
        },
        {
          /** 命令正则匹配 */
          reg: '^#?排行榜$',
          /** 执行方法 */
          fnc: 'rankings'
        },
        {
          /** 命令正则匹配 */
          reg: '^#?我要境界(.*)$',
          /** 执行方法 */
          fnc: 'giveme_level'
        },
        {
          /** 命令正则匹配 */
          reg: '^#?我要灵力(.*)$',
          /** 执行方法 */
          fnc: 'giveme_exp'
        },
        {
          /** 命令正则匹配 */
          reg: '^#?(修仙者|修炼者|用户)(人数|数量)$',
          /** 执行方法 */
          fnc: 'numxiuxian'
        },
        {
          /** 命令正则匹配 */
          reg: '^#?我的id$',
          /** 执行方法 */
          fnc: 'myid'
        },
        {
          reg: '#?全服(排行榜|排名)$',
          fnc: 'allrank'
        },
        {
          reg: '#?全服加灵力(.*)',
          fnc: 'giveall_exp'
        },
        {
          reg: '#?全服加境界(.*)',
          fnc: 'giveall_level'
        },
        {
          reg: '#?开始压缩(.*)',
          fnc: 'moveback'
        }
      ]
    })
  }

  async moveback (e) {
    if (!e.isMaster) return false
    await xiuxiandb.moveback()
    await e.reply('压缩完成')
  }

  async clear (e) {
    let dirpath = process.cwd() + '/data/xiuxian-plugin/xiuxiandata.db'
    if (fs.existsSync(dirpath)) {
      let files = fs.readdirSync(dirpath)
      files.forEach(function (file) {
        let filepath = dirpath + '/' + file
        let stats = fs.statSync(filepath)
        if (stats.isFile()) {
          fs.unlinkSync(filepath)
        }
      })
      fs.rmdirSync(dirpath)
    }
    e.reply('清除成功！！')
  }

  async myid (e) {
    let user_id = e.user_id
    if (typeof user_id != 'string') user_id = JSON.stringify(user_id)
    if (user_id.length > 30) btn = isqbot.getBtn(e)
    let group_id = e.group_id
    if (typeof group_id != 'string') group_id = JSON.stringify(group_id)
    let user_data = await xiuxiandb.getUserInfo(user_id)
    if (user_data === null) {
      return e.reply('\r\r#请先使用【修仙】自动分配id')
    }
    ensureUserGroup(user_data, group_id)
    if (user_id.length > 30) return await e.reply([segment.at(e.user_id), `\r\r#你的id是:${user_data.id}`, btn])
    return await e.reply([segment.at(e.user_id), `\r\r#你的id是:${user_data.id}`])
  }

  async numxiuxian (e) {
    e.reply(JSON.stringify(await xiuxiandb.getMaxId()))
  }

  async giveme_level (e) {
    let user_id = e.user_id
    if (user_id.length > 30) {
      btn = isqbot.getBtn(e)
    }
    if (typeof user_id != 'string') user_id = JSON.stringify(user_id)
    if (!e.isMaster) {
      if (user_id.length > 30) return await e.reply(['哈哈，你也想要我的境界吗，咦，不给你，哈哈哈哈,🤣👉🏻🤡', btn])
      return await e.reply('哈哈，你也想要我的境界吗，咦，不给你，哈哈哈哈,🤣👉🏻🤡')
    }
    let numreg = /[1-9][0-9]{0,12}/
    let numret = parseInt(numreg.exec(e.msg))
    let group_id = e.group_id
    if (typeof group_id != 'string') group_id = JSON.stringify(group_id)
    let user_data = await xiuxiandb.getUserInfo(user_id)
    if (user_data === null) {
      user_data = { // 创建新用户
        experience: 0,
        level: 0,
        levelname: '凡人',
        group_id
      }
      await xiuxiandb.updateUserInfo(user_id, user_data)
      user_data = await xiuxiandb.getUserInfo(user_id)
    }

    /** 储存玩家所在群组 */
    ensureUserGroup(user_data, group_id)

    /** 增加境界 */
    user_data.level += numret

    /** 更新境界名称 */
    user_data.levelname = xiuxiandb.levelName(user_data)
    /** 保存数据库 */
    await user_data.save()
    await e.reply([segment.at(e.user_id), `恭喜您，获得了境界${numret}层`])

    /** 获取灵力名称、突破下境界所需灵力值 */
    const { need, pwname } = xiuxiandb.experience(user_data)

    const msg = [segment.at(e.user_id), `\r\r#id:${user_data.id},\r>境界:${user_data.levelname},\r>${pwname}:${user_data.experience},\r>您还需要:${need}点${pwname}突破下一境界`]
    /** QQBot加入按钮 */
    if (user_id.length > 30) msg.push(btn)
    return await e.reply(msg)
  }

  async giveme_exp (e) {
    let user_id = e.user_id
    if (user_id.length > 30) {
      btn = isqbot.getBtn(e)
    }
    if (typeof user_id != 'string') user_id = JSON.stringify(user_id)
    if (!e.isMaster) {
      if (user_id.length > 30) return await e.reply(['哈哈，你也想要我的灵力吗，咦，不给你，哈哈哈哈,🤣👉🏻🤡', btn])
      return await e.reply('哈哈，你也想要我的灵力吗，咦，不给你，哈哈哈哈,🤣👉🏻🤡')
    }
    let numreg = /[1-9][0-9]{0,12}/
    let numret = parseInt(numreg.exec(e.msg))
    let group_id = e.group_id
    if (typeof group_id != 'string') group_id = JSON.stringify(group_id)
    let user_data = await xiuxiandb.getUserInfo(user_id)
    if (user_data === null) {
      user_data = { // 创建新用户
        experience: 0,
        level: 0,
        levelname: '凡人',
        group_id
      }
      await xiuxiandb.updateUserInfo(user_id, user_data)
      user_data = await xiuxiandb.getUserInfo(user_id)
    }
    ensureUserGroup(user_data, group_id)
    user_data.experience += numret
    await user_data.save()

    /** 获取灵力名称、突破下境界所需灵力值 */
    const { need, pwname } = xiuxiandb.experience(user_data)
    if (user_id.length > 30) return await e.reply([segment.at(e.user_id), `\r\r#id:${user_data.id},\r>境界:${user_data.levelname},\r>${pwname}:${user_data.experience},\r>您还需要:${need}点${pwname}突破下一境界`, btn])
    return await e.reply([segment.at(e.user_id), `\r\r#id:${user_data.id},\r>境界:${user_data.levelname},\r>${pwname}:${user_data.experience},\r>您还需要:${need}点${pwname}突破下一境界`])
  }

  async xxsetCd (seconds = 60) {
    let ext = new Date() * 1 + seconds * 1000
    await redis.set(`xiuxian:cd:${this.e.user_id}`, ext + '', { EX: seconds })
  }

  async xxinCd () {
    let ext = await redis.get(`xiuxian:cd:${this.e.user_id}`)
    if (!ext || isNaN(ext)) {
      return false
    }
    let cd = (new Date() * 1) - ext
    if (cd < 0 && Math.abs(cd)) {
      return Math.ceil(0 - cd / 1000)
    }
    return false
  }

  async brsetCd (seconds = 60) {
    let ext = new Date() * 1 + seconds * 1000
    await redis.set(`xiuxian:break-cd:${this.e.user_id}`, ext + '', { EX: seconds })
  }

  async brinCd () {
    let ext = await redis.get(`xiuxian:break-cd:${this.e.user_id}`)
    if (!ext || isNaN(ext)) {
      return false
    }
    let cd = (new Date() * 1) - ext
    if (cd < 0 && Math.abs(cd) < 100 * 60 * 1000) {
      return Math.ceil(0 - cd / 1000)
    }
    return false
  }

  async rankings (e) {
    let user_id = e.user_id
    if (typeof user_id != 'string') user_id = JSON.stringify(user_id)
    if (user_id.length > 30) {
      btn = isqbot.getBtn(e)
    }
    let group_id = e.group_id
    if (typeof group_id != 'string') group_id = JSON.stringify(group_id)
    let group_data = await xiuxiandb.getTopUsers(group_id, cfg().group_limit)
    if (group_data.length == 0) { // 如果文件不存在
      return await e.reply('本群暂无修炼者～')
    }

    const { pwname } = xiuxiandb.experience(group_data[0])

    // QQBot：不转发，发精简排行榜（限 QQBot_RANK_LIMIT 条）+ 按钮，避免消息过长
    if (isQQBot(e)) {
      const limited = group_data.slice(0, QQBot_RANK_LIMIT)
      const lines = [`本群修炼榜（前 ${limited.length}）`]
      for (let i = 0; i < limited.length; i++) {
        const displayName = resolveMember(e, limited[i].user_id).name || limited[i].user_id
        lines.push(`第${i + 1}名 ${displayName}｜${limited[i].levelname}｜${limited[i].experience}`)
      }
      if (group_data.length > limited.length) lines.push(`……共 ${group_data.length} 人`)
      const msg = [lines.join('\r')]
      msg.push(isqbot.getBtn(e))
      return await e.reply(msg)
    }

    /** 获取灵力名称、突破下境界所需灵力值 */
    let MsgList = []
    for (let i = 0; i < group_data.length; i++) {
      const uid = group_data[i].user_id
      const avatar = resolveAvatar(e, uid)
      const displayName = resolveMember(e, uid).name || uid
      const segs = []
      if (avatar) segs.push(segment.image(avatar))
      segs.push(`\n第${i + 1}名\n${displayName}\n用户id:${group_data[i].id}\n境界:${group_data[i].levelname}\n${pwname}:${group_data[i].experience}`)
      MsgList.push({
        message: segs,
        nickname: displayName,
        user_id: uid
      })
    }
    let forwardMsg
    if (e.group?.makeForwardMsg) {
      forwardMsg = await e.group.makeForwardMsg(MsgList)
    } else if (e.friend?.makeForwardMsg) {
      forwardMsg = await e.friend.makeForwardMsg(MsgList)
    } else {
      forwardMsg = await Bot.makeForwardMsg(MsgList)
    }
    return await e.reply(forwardMsg)
  }

  async giveall_exp (e) {
    if (!e.isMaster) {
      return false
    }
    await e.reply('添加中请耐心等待')
    let numreg = /[1-9][0-9]{0,12}/
    let value = Number(numreg.exec(e.msg))
    await xiuxiandb.addExperience(value)
    await e.reply(`添加成功,全服增加灵力${value}`)
  }

  async giveall_level (e) {
    if (!e.isMaster) {
      return false
    }
    await e.reply('添加中请耐心等待')
    let numreg = /[1-9][0-9]{0,12}/
    let value = Number(numreg.exec(e.msg))
    await xiuxiandb.addLevel(value)
    await e.reply(`添加成功,全服增加境界${value}`)
  }

  async allrank (e) {
    let user_id = e.user_id
    if (user_id.length > 30) {
      btn = isqbot.getBtn(e)
    }
    if (typeof user_id != 'string') user_id = JSON.stringify(user_id)
    let group_data = await xiuxiandb.getTopUsers2(cfg().all_limit)
    if (group_data.length == 0) { // 如果文件不存在
      return await e.reply('暂无修炼者～')
    }
    const { pwname } = xiuxiandb.experience(group_data[0])

    // QQBot：不转发，发精简全服榜（限 QQBot_RANK_LIMIT 条）+ 按钮
    if (isQQBot(e)) {
      const limited = group_data.slice(0, QQBot_RANK_LIMIT)
      const lines = [`全服修炼榜（前 ${limited.length}）`]
      for (let i = 0; i < limited.length; i++) {
        const displayName = resolveMember(e, limited[i].user_id).name || limited[i].user_id
        lines.push(`第${i + 1}名 ${displayName}｜${limited[i].levelname}｜${limited[i].experience}`)
      }
      if (group_data.length > limited.length) lines.push(`……共 ${group_data.length} 人`)
      const msg = [lines.join('\r'), isqbot.getBtn(e)]
      return await e.reply(msg)
    }

    let MsgList = []
    for (let i = 0; i < group_data.length; i++) {
      const uid = group_data[i].user_id
      const avatar = resolveAvatar(e, uid)
      const displayName = resolveMember(e, uid).name || uid
      const segs = []
      if (avatar) segs.push(segment.image(avatar))
      segs.push(`\n第${i + 1}名\n${displayName}\n用户id:${group_data[i].id}\n境界:${group_data[i].levelname}\n${pwname}:${group_data[i].experience}`)
      MsgList.push({
        message: segs,
        nickname: displayName,
        user_id: uid
      })
    }
    let forwardMsg
    if (e.group?.makeForwardMsg) {
      forwardMsg = await e.group.makeForwardMsg(MsgList)
    } else if (e.friend?.makeForwardMsg) {
      forwardMsg = await e.friend.makeForwardMsg(MsgList)
    } else {
      forwardMsg = await Bot.makeForwardMsg(MsgList)
    }
    e.reply(forwardMsg)
  }

  async view (e) {
    let user_id = e.user_id
    if (typeof user_id != 'string') user_id = JSON.stringify(user_id)
    if (user_id.length > 30) btn = isqbot.getBtn(e)
    logger.info('[xiuxian-plugin]', e.msg)
    let user_data = await xiuxiandb.getUserInfo(user_id)
    if (user_data === null) {
      if (user_id.length > 30) {
        return e.reply([segment.at(e.user_id), '您还是凡人，请通过#修炼和#突破开启你的仙途', btn])
      }
      return e.reply([segment.at(e.user_id), '您还是凡人，请通过#修炼和#突破开启你的仙途'])
    }
    let group_id = e.group_id
    if (typeof group_id != 'string') group_id = JSON.stringify(group_id)
    ensureUserGroup(user_data, group_id)
    /** 获取灵力名称、突破下境界所需灵力值 */
    const { need, pwname } = xiuxiandb.experience(user_data)
    if (user_id.length > 30) {
      return await e.reply([segment.at(e.user_id), `\r#你的id:${user_data.id},\r>境界:${user_data.levelname},\r>${pwname}:${user_data.experience},\r>您还需要:${need}点灵力突破下一境界`, btn])
    }
    await e.reply([segment.at(e.user_id), `\r#你的id:${user_data.id},\r>境界:${user_data.levelname},\r>${pwname}:${user_data.experience},\r>您还需要:${need}点灵力突破下一境界`])
  }

  async list (e) {
    let user_id = e.user_id
    if (typeof user_id != 'string') user_id = JSON.stringify(user_id)
    if (user_id.length > 30) {
      btn = isqbot.getBtn(e)
    }
    let msg = levelname[0] + '\n'
    for (let j = 1; j < levelname.length; j++) {
      msg = msg + levelname[j] + '\n'
    }
    msg += '\r#凡境每个境界分九层,仙境每个境界分初期中期后期圆满四层,仙帝之后则还有不同,自行探索吧!\r#欸嘿!到大帝境界后别努力了,道祖境界你达不到的doge!!\r#后期修行困难可以选择#服用丹药,有40%的成功率.\r#预计将在大帝之后开放神魔境，可以自选成神或成魔，默认为大帝，选择成神或者成魔之后将无法再作改变，等到神魔合一境才可回归正途'
    if (user_id.length > 30) {
      return e.reply([msg, btn])
    }
    e.reply(msg)
  }

  async xiuxian (e) {
    let user_id = e.user_id
    if (typeof user_id != 'string') user_id = JSON.stringify(user_id)
    if (user_id.length > 30) {
      btn = isqbot.getBtn(e)
    }
    logger.info('[xiuxian-plugin]', e.msg)
    let cdtime = await this.xxinCd()
    if (this.e.isMaster && !cfg().master_cd) {
      cdtime = 0
    }
    if (cdtime > cfg().cdtime_xiuxian * 60) return await e.reply(`\r#您还在闭关中,还有${cdtime}秒cd`)
    if (cdtime) {
      if (user_id.length > 30) {
        return await e.reply([segment.at(user_id), `\n对不起,修炼失败，还有${cdtime}秒cd`, btn])
      }
      return await e.reply([segment.at(user_id), `\n对不起,修炼失败，还有${cdtime}秒cd`])
    }
    let group_id = e.group_id
    if (typeof group_id != 'string') group_id = JSON.stringify(group_id)
    await this.xxsetCd(cfg().cdtime_xiuxian * 60)
    let user_data = await xiuxiandb.getUserInfo(user_id)
    if (user_data === null) {
      user_data = { // 创建新用户
        experience: 0,
        level: 0,
        levelname: '凡人',
        group_id
      }
      await xiuxiandb.updateUserInfo(user_id, user_data)
      user_data = await xiuxiandb.getUserInfo(user_id)
    }
    ensureUserGroup(user_data, group_id)
    let experience_ = 0
    let pills = Math.random() * 100
    /** 获取灵力名称、突破下境界所需灵力值 */
    const { pwname } = xiuxiandb.experience(user_data)

    if (e.msg.includes('丹药')) {
      if (pills > (100 - cfg().pill_per)) {
        user_data.experience += cfg().pill_up
        let lev = user_data.level
        let exerp = 1000 * (lev - 110) + 30500
        let need
        if (user_data.experience < level_exp[lev] && user_data.level < 111) need = level_exp[lev] - user_data.experience
        else if (user_data.level > 110 && user_data.experience < exerp) need = exerp - user_data.experience
        else need = 0
        /** 保存数据库 */
        await user_data.save()
        user_data = await xiuxiandb.getUserInfo(user_id)
        if (user_id.length > 30) await e.reply([segment.at(user_id), `\r#用户:${user_data.id}\r#恭喜你服用丹药成功，你获得了25点${pwname}！\r>境界:${user_data.levelname},\r>${pwname}:${user_data.experience}\n您还需要:${need}点${pwname}突破下一境界`, btn])
        else await e.reply([segment.at(user_id), `\r#用户:${user_data.id}\r#恭喜你服用丹药成功，你获得了25点${pwname}！\r>境界:${user_data.levelname},\r>${pwname}:${user_data.experience}\n您还需要:${need}点${pwname}突破下一境界`])
      } else {
        user_data.experience -= cfg().pill_down
        /** 保存数据库 */
        await user_data.save()
        if (user_id.length > 30) await e.reply([segment.at(user_id), `\r#用户:${user_data.id}\r#服用失败，由于大量丹毒你损失了7点${pwname}！\r>境界:${user_data.levelname}\r>${pwname}:${user_data.experience}`, btn])
        else await e.reply([segment.at(user_id), `\r#用户:${user_data.id}\r#服用失败，由于大量丹毒你损失了7点${pwname}！\r>境界:${user_data.levelname}\r>${pwname}:${user_data.experience}`])
      }
    } else {
      experience_ = Math.round(cfg().xiuxian_up + cfg().xiuxian_ave * Math.random())
      user_data.experience += experience_
      let lev = user_data.level
      let exerp = 1000 * (lev - 110) + 30500
      let need
      if (user_data.experience < level_exp[lev] && user_data.level < 111) need = level_exp[lev] - user_data.experience
      else if (user_data.level > 110 && user_data.experience < exerp) need = exerp - user_data.experience
      else need = 0
      /** 保存数据库 */
      await user_data.save()
      if (user_id.length > 30) await e.reply([segment.at(user_id), `\r#用户:${user_data.id}\r#恭喜你获得了${experience_}点${pwname}。\r>境界:${user_data.levelname}\r>${pwname}:${user_data.experience}\n您还需要:${need}点${pwname}突破下一境界`, btn])
      else await e.reply([segment.at(user_id), `\r#用户:${user_data.id}\r#恭喜你获得了${experience_}点${pwname}。\r>境界:${user_data.levelname}\r>${pwname}:${user_data.experience}\n您还需要:${need}点${pwname}突破下一境界`])
    }
  }

  async break (e) {
    let user_id = e.user_id
    if (typeof user_id != 'string') user_id = JSON.stringify(user_id)
    if (user_id.length > 30) {
      btn = isqbot.getBtn(e)
    }
    logger.info('[xiuxian-plugin]', e.msg)
    let cdtime = await this.brinCd()
    if (this.e.isMaster && !cfg().master_cd) {
      cdtime = 0
    }
    if (cdtime) {
      if (user_id.length > 30) {
        return await e.reply([segment.at(e.user_id), `\n对不起,突破失败，还有${cdtime}秒cd`, btn])
      }
      return await e.reply([segment.at(e.user_id), `\n对不起,突破失败，还有${cdtime}秒cd`])
    }
    await this.brsetCd(cfg().cdtime_break * 60)
    let group_id = e.group_id
    if (typeof group_id != 'string') group_id = JSON.stringify(group_id)
    let user_data = await xiuxiandb.getUserInfo(user_id)
    if (user_data === null) {
      user_data = { // 创建新用户
        experience: 0,
        level: 0,
        levelname: '凡人',
        group_id
      }
      await xiuxiandb.updateUserInfo(user_id, user_data)
      user_data = await xiuxiandb.getUserInfo(user_id)
    }
    ensureUserGroup(user_data, group_id)
    let lev = user_data.level
    let exerp = 1000 * (lev - 110) + 30500
    if (user_data.experience < level_exp[lev] && user_data.level < 111) {
      if (user_id.length > 30) {
        return e.reply([segment.at(e.user_id), `对不起，用户:${user_data.id},\n你的修为不足,还差${level_exp[lev] - user_data.experience},请再接再厉`, btn])
      }
      return e.reply([segment.at(e.user_id), `对不起，用户:${user_data.id},\n你的修为不足,还差${level_exp[lev] - user_data.experience},请再接再厉`])
    }
    if (user_data.level > 110 && user_data.experience < exerp) {
      if (user_id.length > 30) {
        return e.reply([segment.at(e.user_id), `对不起，用户:${user_data.id},\n你的修为不足,还差${exerp - user_data.experience},请再接再厉`, btn])
      }
      return e.reply([segment.at(e.user_id), `对不起，用户:${user_data.id},\n你的修为不足,还差${exerp - user_data.experience},请再接再厉`])
    }

    const gailv = user_data.level < 110 ? 100 - user_data.level * 0.5 : 45 - user_data.level * 0.05

    e.reply([segment.at(e.user_id), `用户:${user_data.id},\n你当前境界为${user_data.levelname},需要时间${(0.2 * user_data.level)}s,突破成功概率${gailv},开始突破......`])
    let i = Math.random() * 100
    if (i > gailv) {
      return await e.reply([segment.at(user_id), `用户:${user_data.id},\n对不起，突破失败，请努力修行`])
    } else {
      user_data.level++
    }

    /** 修改境界名称 */
    user_data.levelname = xiuxiandb.levelName(user_data)

    /** 获取灵力名称、突破下境界所需灵力值 */
    const { need, pwname } = xiuxiandb.experience(user_data)

    setTimeout(() => { // 延迟
      if (user_id.length > 30) { e.reply([segment.at(e.user_id), `\r#用户:${user_data.id}\r#恭喜你已突破成功！\r>境界:${user_data.levelname},\r>${pwname}:${user_data.experience}\r>您还需要:${need}点${pwname}突破下一境界`, btn]) } else { e.reply([segment.at(e.user_id), `\r#用户:${user_data.id}\r#恭喜你已突破成功！\r>境界:${user_data.levelname},\r>${pwname}:${user_data.experience}\r>您还需要:${need}点${pwname}突破下一境界`]) }
    }, 200 * (user_data.level + 1))// 设置延时
    await user_data.save()
  }
}

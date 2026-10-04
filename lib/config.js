import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import YAML from 'yaml'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PLUGIN_DIR = path.join(__dirname, '..')
const DEFAULT_YAML = path.join(PLUGIN_DIR, 'config', 'default_config', 'xiuxian.yaml')
const USER_YAML = path.join(PLUGIN_DIR, 'config', 'xiuxian.yaml')

// 兜底默认值：真正模板是 config/default_config/xiuxian.yaml
const FALLBACK_CONFIG = {
  master_cd: false,
  cdtime_xiuxian: 2,
  cdtime_break: 0.5,
  cdtime_down: 6,
  down_up: 800,
  down_ave: 1000,
  pill_up: 25,
  pill_down: 7,
  pill_per: 40,
  xiuxian_up: 5,
  xiuxian_ave: 10,
  group_limit: 30,
  all_limit: 100
}

function readYaml (file) {
  try {
    if (!fs.existsSync(file)) return {}
    const parsed = YAML.parse(fs.readFileSync(file, 'utf8'))
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch (err) {
    logger?.warn?.(`[xiuxian-plugin] 配置读取失败 ${file}: ${err}`)
    return {}
  }
}

/**
 * 修仙配置（YAML 落盘，支持锅巴面板）。
 * - config/default_config/xiuxian.yaml  默认模板
 * - config/xiuxian.yaml                 用户配置（生效）
 * 读取顺序：FALLBACK <- 默认模板 <- 用户配置
 */
class ConfigControl {
  constructor () {
    this._cache = null
  }

  _ensureUserConfig () {
    const dir = path.dirname(USER_YAML)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    if (!fs.existsSync(USER_YAML) && fs.existsSync(DEFAULT_YAML)) {
      fs.copyFileSync(DEFAULT_YAML, USER_YAML)
    }
  }

  get () {
    if (this._cache) return this._cache
    this._ensureUserConfig()
    this._cache = { ...FALLBACK_CONFIG, ...readYaml(DEFAULT_YAML), ...readYaml(USER_YAML) }
    return this._cache
  }

  set (key, value) {
    const user = readYaml(USER_YAML)
    user[key] = value
    this._writeUser(user)
    this._cache = null
    return this.get()
  }

  setMultiple (patch) {
    const user = readYaml(USER_YAML)
    Object.assign(user, patch)
    this._writeUser(user)
    this._cache = null
    return this.get()
  }

  _writeUser (obj) {
    const dir = path.dirname(USER_YAML)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    const tmp = USER_YAML + '.tmp'
    fs.writeFileSync(tmp, YAML.stringify(obj), 'utf8')
    fs.renameSync(tmp, USER_YAML)
  }

  reload () {
    this._cache = null
    return this.get()
  }
}

const configControl = new ConfigControl()
export default configControl
export { FALLBACK_CONFIG }

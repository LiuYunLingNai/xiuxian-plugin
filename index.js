import fs from 'node:fs'

if (!global.segment) {
  global.segment = (await import('oicq')).segment
}

const appDir = './plugins/xiuxian-plugin/apps'
const files = fs
  .readdirSync(appDir)
  .filter(file => file.endsWith('.js'))

let ret = []
files.forEach((file) => {
  ret.push(import(`./apps/${file}`))
})
ret = await Promise.allSettled(ret)

let apps = {}
for (let i in files) {
  let name = files[i].replace('.js', '')
  if (ret[i].status != 'fulfilled') {
    logger.error(`加载错误 ${logger.red(name)}`)
    logger.error(ret[i].reason)
    continue
  }
  apps[name] = ret[i].value[Object.keys(ret[i].value)[0]]
}
export { apps }
logger.info(logger.blue('------------------'))
logger.info(logger.green('          xiuxian-plugin 加载完成~~'))
logger.info(logger.blue('------------------'))

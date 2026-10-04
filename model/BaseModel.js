import fs from 'node:fs'
import { Sequelize, DataTypes, Model } from 'sequelize'

// 数据目录：Yunzai 根目录下 data/xiuxian-plugin
const dbDir = process.cwd() + '/data/xiuxian-plugin'
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true })
const dbPath = dbDir + '/xiuxiandata.db'

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: dbPath,
  logging: false
})

await sequelize.authenticate()

export default class BaseModel extends Model {
  static Types = DataTypes

  static initDB (model, columns) {
    let name = model.name
    name = name.replace(/DB$/, 's')
    model.init(columns, { sequelize, tableName: name })
    model.COLUMNS = columns
  }
}
export { sequelize }

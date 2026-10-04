# xiuxian-plugin

轻量修仙插件，从 [wind-plugin](https://gitee.com/wind-trace-typ/Yunzai-QQBot-Plugin) 的「轻量修仙」功能移植为独立插件。

面向 Yunzai / TRSS-Yunzai，支持 QQBot 官方端按钮。

## 功能

| 命令 | 说明 |
| --- | --- |
| `#修炼` / `#修仙` | 提升灵力，有冷却时间（默认 2 分钟） |
| `#服用丹药` | 概率提升 / 降低灵力（默认 40% 成功率） |
| `#突破` | 灵力足够时突破至下一境界，有成功率与冷却 |
| `#我的境界` / `#查看境界` | 查看自身境界、灵力与突破所需 |
| `#修仙境界列表` / `#境界列表` | 查看全部境界名称 |
| `#排行榜` | 本群排行榜（合并转发） |
| `#全服排行榜` / `#全服排名` | 全服排行榜（合并转发） |
| `#我的id` | 查看自己的修仙 id |
| `#修仙者人数` / `#用户数量` | 查看已注册修炼者数量 |

### 管理员命令

| 命令 | 说明 |
| --- | --- |
| `#我要境界N` | 给自己增加 N 层境界（仅主人） |
| `#我要灵力N` | 给自己增加 N 点灵力（仅主人） |
| `#全服加灵力N` | 全服增加 N 点灵力（仅主人） |
| `#全服加境界N` | 全服增加 N 层境界（仅主人） |
| `#开始压缩` | 重算所有用户的境界与名称（仅主人） |

## 配置

配置文件：`config/xiuxian.yaml`（首次运行自动从 `config/default_config/xiuxian.yaml` 生成）。

| 字段 | 说明 | 默认 |
| --- | --- | --- |
| `master_cd` | 主人是否也需要冷却 | `false` |
| `cdtime_xiuxian` | 修炼冷却（分钟） | `2` |
| `cdtime_break` | 突破冷却（分钟） | `0.5` |
| `pill_up` / `pill_down` | 丹药提升 / 降低的灵力值 | `25` / `7` |
| `pill_per` | 丹药成功概率（%） | `40` |
| `xiuxian_up` / `xiuxian_ave` | 修炼保底提升值 / 波动幅度 | `5` / `10` |
| `group_limit` / `all_limit` | 群排行 / 全服排行显示人数 | `30` / `100` |

## 数据

- 使用 `sequelize` + `sqlite` 存储，数据库文件：`data/xiuxian-plugin/xiuxiandata.db`
- 每个用户记录：`id`（修仙 id）、`user_id`、`group_id`（逗号分隔的多群）、`level`、`levelname`、`experience`

## 依赖

- `sequelize`（+ `@karinjs/sqlite3`）
- `yaml`
- `oicq` 的 `segment`（Yunzai 环境已内置）

## QQBot 支持

- 修仙相关回复会自动附带按钮（境界列表、突破、我的境界等）
- 「添加机器人到群聊」链接使用了 AppID 与机器人 QQ 会自动生成，无需额外配置

## 与 wind-plugin 的差异

- 独立插件，目录与路径不再依赖 `wind-plugin`
- 修复了 QQBot 下 `group_id` 为 `null` 时 `.includes` 报错的问题
- 排行榜优先显示昵称与真实头像，取不到昵称时回退显示用户 id

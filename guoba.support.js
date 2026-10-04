import configControl from './lib/config.js'

/**
 * 锅巴（Guoba）面板支持：让修仙插件的配置可视化修改。
 */
export function supportGuoba () {
  return {
    pluginInfo: {
      name: 'xiuxian-plugin',
      title: '修仙',
      description: '轻量修仙（移植自 wind-plugin）',
      author: 'LiuYunLingNai',
      isV3: true,
      isV2: false,
      showInMenu: 'auto',
      icon: 'mdi:auto-fix',
      iconColor: '#6c5ce7'
    },
    configInfo: {
      schemas: [
        {
          component: 'Divider',
          label: '冷却设置',
          componentProps: { orientation: 'left', plain: true }
        },
        {
          field: 'master_cd',
          label: '主人也受冷却限制',
          bottomHelpMessage: '关闭后主人修炼/突破不受冷却时间限制',
          component: 'Switch',
          componentProps: { checkedValue: true, unCheckedValue: false }
        },
        {
          field: 'cdtime_xiuxian',
          label: '修炼冷却（分钟）',
          bottomHelpMessage: '两次修炼之间的等待时间',
          component: 'InputNumber',
          componentProps: { min: 0, max: 1440, placeholder: '2' }
        },
        {
          field: 'cdtime_break',
          label: '突破冷却（分钟）',
          bottomHelpMessage: '两次突破之间的等待时间',
          component: 'InputNumber',
          componentProps: { min: 0, max: 1440, placeholder: '0.5' }
        },
        {
          component: 'Divider',
          label: '数值设置',
          componentProps: { orientation: 'left', plain: true }
        },
        {
          field: 'xiuxian_up',
          label: '修炼保底灵力',
          bottomHelpMessage: '每次修炼至少获得的灵力',
          component: 'InputNumber',
          componentProps: { min: 0, placeholder: '5' }
        },
        {
          field: 'xiuxian_ave',
          label: '修炼波动幅度',
          bottomHelpMessage: '每次修炼额外随机浮动的上限',
          component: 'InputNumber',
          componentProps: { min: 0, placeholder: '10' }
        },
        {
          field: 'pill_up',
          label: '丹药提升灵力',
          bottomHelpMessage: '服用丹药成功时增加的灵力',
          component: 'InputNumber',
          componentProps: { min: 0, placeholder: '25' }
        },
        {
          field: 'pill_down',
          label: '丹药损失灵力',
          bottomHelpMessage: '服用丹药失败时减少的灵力',
          component: 'InputNumber',
          componentProps: { min: 0, placeholder: '7' }
        },
        {
          field: 'pill_per',
          label: '丹药成功概率（%）',
          bottomHelpMessage: '服用丹药成功的百分比概率',
          component: 'InputNumber',
          componentProps: { min: 0, max: 100, placeholder: '40' }
        },
        {
          component: 'Divider',
          label: '排行榜',
          componentProps: { orientation: 'left', plain: true }
        },
        {
          field: 'group_limit',
          label: '群排行显示人数',
          bottomHelpMessage: '本群排行榜最多显示多少人',
          component: 'InputNumber',
          componentProps: { min: 1, max: 200, placeholder: '30' }
        },
        {
          field: 'all_limit',
          label: '全服排行显示人数',
          bottomHelpMessage: '全服排行榜最多显示多少人',
          component: 'InputNumber',
          componentProps: { min: 1, max: 500, placeholder: '100' }
        }
      ],

      getConfigData () {
        return configControl.get()
      },

      setConfigData (data, { Result }) {
        try {
          const patch = {}
          for (const [key, value] of Object.entries(data || {})) patch[key] = value
          configControl.setMultiple(patch)
          return Result.ok({}, '保存成功~修仙配置已更新')
        } catch (err) {
          return Result.error({}, `保存失败：${err.message || err}`)
        }
      }
    }
  }
}

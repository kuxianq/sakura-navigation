import { ICON_NAMES } from './icon-names'

const ICON_LABELS: Record<string, string> = {
  Activity: '活跃',
  BookOpen: '书本',
  Braces: '代码括号',
  Cloud: '云朵',
  Code2: '代码',
  Compass: '指南针',
  Image: '图片',
  ListChecks: '清单',
  Palette: '调色盘',
  Rocket: '火箭',
  Search: '搜索',
  Settings: '设置',
  ShieldCheck: '安全盾牌',
  Sparkles: '星光',
  Tags: '标签',
  Wrench: '工具',
}

export function iconLabel(name: string) {
  return ICON_LABELS[name] ?? name
}

export const ICON_OPTIONS = ICON_NAMES.map((name) => ({
  value: name,
  label: iconLabel(name),
}))

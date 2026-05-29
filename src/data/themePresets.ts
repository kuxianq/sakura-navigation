import type { ThemePreset } from '../types/navigation'

export interface ThemePresetDefinition {
  id: ThemePreset
  name: string
  description: string
  primaryColor: string
  accentColor: string
  textColor: string
  panelColor: string
  borderColor: string
  shadowColor: string
}

export const themePresets: ThemePresetDefinition[] = [
  {
    id: 'sakura',
    name: '樱花粉漫',
    description: '粉紫、夜樱、柔光玻璃，适合二次元氛围首页。',
    primaryColor: '#ff8fbd',
    accentColor: '#ffe3f0',
    textColor: '#fff7fb',
    panelColor: 'rgba(54, 24, 55, 0.46)',
    borderColor: 'rgba(255, 214, 231, 0.28)',
    shadowColor: 'rgba(40, 9, 37, 0.42)',
  },
  {
    id: 'sky',
    name: '天空韵蓝',
    description: '清透蓝白、低饱和、适合更干净的云端工具箱。',
    primaryColor: '#60a5fa',
    accentColor: '#bae6fd',
    textColor: '#f8fbff',
    panelColor: 'rgba(15, 42, 72, 0.42)',
    borderColor: 'rgba(186, 230, 253, 0.30)',
    shadowColor: 'rgba(12, 74, 110, 0.34)',
  },
  {
    id: 'night',
    name: '夜樱紫',
    description: '深紫、星夜、轻霓虹，适合夜间观感。',
    primaryColor: '#c084fc',
    accentColor: '#f0abfc',
    textColor: '#faf5ff',
    panelColor: 'rgba(36, 20, 60, 0.50)',
    borderColor: 'rgba(216, 180, 254, 0.30)',
    shadowColor: 'rgba(59, 7, 100, 0.42)',
  },
  {
    id: 'aqua',
    name: '琉璃青',
    description: '青绿、玻璃、轻科技感。',
    primaryColor: '#2dd4bf',
    accentColor: '#a7f3d0',
    textColor: '#f0fdfa',
    panelColor: 'rgba(13, 55, 62, 0.44)',
    borderColor: 'rgba(153, 246, 228, 0.28)',
    shadowColor: 'rgba(20, 83, 45, 0.32)',
  },
  {
    id: 'cream',
    name: '奶油白',
    description: '浅色、柔和、适合白天模式。',
    primaryColor: '#f59e0b',
    accentColor: '#fed7aa',
    textColor: '#fffaf0',
    panelColor: 'rgba(120, 78, 48, 0.30)',
    borderColor: 'rgba(254, 215, 170, 0.34)',
    shadowColor: 'rgba(120, 53, 15, 0.22)',
  },
]

export function getThemePreset(id: ThemePreset) {
  return themePresets.find((preset) => preset.id === id) ?? themePresets[0]
}

import {
  Activity, BookOpen, Braces, Cloud, Code2, Compass, Image, ListChecks,
  Palette, Rocket, Search, Settings, ShieldCheck, Sparkles, Tags, Wrench,
  type LucideIcon,
} from 'lucide-react'

const icons: Record<string, LucideIcon> = {
  Activity, BookOpen, Braces, Cloud, Code2, Compass, Image, ListChecks,
  Palette, Rocket, Search, Settings, ShieldCheck, Sparkles, Tags, Wrench,
}

export function IconByName({ name, className }: { name: string; className?: string }) {
  const Icon = icons[name] ?? Sparkles
  return <Icon className={className} aria-hidden="true" />
}


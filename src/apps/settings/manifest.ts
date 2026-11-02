import type { AppManifest } from '../../core/registry';

export const manifest: AppManifest = {
  id: 'settings',
  names: { en: 'Settings', bn: 'সেটিংস' },
  description: { en: 'Language, theme, wallpaper, Low-power mode and reset.', bn: 'ভাষা, থিম, ওয়ালপেপার, লো-পাওয়ার মোড ও রিসেট।' },
  icon: 'Settings',
  category: 'start',
  defaultSize: { w: 520, h: 520 },
  opens: [],
  keywords: ['settings', 'preferences', 'theme', 'wallpaper', 'language', 'reset', 'সেটিংস', 'থিম', 'ওয়ালপেপার'],
  enabled: true,
  load: () => import('./Settings'),
};

import type { AppManifest } from '../../core/registry';

export const manifest: AppManifest = {
  id: 'welcome',
  names: { en: 'Welcome', bn: 'স্বাগতম' },
  description: { en: 'Start here: language, theme and Low-power mode.', bn: 'এখান থেকে শুরু করুন: ভাষা, থিম ও লো-পাওয়ার মোড।' },
  icon: 'Sparkles',
  category: 'start',
  defaultSize: { w: 520, h: 420 },
  opens: [],
  keywords: ['welcome', 'start', 'settings', 'স্বাগতম'],
  enabled: true,
  load: () => import('./Welcome'),
};

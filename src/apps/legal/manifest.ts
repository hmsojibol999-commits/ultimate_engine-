import type { AppManifest } from '../../core/registry';

export const manifest: AppManifest = {
  id: 'legal',
  names: { en: 'Privacy and Terms', bn: 'গোপনীয়তা ও শর্ত' },
  description: { en: 'What is saved, what is not, and the rules of use.', bn: 'কী সেভ হয়, কী হয় না, আর ব্যবহারের নিয়ম।' },
  icon: 'ShieldCheck',
  category: 'start',
  defaultSize: { w: 560, h: 560 },
  opens: [],
  keywords: ['privacy', 'terms', 'policy', 'cookies', 'data', 'abuse', 'গোপনীয়তা', 'শর্ত', 'নীতি'],
  enabled: true,
  load: () => import('./Legal'),
};

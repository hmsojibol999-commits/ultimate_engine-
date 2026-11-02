import type { AppManifest } from '../../core/registry';

export const manifest: AppManifest = {
  id: 'help',
  names: { en: 'Help', bn: 'সাহায্য' },
  description: { en: 'Shortcuts, what is new, and how to send feedback.', bn: 'শর্টকাট, নতুন কী, আর মতামত পাঠানোর উপায়।' },
  icon: 'HelpCircle',
  category: 'start',
  defaultSize: { w: 520, h: 520 },
  opens: [],
  keywords: ['help', 'shortcuts', 'keyboard', 'whats new', 'changelog', 'feedback', 'support', 'সাহায্য', 'শর্টকাট', 'মতামত'],
  enabled: true,
  load: () => import('./Help'),
};

import type { AppManifest } from '../../core/registry';

export const manifest: AppManifest = {
  id: 'taskmanager',
  names: { en: 'Task manager', bn: 'টাস্ক ম্যানেজার' },
  description: { en: 'Real frame rate, storage, connection and open windows.', bn: 'আসল ফ্রেম রেট, স্টোরেজ, সংযোগ ও খোলা উইন্ডো।' },
  icon: 'Activity',
  category: 'start',
  defaultSize: { w: 480, h: 560 },
  opens: [],
  keywords: ['task manager', 'performance', 'fps', 'memory', 'storage', 'monitor', 'টাস্ক', 'পারফরম্যান্স'],
  enabled: true,
  load: () => import('./TaskManager'),
};

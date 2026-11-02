// What's new log (F-31). Newest first. Only list things that really work; unfinished work is not announced.
import type { Lang } from '../core/i18n';

export interface ChangelogEntry { version: string; date: string; items: Record<Lang, string[]> }

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '0.1.0',
    date: '2026-11-02',
    items: {
      en: [
        'Desktop with draggable, resizable windows, taskbar and Start menu. Phones get full-screen cards and a bottom app switcher.',
        'Command palette (Ctrl/Cmd+K) and global search (Ctrl/Cmd+Shift+K).',
        'Notifications, four themes, three wallpapers and Low-power mode.',
        'English and Bengali, switchable at any time.',
        'Settings, Task manager, Help, and the Privacy and Terms pages.',
      ],
      bn: [
        'টেনে সরানো ও মাপ বদলানো যায় এমন উইন্ডো, টাস্কবার ও স্টার্ট মেনু সহ ডেস্কটপ। ফোনে পুরো স্ক্রিনের কার্ড ও নিচে অ্যাপ বদলানোর বার।',
        'কমান্ড প্যালেট (Ctrl/Cmd+K) ও গ্লোবাল সার্চ (Ctrl/Cmd+Shift+K)।',
        'নোটিফিকেশন, চারটি থিম, তিনটি ওয়ালপেপার ও লো-পাওয়ার মোড।',
        'ইংরেজি ও বাংলা, যেকোনো সময় বদলানো যায়।',
        'সেটিংস, টাস্ক ম্যানেজার, সাহায্য এবং গোপনীয়তা ও শর্তের পাতা।',
      ],
    },
  },
];

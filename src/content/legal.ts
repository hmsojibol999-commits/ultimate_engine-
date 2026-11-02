// Privacy and Terms text (F-27). Plain language, both languages, kept as data so a test can check parity.
// HONESTY RULE: describe only what the current build really does. When a later part adds uploads
// (share links, S-*) or the AI assistant (C-*), update PRIVACY here in the same session and bump LEGAL_UPDATED.
// OWNER: have a lawyer read these before public launch (see STATUS.md, F-27, NEEDS OWNER APPROVAL).
import type { Lang } from '../core/i18n';

export const LEGAL_UPDATED = '2026-11-02';

export interface LegalSection {
  id: string;
  heading: Record<Lang, string>;
  body: Record<Lang, string[]>;
}

export const PRIVACY: LegalSection[] = [
  {
    id: 'what-it-is',
    heading: { en: 'What Shadow-Grid is', bn: 'শ্যাডো-গ্রিড কী' },
    body: {
      en: ['Shadow-Grid is a workspace that runs in your browser. Most of what you do stays on your own device.'],
      bn: ['শ্যাডো-গ্রিড এমন একটি কাজের জায়গা যা আপনার ব্রাউজারেই চলে। আপনি যা করেন তার বেশিরভাগই আপনার নিজের ডিভাইসে থাকে।'],
    },
  },
  {
    id: 'saved-on-device',
    heading: { en: 'What is saved on your device', bn: 'আপনার ডিভাইসে কী সেভ হয়' },
    body: {
      en: [
        'Your settings: theme, language, wallpaper and Low-power mode.',
        'A random, anonymous device ID. It is not linked to your name, email or phone number, and it is not a cookie.',
        'Your files and projects, in your browser\'s own storage (IndexedDB).',
        'The current version does not upload any of this.',
      ],
      bn: [
        'আপনার সেটিংস: থিম, ভাষা, ওয়ালপেপার ও লো-পাওয়ার মোড।',
        'একটি এলোমেলো বেনামি ডিভাইস আইডি। এটি আপনার নাম, ইমেইল বা ফোন নম্বরের সঙ্গে যুক্ত নয়, আর এটি কুকিও নয়।',
        'আপনার ফাইল ও প্রজেক্ট, ব্রাউজারের নিজস্ব স্টোরেজে (IndexedDB)।',
        'বর্তমান সংস্করণ এর কিছুই আপলোড করে না।',
      ],
    },
  },
  {
    id: 'cookies',
    heading: { en: 'Cookies and tracking', bn: 'কুকি ও ট্র্যাকিং' },
    body: {
      en: [
        'Shadow-Grid sets no cookies.',
        'There are no ads and no advertising trackers.',
        'If simple, cookie-free visit counting is added later, this page will be updated first.',
      ],
      bn: [
        'শ্যাডো-গ্রিড কোনো কুকি সেট করে না।',
        'কোনো বিজ্ঞাপন নেই, বিজ্ঞাপনের ট্র্যাকারও নেই।',
        'ভবিষ্যতে কুকি ছাড়া সাধারণ ভিজিট গণনা যোগ হলে আগে এই পাতা হালনাগাদ করা হবে।',
      ],
    },
  },
  {
    id: 'hosting',
    heading: { en: 'Hosting', bn: 'হোস্টিং' },
    body: {
      en: ['The site is delivered by Cloudflare. Like any website host, Cloudflare handles technical request data, such as your IP address, to deliver pages and protect the site.'],
      bn: ['সাইটটি ক্লাউডফ্লেয়ার থেকে পরিবেশিত হয়। যেকোনো ওয়েবসাইট হোস্টের মতোই ক্লাউডফ্লেয়ার পেজ পৌঁছাতে ও সাইট রক্ষা করতে আইপি ঠিকানার মতো কারিগরি তথ্য প্রক্রিয়া করে।'],
    },
  },
  {
    id: 'future-features',
    heading: { en: 'Features that will send data', bn: 'যে ফিচার ডেটা পাঠাবে' },
    body: {
      en: ['Share links and the AI assistant are not available yet. When they arrive, each one will tell you before anything leaves your device, and this page will be updated.'],
      bn: ['শেয়ার লিংক ও এআই সহকারী এখনও চালু হয়নি। চালু হলে আপনার ডিভাইস থেকে কিছু বের হওয়ার আগেই জানানো হবে, আর এই পাতা হালনাগাদ হবে।'],
    },
  },
  {
    id: 'your-control',
    heading: { en: 'Your control', bn: 'আপনার নিয়ন্ত্রণ' },
    body: {
      en: [
        'Settings has a reset button. It restores the default settings and keeps your files.',
        'Clearing this site\'s data in your browser removes your settings, device ID and files. Keep your own copy of anything you want to keep.',
      ],
      bn: [
        'সেটিংসে একটি রিসেট বোতাম আছে। এটি ডিফল্ট সেটিংস ফেরায়, আপনার ফাইল ঠিক থাকে।',
        'ব্রাউজারে এই সাইটের ডেটা মুছলে আপনার সেটিংস, ডিভাইস আইডি ও ফাইল চলে যাবে। যা রাখতে চান তার একটি কপি নিজে রেখে দিন।',
      ],
    },
  },
];

export const TERMS: LegalSection[] = [
  {
    id: 'using',
    heading: { en: 'Using Shadow-Grid', bn: 'শ্যাডো-গ্রিড ব্যবহার' },
    body: {
      en: [
        'Shadow-Grid is free and provided "as is". There is no promise that it will always work or stay available.',
        'Browsers can clear stored data. Keep your own copy of anything important.',
      ],
      bn: [
        'শ্যাডো-গ্রিড বিনামূল্যে ও "যেমন আছে তেমন" অবস্থায় দেওয়া হয়। এটি সবসময় চলবে বা চালু থাকবে, এমন কোনো প্রতিশ্রুতি নেই।',
        'ব্রাউজার সংরক্ষিত ডেটা মুছে ফেলতে পারে। জরুরি কিছুর একটি কপি নিজে রেখে দিন।',
      ],
    },
  },
  {
    id: 'your-content',
    heading: { en: 'Your content', bn: 'আপনার কনটেন্ট' },
    body: {
      en: [
        'Your files are yours. They are stored on your device and we claim no rights to them.',
        'You are responsible for what you create, open and share with these tools.',
      ],
      bn: [
        'আপনার ফাইল আপনারই। সেগুলো আপনার ডিভাইসে থাকে এবং এতে আমরা কোনো অধিকার দাবি করি না।',
        'এই টুলগুলো দিয়ে আপনি যা বানান, খোলেন ও শেয়ার করেন তার দায়িত্ব আপনার।',
      ],
    },
  },
  {
    id: 'acceptable-use',
    heading: { en: 'Acceptable use', bn: 'গ্রহণযোগ্য ব্যবহার' },
    body: {
      en: [
        'Do not use Shadow-Grid for anything illegal, to harm or harass others, or to build or spread malware.',
        'Do not try to break, overload or get around the limits of the site or its services.',
        'Content shared through Shadow-Grid links (when they are available) may be removed if it breaks these rules.',
      ],
      bn: [
        'বেআইনি কাজে, অন্যের ক্ষতি বা হয়রানিতে, কিংবা ম্যালওয়্যার বানাতে বা ছড়াতে শ্যাডো-গ্রিড ব্যবহার করবেন না।',
        'সাইট বা এর সেবার সীমা ভাঙার, অতিরিক্ত চাপ দেওয়ার বা পাশ কাটানোর চেষ্টা করবেন না।',
        'শ্যাডো-গ্রিড লিংকের মাধ্যমে (চালু হলে) শেয়ার করা কনটেন্ট এই নিয়ম ভাঙলে সরিয়ে ফেলা হতে পারে।',
      ],
    },
  },
  {
    id: 'no-advice',
    heading: { en: 'Tools and answers', bn: 'টুল ও উত্তর' },
    body: {
      en: [
        'Results from tools and from the helper can be wrong or incomplete. Check important results yourself.',
        'Nothing here is medical, legal or financial advice.',
      ],
      bn: [
        'টুল ও সহকারীর ফলাফল ভুল বা অসম্পূর্ণ হতে পারে। জরুরি ফলাফল নিজে যাচাই করুন।',
        'এখানের কিছুই চিকিৎসা, আইনি বা আর্থিক পরামর্শ নয়।',
      ],
    },
  },
  {
    id: 'changes',
    heading: { en: 'Changes', bn: 'পরিবর্তন' },
    body: {
      en: ['These terms and the privacy page may change as new features arrive. The date at the top shows the latest update.'],
      bn: ['নতুন ফিচার এলে এই শর্ত ও গোপনীয়তার পাতা বদলাতে পারে। ওপরের তারিখে সর্বশেষ হালনাগাদ দেখা যায়।'],
    },
  },
];

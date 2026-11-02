// OWNER DETAILS. TODO: replace every placeholder below before publishing.
// Never invent real contact details; empty/placeholder values hide the matching button.
export const PROFILE = {
  OWNER_NAME: 'OWNER_NAME', // TODO
  TAGLINE: 'I build fast, polished web tools and apps.', // TODO
  WHATSAPP: '', // TODO e.g. https://wa.me/8801XXXXXXXXX
  TELEGRAM: '', // TODO e.g. https://t.me/username
  EMAIL: '', // TODO e.g. you@example.com
  GITHUB_URL: '', // TODO
  REPO_URL: '', // TODO
} as const;

export const isPlaceholder = (v: string): boolean => v === '' || v.startsWith('TODO') || v === 'OWNER_NAME';

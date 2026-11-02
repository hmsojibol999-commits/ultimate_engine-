// Owner contact links built only from real values in config/profile.ts. Placeholders never become buttons (F-26).
import { PROFILE, isPlaceholder } from '../config/profile';

export interface ContactSource { EMAIL: string; GITHUB_URL: string; REPO_URL: string; WHATSAPP: string; TELEGRAM: string }
export interface ContactLinks { email?: string; feedback?: string; github?: string; repo?: string; whatsapp?: string; telegram?: string }

const isHttps = (v: string): boolean => /^https:\/\/[^\s]+$/.test(v);
const isEmail = (v: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

/** Returns only links that are real. Feedback prefers the repo issue form, then email. */
export function contactLinks(p: ContactSource = PROFILE, subject = 'Shadow-Grid feedback'): ContactLinks {
  const out: ContactLinks = {};
  if (!isPlaceholder(p.EMAIL) && isEmail(p.EMAIL)) out.email = `mailto:${p.EMAIL}?subject=${encodeURIComponent(subject)}`;
  if (!isPlaceholder(p.GITHUB_URL) && isHttps(p.GITHUB_URL)) out.github = p.GITHUB_URL;
  if (!isPlaceholder(p.REPO_URL) && isHttps(p.REPO_URL)) out.repo = p.REPO_URL;
  if (!isPlaceholder(p.WHATSAPP) && isHttps(p.WHATSAPP)) out.whatsapp = p.WHATSAPP;
  if (!isPlaceholder(p.TELEGRAM) && isHttps(p.TELEGRAM)) out.telegram = p.TELEGRAM;
  if (out.repo) out.feedback = `${out.repo.replace(/\/+$/, '')}/issues/new`;
  else if (out.email) out.feedback = out.email;
  return out;
}

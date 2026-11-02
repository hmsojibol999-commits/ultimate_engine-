import type { StringKey } from '../content/strings.en';
import type { ContactLinks } from '../core/contact';
import type { Lang } from '../core/i18n';
import type { AppCategory, AppManifest } from '../core/registry';
import { basename, dirname } from '../core/vfs/path';

/** Start menu logic (F-08, F-26, F-28). Pure and testable; the UI lives in shell/StartMenu.tsx. */

// ---------- Apps by category ----------

/** Display order of categories. A category with no enabled app is not shown at all. */
export const CATEGORY_ORDER: readonly AppCategory[] = ['start', 'workspace', 'ai', 'data', 'dev', 'media', 'everyday', 'learn'];

export const CATEGORY_LABEL: Record<AppCategory, StringKey> = {
  start: 'start.cat.start',
  workspace: 'start.cat.workspace',
  ai: 'start.cat.ai',
  data: 'start.cat.data',
  dev: 'start.cat.dev',
  media: 'start.cat.media',
  everyday: 'start.cat.everyday',
  learn: 'start.cat.learn',
};

export interface AppGroup { category: AppCategory; apps: AppManifest[] }

/** Groups enabled apps by category (fixed order) and sorts each group by the name in the current language. */
export function groupApps(apps: readonly AppManifest[], lang: Lang): AppGroup[] {
  const buckets = new Map<AppCategory, AppManifest[]>();
  for (const app of apps) {
    if (!app.enabled) continue;
    // An unknown category (should not happen) is shown under 'start' instead of being hidden.
    const cat = CATEGORY_ORDER.includes(app.category) ? app.category : 'start';
    const list = buckets.get(cat);
    if (list) list.push(app); else buckets.set(cat, [app]);
  }
  const groups: AppGroup[] = [];
  for (const category of CATEGORY_ORDER) {
    const list = buckets.get(category);
    if (!list || list.length === 0) continue;
    groups.push({ category, apps: [...list].sort((a, b) => a.names[lang].localeCompare(b.names[lang], lang)) });
  }
  return groups;
}

// ---------- Recent files ----------

export interface FileLike { path: string; kind: 'file' | 'dir'; mtime: number }
export interface RecentFile { path: string; name: string; dir: string; mtime: number }

export const RECENT_LIMIT = 5;

/** Newest files first (ties: path order, so the list never flickers). Folders are ignored. */
export function pickRecentFiles(entries: readonly FileLike[], limit = RECENT_LIMIT): RecentFile[] {
  return entries
    .filter((e) => e.kind === 'file')
    .sort((a, b) => b.mtime - a.mtime || a.path.localeCompare(b.path))
    .slice(0, Math.max(0, limit))
    .map((e) => ({ path: e.path, name: basename(e.path), dir: dirname(e.path), mtime: e.mtime }));
}

export type AgoUnit = 'now' | 'min' | 'hour' | 'day';

/** Coarse "time ago" parts. The UI turns them into a translated string. Future times count as "now". */
export function agoParts(mtime: number, now: number): { unit: AgoUnit; n: number } {
  const sec = Math.max(0, Math.floor((now - mtime) / 1000));
  if (sec < 60) return { unit: 'now', n: 0 };
  const min = Math.floor(sec / 60);
  if (min < 60) return { unit: 'min', n: min };
  const hour = Math.floor(min / 60);
  if (hour < 24) return { unit: 'hour', n: hour };
  return { unit: 'day', n: Math.floor(hour / 24) };
}

// ---------- Keyboard (F-28) ----------

/** Arrow/Home/End movement across the menu's items. Returns the new index, or -1 when there are no items. */
export function moveIndex(current: number, count: number, key: string): number {
  if (count <= 0) return -1;
  switch (key) {
    case 'ArrowDown': return current < 0 ? 0 : (current + 1) % count;
    case 'ArrowUp': return current < 0 ? count - 1 : (current - 1 + count) % count;
    case 'Home': return 0;
    case 'End': return count - 1;
    default: return current;
  }
}

/**
 * Focus trap for Tab. Returns the index that must receive focus when Tab would leave the menu
 * (wrap around), or null when the browser's normal Tab order is fine.
 * `active` is the index of the focused item, or -1 if focus is somewhere else.
 */
export function trapTab(active: number, count: number, shift: boolean): number | null {
  if (count <= 0) return null;
  if (active < 0) return shift ? count - 1 : 0;
  if (!shift && active === count - 1) return 0;
  if (shift && active === 0) return count - 1;
  return null;
}

// ---------- About / Hire card (F-26) ----------

export type ContactKind = 'whatsapp' | 'telegram' | 'email' | 'github';
export interface ContactButton { kind: ContactKind; href: string }
export interface AboutCard {
  /** Real owner name, or null while it is still a placeholder (the card then talks about the app only). */
  name: string | null;
  tagline: string | null;
  /** Only real, valid links. Empty when the owner has not filled in any contact yet. */
  buttons: ContactButton[];
}

interface ProfileLike { OWNER_NAME: string; TAGLINE: string }

/** Contact buttons come first (hire), GitHub last. Placeholders never become buttons or text (D-018). */
export function buildAboutCard(profile: ProfileLike, links: ContactLinks, isPlaceholder: (v: string) => boolean): AboutCard {
  const hasName = !isPlaceholder(profile.OWNER_NAME);
  const buttons: ContactButton[] = [];
  if (links.whatsapp) buttons.push({ kind: 'whatsapp', href: links.whatsapp });
  if (links.telegram) buttons.push({ kind: 'telegram', href: links.telegram });
  if (links.email) buttons.push({ kind: 'email', href: links.email });
  if (links.github) buttons.push({ kind: 'github', href: links.github });
  return {
    name: hasName ? profile.OWNER_NAME : null,
    // The default tagline is boilerplate, so it is only shown together with a real name.
    tagline: hasName && !isPlaceholder(profile.TAGLINE) ? profile.TAGLINE : null,
    buttons,
  };
}

/** The "Need a tool or app built?" line is shown only when there is a way to reach the owner. */
export const hasHireContacts = (card: AboutCard): boolean => card.buttons.some((b) => b.kind !== 'github');

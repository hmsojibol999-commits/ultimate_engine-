import { lazy, type ComponentType, type LazyExoticComponent } from 'react';
import type { Lang } from './i18n';

export type AppCategory = 'start' | 'workspace' | 'ai' | 'data' | 'dev' | 'media' | 'everyday' | 'learn';
export interface AppProps { windowId: string; file?: string }

/** Every app is a plugin: one folder with manifest.ts (spec section 6). */
export interface AppManifest {
  id: string;
  names: Record<Lang, string>;
  description: Record<Lang, string>;
  icon: string;
  category: AppCategory;
  defaultSize: { w: number; h: number };
  opens: string[];     // file extensions this app can open, e.g. ['.json']
  keywords: string[];
  enabled: boolean;    // unfinished apps are hidden with enabled:false, never shown broken
  load: () => Promise<{ default: ComponentType<AppProps> }>;
}

const modules = import.meta.glob<{ manifest: AppManifest }>('../apps/*/manifest.ts', { eager: true });
const all: AppManifest[] = Object.values(modules).map((m) => m.manifest);

export const listApps = (): AppManifest[] => all.filter((a) => a.enabled);
export const getApp = (id: string): AppManifest | undefined => all.find((a) => a.id === id);
export const appForExtension = (ext: string): AppManifest | undefined => listApps().find((a) => a.opens.includes(ext.toLowerCase()));

const cache = new Map<string, LazyExoticComponent<ComponentType<AppProps>>>();
/** Lazy component per app; heavy modules load only when the app first opens. */
export function getAppComponent(id: string): LazyExoticComponent<ComponentType<AppProps>> | undefined {
  const app = getApp(id);
  if (!app) return undefined;
  let c = cache.get(id);
  if (!c) { c = lazy(app.load); cache.set(id, c); }
  return c;
}

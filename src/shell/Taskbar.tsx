import { useEffect, useState } from 'react';
import { useT } from '../core/i18n';
import { getApp } from '../core/registry';
import { useSettings } from '../core/settings';
import { useNotices } from '../core/notifications';
import { unreadCount } from '../core/notificationLogic';
import { getIcon, Menu, Languages, Search, Command, Bell } from '../design/icons';
import { useWindows } from './windowStore';
import { swipeHandlers } from './useIsMobile';

function Clock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const i = setInterval(() => setNow(new Date()), 15000); return () => clearInterval(i); }, []);
  return <time dateTime={now.toISOString()} style={{ fontVariantNumeric: 'tabular-nums', color: 'var(--text-dim)', padding: '0 var(--sp-2)' }}>
    {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>;
}

/** Desktop: taskbar along the bottom. Phone: the same strip acts as the bottom app switcher (swipe to switch). */
export function Taskbar({ mobile, startOpen, onToggleStart, onSearch, onPalette, onNotifications }: { mobile: boolean; startOpen: boolean; onToggleStart: () => void; onSearch: () => void; onPalette: () => void; onNotifications: () => void }) {
  const { t, lang } = useT();
  const { windows, focusedId, focus, minimize, cycle } = useWindows();
  const update = useSettings((s) => s.update);
  const swipe = swipeHandlers(() => cycle(1), () => cycle(-1));
  const unread = useNotices((s) => unreadCount(s.notices));

  return (
    <nav aria-label={mobile ? t('switcher.label') : t('taskbar.start')} className="sg-glass" {...(mobile ? swipe : {})}
      style={{ position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 100001, display: 'flex', alignItems: 'center', gap: 'var(--sp-1)', height: `var(${mobile ? '--switcher-h' : '--taskbar-h'})`, padding: '0 var(--sp-2) env(safe-area-inset-bottom)', boxSizing: 'content-box', borderLeft: 0, borderRight: 0, borderBottom: 0 }}>
      <button data-start-button data-tour="start" className="sg-btn" aria-label={t('taskbar.start')} aria-expanded={startOpen} onClick={onToggleStart} style={{ padding: 0, boxShadow: startOpen ? 'var(--glow)' : undefined }}>
        <Menu size={20} />
      </button>
      <div style={{ flex: 1, display: 'flex', gap: 'var(--sp-1)', overflowX: 'auto', minWidth: 0 }}>
        {windows.length === 0 && !mobile && <span style={{ color: 'var(--text-dim)', padding: '0 var(--sp-3)' }}>{t('taskbar.noWindows')}</span>}
        {windows.map((w) => {
          const app = getApp(w.appId); if (!app) return null;
          const Icon = getIcon(app.icon);
          const active = focusedId === w.id && !w.minimized;
          return (
            <button key={w.id} className="sg-btn" aria-pressed={active} title={app.names[lang]}
              onClick={() => (active && !mobile ? minimize(w.id) : focus(w.id))}
              style={{ gap: 'var(--sp-2)', boxShadow: active ? 'var(--glow)' : undefined, opacity: w.minimized ? 0.6 : 1, flexShrink: 0 }}>
              <Icon size={16} aria-hidden />{!mobile && <span style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{app.names[lang]}</span>}
            </button>
          );
        })}
      </div>
      <button data-tour="search" className="sg-btn" aria-label={t('taskbar.search')} onClick={onSearch} style={{ padding: 0 }}><Search size={16} aria-hidden /></button>
      <button data-tour="palette" className="sg-btn" aria-label={t('taskbar.palette')} onClick={onPalette} style={{ padding: 0 }}><Command size={16} aria-hidden /></button>
      <button data-notif-button data-tour="notifications" className="sg-btn" aria-label={unread > 0 ? `${t('taskbar.notifications')}, ${t('notif.unread', { n: unread })}` : t('taskbar.notifications')} onClick={onNotifications} style={{ padding: 0, position: 'relative' }}>
        <Bell size={16} aria-hidden />
        {unread > 0 && <span aria-hidden style={{ position: 'absolute', top: 6, right: 6, minWidth: 14, height: 14, padding: '0 3px', borderRadius: 7, background: 'var(--accent)', color: 'var(--bg-0)', fontSize: 10, lineHeight: '14px', textAlign: 'center', fontWeight: 700 }}>{unread > 9 ? '9+' : unread}</span>}
      </button>
      <button data-tour="language" className="sg-btn" aria-label={t('settings.language')} onClick={() => update({ lang: lang === 'en' ? 'bn' : 'en' })}>
        <Languages size={16} aria-hidden />{lang === 'en' ? 'বাং' : 'EN'}
      </button>
      {!mobile && <Clock />}
    </nav>
  );
}

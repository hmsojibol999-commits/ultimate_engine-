import { registerCommand } from '../core/commands';
import { translate } from '../core/i18n';
import { useNotices } from '../core/notifications';
import { THEMES, WALLPAPERS, useSettings } from '../core/settings';
import type { StringKey } from '../content/strings.en';
import { useShortcutsPanel } from '../core/shortcutsPanel';
import { useTour } from '../core/tour';
import { useCharacter } from '../core/characterChoice';
import { useWindows } from './windowStore';

const both = (key: StringKey, vars?: Record<string, string | number>) => ({ en: translate('en', key, vars), bn: translate('bn', key, vars) });

/** Shell-level commands for the palette (F-09). Titles exist in both languages, so switching language needs no re-registering. */
export function registerBuiltinCommands(): () => void {
  const offs: Array<() => void> = [];

  for (const id of THEMES) {
    const key = `theme.${id}` as StringKey;
    offs.push(registerCommand({
      id: `theme.${id}`,
      title: { en: translate('en', 'cmd.theme', { name: translate('en', key) }), bn: translate('bn', 'cmd.theme', { name: translate('bn', key) }) },
      keywords: ['theme', 'color', 'থিম', 'রং'],
      run: () => useSettings.getState().update({ theme: id }),
    }));
  }

  offs.push(registerCommand({
    id: 'tour.start', title: both('tour.replay'), keywords: ['tour', 'guide', 'help', 'ট্যুর', 'গাইড'],
    run: () => useTour.getState().start(),
  }));

  for (const l of ['en', 'bn'] as const) {
    offs.push(registerCommand({
      id: `lang.${l}`, title: both(`cmd.lang.${l}`), keywords: ['language', 'ভাষা', l === 'en' ? 'english' : 'bangla', l === 'en' ? 'ইংরেজি' : 'বাংলা'],
      run: () => useSettings.getState().update({ lang: l }),
    }));
  }

  for (const id of WALLPAPERS) {
    const key = `wallpaper.${id}` as StringKey;
    offs.push(registerCommand({
      id: `wallpaper.${id}`,
      title: { en: translate('en', 'cmd.wallpaper', { name: translate('en', key) }), bn: translate('bn', 'cmd.wallpaper', { name: translate('bn', key) }) },
      keywords: ['wallpaper', 'background', 'ওয়ালপেপার'],
      run: () => useSettings.getState().update({ wallpaper: id }),
    }));
  }

  offs.push(registerCommand({
    id: 'shortcuts.show', title: both('cmd.shortcuts'), keywords: ['keyboard', 'shortcuts', 'keys', 'help', 'শর্টকাট', 'কিবোর্ড'],
    run: () => useShortcutsPanel.getState().show(),
  }));

  offs.push(registerCommand({
    id: 'settings.open', title: both('cmd.openSettings'), keywords: ['settings', 'preferences', 'সেটিংস'],
    run: () => { useWindows.getState().open('settings'); },
  }));

  offs.push(registerCommand({
    id: 'character.change', title: both('cmd.character'), keywords: ['character', 'helper', 'avatar', 'assistant', 'চরিত্র', 'সহায়ক'],
    run: () => useCharacter.getState().openPicker(),
  }));

  offs.push(registerCommand({
    id: 'lowpower.toggle', title: both('cmd.lowPower'), keywords: ['low power', 'performance', 'battery', 'লো-পাওয়ার'],
    run: () => {
      const next = !useSettings.getState().lowPower;
      useSettings.getState().update({ lowPower: next });
      useNotices.getState().push('info', translate(useSettings.getState().lang, next ? 'cmd.lowPower.on' : 'cmd.lowPower.off'));
    },
  }));

  offs.push(registerCommand({
    id: 'windows.closeAll', title: both('cmd.closeAll'), keywords: ['close', 'windows', 'উইন্ডো'],
    run: () => { const s = useWindows.getState(); [...s.windows].forEach((w) => s.close(w.id)); },
  }));

  return () => offs.forEach((off) => off());
}

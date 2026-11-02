import { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { AnimatePresence } from 'motion/react';
import { connectToastBus } from './core/notifications';
import { connectCharacterExpressionBus } from './core/characterExpressions';
import { Desktop } from './shell/Desktop';
import { Boot } from './shell/Boot';
import { BackupBanner } from './shell/BackupBanner';
import { requestPersistence } from './core/backup';
import { registerBuiltinCommands } from './shell/builtinCommands';
import { useWindows } from './shell/windowStore';
import { restoreWorkspace, startWorkspaceAutosave } from './shell/workspace';
import { Tour } from './shell/Tour';
import { useTour } from './core/tour';
import { TOUR_START_DELAY_MS, shouldAutoStartTour } from './design/tourLogic';
import { LOW_POWER_SUGGEST_DELAY_MS, markLowPowerSuggested, shouldShowLowPowerSuggestion } from './design/lowPowerLogic';
import { shouldSuggestLowPower } from './design/motion';
import { useSettings } from './core/settings';
import { useNotices } from './core/notifications';
import { translate } from './core/i18n';
import { shouldShowPicker, useCharacter } from './core/characterChoice';

// The character art and picker are a separate chunk, loaded only when the picker opens (addendum B.8).
const CharacterPicker = lazy(() => import('./character/CharacterPicker'));

export default function App() {
  const [booting, setBooting] = useState(true);
  const onBootDone = useCallback(() => setBooting(false), []);
  // Palette commands, notifications, and character cues are connected once at startup.
  useEffect(() => {
    const offCommands = registerBuiltinCommands();
    const offToasts = connectToastBus();
    const offCharacter = connectCharacterExpressionBus();
    return () => { offCommands(); offToasts(); offCharacter(); };
  }, []);
  // Once the boot screen is gone: put the saved windows back (F-17). With nothing saved (first visit) open Welcome.
  // Autosave starts only after that, so the empty startup state can never overwrite the saved workspace.
  useEffect(() => {
    if (booting) return;
    let stopped = false;
    let stopAutosave: (() => void) | undefined;
    void (async () => {
      let result: 'restored' | 'none' = 'none';
      try { result = await restoreWorkspace(); } catch { result = 'none'; }
      if (stopped) return;
      if (result === 'none' && useWindows.getState().windows.length === 0) useWindows.getState().open('welcome');
      stopAutosave = startWorkspaceAutosave();
    })();
    return () => { stopped = true; stopAutosave?.(); };
  }, [booting]);
  // Character picker (C-01): opens by itself on the first visit, right after the boot screen and before the tour.
  const pickerOpen = useCharacter((st) => st.pickerOpen);
  useEffect(() => {
    if (booting) return;
    if (shouldShowPicker(typeof localStorage === 'undefined' ? undefined : localStorage)) useCharacter.getState().openPicker();
  }, [booting]);
  // Guided tour (F-22): starts once on the first visit, shortly after the boot screen and Welcome window.
  // While the character picker is open the tour waits; it starts when the visitor has chosen.
  useEffect(() => {
    if (booting || pickerOpen) return;
    const id = window.setTimeout(() => {
      if (useCharacter.getState().pickerOpen) return;
      if (shouldAutoStartTour(typeof localStorage === 'undefined' ? undefined : localStorage)) useTour.getState().start();
    }, TOUR_START_DELAY_MS);
    return () => window.clearTimeout(id);
  }, [booting, pickerOpen]);
  // Low-power suggestion (F-04): one friendly notice per device, only when real signals say the device is slow.
  useEffect(() => {
    if (booting) return;
    const id = window.setTimeout(() => {
      const store = typeof localStorage === 'undefined' ? undefined : localStorage;
      const { lowPower, lang } = useSettings.getState();
      if (!shouldShowLowPowerSuggestion({ slow: shouldSuggestLowPower(), lowPower, store })) return;
      markLowPowerSuggested(store);
      useNotices.getState().push('info', translate(lang, 'lowPower.suggestion'));
    }, LOW_POWER_SUGGEST_DELAY_MS);
    return () => window.clearTimeout(id);
  }, [booting]);
  // Ask the browser to keep our storage (F-24); never blocks and never throws.
  useEffect(() => { if (!booting) void requestPersistence(); }, [booting]);
  return (
    <>
      <Desktop />
      {!booting && <BackupBanner />}
      {!booting && <Tour />}
      {!booting && pickerOpen && <Suspense fallback={null}><CharacterPicker /></Suspense>}
      <AnimatePresence>{booting && <Boot key="boot" onDone={onBootDone} />}</AnimatePresence>
    </>
  );
}

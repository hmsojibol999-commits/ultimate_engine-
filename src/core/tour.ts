import { create } from 'zustand';
import { markTourSeen } from '../design/tourLogic';

/** Open/closed state of the guided tour (F-22). Finishing or skipping marks it as seen so it never auto-starts again. */
interface TourState { active: boolean; start: () => void; stop: () => void }

const storage = () => (typeof localStorage === 'undefined' ? undefined : localStorage);

export const useTour = create<TourState>((set) => ({
  active: false,
  start: () => set({ active: true }),
  stop: () => { markTourSeen(storage()); set({ active: false }); },
}));

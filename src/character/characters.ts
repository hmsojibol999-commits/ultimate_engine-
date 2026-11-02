import { CHARACTER_STYLES, CHARACTER_VARIANTS, type CharacterId, type CharacterStyle, type CharacterVariant } from '../core/characterChoice';

/** Colors of one character. All art is original and drawn from these (no existing characters, no real people). */
export interface Look {
  skin: string; skinShade: string; hair: string; hairShade: string;
  outfit: string; outfit2: string; eye: string; accent: string;
}

export interface CharacterDef {
  id: CharacterId;
  style: CharacterStyle;
  variant: CharacterVariant;
  name: { en: string; bn: string };
  look: Look;
}

const human = (skin: string, skinShade: string): Pick<Look, 'skin' | 'skinShade'> => ({ skin, skinShade });

/** 12 characters: 4 styles x 3 looks. Names are invented labels, not references to anyone. */
const DEFS: Array<Omit<CharacterDef, 'id' | 'style' | 'variant'> & { id: CharacterId }> = [
  // Anime-style
  { id: 'anime-a', name: { en: 'Daichi', bn: 'দাইচি' }, look: { ...human('#f6d5c0', '#e8b9a0'), hair: '#1f2a44', hairShade: '#2f3d63', outfit: '#243b6b', outfit2: '#00c8d6', eye: '#2bb3ff', accent: '#00f3ff' } },
  { id: 'anime-b', name: { en: 'Mika', bn: 'মিকা' }, look: { ...human('#fbdcc9', '#efbfa8'), hair: '#c04a8a', hairShade: '#e06aa8', outfit: '#4a2a6b', outfit2: '#ff7ac8', eye: '#a855f7', accent: '#ff7ac8' } },
  { id: 'anime-c', name: { en: 'Tomo', bn: 'তোমো' }, look: { ...human('#f1cdb3', '#dfae92'), hair: '#2c7a6b', hairShade: '#3fa38f', outfit: '#16463f', outfit2: '#fbbf24', eye: '#34d399', accent: '#34d399' } },
  // Robot
  { id: 'robot-a', name: { en: 'Volt', bn: 'ভোল্ট' }, look: { ...human('#9fb4c9', '#7d93ab'), hair: '#5b7089', hairShade: '#42566d', outfit: '#2b3a52', outfit2: '#00f3ff', eye: '#00f3ff', accent: '#00f3ff' } },
  { id: 'robot-b', name: { en: 'Nova', bn: 'নোভা' }, look: { ...human('#d9c9ee', '#b8a3d8'), hair: '#8b6fc4', hairShade: '#6f54a8', outfit: '#3b2b63', outfit2: '#f0abfc', eye: '#f0abfc', accent: '#f0abfc' } },
  { id: 'robot-c', name: { en: 'Pixel', bn: 'পিক্সেল' }, look: { ...human('#e8efe9', '#c2cec6'), hair: '#9aa9a0', hairShade: '#7b8b81', outfit: '#25382f', outfit2: '#a3e635', eye: '#a3e635', accent: '#a3e635' } },
  // Cartoon
  { id: 'cartoon-a', name: { en: 'Bobo', bn: 'বোবো' }, look: { ...human('#ffd9a8', '#f2b97a'), hair: '#7a3e1d', hairShade: '#5a2b10', outfit: '#ef4444', outfit2: '#fde047', eye: '#1b1b2f', accent: '#fde047' } },
  { id: 'cartoon-b', name: { en: 'Pip', bn: 'পিপ' }, look: { ...human('#ffe0c2', '#f5c096'), hair: '#f59e0b', hairShade: '#d97706', outfit: '#22c55e', outfit2: '#fb7185', eye: '#1b1b2f', accent: '#fb7185' } },
  { id: 'cartoon-c', name: { en: 'Zuzu', bn: 'জুজু' }, look: { ...human('#f3c9a0', '#dca67a'), hair: '#3b82f6', hairShade: '#2563eb', outfit: '#8b5cf6', outfit2: '#38bdf8', eye: '#1b1b2f', accent: '#38bdf8' } },
  // Friendly "normal" human style
  { id: 'human-a', name: { en: 'Arif', bn: 'আরিফ' }, look: { ...human('#d9a679', '#c18a5e'), hair: '#1c1917', hairShade: '#2b2623', outfit: '#1e3a5f', outfit2: '#00f3ff', eye: '#1c1917', accent: '#00f3ff' } },
  { id: 'human-b', name: { en: 'Nila', bn: 'নীলা' }, look: { ...human('#e2b48c', '#c99870'), hair: '#2a1a14', hairShade: '#3d2820', outfit: '#6d28d9', outfit2: '#f0abfc', eye: '#2a1a14', accent: '#a78bfa' } },
  { id: 'human-c', name: { en: 'Sam', bn: 'স্যাম' }, look: { ...human('#f1c9a5', '#d9a982'), hair: '#8a5a3a', hairShade: '#6e4528', outfit: '#0f766e', outfit2: '#fbbf24', eye: '#3a2a1e', accent: '#34d399' } },
];

export const CHARACTERS: CharacterDef[] = DEFS.map((d) => {
  const [style, variant] = d.id.split('-') as [CharacterStyle, CharacterVariant];
  return { ...d, style, variant };
});

export const getCharacter = (id: CharacterId): CharacterDef => {
  const found = CHARACTERS.find((c) => c.id === id);
  if (!found) throw new Error(`Unknown character ${id}`); // cannot happen: ids are typed and tested
  return found;
};

/** Gallery order: styles in a fixed order, three looks each. */
export const charactersByStyle = (): Array<{ style: CharacterStyle; items: CharacterDef[] }> =>
  CHARACTER_STYLES.map((style) => ({ style, items: CHARACTER_VARIANTS.map((v) => getCharacter(`${style}-${v}` as CharacterId)) }));

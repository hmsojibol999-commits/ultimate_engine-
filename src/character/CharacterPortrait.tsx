import { useMemo } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { MOOD_FACES, MOOD_MOTION, type CharacterMood } from '../core/characterExpressionLogic';
import { transition } from '../design/motion';
import { buildPortraitSvg, completeFace, PORTRAIT_VIEWBOX, type Face } from './characterArt';
import type { CharacterDef } from './characters';

interface Props {
  character: CharacterDef;
  /** Width in px; height follows the art's proportions. */
  size?: number;
  label: string;
  /** Only the parts you want to change; the rest use the default face. */
  face?: Partial<Face>;
  /** Semantic event mood, used for restrained body motion. */
  mood?: CharacterMood;
  /** Disables all portrait motion when OS or in-app reduced motion is active. */
  reducedMotion?: boolean;
}

/**
 * One original character portrait. SVG strings use only our own constants (never user text),
 * so injecting them is safe. The wrapper carries the accessible name; the SVG itself is decorative.
 */
export function CharacterPortrait({ character, size = 96, label, face, mood = 'idle', reducedMotion = false }: Props) {
  // Depend on the four options, not on the `face` object, so an inline face prop does not rebuild the SVG every render.
  const { eyes, mouth, brows, hands } = completeFace({ ...MOOD_FACES[mood], ...face });
  const html = useMemo(() => buildPortraitSvg(character, { eyes, mouth, brows, hands }), [character, eyes, mouth, brows, hands]);
  const faceKey = `${eyes}-${mouth}-${brows}-${hands}`;
  const bodyMotion = reducedMotion ? MOOD_MOTION.idle : MOOD_MOTION[mood];
  const motionTransition = reducedMotion ? { duration: 0 } : transition.base;
  const faceTransition = reducedMotion ? { duration: 0 } : transition.fast;

  return (
    <motion.span
      className="sg-portrait"
      role="img"
      aria-label={label}
      animate={bodyMotion}
      transition={motionTransition}
      style={{
        width: size,
        height: Math.round((size * PORTRAIT_VIEWBOX.h) / PORTRAIT_VIEWBOX.w),
        position: 'relative',
      }}
    >
      <AnimatePresence initial={false} mode="sync">
        <motion.span
          key={faceKey}
          initial={reducedMotion ? false : { opacity: 0, scale: 0.985 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={reducedMotion ? { opacity: 1 } : { opacity: 0, scale: 0.995 }}
          transition={faceTransition}
          style={{ position: 'absolute', inset: 0, display: 'block' }}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </AnimatePresence>
    </motion.span>
  );
}

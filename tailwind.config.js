/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg0: 'var(--bg-0)', bg1: 'var(--bg-1)', bg2: 'var(--bg-2)',
        accent: 'var(--accent)', accent2: 'var(--accent-2)', accent3: 'var(--accent-3)',
        ok: 'var(--success)', warn: 'var(--warning)', danger: 'var(--danger)',
        fg: 'var(--text)', dim: 'var(--text-dim)',
      },
      borderRadius: { sg1: '6px', sg2: '10px', sg3: '16px' },
      transitionTimingFunction: { out: 'var(--ease-out)', inout: 'var(--ease-in-out)' },
    },
  },
  plugins: [],
};

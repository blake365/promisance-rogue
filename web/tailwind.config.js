/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Base colors
        'game-dark': '#0a0a12',
        'game-panel': '#1a1a2e',
        'game-card': '#16213e',
        'game-border': '#0f3460',
        'game-highlight': '#e94560',

        // Resources
        gold: '#ffd700',
        food: '#7cfc00',
        runes: '#da70d6',
        land: '#00bfff',

        // Eras
        'era-past': '#9932cc',
        'era-present': '#00ced1',
        'era-future': '#32cd32',

        // Rarity
        common: '#c0c0c0',
        uncommon: '#00ff7f',
        rare: '#1e90ff',
        legendary: '#ffd700',
      },
      fontFamily: {
        display: ['MedievalSharp', 'Cinzel', 'Times New Roman', 'serif'],
        mono: ['VT323', 'Courier New', 'monospace'],
        stats: ['Orbitron', 'Share Tech Mono', 'monospace'],
      },
      boxShadow: {
        'retro-inset':
          'inset -2px -2px 0 rgba(0,0,0,0.3), inset 2px 2px 0 rgba(255,255,255,0.2)',
        'retro-pressed':
          'inset 2px 2px 0 rgba(0,0,0,0.3), inset -2px -2px 0 rgba(255,255,255,0.1)',
        'panel-glow': 'inset 0 0 20px rgba(0,0,0,0.5)',
        'gold-glow': '0 0 10px rgba(255,215,0,0.5)',
        'blue-glow': '0 0 10px rgba(30,144,255,0.5)',
        'purple-glow': '0 0 10px rgba(153,50,204,0.5)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        glow: {
          '0%': { boxShadow: '0 0 5px currentColor' },
          '100%': { boxShadow: '0 0 20px currentColor' },
        },
      },
    },
  },
  plugins: [],
};

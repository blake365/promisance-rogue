# Promisance Rogue Web - Development Plan

## Project Vision

A **mobile-first web version** of Promisance Rogue with an **early 2000s browser game aesthetic** - think Ogame, Travian, Tribal Wars, or the original Promisance. This means:

- Compact, information-dense layouts
- Table-based displays for stats and resources
- Bold, saturated colors on dark backgrounds
- Pixel-art icons and fantasy fonts
- Simple but functional UI over flashy animations
- Nostalgic "web 1.5" feeling with modern accessibility

---

## Technical Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Framework | React 18+ | Matches CLI, easy knowledge transfer |
| Styling | Tailwind CSS | Rapid development, mobile-first utilities |
| Routing | React Router v6 | SPA navigation |
| State | Zustand or React Context | Lighter than Redux, similar to useGame hook |
| Build | Vite | Fast dev experience, modern bundling |
| Types | TypeScript | Shared with CLI |
| API | PromisanceClient class | Direct port from CLI |

---

## Aesthetic Guidelines

### Color Palette (Early 2000s Browser Game)

```css
/* Base colors */
--bg-dark: #0a0a12;        /* Near-black with blue tint */
--bg-panel: #1a1a2e;       /* Panel backgrounds */
--bg-card: #16213e;        /* Card/container backgrounds */
--border: #0f3460;         /* Panel borders */
--border-highlight: #e94560; /* Active/focus borders */

/* Resources */
--gold: #ffd700;
--food: #7cfc00;
--runes: #da70d6;
--land: #00bfff;

/* Era colors */
--era-past: #9932cc;       /* Deep purple */
--era-present: #00ced1;    /* Cyan */
--era-future: #32cd32;     /* Lime green */

/* Rarity */
--common: #c0c0c0;
--uncommon: #00ff7f;
--rare: #1e90ff;
--legendary: #ffd700;

/* UI states */
--danger: #dc3545;
--success: #28a745;
--warning: #ffc107;
```

### Typography

```css
/* Headers - Fantasy/medieval feel */
font-family: 'MedievalSharp', 'Cinzel', 'Times New Roman', serif;

/* Body - Readable but retro */
font-family: 'VT323', 'Press Start 2P', 'Courier New', monospace;

/* Numbers/Stats - Clear and bold */
font-family: 'Orbitron', 'Share Tech Mono', monospace;
```

### Visual Elements

1. **Borders**: Double-line or rounded with glow effects
2. **Backgrounds**: Subtle gradients, star-fields, or texture overlays
3. **Icons**: 16x16 or 24x24 pixel-art style
4. **Shadows**: Colored glows (blue, purple, gold) not black shadows
5. **Tables**: Alternating row colors, visible gridlines
6. **Buttons**: Beveled/embossed "3D" look or gradient buttons

---

## Architecture

### Folder Structure

```
web/
├── public/
│   ├── favicon.ico
│   ├── fonts/           # Custom retro fonts
│   └── icons/           # Pixel art icons
├── src/
│   ├── api/
│   │   └── client.ts    # Port from CLI (identical)
│   ├── types/
│   │   └── index.ts     # Port from CLI api/client.ts types
│   ├── hooks/
│   │   ├── useGame.ts   # Adapt from CLI hook
│   │   ├── useAuth.ts   # Session management
│   │   └── useLocalStorage.ts
│   ├── stores/
│   │   └── gameStore.ts # Zustand store (alternative to hooks)
│   ├── utils/
│   │   ├── format.ts    # formatNumber, formatDate, etc.
│   │   └── calculations.ts  # Building costs, tech bonuses
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── Footer.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── MobileNav.tsx
│   │   ├── game/
│   │   │   ├── EmpireStatus.tsx
│   │   │   ├── ResourceBar.tsx
│   │   │   ├── ActionGrid.tsx
│   │   │   ├── ActionResult.tsx
│   │   │   ├── TurnSlider.tsx
│   │   │   ├── BuildingPanel.tsx
│   │   │   ├── MarketPanel.tsx
│   │   │   ├── BankPanel.tsx
│   │   │   ├── SpellList.tsx
│   │   │   ├── EnemyList.tsx
│   │   │   ├── IntelCard.tsx
│   │   │   ├── DraftCarousel.tsx
│   │   │   ├── AdvisorCard.tsx
│   │   │   ├── NewsLog.tsx
│   │   │   └── StandingsTable.tsx
│   │   └── ui/
│   │       ├── Panel.tsx        # Retro bordered container
│   │       ├── RetroButton.tsx  # 3D beveled button
│   │       ├── StatTable.tsx    # Early 2000s table styling
│   │       ├── ProgressBar.tsx
│   │       ├── Badge.tsx
│   │       ├── Modal.tsx
│   │       └── Tooltip.tsx
│   ├── pages/
│   │   ├── TitlePage.tsx
│   │   ├── GamePage.tsx
│   │   ├── LeaderboardPage.tsx
│   │   └── GuidePage.tsx
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css        # Tailwind + custom retro styles
├── index.html
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

---

## Component Mapping: CLI → Web

### Layout Changes

| CLI Pattern | Web Adaptation |
|-------------|----------------|
| Terminal full screen | Responsive viewport with mobile nav |
| Box borders (ASCII) | CSS borders with retro styling |
| Text colors (ANSI) | CSS color classes |
| Column layout (flexbox) | CSS Grid + Flexbox |
| Keyboard navigation | Touch + Click + Keyboard shortcuts |

### Component Adaptations

| CLI Component | Web Component | Key Changes |
|---------------|---------------|-------------|
| `EmpireStatus` | `EmpireStatus` + `ResourceBar` | Split into modular pieces, collapsible on mobile |
| `ActionMenu` | `ActionGrid` | 2-column grid → responsive grid, touch targets |
| `TurnsInput` | `TurnSlider` | Keyboard input → slider + increment buttons |
| `BuildingSelector` | `BuildingPanel` | Tab interface → accordion or modal |
| `MarketView` | `MarketPanel` | Same logic, touch-friendly inputs |
| `BankView` | `BankPanel` | Same logic, larger touch targets |
| `DraftPicker` | `DraftCarousel` | Horizontal scroll → swipeable cards |
| `BotList` | `EnemyList` | List → cards with expandable intel |
| `SpellSelector` | `SpellList` | Same, with touch-friendly selection |
| `NewsDisplay` | `NewsLog` | Scrollable feed with card styling |
| `GameSummary` | End-game modal/page | Full-screen overlay with stats |
| `LeaderboardView` | `LeaderboardPage` | Dedicated page with filters |
| `GuideScreen` | `GuidePage` | Dedicated page, collapsible sections |

---

## Mobile-First Breakpoints

```css
/* Mobile first - base styles */
/* sm: 640px - Large phones */
/* md: 768px - Tablets */
/* lg: 1024px - Laptops */
/* xl: 1280px - Desktops */
```

### Mobile Layout Strategy

1. **Header**: Fixed top bar with empire name, round, turns
2. **Main Content**: Scrollable game area
3. **Bottom Nav**: Fixed action bar with primary actions
4. **Modals/Panels**: Full-screen overlays on mobile, side panels on desktop

---

## Phase 1: Foundation (Infrastructure)

### 1.1 Project Setup
- [ ] Initialize Vite + React + TypeScript project
- [ ] Configure Tailwind CSS with custom theme
- [ ] Set up ESLint + Prettier matching CLI config
- [ ] Add custom fonts (Google Fonts + local fallbacks)
- [ ] Create base CSS with retro color variables

### 1.2 Shared Code
- [ ] Port types from `cli/src/api/client.ts` → `web/src/types/`
- [ ] Port `PromisanceClient` class → `web/src/api/client.ts`
- [ ] Create utility functions (`formatNumber`, `formatDate`, etc.)
- [ ] Implement calculation helpers (building cost, tech bonus, etc.)

### 1.3 Core UI Components
- [ ] `Panel` - Bordered container with retro styling
- [ ] `RetroButton` - 3D beveled button variants
- [ ] `StatTable` - Alternating row table
- [ ] `Badge` - Rarity/status indicator
- [ ] `ProgressBar` - Resource/health bars
- [ ] `Modal` - Full-screen mobile, centered desktop
- [ ] `Tooltip` - Long-press mobile, hover desktop

---

## Phase 2: Authentication & Navigation

### 2.1 Routing
- [ ] Set up React Router with routes:
  - `/` - Title/login
  - `/game` - Active game
  - `/leaderboard` - Rankings
  - `/guide` - Help/documentation

### 2.2 Auth Flow
- [ ] `useAuth` hook for session management
- [ ] localStorage persistence
- [ ] Login form (display name input)
- [ ] Session restoration on load

### 2.3 Navigation Components
- [ ] `Header` with empire status (when in game)
- [ ] `MobileNav` bottom navigation bar
- [ ] `Sidebar` for desktop (optional)

---

## Phase 3: Title Screen & Game Setup

### 3.1 Title Page
- [ ] Retro logo/title treatment
- [ ] Menu buttons (New Game, Continue, Leaderboard)
- [ ] Login modal/form
- [ ] Active game check and restore

### 3.2 Game Creation Flow
- [ ] Empire name input
- [ ] Race selection grid (with stat preview)
- [ ] Confirm and start game

### 3.3 Leaderboard Page
- [ ] Timeframe filter (All/Weekly/Daily)
- [ ] Race filter (optional)
- [ ] Paginated table with rankings

---

## Phase 4: Core Game Loop

### 4.1 Game State Management
- [ ] `useGame` hook adaptation (or Zustand store)
- [ ] Real-time state sync with API
- [ ] Loading and error states
- [ ] Phase tracking (player/shop/bot/complete)

### 4.2 Empire Status Display
- [ ] `EmpireStatus` component (collapsible on mobile)
- [ ] `ResourceBar` for gold/food/runes
- [ ] Round and turn indicator
- [ ] Active effects display (shield, gate, etc.)

### 4.3 Action System
- [ ] `ActionGrid` with all turn actions
- [ ] Responsive layout (2 cols mobile, 4 cols desktop)
- [ ] Disabled states based on available turns
- [ ] Keyboard shortcut hints

---

## Phase 5: Turn Actions

### 5.1 Simple Actions
- [ ] Explore with turn count selection
- [ ] Farm with turn count selection
- [ ] Cash with tax rate input
- [ ] Meditate with turn count selection
- [ ] Industry with allocation UI

### 5.2 Building System
- [ ] `BuildingPanel` with build/demolish toggle
- [ ] Building cost calculations
- [ ] Free land tracking
- [ ] Clear and max buttons

### 5.3 Action Results
- [ ] `ActionResult` modal/panel
- [ ] Breakdown of income/expenses/production
- [ ] Combat results display
- [ ] Spell results display

---

## Phase 6: Combat & Spells

### 6.1 Enemy List
- [ ] `EnemyList` with bot cards
- [ ] Era indicator and compatibility check
- [ ] Intel display (if available)
- [ ] Target selection

### 6.2 Attack Flow
- [ ] Attack type selection (Standard, Infantry, etc.)
- [ ] Combat preview (win chance estimate)
- [ ] Combat result display

### 6.3 Spell System
- [ ] `SpellList` with self and offensive spells
- [ ] Rune cost display
- [ ] Cooldown indicators
- [ ] Target selection for offensive spells
- [ ] Spell result display

---

## Phase 7: Economy

### 7.1 Market
- [ ] `MarketPanel` with buy/sell tabs
- [ ] Food trading
- [ ] Troop trading (with stock limits in shop)
- [ ] Rune trading
- [ ] Price display and transaction preview

### 7.2 Bank
- [ ] `BankPanel` with four operations
- [ ] Deposit/withdraw from savings
- [ ] Take/pay loan
- [ ] Interest rate display
- [ ] Max loan calculation

---

## Phase 8: Shop Phase

### 8.1 Draft System
- [ ] `DraftCarousel` with swipeable cards
- [ ] Card styling by type (advisor/tech/edict/policy)
- [ ] Rarity colors and effects
- [ ] Mastery level progression display

### 8.2 Draft Actions
- [ ] Selection and confirmation
- [ ] Reroll with cost display
- [ ] Skip option
- [ ] Extra picks indicator

### 8.3 Advisor Management
- [ ] Current advisors list
- [ ] Dismiss functionality
- [ ] Capacity indicator

---

## Phase 9: Bot Phase

### 9.1 Bot Phase Execution
- [ ] Trigger button/modal
- [ ] Loading state with progress
- [ ] News feed display

### 9.2 News & Standings
- [ ] `NewsLog` with event cards
- [ ] Attack/spell notifications
- [ ] Elimination alerts
- [ ] `StandingsTable` with rank changes

### 9.3 Round Transition
- [ ] Round summary
- [ ] Continue button
- [ ] Defeat/victory detection

---

## Phase 10: Game Completion

### 10.1 Game Over States
- [ ] Victory screen (survived 10 rounds)
- [ ] Defeat screen (with reason)
- [ ] Game summary statistics

### 10.2 End Game Actions
- [ ] View final stats
- [ ] Share result (optional)
- [ ] Return to title screen
- [ ] Start new game

---

## Phase 11: Polish & Enhancement

### 11.1 Visual Polish
- [ ] Add pixel art icons for resources/units
- [ ] Implement subtle animations (resource changes, etc.)
- [ ] Add sound effects (optional, togglable)
- [ ] Loading skeletons and states

### 11.2 Accessibility
- [ ] ARIA labels for screen readers
- [ ] Keyboard navigation support
- [ ] High contrast mode option
- [ ] Touch target sizing (48px minimum)

### 11.3 Performance
- [ ] Component memoization
- [ ] Lazy loading for pages
- [ ] API request caching
- [ ] Service worker for offline status

### 11.4 Testing
- [ ] Unit tests for utilities
- [ ] Component tests with React Testing Library
- [ ] E2E tests with Playwright

---

## Reusable Logic from CLI

### Direct Ports (Copy As-Is)
```
cli/src/api/client.ts (types + PromisanceClient class)
```

### Logic to Extract and Adapt

**Format Functions:**
```typescript
// From multiple CLI components
formatNumber(n: number): string  // M/K abbreviation
formatDate(timestamp: number): string
formatNetworth(n: number): string
formatChange(n: number): string  // +/- prefix
```

**Calculation Functions:**
```typescript
// From GameScreen.tsx
getTechBonus(empire, action): number
estimateLandGain(empire): number
getActionLabel(empire, action): string

// From BuildingSelector.tsx
getBuildingCost(land: number): number  // 1500 + land * 0.05
getDemolishRefund(cost: number): number  // cost * 0.3

// From MarketView.tsx
getMaxBuyable(gold, price): number
getMaxSellable(amount, limit): number
```

**Validation Functions:**
```typescript
// From BotList.tsx, SpellSelector.tsx
canAttackBot(playerEra, botEra, hasGate): boolean
canCastSpell(spell, runes, wizards, cooldowns): boolean
```

**Constants:**
```typescript
// From GameScreen.tsx
TECH_BONUS: Record<string, number>

// From DraftPicker.tsx
RARITY_COLORS, TYPE_ICONS, ROMAN_NUMERALS
```

---

## UI/UX Differences: CLI vs Web

| Aspect | CLI | Web |
|--------|-----|-----|
| **Input** | Keyboard-only | Touch + Click + Keyboard |
| **Navigation** | View modes, Escape key | Routes, back button |
| **Feedback** | Immediate text updates | Visual transitions, toasts |
| **Layout** | Fixed terminal size | Responsive, scrollable |
| **Density** | Very dense | Slightly less dense on mobile |
| **Selection** | Arrow keys + Enter | Tap/click |
| **Numbers** | Type digits or use +/- | Slider + buttons + input |

---

## Mobile-Specific Considerations

1. **Fat Finger Problem**: Minimum 48px touch targets
2. **Reachability**: Important actions in bottom half of screen
3. **Gestures**: Swipe for navigation, long-press for details
4. **Viewport**: Avoid horizontal scroll at all costs
5. **Forms**: Use appropriate input types (number, etc.)
6. **Feedback**: Haptic feedback where supported
7. **Orientation**: Support portrait and landscape

---

## Sample Component: RetroButton

```tsx
// Example of the early 2000s aesthetic
interface RetroButtonProps {
  variant: 'primary' | 'secondary' | 'danger';
  size: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

export function RetroButton({ variant, size, disabled, onClick, children }: RetroButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        // Base styles
        'font-bold uppercase tracking-wider',
        'border-2 transition-all duration-150',
        // 3D effect with shadows
        'shadow-[inset_-2px_-2px_0_rgba(0,0,0,0.3),inset_2px_2px_0_rgba(255,255,255,0.2)]',
        // Active state (pressed)
        'active:shadow-[inset_2px_2px_0_rgba(0,0,0,0.3),inset_-2px_-2px_0_rgba(255,255,255,0.1)]',
        'active:translate-y-[1px]',
        // Size variants
        size === 'sm' && 'px-3 py-1 text-xs',
        size === 'md' && 'px-4 py-2 text-sm',
        size === 'lg' && 'px-6 py-3 text-base',
        // Color variants
        variant === 'primary' && 'bg-gradient-to-b from-blue-500 to-blue-700 border-blue-400 text-white',
        variant === 'secondary' && 'bg-gradient-to-b from-gray-600 to-gray-800 border-gray-500 text-gray-100',
        variant === 'danger' && 'bg-gradient-to-b from-red-500 to-red-700 border-red-400 text-white',
        // Disabled
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      {children}
    </button>
  );
}
```

---

## Sample Component: Panel

```tsx
// Retro container with double borders
interface PanelProps {
  title?: string;
  variant?: 'default' | 'gold' | 'danger';
  children: React.ReactNode;
}

export function Panel({ title, variant = 'default', children }: PanelProps) {
  return (
    <div
      className={clsx(
        'bg-[#1a1a2e] rounded',
        'border-2',
        variant === 'default' && 'border-[#0f3460]',
        variant === 'gold' && 'border-yellow-500/50',
        variant === 'danger' && 'border-red-500/50',
        // Inner glow effect
        'shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]'
      )}
    >
      {title && (
        <div
          className={clsx(
            'px-3 py-2 border-b-2 font-bold uppercase tracking-wider text-sm',
            variant === 'default' && 'border-[#0f3460] text-cyan-400',
            variant === 'gold' && 'border-yellow-500/50 text-yellow-400',
            variant === 'danger' && 'border-red-500/50 text-red-400'
          )}
        >
          {title}
        </div>
      )}
      <div className="p-3">{children}</div>
    </div>
  );
}
```

---

## Development Order Recommendation

1. **Weeks 1-2**: Phase 1 (Foundation) + Phase 2 (Auth/Nav)
2. **Weeks 3-4**: Phase 3 (Title) + Phase 4 (Core Game)
3. **Weeks 5-6**: Phase 5 (Turn Actions)
4. **Weeks 7-8**: Phase 6 (Combat/Spells) + Phase 7 (Economy)
5. **Weeks 9-10**: Phase 8 (Shop) + Phase 9 (Bot Phase)
6. **Weeks 11-12**: Phase 10 (Completion) + Phase 11 (Polish)

---

## Success Criteria

- [ ] Full feature parity with CLI
- [ ] Works on mobile (iPhone SE and larger)
- [ ] Works on desktop browsers
- [ ] Loads in under 3 seconds
- [ ] Nostalgic early 2000s feel achieved
- [ ] Accessible (WCAG 2.1 Level A minimum)
- [ ] TypeScript strict mode passes
- [ ] Core game loop tests pass

---

## Reference Links

- [Original Promisance Games](http://promisance.org/)
- [Ogame UI Reference](https://ogame.org/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Vite + React Setup](https://vitejs.dev/guide/)

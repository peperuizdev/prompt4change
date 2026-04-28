---
name: SeaCool System
colors:
  surface: '#f8f9fa'
  surface-dim: '#d9dadb'
  surface-bright: '#f8f9fa'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f3f4f5'
  surface-container: '#edeeef'
  surface-container-high: '#e7e8e9'
  surface-container-highest: '#e1e3e4'
  on-surface: '#191c1d'
  on-surface-variant: '#43474f'
  inverse-surface: '#2e3132'
  inverse-on-surface: '#f0f1f2'
  outline: '#737780'
  outline-variant: '#c3c6d1'
  surface-tint: '#3a5f94'
  primary: '#001e40'
  on-primary: '#ffffff'
  primary-container: '#003366'
  on-primary-container: '#799dd6'
  inverse-primary: '#a7c8ff'
  secondary: '#006d37'
  on-secondary: '#ffffff'
  secondary-container: '#6bfe9c'
  on-secondary-container: '#00743a'
  tertiary: '#2e1900'
  on-tertiary: '#ffffff'
  tertiary-container: '#4b2c00'
  on-tertiary-container: '#d98a00'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d5e3ff'
  primary-fixed-dim: '#a7c8ff'
  on-primary-fixed: '#001b3c'
  on-primary-fixed-variant: '#1f477b'
  secondary-fixed: '#6bfe9c'
  secondary-fixed-dim: '#4ae183'
  on-secondary-fixed: '#00210c'
  on-secondary-fixed-variant: '#005228'
  tertiary-fixed: '#ffddb9'
  tertiary-fixed-dim: '#ffb961'
  on-tertiary-fixed: '#2b1700'
  on-tertiary-fixed-variant: '#663e00'
  background: '#f8f9fa'
  on-background: '#191c1d'
  surface-variant: '#e1e3e4'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-caps:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.05em
  data-mono:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: -0.01em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 40px
  container-max: 1440px
  gutter: 24px
---

## Brand & Style

This design system is built to bridge the gap between industrial efficiency and ecological stewardship. The brand personality is **Technical, Authoritative, and Vital**. It targets engineers, sustainability officers, and operational managers who require high-density data presented with absolute clarity.

The visual style follows a **Modern Corporate** aesthetic with **Minimalist** influences. It utilizes a "Command Center" philosophy—where information is prioritized through clear visual hierarchies—without the intimidating complexity of traditional industrial software. By using expansive whitespace and a structured grid, the UI evokes an emotional response of organized control and environmental optimism.

## Colors

The palette is rooted in the natural world but executed with technical precision. 

*   **Deep Ocean Blue (#003366):** The foundational primary color, used for navigation, primary actions, and structural elements to convey stability and depth.
*   **Vibrant Agricultural Green (#2ECC71):** The secondary color, signifying growth, sustainability, and "active/optimal" statuses in data visualizations.
*   **Warm Orange (#F39C12):** A strategic accent color representing residual heat and energy conversion. It is used sparingly for highlights, warnings, or secondary data points to provide warmth against the cooler primary tones.
*   **Neutral Foundation:** A light gray (#F8F9FA) and pure white background keep the interface professional and ensure that data-heavy cards remain legible and distinct.

## Typography

The typography in this design system utilizes **Inter** exclusively to maintain a systematic and utilitarian feel. 

Headlines are set with tight letter-spacing and heavy weights to create a sense of importance and "tech-first" branding. Body text prioritizes readability with generous line heights. A specific "label-caps" style is used for metadata and category headers to provide a structural rhythm within complex dashboards. For numerical data and status readouts, a medium-weight Inter is used to mimic the clarity of technical displays while remaining highly legible.

## Layout & Spacing

This design system employs a **Fluid Grid** model based on a 12-column system. 

The spacing rhythm is built on a 4px baseline, ensuring all elements align to a technical grid. High-level dashboard layouts use 24px gutters to allow data cards sufficient breathing room, preventing the "command center" from feeling claustrophobic. Margins are generous (minimum 40px on desktop) to center the user's focus on the primary metrics and visualizations.

## Elevation & Depth

Visual hierarchy is achieved through **Tonal Layers** and **Ambient Shadows**. 

Instead of heavy shadows, the system uses "Soft Depth":
*   **Level 0 (Background):** Solid white or very light gray.
*   **Level 1 (Cards):** Subtly raised with a 1px border (#E9ECEF) and a very diffused, low-opacity shadow (4% opacity) to create separation without clutter.
*   **Level 2 (Interaction):** Hover states and active modals use a slightly more pronounced shadow and a subtle color tint from the primary blue to signify interactivity.
*   **Glassmorphism:** Reserved strictly for sidebars or floating overlays to maintain the "technical" feel while showing the content hierarchy underneath.

## Shapes

The shape language focuses on "Engineered Softness." 

Standard elements use a **0.5rem (8px)** corner radius to feel approachable and modern. Larger containers, such as data cards or feature panels, utilize **1rem (16px)** to emphasize their role as distinct modules of information. This prevents the "command center" from appearing sharp or hostile, reinforcing the brand's commitment to sustainable and human-centric technology.

## Components

### Buttons
Primary buttons are solid Deep Ocean Blue with white text. Secondary buttons use a ghost style with a 1px Blue border. Success actions utilize the Vibrant Green. All buttons have 8px rounded corners and a slight transition on hover.

### Cards
Cards are the core of the UI. They feature a white background, 16px rounded corners, and a subtle 1px border. Header areas within cards should have a clear distinction using the "label-caps" typography style and a 16px bottom margin.

### Data Visualizations
Charts should use the primary blue for baseline data, green for "saved energy" or "optimal output," and orange for "waste heat" or "alerts." Lines should be thin (2px) and elegant, avoiding heavy fills.

### Input Fields
Inputs are clean with a light gray background and an 8px radius. On focus, the border transitions to the primary blue with a soft glow effect.

### Chips & Tags
Used for status monitoring (e.g., "Active", "Cooling", "Recovery"). They use a low-opacity background of the status color (green, orange, or blue) with high-contrast text of the same hue for maximum visibility.

### Additional Components
*   **Metric Tickers:** Large-format numerical displays for real-time monitoring.
*   **System Map:** Linear icon-based diagrams showing the flow of thermal energy and ocean cooling.
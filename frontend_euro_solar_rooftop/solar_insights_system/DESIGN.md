---
name: Solar Insights System
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#4d4732'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#7e775f'
  outline-variant: '#d0c6ab'
  surface-tint: '#705d00'
  primary: '#705d00'
  on-primary: '#ffffff'
  primary-container: '#ffd700'
  on-primary-container: '#705e00'
  inverse-primary: '#e9c400'
  secondary: '#006e1c'
  on-secondary: '#ffffff'
  secondary-container: '#91f78e'
  on-secondary-container: '#00731e'
  tertiary: '#545f73'
  on-tertiary: '#ffffff'
  tertiary-container: '#cfdaf2'
  on-tertiary-container: '#545f74'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffe16d'
  primary-fixed-dim: '#e9c400'
  on-primary-fixed: '#221b00'
  on-primary-fixed-variant: '#544600'
  secondary-fixed: '#94f990'
  secondary-fixed-dim: '#78dc77'
  on-secondary-fixed: '#002204'
  on-secondary-fixed-variant: '#005313'
  tertiary-fixed: '#d8e3fb'
  tertiary-fixed-dim: '#bcc7de'
  on-tertiary-fixed: '#111c2d'
  on-tertiary-fixed-variant: '#3c475a'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  headline-xl:
    fontFamily: Montserrat
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Montserrat
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Montserrat
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
  headline-md:
    fontFamily: Montserrat
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
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
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  container-max: 1280px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 40px
---

## Brand & Style

The design system is engineered for a high-performance solar potential assessment platform. It balances the technical precision of a data-driven SaaS product with the optimistic energy of renewable technology. The brand personality is **trustworthy, innovative, and eco-friendly**, ensuring users feel confident in complex environmental calculations.

The visual style follows a **Modern Corporate/SaaS** aesthetic. It prioritizes clarity through ample whitespace, crisp geometry, and interactive data visualizations. By mixing a professional slate palette with vibrant energy-inspired accents, the design system creates an environment that feels both scientifically rigorous and environmentally conscious.

## Colors

The color palette is strategically divided between data clarity and brand expression:

- **Primary (Solar Yellow):** Used sparingly for high-value actions, active states in energy charts, and highlighting solar potential. It represents energy and optimism.
- **Secondary (Sustainable Green):** Reserved for environmental impact metrics, CO2 savings, and "success" states.
- **Tertiary (Slate Blue):** The foundation for typography and structural depth. It provides the "professional" weight required for a financial or technical assessment tool.
- **Neutral/Background:** A clean, cool-toned grey-white ensures that colorful data visualizations remain the focal point without visual noise.

## Typography

This design system utilizes a dual-font approach to maximize both impact and readability. 

**Montserrat** is used for headlines to provide a bold, geometric, and modern feel that resonates with innovation. **Inter** is used for all body text, data points, and interface labels due to its exceptional legibility at small sizes and its neutral, systematic character.

For data-heavy views, use `label-sm` with upper-case styling to denote categories or metadata. Use `headline-xl` exclusively for landing pages or high-level summary hero sections.

## Layout & Spacing

The system employs a **Fluid Grid** model based on a 12-column structure for desktop and a 4-column structure for mobile. 

- **Modular Spacing:** All spacing follows an 8px rhythmic scale.
- **Desktop:** A maximum container width of 1280px prevents line lengths from becoming unreadable on ultra-wide monitors.
- **Card-Based Layout:** Data is organized into "widgets" or cards. Use `24px` (3 units) for gutters between cards to maintain a breathable, modern SaaS feel.
- **Vertical Rhythm:** Use larger gaps (48px - 64px) between distinct sections of the assessment (e.g., between the map view and the financial breakdown).

## Elevation & Depth

Visual hierarchy is established using **Tonal Layers** combined with **Ambient Shadows**. 

1. **Floor (Level 0):** The background (#F8FAFC) serves as the canvas.
2. **Cards/Containers (Level 1):** White surfaces with a subtle, highly diffused shadow (Y: 2px, Blur: 8px, Opacity: 4% of Tertiary Blue). These house the primary content.
3. **Overlays/Search (Level 2):** Interaction elements like the prominent address search bar or tooltips use a more pronounced shadow (Y: 4px, Blur: 16px, Opacity: 8%) to appear "lifted" and ready for input.

Avoid heavy borders; instead, use 1px strokes in a light-grey version of the neutral palette to define card boundaries only when sitting on non-white backgrounds.

## Shapes

The shape language is consistently **Rounded**, reinforcing the "friendly and approachable" brand pillar. 

- **Standard Components:** Buttons, inputs, and cards use a 0.5rem (8px) radius.
- **Large Components:** Hero images or featured data blocks use a 1rem (16px) radius.
- **Interactive States:** Maintain consistent radii even during hover or active states to preserve the geometric integrity of the UI.

## Components

- **Prominent Search Bar:** The central entry point. Should be oversized with a 1rem corner radius, featuring a clear search icon and a high-contrast action button ("Find My Roof").
- **Primary Buttons:** Solid Solar Yellow with Slate Blue text for maximum contrast. Use a bold weight for the label.
- **Secondary Buttons:** Ghost style with a Slate Blue 1px border or a light Slate background.
- **Data Cards:** Content-rich containers with a white background and Level 1 elevation. Titles should be `headline-md` in Slate Blue.
- **Energy Gauges:** Interactive radial or linear progress bars using Sustainable Green to indicate efficiency or savings percentage.
- **Chips/Status:** Small pills with 1rem radius used for "High Potential" (Yellow) or "Eco-Friendly" (Green) tags.
- **Input Fields:** Clean, minimal fields with a focus state that uses a 2px Solar Yellow bottom border or glow to signal activity.
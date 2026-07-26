---
version: alpha
name: BlogKub
description: Design system for blogkub.com, the marketing site and docs around a no-code Blogger theme builder.
colors:
  primary: "#6366f1"
  primary-strong: "#4f46e5"
  secondary: "#8b5cf6"
  tertiary: "#ec4899"
  accent: "#22d3ee"
  accent-ink: "#0e7490"
  background: "#f7f8fc"
  surface: "#ffffff"
  surface-2: "#f2f3fa"
  border: "#e6e8f2"
  border-strong: "#d6d9e8"
  ink: "#0e0f1a"
  ink-2: "#4a4d63"
  ink-3: "#8b8fa6"
  on-primary: "#ffffff"
  background-dark: "#07070d"
  surface-dark: "#0d0d16"
  border-dark: "#2a2a38"
  ink-dark: "#f4f5fb"
  ink-2-dark: "#a6a8bd"
  ink-3-dark: "#6e7088"
  success: "#0f766e"
  warning: "#b45309"
  danger: "#be123c"
typography:
  display:
    fontFamily: Space Grotesk
    fontSize: 72px
    fontWeight: 700
    lineHeight: 1.06
    letterSpacing: -0.035em
  h1:
    fontFamily: Space Grotesk
    fontSize: 40px
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: -0.02em
  h2:
    fontFamily: Space Grotesk
    fontSize: 28px
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: -0.02em
  h3:
    fontFamily: Space Grotesk
    fontSize: 21px
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: -0.01em
  body-lg:
    fontFamily: IBM Plex Sans Thai
    fontSize: 18px
    fontWeight: 400
    lineHeight: 1.65
  body:
    fontFamily: IBM Plex Sans Thai
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.6
  body-sm:
    fontFamily: IBM Plex Sans Thai
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.6
  button:
    fontFamily: Space Grotesk
    fontSize: 15px
    fontWeight: 600
    lineHeight: 1.2
  label:
    fontFamily: Space Grotesk
    fontSize: 13px
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: 0.01em
  caption:
    fontFamily: IBM Plex Sans Thai
    fontSize: 12px
    fontWeight: 500
    lineHeight: 1.5
  code:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.7
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  2xl: 40px
  3xl: 64px
  4xl: 96px
rounded:
  sm: 6px
  md: 9px
  lg: 12px
  xl: 16px
  2xl: 18px
  full: 999px
components:
  button-primary:
    backgroundColor: "{colors.primary-strong}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.lg}"
    typography: "{typography.button}"
    padding: "{spacing.md}"
  button-ghost:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    typography: "{typography.button}"
    padding: "{spacing.md}"
  divider:
    backgroundColor: "{colors.border}"
    height: 1px
  divider-strong:
    backgroundColor: "{colors.border-strong}"
    height: 1px
  divider-dark:
    backgroundColor: "{colors.border-dark}"
    height: 1px
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.xl}"
    padding: "{spacing.xl}"
  card-muted:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.lg}"
    padding: "{spacing.lg}"
  page:
    backgroundColor: "{colors.background}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
  page-dark:
    backgroundColor: "{colors.background-dark}"
    textColor: "{colors.ink-dark}"
    typography: "{typography.body}"
  card-dark:
    backgroundColor: "{colors.surface-dark}"
    textColor: "{colors.ink-2-dark}"
    rounded: "{rounded.xl}"
    padding: "{spacing.xl}"
  caption-text:
    backgroundColor: "{colors.background}"
    textColor: "{colors.ink-3}"
    typography: "{typography.caption}"
  caption-text-dark:
    backgroundColor: "{colors.background-dark}"
    textColor: "{colors.ink-3-dark}"
    typography: "{typography.caption}"
  badge:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.primary-strong}"
    rounded: "{rounded.full}"
    typography: "{typography.label}"
  badge-accent:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.accent-ink}"
    rounded: "{rounded.full}"
    typography: "{typography.label}"
  heading-hero:
    backgroundColor: "{colors.background}"
    textColor: "{colors.ink}"
    typography: "{typography.display}"
  heading-section:
    backgroundColor: "{colors.background}"
    textColor: "{colors.ink}"
    typography: "{typography.h2}"
  logo-mark:
    backgroundColor: "{colors.primary}"
    rounded: "{rounded.md}"
    size: 34px
  glow-orb-secondary:
    backgroundColor: "{colors.secondary}"
    size: 460px
  glow-orb-tertiary:
    backgroundColor: "{colors.tertiary}"
    size: 420px
  glow-orb-accent:
    backgroundColor: "{colors.accent}"
    size: 420px
  callout-success:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.success}"
    rounded: "{rounded.lg}"
    typography: "{typography.body-sm}"
  callout-warning:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.warning}"
    rounded: "{rounded.lg}"
    typography: "{typography.body-sm}"
  callout-danger:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.danger}"
    rounded: "{rounded.lg}"
    typography: "{typography.body-sm}"
  code-block:
    backgroundColor: "{colors.surface-dark}"
    textColor: "{colors.ink-dark}"
    rounded: "{rounded.lg}"
    typography: "{typography.code}"
  prose:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink-2}"
    typography: "{typography.body-lg}"
---

# BlogKub Design System

## Overview

BlogKub is a free, no-code Blogger theme builder with a marketing site and a
library of guides in Thai and English. The audience is people running a blog on
Blogger who are not developers, so the interface has to look capable without
looking technical.

The mood is a bright workshop rather than a dark developer console. Layouts are
airy and centred, with generous vertical rhythm between sections and a single
clear action per screen. Colour is used sparingly: most of a page is white
surface on a very light lavender-tinted background, and the indigo-to-pink
gradient appears only on the primary action, the logo mark, and the occasional
headline word. That restraint is what keeps a page with fifteen feature cards
from feeling loud.

Motion is quiet and physical. Interactive elements lift two pixels on hover with
a soft coloured shadow, using a single shared easing curve
(`cubic-bezier(.22, 1, .36, 1)`) so everything decelerates the same way. Nothing
spins, bounces, or slides in from off-screen.

Both a light and a dark theme are first-class. The dark theme is not an
inversion: it uses near-black backgrounds with translucent white surfaces, so
depth comes from luminance rather than borders.

Thai and English share every layout. Thai text is set in IBM Plex Sans Thai and
needs more line height than Latin text of the same size, which is why body line
heights sit at 1.6 and above throughout.

## Colors

`primary` (#6366f1) is the brand indigo. It carries the logo, links, focus
rings, and the gradient's first stop. `secondary` (violet) and `tertiary` (pink)
exist almost entirely to complete that gradient; they are not general-purpose
fills.

`primary-strong` (#4f46e5) is the same hue one step darker. Use it, not
`primary`, whenever white text sits on a solid brand fill. At 15px, white on
`primary` measures 4.47:1, just under the 4.5:1 the WCAG AA minimum asks for,
while `primary-strong` reaches 6.3:1. The lighter value is still correct for
borders, icons, glows, and gradient stops, where contrast is not being carried
by the colour.

`accent` (cyan) is a highlight for illustrations and glows only. Its text
counterpart is `accent-ink`, a deep teal, because the cyan itself is far too
light to read on a white surface.

The neutral ramp is three inks deep. `ink` is body copy and headings, `ink-2` is
secondary copy and inactive navigation, and `ink-3` is metadata such as dates,
counts, and helper text. Anything below `ink-3` would stop being readable, so
there is no fourth step.

Dark theme tokens carry a `-dark` suffix and map one-to-one onto their light
counterparts, so a component only ever swaps the token set, never its structure.

`success`, `warning`, and `danger` are reserved for status. They never appear as
decoration, because a coloured callout that means nothing trains people to stop
reading callouts.

## Typography

Two families do all the work. Space Grotesk sets headings, buttons, labels, and
navigation; its slightly geometric character gives the product a made-thing feel.
IBM Plex Sans Thai sets body copy in both languages, and it is the fallback for
headings whenever a Thai glyph appears in one, since Space Grotesk has no Thai
coverage. JetBrains Mono is used only for code.

Headings are tightly tracked. `display` pulls to -0.035em and `h1` and `h2` to
-0.02em, which keeps large Latin type from looking gappy. Thai has no tracking
adjustment applied, as negative letter spacing collides with Thai combining
marks.

The `display` size is the top of a fluid range: in practice the hero clamps
between 38px and 72px, and section headings between 28px and 44px. The tokens
record the largest value in each range, and the CSS interpolates below it.

Body text never goes below 14px, and metadata never below 12px. Line height
stays at 1.6 or higher for anything running longer than a single line, which
Thai needs more than Latin does.

## Layout

Content sits in a 1200px maximum-width container with 24px of side padding,
centred. Long-form prose narrows further, to roughly 720px, because a full
1200px measure is unreadable.

The spacing scale is a soft geometric progression from 4px to 96px. Component
padding draws from `md` through `xl`; the gaps between page sections come from
`3xl` and `4xl`. Anything in between is a mistake to be corrected rather than a
new token.

Cards and feature grids use CSS grid with `auto-fit` and a minimum column width,
so the column count falls from three to two to one on its own. There is a single
breakpoint of consequence at 768px, where the header collapses into a drawer.

## Elevation & Depth

Depth is coloured, not grey. A raised element casts a shadow tinted with the
brand glow, `rgba(99, 102, 241, .25)` in light mode and a stronger
`rgba(99, 102, 241, .5)` in dark, so lifted surfaces feel lit by the brand rather
than by a lamp.

There are three levels. Flat surfaces sit on a border alone. Cards get a soft
ambient shadow. Overlays, dropdowns, and the primary button get a larger,
offset shadow that grows on hover as the element lifts.

Behind everything, three heavily blurred colour orbs drift near the edges of the
viewport to keep large empty areas from reading as blank. They are decorative,
sit at low opacity, and never carry meaning.

The sticky header has no background until the page scrolls, at which point it
gains a translucent blurred backdrop and a hairline bottom border.

## Shapes

Radii climb with element size: 6px on the smallest chips, 9px on buttons and
icon buttons, 12px on larger buttons and inputs, 16px to 18px on cards and
panels, and fully round on pills, avatars, and badges.

The rule to hold onto is that a child's radius should never exceed its parent's.
A 9px control inside a 16px card looks correct; the reverse looks broken.

Borders are one pixel and low-contrast. They separate; they do not decorate.

## Components

The primary button is the only element in the interface that may carry the full
gradient. There is at most one per screen. Its ghost counterpart handles every
secondary action, and plain text links handle the rest.

Cards are a white surface, a hairline border, a 16px radius, and 24px of
padding. Their content order is fixed: icon, then heading, then description,
then optional link. Card titles are `h3`; nothing inside a card is ever `h1`.

Badges are pill-shaped, use the label type token, and pair a tinted surface with
a dark text colour rather than the reverse, which keeps them legible at 13px.

Callouts share the card's shape and take their meaning from a coloured left
border and icon, never from a saturated background fill.

Code blocks always render on the dark surface, in both themes. A code sample
that changes colour between themes is harder to recognise at a glance than one
that stays put.

## Do's and Don'ts

**Do** reach for `primary-strong` the moment white text lands on a solid brand
fill, and keep `primary` for borders, icons, glows, and gradient stops.

**Do** let the gradient stay rare. One gradient element per screen reads as
deliberate; three read as a template.

**Do** keep the three-step ink ramp intact. If text seems to need a fourth,
lighter grey, the real problem is usually that too much is on the page.

**Do** check both themes before calling a component finished. Translucent
surfaces that look right on white frequently disappear on near-black.

**Don't** apply negative letter spacing to Thai text. It collides with vowel and
tone marks sitting above and below the baseline.

**Don't** introduce a new spacing or radius value. Every gap in the product
should trace back to a token in the scale above.

**Don't** use `accent` cyan for text on a light surface. It is a glow and an
illustration colour; `accent-ink` is its readable counterpart.

**Don't** put a status colour on anything that is not a status. Decorative
warnings teach people to ignore real ones.

## Known Contrast Gaps

Two tokens in this file record what the site ships today rather than what
passes WCAG AA, and the linter reports both as warnings on purpose. They are
listed here so the gap stays visible instead of being quietly rounded off.

| Token | Current | On | Ratio | AA-passing value |
| --- | --- | --- | --- | --- |
| `ink-3` | `#8b8fa6` | `background` | 3.01:1 | `#6c7085` |
| `ink-3-dark` | `#6e7088` | `background-dark` | 4.15:1 | `#7a7d95` |

Both carry metadata: dates, reading times, post counts, helper text under form
fields. AA asks for 4.5:1 on text of this size. Changing them is a two-line edit
in `site/src/styles/site.css`, and the replacement values above are the nearest
shades on the same hue that clear the threshold. Until that lands, treat the
warnings as expected output rather than something to suppress.

---

## Working With This File

`DESIGN.md` is the source of truth. The tooling is
[`@google/design.md`](https://github.com/google-labs-code/design.md), installed
as a dev dependency of `site/`.

```bash
npm --prefix site run design:lint     # validate, report contrast and orphaned tokens
npm --prefix site run design:tokens   # regenerate design.tokens.json (W3C DTCG)
npm --prefix site run design:spec     # print the format spec and the linting rules
```

`design.tokens.json` is generated, never hand-edited. Regenerate it in the same
commit as any token change.

The site is hand-written CSS rather than Tailwind, so the Tailwind exporters are
not wired up. If that ever changes, `design.md export --format css-tailwind`
emits a v4 `@theme` block from these same tokens.

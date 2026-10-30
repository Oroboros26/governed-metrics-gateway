# VORO UI/UX Design Reference

This document describes the current VORO web application's visual language,
navigation, interaction patterns, and typography. It is based on the frontend
implementation in `apps/web`; it is a reference to what exists today, not a
claim that every page has been fully standardized.

## Product and experience

VORO is a metadata-first intelligence product for data teams. The interface
should help users understand the health of their data platform, investigate
issues, and act on findings without requiring them to inspect warehouse rows.

The experience combines:

- **A public product site** for explaining VORO, use cases, pricing, docs, and
  company/legal information.
- **An authenticated workspace app** for audits, findings, lineage, reviews,
  cost visibility, integrations, and settings.
- **An admin area** for platform operations, separate from everyday workspace
  work.

The current visual character is restrained and technical: neutral surfaces,
compact data-dense controls, violet accents, clear status/severity colors, and
an especially expressive dark marketing site.

## Visual themes and color

### Workspace application

The authenticated app supports light and dark themes. The selected theme is
stored in local storage under `ag-theme`; when no preference has been saved,
the system color preference is used.

| Role | Light theme | Dark theme | Usage |
|---|---|---|---|
| Main background | `#ffffff` | `#0a0a0a` | Main app canvas |
| Primary text | `#0a0a0a` | `#fafafa` | Main headings and important content |
| Secondary text | `#525252` | `#a3a3a3` | Supporting copy |
| Muted text | `#737373` | `#737373` | Hints, metadata, less prominent labels |
| Faint text | `#a3a3a3` | `#525252` | Lowest-priority text |
| Sidebar | `neutral-50` | `neutral-900` | Persistent app navigation |
| Card | `#ffffff` | `neutral-900` | Content grouping |
| Borders | `neutral-200` | `neutral-800` | Dividers and control boundaries |
| Accent | Violet, centered on `#8b5cf6` | Same accent family | Active navigation and selected states |

The Tailwind accent palette runs from `accent-50` (`#f5f3ff`) through
`accent-500` (`#8b5cf6`) to `accent-950` (`#2e1065`). The app uses mostly
neutral colors; the violet accent is intended to be selective rather than a
large-area background color.

Status badges use semantic colors: emerald for success, red for errors, amber
for warnings, blue for information/low severity, and neutral gray for inactive
or unspecified states. Finding severity is distinguished as critical (red),
high (orange), medium (amber), and low (blue). Keep text labels alongside color
so meaning is not color-only.

### Public site

The landing page and public marketing pages use a dark presentation regardless
of the app's light/dark preference. The base is near-black (`#0a0a0a` /
`neutral-950`), with white and neutral-gray text, subtle borders, and violet,
indigo, blue, and green gradients for emphasis. The public navbar is a
translucent near-black bar with backdrop blur.

### Data visualizations

Lineage/graph canvases use React Flow. Controls have explicit light and dark
overrides so they remain visible against their canvas. Labels in graph nodes
are compact; use the shared canvas typography constants in
`src/lib/typography.ts` for SVG/canvas-rendered text.

## Typography

### Font families

- **UI sans:** Geist first, then Inter, followed by system sans-serif fallbacks.
  The fonts are loaded in `apps/web/index.html`.
- **Code/data monospace:** JetBrains Mono, followed by Fira Code and system
  monospace fallbacks.
- **Canvas typography note:** `src/lib/typography.ts` currently places Inter
  first in its sans stack, whereas Tailwind places Geist first. When changing
  typography, keep browser-rendered and canvas-rendered text aligned.

### Current type scale

| Purpose | Current style | Approximate size |
|---|---|---:|
| Default body | `font-sans`, global body size | 14px |
| Page title | `.type-page-title`: bold, tight tracking | 24px |
| Page subtitle | `.type-page-sub`: muted, with top spacing | 14px |
| Section / card title | `.type-section-title` / `.type-card-title`: semibold | 14px |
| Body and table cells | `.type-body` | 14px |
| Table header | `.type-table-header`: uppercase, semibold, tracked | 12px |
| Small label / hint | `.type-muted` | 12px |
| Micro-label | `.type-label-caps`: uppercase, widely tracked | 11px |
| Canvas badge | `FONT_SIZE['2xs']` | 10px |
| Base utility size | Tailwind `text-base` | 16px |
| Code | `.type-mono` | 12px |

Global headings use medium weight and `-0.02em` letter spacing unless a
component utility overrides them. Use the shared `.type-*` classes for
consistent dashboard typography rather than inventing a new scale per page.

For graph labels, `FONT_SIZE`, `FONT_WEIGHT`, `LETTER_SPACING`, and
`NODE_TYPOGRAPHY` in `src/lib/typography.ts` provide typed values for inline
SVG/React Flow styles.

## Layout and navigation

### Authenticated application shell

- A persistent left sidebar sits beside a full-height main content region.
- The sidebar animates between **216px expanded** and **52px collapsed**.
- Expanded navigation is grouped into **AI & Insights**, **Data**, **Reviews**,
  and **Cost**. Workspace **Integrations** and **Settings** appear at the
  bottom; admin users also see an **Admin** group.
- Groups can be expanded/collapsed. The collapsed sidebar retains icon-only
  links with accessible names/tooltips.
- The user menu contains the theme switch, links to settings/integrations,
  feedback, account identity, and log out.
- The main content region scrolls independently and uses a brief crossfade
  during page changes. Lazy-loaded pages show a skeleton matching the expected
  page structure.
- A maintenance notice can appear above page content.
- Some navigation entries are controlled by workspace feature flags.

The shell's navigation and page routes are defined in `src/components/Layout.tsx`
and `src/main.tsx`. The shell uses the sidebar across viewport widths; page
components should still provide responsive content layouts.

### Public site shell

The public navbar is fixed at the top, with a 56px row, centered max-width
content, desktop links, sign-in and get-started actions, and an animated
mobile menu below the medium breakpoint. Public content uses a max-width
container (typically `max-w-7xl`), followed by a multi-column footer.

### Information architecture

**Public pages:** landing, use cases, documentation, pricing, changelog,
community, privacy, and terms. Authentication-related screens include login,
OAuth callback, password reset, and email verification.

**Workspace pages:**

- **AI & insights:** dashboard, AI assistant, agent studio, findings, best
  practices.
- **Data:** model lineage, column lineage, data catalog, Power BI lineage, and
  JSON explorer.
- **Reviews:** GitHub PR reviews and GitLab MR reviews.
- **Cost:** cost optimizer, spend analytics, and budgets.
- **Workspace setup:** integrations and settings (including API keys,
  connectors, profile, and integration-specific configuration).

**Admin pages:** overview, analytics, users, usage, feedback, platform
settings, workspaces, and user activity.

## Components and surface styling

- **Buttons:** shared `.btn`, `.btn-primary`, `.btn-ghost`, and `.btn-danger`
  styles use compact padding, medium-weight text, rounded corners, hover
  feedback, focus rings, and disabled states.
- **Cards:** `.card` uses a 1px neutral border, white/neutral-900 surface,
  padding, and a rounded-xl radius.
- **Inputs:** `.input` uses a full-width neutral surface, border, placeholder
  styling, and a visible focus ring. Login variables provide separate themed
  form colors.
- **Labels and badges:** `.label` and `.badge` are compact; semantic status and
  severity variants are provided globally.
- **Skeletons:** pulse placeholders are used for loading content and route
  transitions.
- **Icons:** app navigation uses the shared sidebar icon component; the public
  mobile menu and selected interface controls use inline SVG.
- **Dialogs/overlays:** feedback appears as a compact panel over a dimmed
  backdrop. Menus and grouped navigation use short Framer Motion transitions.

Tailwind's configured `rounded-lg`, `rounded-md`, and `rounded-sm` values are
6px, 4px, and 2px respectively. Larger `rounded-xl` and `rounded-2xl` utilities
are used for cards, menus, and prominent containers.

## Interaction and motion

- Use a clear active state for the current navigation item; hover states should
  remain visually quieter than selected states.
- Controls should expose hover, focus-visible, pressed/selected, disabled,
  loading, success, and error states as applicable.
- Keep transitions short and purposeful. Existing patterns include sidebar
  width changes, menu/group expansion, page crossfades, skeleton pulses, and
  public-page fade/slide reveals.
- Marketing-only effects include gradient headline text, a subtle grid,
  floating elements, and a particle network. These effects should not compete
  with data-heavy workspace tasks.
- Public navigation prefetches linked pages on hover/focus and includes an
  animated mobile menu. Workspace navigation prefetches route chunks and
  selected data for common destinations.

## UX content and states

The main product loop is to connect or configure a data source, run or review
an audit, understand findings and their severity, then investigate supporting
metadata through lineage/review tools. Navigation labels should use familiar
data-team terminology and make the next action apparent.

When designing or updating a page, account for:

1. **Initial/loading:** skeleton or progress feedback that preserves the page
   structure and avoids unexplained blank content.
2. **Empty:** explain why there is no data and provide the relevant setup or
   first action where possible.
3. **Success/healthy:** show completion and the useful next step, not just a
   green state.
4. **Partial failure/error:** explain what failed and how to retry or recover;
   do not make an error look like an empty result.
5. **Permission/feature availability:** distinguish unavailable features from
   loading or empty states.
6. **Dense results:** support scan-friendly headings, filters, status/severity
   labels, and readable metadata/code.

The shell already includes route skeletons, a maintenance banner, feature-flag
navigation, an error boundary, and a user feedback form. Individual pages may
implement additional states.

## Responsive behavior

- The public navbar switches from desktop links to a hamburger menu below the
  `md` breakpoint. Public page sections use responsive grid/container classes.
- Workspace navigation is a fixed-width collapsible sidebar rather than a
  dedicated mobile drawer in the app shell. Keep this in mind when changing
  the shell or adding narrow-screen workflows.
- Data tables, graphs, and forms should avoid forcing horizontal page overflow;
  use local scrolling or responsive stacking where needed.
- Preserve touch-sized targets and do not rely on hover as the only way to
  discover an action.

## Accessibility and usability

- Preserve semantic landmarks, heading order, explicit form labels, and
  accessible names for icon-only controls.
- Keep keyboard focus visible. Shared buttons and sidebar links use focus-ring
  styling; menu controls expose expanded/pressed state where applicable.
- Convey status and severity with both text and color.
- Maintain readable contrast in both themes, especially for muted text,
  borders, disabled controls, and graph overlays.
- Verify menus, dialogs, theme switching, and navigation with keyboard and
  screen-reader interaction.
- Global CSS currently hides scrollbars. Ensure scrollable regions remain
  discoverable and usable with keyboard, wheel, and touch input.
- Respect reduced-motion preferences when adding or extending animation; the
  current global animation styles do not define a reduced-motion override.

## Design implementation references

- `apps/web/src/index.css` — global tokens, type utilities, controls, badges,
  motion utilities, and React Flow overrides.
- `apps/web/tailwind.config.js` — font stacks, accent palette, radii, and
  animation definitions.
- `apps/web/index.html` — font loading and initial page theme/background.
- `apps/web/src/contexts/ThemeContext.tsx` — persisted light/dark theme.
- `apps/web/src/components/Layout.tsx` — authenticated navigation and shell.
- `apps/web/src/components/public/PublicNavbar.tsx` and
  `PublicFooter.tsx` — public-site navigation/footer.
- `apps/web/src/lib/typography.ts` — shared typography for graph/canvas
  renderers.
- `apps/web/src/main.tsx` — page routes and public/protected/admin boundaries.

## Consistency checklist for future UI work

- Use existing neutral/accent/status tokens and `.type-*` utilities.
- Check both light and dark workspace themes; public pages remain dark.
- Keep page titles, subtitles, section headings, cards, and table labels on the
  shared type scale.
- Provide loading, empty, error, and success behavior.
- Make keyboard focus and icon-only control names explicit.
- Keep mobile layouts usable, especially in graph and tabular views.
- Avoid adding motion without a purpose and provide reduced-motion behavior.
- If a change alters a route or user-visible interaction, update this document
  when it changes the shared experience.

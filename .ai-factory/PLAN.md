# Implementation Plan: Landing Page for lee-to

> **Mode:** fast | **Tests:** no | **Docs:** no
> **GitHub:** [lee-to](https://github.com/lee-to) — Danil Shutsky

---

## Overview

Create a simple, modern landing page for GitHub user **Danil Shutsky** (lee-to) — Backend PHP Developer, creator of MoonShine admin panel, CutCode community leader. The page will be a standalone package in the monorepo using the existing React + Vite + TailwindCSS stack.

### Profile Data

| Field | Value |
|-------|-------|
| Name | Danil Shutsky |
| Login | lee-to |
| Avatar | `https://avatars.githubusercontent.com/u/1861327?v=4` |
| Bio | Backend PHP Developer. CutCodeFather (YouTube channel and Laravel community). Creator of MoonShine admin panel |
| Company | CutCode |
| Blog | cutcode.dev |
| Location | Earth |
| Email | thecutcode@gmail.com |
| Hireable | Yes |
| Followers | 213 |
| Public Repos | 87 |

### Top Projects (by stars)

1. **ai-factory** (420⭐) — TypeScript — AI context/workflow automation
2. **laravel-check-your-skill-test** (56⭐) — PHP — Laravel skill test
3. **hlv** (39⭐) — Rust — Specs-first LLM validation
4. **laravel-livewire-phone-auth** (18⭐) — PHP — Phone auth for Laravel
5. **laravel-admin** (14⭐) — PHP — Free Laravel Admin (Nova-style)

---

## Architecture Decision

**New package** `packages/landing/` — standalone Vite + React + TailwindCSS app on port **5174**. Keeps it isolated from the main Kanban web app while reusing the monorepo tooling.

---

## Tasks

### Task 1: Scaffold `packages/landing/` package

**Files to create:**
- `packages/landing/package.json` — name: `@aif/landing`, scripts: dev/build/preview
- `packages/landing/tsconfig.json` — extend root tsconfig
- `packages/landing/vite.config.ts` — Vite config, port 5174
- `packages/landing/index.html` — HTML entry point
- `packages/landing/src/main.tsx` — React entry
- `packages/landing/src/index.css` — TailwindCSS v4 import

**Details:**
- Mirror the `packages/web/` setup for consistency
- Add to root `package.json` workspaces (should be auto-detected by glob)
- Add `"landing:dev"` script or rely on turborepo

**Depends on:** nothing

---

### Task 2: Create the Landing Page component

**File:** `packages/landing/src/App.tsx`

**Sections (single-page, scroll-based):**

1. **Hero** — Full-width dark section
   - GitHub avatar (rounded, with ring animation)
   - Name: "Danil Shutsky"
   - Tagline: bio text
   - Company badge: "CutCode"
   - Location, hireable badge
   - Social links: GitHub, Blog (cutcode.dev), Email
   - Stats row: 213 followers · 87 repos

2. **Featured Projects** — Grid of top 5 projects
   - Card per project: name, description, stars badge, language pill
   - Links to GitHub repo
   - Hover effects

3. **Tech Stack** — Simple pill/badge layout
   - PHP, Laravel, TypeScript, Rust, Go (derived from repos)

4. **Footer** — Minimal
   - "Built with ❤️" + current year
   - GitHub link

**Design:**
- Dark theme (gray-950 background, white/gray text)
- Monospace accents for developer feel
- Smooth scroll, subtle animations (fade-in on scroll)
- Fully responsive (mobile-first)

**Depends on:** Task 1

---

### Task 3: Add styles and animations

**File:** `packages/landing/src/index.css`

**Details:**
- TailwindCSS v4 base import
- Custom CSS for:
  - Avatar ring glow animation
  - Fade-in-up animation for sections (using `@keyframes` + `animation`)
  - Smooth scroll behavior on `html`
  - Custom scrollbar styling
  - Gradient text for heading

**Depends on:** Task 1

---

### Task 4: Add to Turborepo and verify build

**Files to modify:**
- `turbo.json` — add landing dev/build tasks if needed (may auto-detect)

**Verification:**
- `npm run -w packages/landing dev` starts on port 5174
- `npm run -w packages/landing build` produces dist/
- Page renders correctly in browser

**Depends on:** Tasks 1, 2, 3

---

## Implementation Order

```
Task 1 (scaffold) → Task 2 (component) + Task 3 (styles) in parallel → Task 4 (verify)
```

## Acceptance Criteria

- [ ] Landing page renders at `http://localhost:5174`
- [ ] All 4 sections display correctly (Hero, Projects, Tech, Footer)
- [ ] Responsive on mobile (375px) and desktop (1440px)
- [ ] GitHub avatar loads from GitHub CDN
- [ ] Project cards link to actual GitHub repos
- [ ] No TypeScript errors, no console errors
- [ ] Lint passes (`npm run lint`)

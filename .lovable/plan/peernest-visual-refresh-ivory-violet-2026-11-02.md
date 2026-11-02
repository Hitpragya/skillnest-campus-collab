# PeerNest visual refresh (ivory + violet)

## GitHub sync — answer before any edits
- I cannot see which repository or branch this project syncs to. Lovable syncs exactly one branch (usually `main`, unless someone changed it in Project settings → Git). Check that page to confirm.
- A normal build turn saves its changes as a commit on the synced branch. If that branch is `main`, edits go straight to `main`, and Vercel/Render may auto-deploy them.
- I cannot create a branch named `redesign/peernest-visual-refresh` or switch the synced branch. Two safe options:
  1. **You switch the branch:** create `redesign/peernest-visual-refresh` on GitHub, then select it in Project settings → Git before approving this plan. Build turns will then commit only there.
  2. **Draft:** I build in an isolated Lovable draft and open a pull request from the draft's branch into the synced branch. Lovable names that branch, so it won't be exactly `redesign/peernest-visual-refresh`. Nothing reaches `main` until you merge the pull request.
- I make no edits until you confirm one of these options.

## Design direction
- Warm ivory background, near-black navy text, one violet accent, soft lavender surfaces and shadows, thin borders, rounded cards, lots of space.
- Large editorial headings with an occasional italic serif word (Instrument Serif, loaded with a `<link>`), Manrope for body text, JetBrains Mono for scores and code.
- Light theme only. All text/background pairs meet WCAG AA contrast.
- No new features, counters, communities, chat or invented content. The sample-preview labels stay as they are.

## Files to change (UI only)
- `src/styles.css`: tokens (colors, shadows, radius, fonts), utilities, and the lavender `bg-hero`
- `src/routes/__root.tsx`: font `<link>` only
- `src/components/peernest/AppShell.tsx`: sidebar/top nav, mobile menu, status card. Styling only.
- `src/components/peernest/primitives.tsx`: Logo, PageHeader (adds an optional italic word), Panel, badges, pills, StudentCard, EmptyState, BackendNotice
- `src/components/ui/button.tsx`, `input.tsx`, `textarea.tsx`, `select.tsx`, `badge.tsx`, `tabs.tsx`, `card.tsx` (if used): variant classes only
- Routes, layout and classNames only: `index.tsx`, `auth.tsx`, `dashboard.tsx`, `students.index.tsx`, `students.$id.tsx`, `requirements.index.tsx`, `collaborations.new.tsx`, `requests.tsx`, `architecture.tsx`
- `mem://index.md`: replace the dark-navy design rule with the new ivory/violet direction

Not touched: `server/`, `engine/`, `src/lib/api/*`, hooks, `sample-data.ts`, validation, route paths, `vite.config.ts`, `vercel.json`, `render.yaml`, packages, env files, tests.

## How I'll test it
- Run the existing frontend test (`src/test/app-routing.test.tsx`) and read the build log.
- Use a headless browser on the local preview to screenshot all routes at 1280px and 390px wide. Check for horizontal overflow, console errors and readable contrast.
- Use a `git diff --stat`-style file check to confirm only the files listed above changed.
- Limitation: the preview has no live API, so I can only check the signed-in states visually against the existing sample/unconfigured states. On your branch preview, you can sign in against the real backend.

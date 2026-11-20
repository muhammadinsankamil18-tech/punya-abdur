# Figma Directory · Cross Core Hygiene Journeys

A static site listing every Figma file for the Core Hygiene journeys, with design, delivery and brand-adoption status. It's deployed on Vercel.

**All the content is in one file: `directory.json`.** Edit it on GitHub and commit, and Vercel redeploys. Anyone with the site open sees the new data the next time they switch back to the tab, with no hard refresh needed.

> Keep this repository **private**. It contains the XLSMART design-system bundle and brand fonts.

All files sit in the repo root (no folders), so the whole project can be uploaded through the GitHub website. The build puts each file where the page needs it.

---

## Updating the data

### Option A: edit on GitHub
1. Open `directory.json` in the repo and click ✏️ (Edit).
2. Change what you need (see the reference below).
3. Click **Commit changes**. Vercel deploys in ~20 s and the site updates.

A minimal new link only needs a title, a status and a date:

```json
{ "title": "Auto Top-up", "url": "https://www.figma.com/design/…", "design": "progress", "updated": "2026-11-14" }
```

You can leave out `id`. The build creates a stable one.

### Option B: edit in the browser, then export
1. Open the site with **`?edit`** at the end: `https://your-site.vercel.app/?edit`
2. Add, edit or delete links and change statuses. Changes are saved in your browser as a draft (a yellow bar shows you have unpublished edits).
3. Click **Export**. This downloads `directory.json`.
4. On GitHub: **Add file → Upload files**, drop that `directory.json` in to replace the old one, then **Commit changes**.

The public site (no `?edit`) is read-only. `?edit` only affects your own browser, and nothing goes live until `directory.json` is committed.

### If the data has a mistake
The build checks `directory.json` first. With a typo like `"design": "redy"` or a missing comma, the deploy **fails and the previous version stays live**. The Vercel build log shows exactly where the problem is:

```
✖ Build stopped: 1 problem(s):
  • journey #1 ("Acquire & Activate") → flow #1 ("Onboarding") → link #1 ("New Prepaid Registration"):
    design "redy" is not valid. Use one of: draft, progress, review, validating, approved, ready, hold, deprecated
```

---

## Deploying to Vercel (one-time)
1. **Add New… → Project → Import** this repo.
2. Leave every setting as it is. `vercel.json` already sets the build (`npm run build` → `dist`).
3. Click **Deploy**. From then on, every commit to `main` redeploys automatically.

No environment variables or packages are needed.

---

## Data reference

`directory.json` is a list of **journeys** → **flows** (`groups`) → **links**.

```jsonc
[
  {
    "id": "A",                         // short letter for the sidebar (required, unique)
    "name": "Acquire & Activate",      // required
    "groups": [
      {
        "id": "a-onboarding",          // optional, generated if missing
        "title": "Onboarding",         // required
        "links": [
          {
            "id": "a-onboarding--new-prepaid-registration", // optional, generated if missing
            "title": "New Prepaid Registration",            // required
            "url": "https://www.figma.com/design/…",        // Figma link
            "design": "ready",                              // default "draft"
            "delivery": "released",                         // default "none"
            "updated": "2026-10-02",                        // YYYY-MM-DD or ISO date-time
            "owner": "Rina",                                // optional: Owner / PIC
            "brandTracking": true,                          // optional: show XL / AXIS / SF adoption
            "brands": {
              "xl":   { "status": "aligned", "sharedDate": "2026-10-02", "figmaUrl": "", "blueprint": "v2.3", "targetRelease": "2026-12-01" },
              "axis": { "status": "aligned" },
              "sf":   { "status": "progress" }
            },
            "related":   [ { "label": "PRD", "url": "https://…" } ],
            "changelog": [ { "at": "2026-10-02", "author": "Cross team", "note": "…" } ],
            "comments":  [ { "at": "2026-10-03T09:00:00Z", "author": "Rina", "text": "…" } ]
          }
        ]
      }
    ]
  }
]
```

| `design` | label | | `delivery` | label |
| --- | --- | --- | --- | --- |
| `draft` | Exploring / Draft | | `none` | Not started |
| `progress` | In progress | | `handed` | Handed off |
| `review` | In review | | `dev` | In development |
| `validating` | Validating | | `qa` | In QA |
| `approved` | Approved | | `release` | Ready for release |
| `ready` | Ready for dev | | `released` | Released |
| `hold` | On hold | | `iterating` | Iterating |
| `deprecated` | Deprecated | | | |

**Brand adoption status** (`brands.xl / axis / sf`): `not_shared` · `shared` · `progress` · `submitted` · `audit` · `aligned` · `outdated`

---

## Files

| File | What it is |
| --- | --- |
| `directory.json` | **The content. Edit this.** |
| `index.html` | Page layout and app logic |
| `build.mjs` / `validate-data.mjs` | Checks `directory.json`, builds `dist/` (run by Vercel) |
| `dev.mjs` | Local preview with live reload (`npm run dev`, needs Node 18+) |
| `vercel.json`, `package.json` | Build settings |
| `xlsmart-ds.js`, `xlsmart-tokens.css`, `dc-runtime.js`, `react*.js`, `*.otf` | Design system, runtime and fonts. Don't edit. |

If you add a new status value, add it in **both** `validate-data.mjs` and the `DESIGN` / `DELIVERY` / `BSTAT` lists near the top of the script in `index.html`.

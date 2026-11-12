# Tots & Timelines — Project Plan

> A mobile-first PWA where parents log and understand their newborn's daily life: feeding, sleep, diapers, growth, health and milestones.
> Status: **DRAFT for review** — nothing has been built yet.

---

## 1. Research: What can parents measure on a newborn?

Baby-tracker apps converge on the same core areas (feeding, sleep, diapers, growth) plus milestones and health extras. Pediatric sources add *why* each is worth tracking and what "normal" looks like.

### 1.1 Core trackers (MVP)

| Area | What to log | Derived stats / insights | Why parents care |
|---|---|---|---|
| **Feeding** | Breast (timer, left/right side), bottle (ml/oz, breast milk vs formula), pumping (ml, side), solids later (food, reaction) | Feeds per 24h, avg interval between feeds, avg duration, total ml/day, left/right balance, "last fed X ago", cluster-feeding detection | Newborns feed roughly every 1–3 h; ~8–12 feeds/24h is typical. Intake and frequency are the #1 worry for new parents |
| **Sleep** | Start/stop timer or manual entry, nap vs night, wake-up mood (optional) | Total sleep/24h, longest stretch, nap count, avg wake window, day/night ratio, sleep "heatmap" by hour | Newborns sleep ~14–17 h/day in short bursts; spotting day/night rhythm forming is a milestone in itself |
| **Diapers** | Wet / dirty / mixed, stool colour & consistency (picker), rash note | Wet & dirty per day, trend vs expected (≥5–6 wet/day after day 5) | Wet diapers are a practical hydration/intake signal; stool colour can flag issues for the doctor |
| **Growth** | Weight, length, head circumference, date | Percentile curves (WHO standards), z-scores, weight-gain velocity (g/day), "back to birth weight" marker | Standard at every well-baby visit; WHO charts are the global reference |

### 1.2 Secondary trackers (v1.1+)

| Area | What to log | Notes |
|---|---|---|
| **Health** | Temperature, medication & dosage (with next-dose reminder), symptoms, vaccinations, doctor visits | Export-to-PDF "doctor report" is a loved feature in competitor apps |
| **Milestones** | First smile, rolling, grasping, laughing, sitting, first solids… with date + photo | Age-banded checklist; becomes the "Timeline" in *Tots & **Timelines*** |
| **Mood & fussiness** | Mood emoji, crying episodes (duration), colic-like patterns | Correlate with feeding/sleep |
| **Activities** | Tummy time (duration), bath, walks, play, skin-to-skin | Tummy time has daily recommendations; encourages good habits |
| **Memories** | Photo + note per day, monthly "month-ago" cards | Emotional retention driver |

### 1.3 Habits & patterns worth surfacing (the "how is it going?" layer)

The user asked about eating patterns and habits. Derived, automatic insights:

- **Feeding rhythm:** average gap between feeds by time of day; longest night stretch; cluster-feeding evenings.
- **Sleep rhythm:** day vs night split; typical bedtime; wake windows by age; "best nap time" heatmap.
- **Cross-correlations:** "Longest sleeps follow feeds of > X ml", "fussy evenings follow short naps".
- **Daily rhythm ring:** 24 h circular timeline of the day (sleep / feed / diaper arcs).
- **Streaks & gentle goals:** e.g. "5 days logged in a row" (soft, never guilt-inducing).
- **Week-vs-week deltas:** "+12 min avg sleep stretch vs last week".
- **Age-aware reference bands:** show typical ranges as a soft shaded band on charts, with a clear disclaimer that these are guidance, not diagnosis.

### 1.4 Reference ranges (to seed "typical" bands)

From KidsHealth/AAP-aligned sources (sources disagree slightly, so the app shows **ranges, not hard thresholds**, and links to a pediatrician disclaimer):

- Feeds: on demand, roughly every 1–3 h; commonly cited 8–12 per 24 h.
- Wet diapers: 2–3/day in first days, ≥5–6/day after day 5.
- Sleep: ~14–17 h / 24 h (varies by age); avoid >4 h gaps between feeds until good weight gain is established.
- Growth: WHO child growth standards, birth–24 months. LMS parameter tables (weight-for-age, length-for-age, head-circumference-for-age, by sex) are available as CSV from the CDC's WHO data files. Z-score = `((X/M)^L − 1) / (L·S)`, percentile = Φ(z). We'll bundle these tables as static JSON and compute percentiles client-side.

> ⚠️ **Medical disclaimer:** the app is a logging and insight tool, not medical advice. Needs a visible footer/about-page disclaimer. Reference ranges should be reviewed before launch.

### 1.5 Research sources

- [App Store listings: Baby Tracker apps (feature survey)](https://apps.apple.com/us/app/-/id1561787685)
- [KidsHealth — Your Child's Checkup: 2 weeks](https://kidshealth.org/en/parents/checkup-2weeks.html)
- [Children's Minnesota — Newborn well-child visit](https://childrensmn.org/educationmaterials/parents/article/10596/your-childs-checkup-newborn)
- [Huckleberry — 1-week-old sleep schedule](https://huckleberrycare.com/blog/1-week-old-sleep-schedule-bedtime-and-nap-schedules)
- [CDC — WHO Growth Charts data files (LMS)](https://cdc.gov/growthcharts/who-data-files.htm)
- [WHO — Child growth standards software](https://www.who.int/tools/child-growth-standards/software)

---

## 2. Product design

### 2.1 Personas
- **Tired parent at 3 am:** one-handed, dim screen, needs to log in ≤ 2 taps.
- **Co-parent / caregiver:** shares the same baby's data (v1.1).
- **Planner parent:** wants charts and trends before the pediatrician visit.

### 2.2 Design principles
1. **Log in two taps.** Big pastel quick-action tiles, timers that survive app close.
2. **Calm, not clinical.** Soft colours, rounded shapes, friendly copy, no red alarms.
3. **Insight over data dumps.** Every chart answers a question ("Is sleep improving?").
4. **Night-friendly.** Dark "dusk" theme with muted pastels, auto by system setting.
5. **Works offline.** Logging never blocks on network.

### 2.3 Information architecture

```
Login ──► Onboarding (first time only) ──► App shell
                                            ├─ Home (today)
                                            ├─ Log (quick-add sheet / FAB)
                                            ├─ Insights (charts, patterns)
                                            ├─ Timeline (history + milestones)
                                            └─ Profile (baby, parents, settings)
```

### 2.4 Screens

**A. Login**
- Hero illustration/photo area, app name, tagline ("Every little moment, beautifully tracked").
- Single primary pill button: **Continue with Google** (Firebase Auth, popup on desktop / redirect on mobile PWA).
- Small legal links (privacy, terms) + medical disclaimer line.
- Returning users with completed onboarding skip straight to Home.

**B. Onboarding — one question per screen**
Progress indicator at top (segmented bar), back arrow, large friendly question, single input, black pill "Continue" button. Each answer saved as the user advances (resumable if they close the app).

| # | Question | Input type | Required |
|---|---|---|---|
| 1 | "Welcome! What's your name?" | Text (prefilled from Google) | ✔ |
| 2 | "What's your role?" (Mom / Dad / Parent / Guardian / Other) | Chip select | ✔ |
| 3 | "Is there a co-parent we should know about?" | Name text or "Skip" | optional |
| 4 | "What's your little one's name?" | Text | ✔ |
| 5 | "Is it a boy or a girl?" (Boy / Girl / Prefer not to say) | Big pastel cards. Needed for WHO growth curves | ✔ |
| 6 | "When was {name} born?" | Date picker (+ optional time) | ✔ |
| 7 | "Was {name} born on their due date?" | Premature / On time / Late → gestational weeks if premature (corrected age for charts) | optional |
| 8 | "What was {name}'s birth weight?" | Numeric w/ kg/g or lb/oz toggle | optional |
| 9 | "And birth length?" | Numeric cm/in | optional |
| 10 | "Head circumference at birth?" | Numeric cm/in | optional |
| 11 | "How is {name} fed?" (Breast / Bottle / Both / Solids started) | Chip select; tunes quick-actions | ✔ |
| 12 | "Pick a colour for {name}" | Pastel swatches (personalizes accent) | optional |
| 13 | "Add a photo?" | Upload / skip | optional |
| 14 | Preferences: language (EN/NL, from device), units (default from locale), reminders opt-in | Toggles | ✔ |
| 15 | Celebration screen: "Meet {name}! 🎉" → Home | — | — |

Copy personalises as soon as the baby's name is known. Optional questions have a visible, friendly "Skip for now".

**C. Home (Today)**
- Greeting card: "Hello, {parent}" + baby avatar + status chip ("Last fed 1 h 20 m ago · Napping since 11:40").
- **Quick-action tiles** (pastel 2×2, per inspiration): Sleep (blush), Feeding (butter), Growth (mint), Diaper (lavender). Tap = one-tap log or start timer. Long-press = detailed form.
- Active timer banner (feeding/sleep) pinned to top with live counter.
- "Today at a glance": donut of activity counts, feeds/sleep/diaper totals vs typical range.
- Recent activity list with swipe to edit/delete (undo toast).
- Insight of the day card (e.g. "Longest sleep stretch this week: 3 h 40 m 🎉").

**D. Log sheet (bottom sheet)**
- Opens with a masked circular reveal from the tapped tile.
- Feeding: Breast (timer + L/R) · Bottle (ml stepper, milk type) · Pump.
- Sleep: start/stop slider or manual times.
- Diaper: wet / dirty / mixed tiles + optional colour/notes.
- Growth: weight/length/head with live percentile preview.
- Time defaults to *now*, adjustable with a scrubber. Notes + photo optional.

**E. Insights ("How is it going?")**
- Segmented control: **Day · Week · Month · All**.
- Cards: Feeding (bars per day, avg interval, ml total), Sleep (stacked day/night bars, longest stretch, wake windows), Diapers (wet/dirty dots), 24 h rhythm ring, Growth percentile curves (weight / length / head) with the baby's points and WHO P3–P97 band.
- Pattern cards (insights from §1.3) with plain-language headlines.
- "Share with pediatrician" → generates a PDF/print summary (v1.1).

**F. Timeline**
- Vertical scroll of all events grouped by day, filter chips (All / Feeding / Sleep / Diaper / Health / Milestones).
- Milestone moments and photos as larger cards; "Week N" markers.
- Calendar scrubber to jump to a date.

**G. Profile / Settings**
- Baby profile (edit any onboarding answer), **Add another baby**, language (EN/NL), units, theme (light/dusk/auto), reminders, data export (JSON/CSV), sign out, delete account & data.
- **Invite co-parent** by link/QR to share a baby; manage members.

### 2.5 Visual style (based on `./inspirationandstyle`)

Observed in the two references: soft off-white/misted backgrounds, generous rounded cards (24–32 px), pastel category tiles (blush, butter, mint, periwinkle), black pill primary buttons, circular glass icon buttons, large friendly headlines, photo-led hero/onboarding, floating bottom nav, donut + horizontal bar charts, segmented Day/Week/Month/Year toggle.

**Palette (pastel tokens)**

| Token | Light | Usage |
|---|---|---|
| `--bg` | `#F6F4EE` | App background (warm cream) |
| `--surface` | `#FFFFFF` | Cards |
| `--ink` | `#17171A` | Text, primary buttons |
| `--ink-soft` | `#6B6B73` | Secondary text |
| `--blush` | `#F4D6D2` | Sleep |
| `--butter` | `#FBE9A6` | Feeding |
| `--mint` | `#CDE8E0` | Growth |
| `--lavender` | `#CFD3F8` | Diapers |
| `--peach` | `#FAD9BE` | Health |
| `--sky` | `#CFE6F4` | Milestones / info |

Each pastel has a deeper "ink" companion (for icons/chart lines) to keep contrast ≥ 4.5:1 for text. Dusk theme: deep plum-navy background, same hues at lower lightness.

**Typography:** rounded geometric sans for headings (e.g. *Plus Jakarta Sans* / *Outfit*), clean text face for body (*Inter*). Large type scale, 16 px minimum body.

**Components:** pill buttons, glass icon buttons, chip selects, pastel tiles with arrow-badge, bottom sheet, segmented control, floating tab bar, soft shadows (low-opacity, large blur).

**Shape language:** everything is rounded. Radius tokens: `--r-sm 12px`, `--r-md 20px`, `--r-lg 28px` (cards/tiles), `--r-xl 36px` (sheets), `--r-pill 999px`. No sharp corners anywhere, including chart bars and progress bars.

**Icon system:** a custom, friendly set built on one rule: 24 px grid, 2 px stroke, round caps and joins, generous corner radii, and an optional soft pastel "blob" fill offset behind the stroke (duotone look). Base from a rounded open-source set (e.g. Phosphor duotone) with custom SVGs for the baby-specific ones:
- Feeding: baby bottle, breast-feeding mother/child, pump, spoon/bowl
- Sleep: crescent moon with a sleepy face, cot, Zzz
- Diaper: diaper, droplet, tiny rubber duck for bath
- Growth: sprout / ruler / scale, head-circumference tape
- Health: thermometer, pill, shield with heart, stethoscope
- Milestones: star, balloon, little footprints, camera
- Larger 64 px illustrated versions (soft shapes, no outlines) on the quick-action tiles, animated on press (bottle tilts, moon rocks, sprout grows).

### 2.6 Motion design — fluid, mask-driven

Principle: **shapes reveal content** rather than content just fading in. Everything uses `clip-path` / SVG masks with a shared easing (`cubic-bezier(.22,1,.36,1)`) and spring physics where interactive.

| Moment | Animation |
|---|---|
| App load | Logo mask wipes open, then splits into the login hero |
| Login → Onboarding | Circular `clip-path` expanding from the Google button |
| Onboarding step change | Next screen revealed by a blob/rounded-rect mask sliding in; question text reveals line-by-line via masked slide-up; progress bar fills with liquid ease |
| Option selection | Selected pastel card "floods" its colour from tap point (radial clip) |
| Celebration | Baby's photo/avatar revealed through a growing circle mask, confetti of pastel shapes |
| Home tiles → Log sheet | Tile morphs (shared-element) into the sheet via expanding rounded mask |
| Charts | Bars/lines draw in using mask sweeps; donut arcs animate with stroke-dash; numbers count up |
| Tab switches | Cross-masked page transitions (View Transitions API where supported, fallback to Framer) |
| Timers | Running ring + gently breathing pastel blob behind the counter |
| Micro-interactions | Press-scale, haptic (`navigator.vibrate`) on log, undo toast slides through mask |
| Respect | `prefers-reduced-motion` → swap masks for simple fades |

Performance: animate only `transform`, `opacity`, `clip-path`; target 60 fps on mid-range phones.

---

## 3. Technical plan

### 3.1 Stack (proposed)

| Layer | Choice | Reason |
|---|---|---|
| Framework | **Next.js (App Router) + TypeScript** | Server components for a tiny-JS login/onboarding shell, built-in code splitting, and Route Handlers give us a real backend in the same app (R2, push, third-party APIs) |
| Routing | Next.js App Router | File-based, streaming, prefetch |
| i18n | **next-intl** (EN default, NL) | Type-safe messages, locale-aware dates/units |
| Backend | Next.js Route Handlers + `firebase-admin` | Verify Firebase ID tokens, presign R2 uploads, send push, call external APIs |
| Push | Web Push (VAPID) via `web-push` | Works on iOS 16.4+ for installed PWAs |
| Media | **Cloudflare R2** (S3 API, presigned URLs) | Replaces Firebase Storage |
| Styling | **Tailwind CSS** + CSS variables for tokens | Rapid, themeable |
| Animation | **Framer Motion** (+ CSS `clip-path`/SVG masks, View Transitions API) | Layout/shared-element transitions and springs |
| Charts | **Recharts** or **visx** (custom SVG for rhythm ring/donut) | Animatable SVG |
| State | Zustand + TanStack Query-style Firestore hooks | Lightweight |
| Auth | **Firebase Auth — Google provider** | Requested |
| Database | **Cloud Firestore** with offline persistence (IndexedDB) | Realtime + offline-first |
| PWA | **Serwist** (`@serwist/next`, Workbox-based), manifest, install prompt, offline shell | Next.js-compatible service worker |
| Hosting | **Vercel** (GitHub push → deploy, CI/CD handled by you) | HTTPS, global CDN, preview deploys. Firebase is used only for Auth + Firestore |
| Dates | date-fns | Small, tree-shakeable |
| Forms | React Hook Form + Zod | Validation |
| Testing | Vitest + Testing Library; Playwright for key flows | |

### 3.2 Firestore data model

```
users/{uid}
  displayName, email, role, coParentName, units, theme, createdAt, onboardingComplete, activeBabyId

babies/{babyId}
  name, sex, birthDate, gestationWeeks?, birthWeightG?, birthLengthCm?, birthHeadCm?,
  feedingType, color, photoKey?, ownerUid, memberUids[]      // memberUids enables co-parent sharing (MVP)

babies/{babyId}/invites/{inviteId}      // token hash, email?, expiresAt, role, status
users/{uid}/pushSubscriptions/{id}      // endpoint, keys, device label, locale, tz
babies/{babyId}/reminders/{id}          // type, schedule/interval, enabled, quiet hours, lastSentAt

babies/{babyId}/events/{eventId}
  type: 'feed' | 'sleep' | 'diaper' | 'growth' | 'health' | 'milestone' | 'activity' | 'mood'
  start: Timestamp, end?: Timestamp
  data: { ...type-specific payload }   // e.g. {method:'bottle', ml:90, milk:'formula'}
  note?, photoKey?, createdBy, updatedAt          // photoKey = R2 object key
```

- Single `events` collection keeps the timeline query simple (`orderBy start desc`); composite index on `type + start` for filtered charts.
- Aggregations (daily totals, averages) computed client-side from cached events for MVP; Cloud Function daily rollups only if volume demands.
- **Security rules:** read/write only if `request.auth.uid in babies/{id}.memberUids`; validate event schema.

### 3.3 Folder structure (proposed)

```
totsntimelines/
├─ public/ (icons, manifest, who-growth/*.json)
├─ messages/ (en.json, nl.json)
├─ src/
│  ├─ app/
│  │  ├─ [locale]/ (login, onboarding, (app)/home|insights|timeline|profile)
│  │  ├─ api/ (media/presign, push/subscribe, push/send, cron/reminders, invites, external/*)
│  │  ├─ sw.ts (service worker)
│  │  └─ manifest.ts
│  ├─ features/ (auth, onboarding, babies, home, log, insights, timeline, profile, reminders)
│  ├─ components/ (ui/, icons/, charts/, motion/ MaskReveal, MaskTransition)
│  ├─ lib/ (firebase client, firebase-admin, r2, growth/percentiles, stats/, units, dates)
│  └─ styles/ (tokens.css)
├─ firestore.rules  ├─ firebase.json (rules/indexes only)  ├─ next.config.ts (auth proxy rewrites)  └─ plan.md
```

### 3.4 Key technical notes
- **Google sign-in on installed PWAs:** prefer `signInWithRedirect` on mobile/standalone; popup on desktop. Test on iOS Safari standalone.
- **Vercel + Firebase Auth:** add the Vercel production domain, custom domain and preview domains (`*.vercel.app`) to Firebase Auth → Authorized domains. Redirect sign-in breaks on modern browsers when `authDomain` differs from the app domain (storage partitioning), so set `authDomain` to the app's own domain and proxy `/__/auth/*` to `<project>.firebaseapp.com` via `rewrites()` in `next.config.ts`.
- **Env vars:** Firebase web config goes in `NEXT_PUBLIC_FIREBASE_*` (public identifiers, security comes from Firestore rules). Server-only secrets (Firebase Admin service account, R2 keys, VAPID private key, cron secret) live only in Vercel env vars / `.env.local`, never in git or chat.
- **Rules/indexes** are deployed with the Firebase CLI (`firebase deploy --only firestore`), separate from the Vercel app deploy.
- **PWA on Vercel:** Serwist service worker served from root with `Cache-Control: no-cache` and correct scope; app shell + last-viewed data cached for offline.

### 3.5 How the "feeding type" answer is used
Stored as `babies/{id}.feedingType` (`breast | bottle | both | solids`) and editable in Profile. Events keep their own `method`, so changing it never rewrites history.
- **Home:** Feeding tile opens the matching form directly (breast → timer + L/R side, bottle → ml stepper, both → method picker). Pump shortcut only for breast/both.
- **Insights:** breast → feed count, interval, duration, side balance; bottle → ml/day and ml/feed; both → both views, volume counts only measured feeds.
- **Reference bands:** typical ranges are chosen per feeding type.
- **Solids:** unlocks a food log (food, amount, reaction, allergen flag) and an introduced-foods list.
- **Reminders:** feed reminder wording and defaults adapt to the type.

### 3.6 Performance budget ("must not load 100000 seconds")
- **Server-render the entry pages** (login, onboarding shell) as React Server Components: near-zero JS until interaction.
- **Route-level code splitting** is automatic; additionally lazy-load charts, the growth curves and Framer Motion's heavier features (`LazyMotion` + `domAnimation`) only on the screens that use them.
- **`next/font`** self-hosts fonts with `display: swap` and no layout shift; max two families.
- **`next/image`** for photos; R2 originals resized client-side before upload (max ~1600 px, WebP/JPEG) plus a small thumbnail.
- **Firestore:** enable offline persistence, query only the window needed (today / 7 d / 30 d), paginate the timeline, no full-collection reads.
- **WHO tables** shipped as compact static JSON, loaded only on Growth/Insights.
- **Targets:** LCP < 2 s on mid-range phone over 4G, initial JS < 120 kB gzip on login, interactions < 100 ms, CLS ≈ 0. Checked with Lighthouse in the roadmap's polish phase.
- Skeleton "shimmer" states in the pastel palette instead of spinners; optimistic UI for logging.

### 3.7 Backend (Route Handlers)
- All `/api/*` routes require `Authorization: Bearer <Firebase ID token>`, verified with `firebase-admin`; baby access checked against `memberUids`.
- `POST /api/media/presign` → short-lived R2 presigned PUT/GET URLs.
- `POST /api/push/subscribe`, `POST /api/push/send`, `GET /api/cron/reminders` (protected by a secret header).
- `/api/external/*` = server-side proxy for third-party APIs we may add later (keeps keys off the client).
- `POST /api/invites` + `/api/invites/accept` for co-parent sharing.

### 3.8 Reminders & push notifications (incl. iOS)
- Uses standard **Web Push (VAPID)**. iOS/iPadOS 16.4+ supports it **only for the PWA installed to the Home Screen**, and permission must be requested from a user tap. Plan: an in-app "Install Tots & Timelines" guide (animated Share → Add to Home Screen steps, shown on iOS Safari) and a gentle "Turn on reminders" step after install.
- Reminder types: next feed (interval since last feed), medication/vitamin D (fixed times), diaper check, sleep wake-window ("nap soon"), vaccination/doctor visit, daily log nudge. Quiet hours + per-reminder toggles; all localized EN/NL.
- **Scheduling:** a cron hits `/api/cron/reminders` every minute, which finds due reminders and sends via `web-push`. Vercel Cron per-minute needs a paid plan, so the free alternative is a **Cloudflare Worker cron trigger** (you already use Cloudflare) calling the endpoint with the secret header.
- Dead subscriptions (404/410) are pruned automatically; `notificationclick` deep-links to the relevant log form.
- Caveat: iOS may drop push for PWAs that are never opened, so we also show in-app "due" banners as fallback.

### 3.9 Media on Cloudflare R2
- Private bucket; client asks `/api/media/presign` for a PUT URL, uploads directly to R2, saves the object `key` in Firestore; photos are shown via short-lived presigned GET URLs (baby photos stay private).
- Key layout: `babies/{babyId}/{yyyy}/{uuid}.webp` (+ `-thumb.webp`).
- Bucket CORS must allow `PUT/GET` from the app origins (prod, custom domain, preview, localhost).
- Delete-my-data removes the R2 prefix too.

### 3.10 Language & units
- English default; Dutch (`nl`) switchable in Settings; initial language from the device. Locale-prefixed routes (`/en`, `/nl`), all copy in `messages/*.json`, dates/numbers via `Intl`.
- Units default from locale (NL → metric, US → imperial, otherwise metric); switchable in Settings. Stored metric internally.

### 3.11 Multiple babies & co-parent sharing (MVP)
- Home header has a baby switcher (avatar chips); **Settings → Add another baby** reruns a shortened onboarding (name, sex, birth date, measurements, feeding, colour, photo).
- Co-parent: Settings → "Invite co-parent" creates a link/QR (expires, single-use); on accept, their uid is added to `memberUids`. Each log shows who logged it; owner can remove members.
- **Timers** persist as `start` events with no `end`; closing the app does not lose them.
- **Corrected age** for premature babies drives growth chart and milestone age bands.
- **Units** stored canonically metric; converted at the UI edge.
- **Privacy:** baby data is sensitive. Minimise collected data, no third-party analytics by default, delete-my-data flow, GDPR-friendly consent text.
- **Accessibility:** 44 px touch targets, labelled inputs, focus order, contrast checks, reduced-motion support.

---

## 4. Roadmap

| Phase | Scope | Outcome |
|---|---|---|
| **0 — Setup** | Next.js + TS, Tailwind tokens, next-intl (EN/NL), Firebase client/admin, Serwist PWA scaffold, icon set, auth proxy rewrites | Installable shell, ready to push to GitHub → Vercel |
| **1 — Auth & onboarding** | Google login, 15-step masked onboarding (EN/NL), Firestore profile/baby | A user can sign up and meet their baby |
| **2 — Core logging & family** | Home, quick tiles, log sheet for feed / sleep / diaper, timers, timeline list, multi-baby switcher, co-parent invites, R2 photos | Daily use, shared between parents |
| **3 — Insights** | Today donut, week/month charts, rhythm ring, pattern cards | "How is it going?" answered |
| **4 — Growth** | Growth logging + WHO percentile charts | Pediatrician-ready |
| **5 — Reminders & polish** | iOS-capable push reminders + install guide, full motion pass, dusk theme, offline hardening, a11y, Lighthouse perf/PWA ≥ 90 | Launch quality |
| **6 — v1.1** | Health tracker, milestones timeline, PDF doctor report, mood/activities | Retention features |

---

## 5. Decisions & remaining open items

### Decided
| # | Topic | Decision |
|---|---|---|
| 1 | Co-parent sharing | In the MVP (invite link/QR, §3.11) |
| 2 | Multiple babies | Supported; add another in Settings |
| 3 | Units | Default from locale, changeable in Settings |
| 4 | Language | English default, Dutch switchable in Settings (next-intl) |
| 5 | Stack | **Next.js** (App Router) with Route Handlers as backend; strict performance budget (§3.6) |
| 6 | Reminders | In scope, iOS-compatible via Web Push on the installed PWA (§3.8) |
| 7 | Photos | Cloudflare R2 via presigned URLs (§3.9) |
| 8 | Deploy | Push to GitHub, Vercel CI/CD handled by the owner |
| 9 | Design | Pastel, very rounded, custom icon system (§2.5) |

### Still needed from the owner (never paste secrets in chat; put them in `.env.local` / Vercel env vars)
1. ~~Firebase project~~ **Resolved:** reusing the retired `influxdbbandi` project (no other app depends on it), default Firestore database.
2. ~~Firebase Admin service account~~ **Resolved:** key file placed in the project root. It must never be committed: it is added to `.gitignore` and its values moved into `.env.local` / Vercel env vars when the app is scaffolded.
3. **Authorized domains** in Firebase Auth: Vercel production/custom domain, preview domains, localhost.
4. **Cloudflare R2:** account ID, bucket name (private), an API token with *Object Read & Write* scoped to that bucket (access key ID + secret), and CORS rules for the app origins.
5. ~~Reminder scheduler~~ **Resolved:** Cloudflare Worker cron trigger (every minute) calling `/api/cron/reminders` with a secret header. Worker lives in `/workers/reminders`.
6. **VAPID keys** for web push: I'll generate them; you add the private key to Vercel env.
7. **Domain/name** for the production URL, to be provided later (not on Vercel yet). Until then we use `localhost` and the `*.vercel.app` URL; `authDomain`, manifest and push origin get updated once it exists.

---

## 6. Definition of done (MVP)

- Sign in with Google; onboarding completes and persists; returning users land on Home.
- Log feed, sleep (with timer), diaper in ≤ 2 taps; works offline and syncs.
- Insights show day/week/month charts and at least 4 pattern insights.
- Growth entries plot against WHO percentile curves.
- Installable PWA, Lighthouse PWA/Accessibility ≥ 90, animations smooth with reduced-motion fallback.
- Firestore rules enforce per-baby access; medical disclaimer visible.
- App fully usable in English and Dutch; units default from locale.
- Multiple babies and a working co-parent invite flow.
- Photos upload to R2 and display via signed URLs.
- Reminders arrive on an iOS Home Screen PWA and on Android/desktop.
- Performance budget in §3.6 met.

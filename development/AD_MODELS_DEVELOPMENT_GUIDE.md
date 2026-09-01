# Amuze Ad Network — Backend Development Guide

**Scope:** How to evolve the current NestJS advertiser system into the four advertising
models defined in *Advertising Models for AMUZE Application* (Aug 2026), without discarding
the working engine already built from the *Ad Network – Advertiser System Design Document*.

**Audience:** Backend developer(s) on this repo. Companion guides for
`amuze-ads-customer` (advertiser self-service FE) and `amuze-ads-FE` (admin panel FE)
will follow once this one is reviewed — several phases below change API contracts both
apps depend on, so read this first.

**Status:** Planning document, not yet started. Supersedes nothing in
`development/PROJECT_STATUS.md` — that file still accurately describes what exists today.

---

## 1. Current System Snapshot (ground truth)

**Stack:** NestJS 11 + TypeORM 0.3 + PostgreSQL, JWT auth (`passport-jwt`), MinIO for file
storage, `@nestjs/schedule` for cron. No queue library, no payment SDK, no Swagger.

**What's built:** One generic "boost a post" campaign engine — 13 modules, full CRUD,
a real cron-driven budget/spend worker. This is *not* being thrown away; it becomes the
shared kernel every model below builds on.

**Two existing FE consumers, confirmed from their repos:**

| App | Role | Talks to |
|---|---|---|
| `amuze-ads-customer` | Advertiser self-service portal — advertiser/profile CRUD, campaign/post CRUD, ad list, notifications | Advertiser-scoped endpoints |
| `amuze-ads-FE` | Internal admin panel — admin-user CRUD, advertiser oversight, profile review, dashboard | Admin-scoped endpoints |

Both currently call the same flat, unguarded-by-role API — see the security gap in §4.1.

**Current core entities (exact fields, as of this baseline):**

`campaigns` — id, name, objective (`reach`/`traffic`/`engagement`, free-text varchar),
dailyBudget, totalBudget, spentAmount (default 0), startDate, endDate, status (free-text
varchar), advertiserId (FK), **postId (FK, hardcoded single target type)**.

`ad_sets` — id, ageMin, ageMax, gender, location (single text field, not JSON/array),
category, campaignId (FK).

`ads` — id, status only. **No type, no placement, no creative fields.**

`transactions` — id, advertiserId, paymentMethod (free-text string), amount,
**referenceType + referenceId (already polymorphic)**, no gateway call behind it.

`system_configs` — category + configKey (unique together) + configValue (JSONB) +
description + isActive. Already used for pricing (CPM/CPC/CPE rates). This is the
pattern we reuse for ad-type/placement catalogs — see §2.3.

**Confirmed non-functional gaps** (not opinions — verified in code):

1. **No role separation on JWTs.** `JwtStrategy.validate()` returns only `{ id, email }`
   — no role claim. `JwtAuthGuard` is the *only* guard on every protected controller,
   including `/admin-users`. An advertiser's JWT, minted from `/auth/advertiser/login`,
   currently satisfies the guard on admin-only routes. This must be fixed before any
   admin-approval workflow is meaningful (§4.1).
2. **No ad-serving engine.** `ad_sets` targeting fields are written but never read by
   anything — there is no endpoint that takes a viewer context and returns a chosen ad.
   Note this isn't just a missing endpoint: every route in the system today (including
   `ads` and `daily-ad-stats`, e.g. `GET /daily-ad-stats/ad/:adId/servable`) sits behind
   `JwtAuthGuard`, i.e. requires an advertiser/admin login. The eventual serving endpoint
   is called by a fundamentally different caller — the main Amuze app, or its end users —
   who have no advertiser/admin account in this system. It must not inherit the
   admin/advertiser guard chain by default; see §3.5 and §4.1.
3. **No admin approval workflow.** Status fields are free-text strings settable via
   generic `PATCH .../status` with no state machine and no role gate.
4. **Payment is a stub.** `transactions` just persists a row; no gateway is called.
5. **`synchronize: true`** in `app.module.ts` (already flagged with a `❗` comment by
   whoever wrote it) — schema changes currently auto-apply on boot. This must switch to
   TypeORM migrations before Phase 0 ships, or schema drift across dev/staging/prod
   becomes unrecoverable.
6. Core business logic (cron budget engine, campaign creation) has no test coverage.

---

## 2. Target Architecture — One Kernel, Config-Driven Differences

Confirmed from the requirement doc: Display Advertising and Content Discovery share
almost the same flow shape (select target → select type → \[targeting\] → placement →
budget/duration → payment → report); Brand & Campaign is the same engine with relaxed,
admin-negotiated terms. So the four models are **one campaign engine, differentiated by
a small set of fields and lookup catalogs** — not four separate schemas.

### 2.1 `model_type` discriminator
Add to `campaigns`: `modelType` (`display_ads` | `content_discovery` | `brand_campaign` |
`self_service`). Reserve `self_service` in the enum now even though it's built last, to
avoid a breaking enum migration later. This single field drives which validation rules,
which catalog entries, and which workflow (self-serve vs admin-assisted) apply.

### 2.2 Polymorphic promotion target
Replace `campaigns.postId` (hardcoded FK) with `targetType` (`post` | `ad_creative` |
`profile` | `course` | `product`) + `targetId` — the same shape `transactions` already
uses for `referenceType`/`referenceId`. Only `post` and `ad_creative` are active until
Phase 4; the other three are reserved values.

- `post` → reuses `advertiser_posts` as-is (Content Discovery boosts existing content).
- `ad_creative` → **new table**, since a banner/video ad isn't organic content: raw
  creative asset (image/video via MinIO) + destination link + advertiser ownership.
- `profile` / `course` / `product` → deferred to Phase 4; likely need their own source
  tables or a link into whatever the main Amuze platform already uses for these entities
  (needs a decision — see §3.5's open questions).

### 2.3 Ad-type and placement as catalogs, not hardcoded enums
Extend the existing `system_configs` category pattern (already used for `pricing`) with
two new categories: `ad_type_catalog` (scoped by `modelType` → allowed values, e.g.
banner/interstitial/reward_video/native/splash for `display_ads`; featured/trending/
recommendation for `content_discovery`) and `placement_catalog` (Home Page, Comic, Novel,
Search, Discovery Feed, etc., also scoped by `modelType`). Add `adType` and `placementId`
(or `placementKey`) columns to `ads`. Validated at the DTO/service layer against the
active catalog rows — admin-editable without a redeploy, consistent with how pricing
already works.

### 2.4 Targeting becomes optional per model
Content Discovery's flow has no target-audience step in the spec. Make `ads.adSetId`
nullable, skip the ad-set-creation step in the service layer when
`campaign.modelType === 'content_discovery'`.

### 2.5 Admin approval as a real state machine
Replace the free-text `status` + generic PATCH pattern on `campaigns` and `ads` with an
explicit, guarded transition: `draft → pending → active | rejected`, `active → paused |
completed`. Enforced server-side (illegal transitions rejected), gated by an admin-only
role check (§4.1), with dedicated `POST /campaigns/:id/approve` and
`POST /campaigns/:id/reject` endpoints replacing the generic status PATCH for that
transition specifically.

### 2.6 Real payment integration
`transactions` already has the right shape (`paymentMethod`, `referenceType`,
`referenceId`). What's missing is the gateway call itself: initiate payment against
kbzpay/wave/bank, webhook or polling to confirm, then write the transaction row only on
confirmed success — plus a `pending`/`failed` transaction status so the "Retry Payment"
step in every flow diagram has something real to retry against.

---

## 3. Phase Plan

Phases 1–3 are ordered by how much of the shared kernel they exercise (highest-reuse
first), not strictly by business priority — Phase 1 (Display Advertising) happens to be
both highest-reuse *and* the direct revenue objective, so it leads either way.

### Phase 0 — Foundation (no new user-facing model ships)

**Goal:** Make every subsequent phase a config/data change instead of a code fork.

| Change | Type | Notes |
|---|---|---|
| Switch off `synchronize`, adopt TypeORM migrations | Infra | Blocks everything else safely shipping |
| Add role claim to JWT payload; add `RolesGuard` | Security | Fixes the advertiser→admin-route gap in §1.4 |
| `campaigns.modelType` | Schema | **Done.** `varchar(50) NOT NULL DEFAULT 'display_ads'` — every existing row backfilled automatically. Validated in `CreateCampaignDTO` against the four model values via `@IsIn`. |
| `campaigns.targetType` / `targetId` | Schema | **Partially done.** Columns added (nullable), accepted as optional fields in `CreateCampaignDTO`, but **not yet wired to anything** — `postId` is untouched and still the only field actually used by services/FE. Deliberately additive: no backfill, no `postId` removal yet, to avoid a breaking change before `amuze-ads-customer`/`amuze-ads-FE` are ready for it (§4.5). Backfill + `postId` retirement is still open, to be done once an `ad_creative` target type actually exists (Phase 1) and both FE apps have migrated. |
| `ad_type_catalog`, `placement_catalog` config categories | Schema (via `system_configs`) | Seed with Display Advertising's known values first |
| `ads.adType`, `ads.placementKey` | Schema | Nullable initially, required once Phase 1 validation lands |
| `ads.adSetId` nullable | Schema | Unblocks Phase 2 |
| Campaign/ad approval state machine + role-gated `approve`/`reject` endpoints | API | **Done.** `campaign-status.ts`/`ad-status.ts` define per-resource self-service transition maps (advertiser: `draft→pending`, `active↔paused`; admin bypasses the map entirely). New admin-only `POST .../:id/approve` and `.../:id/reject` (guarded by `RolesGuard`+`@Roles('admin')`) handle `pending→active`/`pending→rejected` specifically, replacing the generic status PATCH for that transition. The generic `PATCH .../status` endpoints still exist for the self-service transitions, now with the transition map enforced for advertisers (admin keeps full flexibility, matching the existing bypass pattern). Building this surfaced that `ads` had **zero** ownership protection at all (unlike campaigns/posts/profiles, fixed earlier) — added `AdOwnershipGuard` (same pattern as the others) plus list filtering on `GET /ads`, so this closes that gap too, not just the approval piece. |
| Payment gateway integration (kbzpay/wave minimum) | API + infra | **Deferred — owned by user, not this assistant.** Needs real merchant credentials and API docs only the account holder has; will be picked up separately later. Not blocking anything else in this plan — `transactions` already has the right shape (`paymentMethod`, `referenceType`/`referenceId`), it's just not wired to a real gateway call yet. |

**FE impact:** `amuze-ads-customer` and `amuze-ads-FE` both need the new login response
shape (role claim) and both need to handle the new approve/reject endpoints replacing
generic status PATCH for that specific transition. Existing status PATCH stays for
non-approval transitions (pause/resume) to avoid a bigger FE rewrite than necessary.

**Definition of done:** All existing FE flows (campaign/post/ad CRUD) still work
unmodified except for the login response shape and the approval-specific endpoint swap.
No behavior change for Display Advertising yet — this phase is pure plumbing.

### Phase 1 — Display Advertising

**Goal:** First model to go live end-to-end, including real ad delivery.

| Change | Type | Notes |
|---|---|---|
| `ad_creatives` table (image/video, link, advertiserId, MinIO ref) | Schema | New — nothing today represents a raw ad creative |
| `ads.adType`, `ads.placementKey`, `ads.adSetId` nullable | Schema | **Done.** Columns added (nullable), `ad_set_id`'s `NOT NULL` relaxed. Not yet wired to a DTO — `POST /ads` has a pre-existing mismatch where the controller/service actually validate against `CreateAdSetsDTO` (ad-**set** fields), not the unused `CreateAdDTO`; bolting ad-specific fields onto the wrong-named DTO would compound that rather than fix it, so left unwired until that's sorted out. |
| Seed `ad_type_catalog` with banner/interstitial/reward_video/native/splash | Config | `modelType=display_ads` |
| Seed `placement_catalog` with real app surfaces | Config | Placement list now known: Home Page, Comic, Novel, Story Tellings, Magazine (provisional, may not be exhaustive) |
| Ad-serving endpoint: given placement + viewer context, query active `ads` joined to `ad_sets` targeting, return a servable ad | API — **new capability, not a refactor** | This is the one genuinely new engine piece; everything else in this phase is config. **Auth note:** this endpoint's caller is the main Amuze app / its end users, not an advertiser or admin — it must sit outside `JwtAuthGuard`/`RolesGuard` and get its own auth mechanism (§3.5, §4.1), not be bolted onto the existing guard chain by default. |
| Wire `checkAdServable` (already exists) into the new serving endpoint | API | Reuse existing daily-cap logic rather than duplicating it |

**Definition of done:** An advertiser can create a `display_ads` campaign with an
`ad_creative` target, get admin-approved, and a placement query returns their ad within
budget caps and targeting rules.

### Phase 2 — Content Discovery

**Goal:** Mostly config on top of Phase 0/1 infrastructure.

| Change | Type | Notes |
|---|---|---|
| Seed `ad_type_catalog` with featured/trending/recommendation | Config | `modelType=content_discovery` |
| Seed `placement_catalog` scoped to discovery surfaces | Config | |
| Skip ad-set creation step when `modelType=content_discovery` | Service logic | Uses §2.4 |
| "Boosted post" signal for the recommendation/feed system | **Cross-team integration, not internal engineering** | This service can only expose "this post has an active discovery campaign, weight=X" — actually applying that boost lives in whatever service owns the Amuze feed/recommendation/search ranking. Needs a contract (webhook, shared table, or read API) agreed with that team before this phase can be called done. |

**Definition of done:** A creator can boost an existing post into a discovery placement,
get approved, and the boost signal is available for the recommendation system to consume
— even if the recommendation system's consumption of it is out of this repo's scope.

### Phase 3 — Brand & Campaign

**Goal:** Least new engineering, most new admin tooling.

| Change | Type | Notes |
|---|---|---|
| Admin-side "create campaign on advertiser's behalf" flow | API (admin panel only) | Not self-serve — the spec gives this model no self-service flow diagram, unlike the other three |
| Custom/negotiated pricing override on a campaign (bypass standard CPM/CPC/CPE lookup) | Schema + service logic | e.g. optional `customRate` on campaign, used instead of `system_configs.pricing` when set |
| `ad_type_catalog` entry: `custom` (free-form, admin-defined per deal) | Config | |

**Definition of done:** Admin panel can create and approve a fully custom campaign for an
enterprise partner without going through the standard self-serve budget calculator.

### Phase 4 — Self-Service Promotion (deferred, built last per your call)

Expands `targetType` to `profile` / `course` / `product`, adds Search Sponsored Result
(another cross-team integration, this time with search ranking rather than the feed).
This is the largest phase because it's the one that reaches furthest outside this
service's existing domain — not because the ad-engine part is harder than Phase 1–3.
Detailed schema/API plan intentionally deferred until Phases 0–3 are stable, since the
target-type decisions here depend on how `profile`/`course`/`product` are represented in
the wider Amuze platform (open question, §3.5).

### 3.4 Known gap: ad creation doesn't verify campaign ownership

`POST /ads` accepts a `campaignId` (via the reused `CreateAdSetsDTO` — see the DTO
mismatch note in the Phase 0 table) with no check that the campaign belongs to the
calling advertiser. So today, an advertiser could create an ad under another
advertiser's campaign. This is the same category of issue as the create-time
`advertiserId` override fixed on campaigns/posts/profiles, but one level indirect (via
`campaignId` rather than a direct owner field), and fixing it means `AdModule` importing
`CampaignService` to check `campaign.advertiserId` before allowing the create — a new
cross-module dependency, not just a guard on an existing route. Deliberately deferred
rather than folded into the ownership-guard work above; flagging here so it isn't
forgotten.

### 3.5 Open questions (need a product/business decision before the relevant phase starts)

- ~~**Placement catalog values**~~ — **answered**: Home Page, Comic, Novel, Story
  Tellings, Magazine. Enough to seed `placement_catalog` for Phase 1. Treat as
  provisional, not necessarily exhaustive — revisit if more app surfaces get added.
- **Content Discovery integration contract** — who owns the feed/recommendation service,
  and what shape does the "boosted" signal need to be in for them to consume it (webhook
  push vs. shared read table vs. polling API)? **Status: unknown, not yet identified.**
  Doesn't block Phase 0/1 engineering work, only blocks calling Phase 2 (Content
  Discovery) actually planned — find the owner before starting that phase.
- **Brand & Campaign approval owner** — is this created by admin ops staff directly, or
  does an advertiser submit a request that ops then converts into a campaign? Changes
  whether Phase 3 needs any advertiser-facing UI at all.
- **Self-service profile/course/product** — do these already exist as entities somewhere
  in the main Amuze platform (a separate service/DB), or do they need to be represented
  here? Determines whether Phase 4's `targetId` is a local FK or a foreign-system
  reference with no referential integrity at the DB level.
- **Watch & Earn** is not one of the four models and is architecturally unrelated (points
  ledger + wallet + video-completion verification, not campaign/budget/targeting). Worth
  scoping as an independent module whenever prioritized — no dependency on Phases 0–4.
- **Ad-serving endpoint auth model (Phase 1 blocker)** — the endpoint that actually
  returns an ad to display is called by the main Amuze app or its end users, not by an
  advertiser/admin account in this system. Needs a decision with whoever owns the main
  Amuze backend: a service-to-service credential (API key / mTLS / internal network
  trust) if the main backend calls this service server-side, or validation of the main
  platform's own end-user session token if end-user clients call it directly. Either way,
  it is explicitly **not** `JwtAuthGuard` + `RolesGuard` — those two guards are scoped to
  the advertiser/admin management API (§4.1).

---

## 4. Cross-Cutting Engineering Standards

### 4.1 Auth & roles (fix before Phase 0 ships anything else)
Add a `role` claim (`admin` | `advertiser`) to the JWT at login time in both
`AuthService.login` and `AuthService.advertiserLogin`, and add a `RolesGuard` (checked
alongside `JwtAuthGuard`) on every controller that should be role-restricted:
`admin-users`, `system-configs`, the new approve/reject endpoints, and anything Phase
0–3 add for admin-only campaign creation. Advertiser-scoped endpoints
(`campaigns`, `advertiser-posts`, `advertiser-profiles`) should additionally verify the
JWT's advertiser id matches the resource's `advertiserId` — not currently enforced
anywhere, worth confirming as in-scope for Phase 0 or a fast-follow.

**Scope note:** `JwtAuthGuard` + `RolesGuard` + the ownership check above are for the
advertiser/admin management API only — the surface `amuze-ads-customer` and
`amuze-ads-FE` talk to. They do not apply to, and should never be reused for, the
Phase 1 ad-serving endpoint (§3.5) — that endpoint has a different caller (the main
Amuze app / its end users) and needs its own auth mechanism, decided separately.

**Status: done.** `role` is now in the signed JWT payload (`auth.service.ts`), read back
in `jwt.strategy.ts`, and `RolesGuard`/`@Roles()` (`src/auth/roles.guard.ts`,
`src/auth/roles.decorator.ts`) are wired onto `admin-users` and `system-configs`.

The ownership check is also done, across all three advertiser-scoped resources
(`campaigns`, `advertiser-posts`, `advertiser-profiles`), same pattern each time:
- A per-resource `*OwnershipGuard` (e.g. `campaign-ownership.guard.ts`) that fetches the
  resource by `:id`, allows admins through unconditionally, and otherwise requires the
  resource's owner field to match `request.user.id`. Kept as three small dedicated
  guards rather than one shared/generic guard — Nest resolves a guard's constructor
  dependencies through the DI context of the module its controller belongs to, so a
  single guard needing all three services injected would force the three modules to
  import each other unnecessarily.
- A shared `@CurrentUser()` param decorator (`src/auth/current-user.decorator.ts`) that
  pulls `request.user` into controller methods — this one *is* shared, since it has no
  per-module dependency, unlike the ownership guards.
- Create endpoints no longer trust a client-supplied `advertiserId`/`advertiser_id` in
  the body — advertisers always get it overwritten with their own token's id; admins can
  still pass one explicitly (needed later for admin-created Brand & Campaign campaigns).
- List-all endpoints (`GET /campaigns`, `GET /advertiser-posts`,
  `GET /advertiser-profiles`) now filter to the caller's own rows for advertisers, and
  stay unfiltered for admins — done via an optional `advertiserId` filter param on the
  corresponding service `find` methods, not a guard (rejecting outright would be wrong
  here; filtering is the correct behavior for a list endpoint).
- `advertiser-posts`' `GET /advertiser-posts/advertiser/:id` is a special case — `:id`
  *is* the advertiser id being queried, not a post id, so it doesn't fit the
  fetch-then-compare guard shape. Handled with an inline check in the controller instead.

### 4.2 Status fields → state machines
Every new status transition introduced by this plan (campaign approval, ad approval)
should be an explicit allowed-transitions map in the service layer, not a free PATCH of
any string — matching the intent already visible in `campaign.status` values
(`draft/pending/active/paused/completed/rejected`) but never enforced today.

### 4.3 Migrations
Once `synchronize` is off, every schema change in this plan ships as a TypeORM migration
checked into the repo, run explicitly in each environment — not auto-applied on boot.

**Status: done.** `src/data-source.ts` is a standalone `DataSource` (the CLI runs outside
Nest's DI, so it can't use `ConfigService` — it reads `.env` directly via `dotenv`).
`app.module.ts`'s `TypeOrmModule.forRootAsync` now also declares the same `migrations`
glob and `synchronize: false`. New npm scripts: `migration:generate`, `migration:create`,
`migration:run`, `migration:revert` — all invoke
`node_modules/typeorm/cli-ts-node-commonjs.js` directly via `node -r
tsconfig-paths/register`, not the `typeorm-ts-node-commonjs` bin directly, because the
entities use `baseUrl`-relative imports (e.g. `"src/advertisers/entities/..."`, per
`tsconfig.json`'s `baseUrl: "./"`) that plain `ts-node` can't resolve without
`tsconfig-paths` patching Node's module resolution first — Nest's own webpack-based
build handles this natively, ts-node does not. The baseline `migration:generate` came
back "no changes" (confirming the DB already matched entities from prior `synchronize`
runs); `migration:run` with zero migration files created the `migrations` bookkeeping
table. From here, any entity change needs an explicit generate+run to reach the DB.

**Correction, found before it shipped:** the original "baseline" step only created the
`migrations` bookkeeping table — it did not capture `CREATE TABLE` statements for any of
the 11 tables that already existed via `synchronize`. That meant the migration history
was not self-sufficient: a genuinely fresh database (new teammate, CI, staging, prod)
would have failed immediately, since the first real migration (`ALTER TABLE campaigns
ADD "model_type"...`) assumes `campaigns` already exists.

Fixed by generating a proper `InitialSchema` migration against a throwaway empty
database (created via `pg` directly, since no `psql` CLI is installed —
`DB_NAME=<scratch> npm run migration:generate -- src/migrations/InitialSchema`, then
dropped after). Because it was generated *after* this session's schema changes, it
already contains the full current schema (`model_type`, `target_type`, `ad_type`,
`placement_key` included) — which made the two incremental migrations
(`AddCampaignModelTypeAndTarget`, `AddAdTypePlacementAndNullableAdSet`) redundant for
any fresh environment (they'd try to re-add columns `InitialSchema` already created).
Deleted both; `InitialSchema` is now the sole migration. The real local dev DB already
had this exact schema, so instead of re-running its SQL there, a row was inserted
directly into its `migrations` table marking it applied. Validated end-to-end by running
`InitialSchema` against a second throwaway empty database and confirming all 11 tables +
FKs were created with no errors, then dropped it too.

**Lesson for next time an entity changes:** since `InitialSchema` already represents the
full schema as of today, any *future* migration should go back to being a normal
incremental one (`migration:generate` against the real dev DB, which will correctly
diff against the current state) — this consolidation was a one-time fix for the gap
in how migrations were first adopted, not the new steady-state pattern.

### 4.4 Testing
The cron-driven budget/spend engine (`daily-ad-stats.service.ts`,
`campaign.service.ts#autoStopCampaigns`) currently has zero coverage despite being the
most consequential logic in the system (it moves money). New tests here should land
before or alongside Phase 0, not deferred further — a bug in budget deduction is a
direct financial/trust issue, not a code-quality nice-to-have.

**Status: done** for these two methods. `campaign.service.spec.ts` (4 tests) covers
`autoStopCampaigns`: completes a campaign at or above budget, leaves one below budget
untouched, and only completes the right campaigns in a mixed batch.
`daily-ad-stats.service.spec.ts` (6 tests) covers `generateDailyAdStats`: correct CPM/
CPC/CPE cap math per objective (cross-checked against the worked examples in the
requirement PDF — 10,000 MMK/day → ~6,666 impressions / 50 clicks / ~83 engagements,
all match), the no-matching-pricing-config edge case, and — the one that actually matters
most for correctness — that a campaign's `spentAmount` is only deducted **once per day
even if it has multiple active ads**, not once per ad.

Both services use `@InjectRepository` and inject other services, so tests mock the
repository/service dependencies via `getRepositoryToken` + `useValue`, rather than
hitting a real database — these are unit tests, not integration tests.

**Side effect worth noting:** both new spec files hit the same `baseUrl`-relative import
problem as the migration CLI (§4.3) — `ts-jest` doesn't understand TS's `baseUrl` either.
Fixed by adding `modulePaths: ["<rootDir>/.."]` to the `jest` config in `package.json`
(Jest's equivalent of Node's `NODE_PATH`). This also surfaced that 4 pre-existing
boilerplate spec files (`advertiser-posts.*.spec.ts`, `advertiser-profiles.*.spec.ts`)
were already failing before this session, for the same reason plus missing repository
mocks — confirmed via `git stash` against the original commit, not a regression from
this work. Left as-is; worth a real fix later since they currently provide zero
coverage despite existing.

### 4.5 API contract change policy for the two FE consumers
Because `amuze-ads-customer` and `amuze-ads-FE` are separate repos already built against
the current flat API, every phase above should be shipped as **additive where possible**
(new optional fields, new endpoints) and any breaking change (the approval endpoint
swap, the login response shape, `postId` → `targetType`/`targetId`) called out explicitly
to both FE teams before merge — not discovered via a broken build. Suggest a short
CHANGELOG section per phase in this doc once implementation starts, so both FE guides
(coming next) can reference exact shapes rather than re-deriving them from source.

---

## 5. Immediate Action Items (start of Phase 0)

1. ~~Add `role` claim + `RolesGuard` + ownership check (§4.1)~~ — **done**, including the
   ownership check across `campaigns`/`advertiser-posts`/`advertiser-profiles`.
2. ~~Introduce TypeORM migration tooling and turn off `synchronize`~~ — **done** (§4.3).
3. ~~Add tests for `autoStopCampaigns` and `generateDailyAdStats`~~ — **done** (§4.4).
4. Get the placement catalog and Content Discovery integration contract answers (§3.5)
   before starting Phase 1 seeding — both block real config, not just planning.

# Ad Network – Advertiser System Design Document (v2)

**Supersedes:** *Ad Network – Advertiser System Design Document* (v1)
**Aligned to:** *Advertising Models for AMUZE Application* (business requirement, Aug 2026)
**Audience:** backend developers, frontend developers, admins, stakeholders

---

## 1. Overview

This document defines the Advertiser-side Ad Network system. v1 modeled a single
generic "Facebook Post Boost" engine. v2 extends that same engine to support the four
advertising models defined in the business requirement, without discarding the working
budget/campaign infrastructure v1 already built.

The core insight: the four models are **one shared engine, differentiated by a small
set of fields**, not four separate systems. A `model_type` field on `campaigns` selects
which model a campaign belongs to; everything else (budget tracking, stats, approval,
notifications) is shared.

For the phase-by-phase build plan and its rationale, see
[`AD_MODELS_DEVELOPMENT_GUIDE.md`](AD_MODELS_DEVELOPMENT_GUIDE.md) — that document is
the working log; this one is the current-state reference.

---

## 2. Core Concepts

| Term | Meaning |
|---|---|
| Advertiser | A business or individual who creates campaigns |
| Admin | Internal Amuze staff — approves campaigns, manages system config, has unrestricted access |
| Post | Content to be promoted (existing use case: Content Discovery, legacy campaign target) |
| Ad Creative | *(planned, Phase 1)* A raw image/video asset + destination link, uploaded by an advertiser specifically to run as a Display Ad — distinct from a Post, which is organic content |
| Campaign | Budget + objective + model-type container |
| Ad Set | Audience targeting rules (age, gender, location, category) |
| Ad | Actual delivery unit — carries ad type and placement |
| Stats | Daily performance metrics, written by a scheduled worker |
| Model Type | Which of the four advertising models a campaign belongs to |
| Target | The polymorphic "what's being promoted" — a post, ad creative, profile, course, or product |
| Placement | Where in the app an ad/promotion can appear (e.g. Home Page, Comic, Novel) |

---

## 3. The Four Advertising Models

| `model_type` value | Model (business name) | Actor | Promotes (`target_type`) | Ad types |
|---|---|---|---|---|
| `display_ads` | Display Advertising | Business / Brand | `ad_creative` | banner, interstitial, reward_video, native, splash |
| `content_discovery` | Content Discovery | Creator | `post` | featured, trending, recommendation |
| `brand_campaign` | Brand & Campaign | Enterprise / Partner | `ad_creative` or `post`, or custom | custom (admin-defined per deal) |
| `self_service` | Self-Service Promotion | Creator / Seller / Instructor | `post`, `profile`, `course`, `product` | content_boost, profile_boost, course_boost, product_boost, search_sponsored |

A fifth track, **Watch & Earn** (rewarded video → points → wallet), is not a campaign
model — it has no advertiser-facing campaign at all, and is architecturally unrelated
(a rewards ledger, not a targeting/budget engine). Tracked separately; see §15.

Structural note: Display Advertising, Content Discovery, and Self-Service Promotion
share nearly identical flows (select target → select type → [targeting] → placement →
budget/duration → payment → report); Content Discovery is the one exception that skips
audience targeting. Brand & Campaign is the outlier — no self-service flow, admin
creates it directly with negotiated terms.

---

## 4. Authentication & Authorization

### 4.1 Identity

Two separate principal types, two separate login endpoints, sharing one JWT shape:

```
POST /auth/admin/login       -> { accessToken, user: { id, role: "Admin", ... } }
POST /auth/advertiser/login  -> { accessToken, user: { id, role: "Advertiser", ... } }
```

JWT payload: `{ sub: <user id>, email, role: "admin" | "advertiser" }`. `role` is signed
into the token itself (not just the login response), since that's the only thing later
requests carry.

### 4.2 Authorization layers

| Layer | Mechanism | Applies to |
|---|---|---|
| Authentication | `JwtAuthGuard` | Every controller except `auth` |
| Role restriction | `RolesGuard` + `@Roles('admin')` | Admin-only resources (`admin-users`, `system-configs`) and admin-only actions on mixed controllers (approve/reject) |
| Ownership | Per-resource `*OwnershipGuard` (`CampaignOwnershipGuard`, `AdOwnershipGuard`, `AdvertiserPostOwnershipGuard`, `AdvertiserProfileOwnershipGuard`) | Any route taking a resource `:id` — advertisers may only act on their own; admin bypasses |
| List scoping | Optional `advertiserId` filter on list queries | `GET /campaigns`, `GET /ads`, `GET /advertiser-posts`, `GET /advertiser-profiles` — advertisers see only their own rows, admin sees all |
| Create-time trust | `advertiserId`/`advertiser_id` in create DTOs is overwritten server-side from the caller's own token when the caller is an advertiser | `campaigns`, `advertiser-posts`, `advertiser-profiles` |

**Known gap:** `POST /ads` accepts a `campaignId` with no check that the campaign
belongs to the caller — an advertiser could currently attach an ad to another
advertiser's campaign. Not yet fixed; would require `AdModule` to depend on
`CampaignService`.

**Scope boundary:** the layers above govern the advertiser/admin management API only
(the surface `amuze-ads-customer` and `amuze-ads-FE` call). The future ad-serving
endpoint (§7.5) is called by the main Amuze app or its end users — a different caller
entirely — and must not be wrapped in this same guard chain.

---

## 5. Advertiser Account Structure

### 5.1 `advertisers`

| Field | Type | Notes |
|---|---|---|
| id | UUID PK | |
| name | varchar | |
| email | varchar | unique |
| phone | varchar | nullable |
| status | varchar | active \| suspended \| banned |
| verified | boolean | |
| password | text | hashed |
| last_login | timestamp | nullable |
| created_at / updated_at | timestamp | |

Admin can stop all of an advertiser's ads via `status`.

### 5.2 `admin-users`

| Field | Type | Notes |
|---|---|---|
| id | UUID PK | |
| name | varchar | |
| email | varchar | unique |
| password | text | hashed |
| isActive | boolean | |
| created_at / updated_at | timestamp | |

### 5.3 `advertiser_profiles` (business info)

| Field | Type | Notes |
|---|---|---|
| id | UUID PK | |
| advertiser_id | UUID FK → advertisers.id | |
| business_name, business_no, business_type, dica_number | varchar | |
| photo, website | varchar | |
| address | text | |
| country, timezone | varchar | |
| created_at / updated_at | timestamp | |

Used for billing, verification, and compliance.

---

## 6. Financial System

### 6.1 `transactions`

| Field | Type | Notes |
|---|---|---|
| id | UUID PK | |
| advertiser_id | UUID FK | |
| payment_method | varchar | kbzpay \| wave \| bank \| manual (free text; gateway not yet integrated) |
| amount | integer | |
| reference_type | varchar | campaign \| refund \| manual |
| reference_id | varchar | |
| created_at / updated_at | timestamp | |

**Status: not integrated with a real payment gateway.** Rows are persisted on
campaign create/update; no external kbzpay/wave call happens yet. Deferred — owned by
the advertiser-system maintainer, not scheduled in the phase plan.

Rule: wallet balance is calculated from transactions; all debits and credits must be
logged.

---

## 7. Content & Campaign System

### 7.1 `advertiser_posts`

| Field | Type | Notes |
|---|---|---|
| id | UUID PK | |
| advertiser_id | UUID FK | |
| title, description | varchar / text | |
| photo | varchar | |
| status | varchar | active \| disabled \| rejected |
| created_at / updated_at | timestamp | |

### 7.2 `campaigns`

| Field | Type | Notes |
|---|---|---|
| id | UUID PK | |
| advertiser_id | UUID FK | |
| name | varchar | |
| objective | varchar | reach \| traffic \| engagement — drives pricing mode (§11) |
| daily_budget, total_budget | integer | |
| spent_amount | integer | default 0, incremented daily by the stats worker |
| start_date, end_date | date | |
| status | varchar | draft \| pending \| active \| paused \| completed \| rejected |
| **model_type** | varchar | display_ads \| content_discovery \| brand_campaign \| self_service — default `display_ads` |
| **target_type** | varchar, nullable | post \| ad_creative \| profile \| course \| product |
| **target_id** | UUID, nullable | polymorphic reference paired with target_type |
| post_id | UUID FK, nullable-in-practice | legacy target reference; superseded by target_type/target_id but not yet retired (see note below) |
| created_at / updated_at | timestamp | |

**Migration note:** `model_type`, `target_type`, `target_id` exist in schema and are
accepted on create, but only `model_type` has a real default; `target_type`/`target_id`
are not yet consumed by any service logic. `post_id` remains the only field actually
used for campaign targeting until Phase 1 wires an `ad_creatives` table and retires it.

Rules: campaign auto-stops when `spent_amount >= total_budget` (daily cron); `pending`
campaigns require admin approval (§8).

### 7.3 `ad_sets` (targeting)

| Field | Type | Notes |
|---|---|---|
| id | UUID PK | |
| campaign_id | UUID FK | |
| age_min, age_max | integer | |
| gender | varchar | male \| female \| all |
| location | text | |
| category | varchar | interest / business category |
| created_at / updated_at | timestamp | |

Not required for `content_discovery` campaigns (that model has no audience-targeting
step in the requirement) — `ads.ad_set_id` is nullable to allow this.

### 7.4 `ads`

| Field | Type | Notes |
|---|---|---|
| id | UUID PK | |
| ad_set_id | UUID FK, **nullable** | nullable to support models without targeting |
| status | varchar | pending \| active \| paused \| rejected |
| **ad_type** | varchar, nullable | model-specific catalog value (§3) — schema only, not yet validated against a catalog |
| **placement_key** | varchar, nullable | which app surface — schema only, not yet validated against a catalog |
| created_at / updated_at | timestamp | |

New ads are created with `status: 'pending'` — no delivery without admin approval (§8).

### 7.5 `ad_creatives` — planned, not yet built

Needed for Phase 1 (Display Advertising). A Display ad isn't organic content, so it
can't reuse `advertiser_posts` — it needs its own table: uploaded image/video (via
MinIO), destination link, advertiser ownership. Once built, `campaigns.target_type =
'ad_creative'` points here.

### 7.6 Ad-serving endpoint — planned, not yet built

The one genuinely new engine piece in the whole plan: given a placement and viewer
context, query active `ads` joined to `ad_sets` targeting and return a servable ad.
`ad_sets`' targeting fields are currently written but never read by anything. Must use
a separate auth mechanism from the rest of this API (§4.2).

---

## 8. Campaign & Ad Approval Workflow

Both `campaigns` and `ads` follow the same shape: a restricted self-service transition
set for advertisers, and admin-only approve/reject for the pending state.

| Resource | Advertiser may change status | Admin-only |
|---|---|---|
| Campaign | `draft → pending` (submit), `active ↔ paused` | `pending → active` (`POST /campaigns/:id/approve`), `pending → rejected` (`POST /campaigns/:id/reject`) |
| Ad | `active ↔ paused` | `pending → active` (`POST /ads/:id/approve`), `pending → rejected` (`POST /ads/:id/reject`) |

Any transition outside the advertiser's allowed set is rejected with 403. Admin is not
restricted by the transition map (can set any status via the generic PATCH endpoints).

**Known gap:** the original rule "advertiser cannot edit approved campaigns" (v1 §11)
is not yet enforced — `PATCH /campaigns/:id/update` currently allows edits regardless of
campaign status, only ownership is checked. Not yet implemented.

---

## 9. Performance Tracking

### 9.1 `advertiser_ad_stats`

| Field | Type | Notes |
|---|---|---|
| id | UUID PK | |
| ad_id | UUID FK | |
| stat_date | date | UNIQUE with ad_id |
| impressions, clicks, spent, engagements | integer | |
| pricing_mode | varchar, nullable | CPM \| CPC \| CPE, resolved from the campaign's objective |
| max_impressions, max_clicks, max_engagements | integer | daily caps computed from `daily_budget` ÷ pricing rate |
| daily_budget | integer | snapshot of the campaign's daily budget for that day |
| created_at / updated_at | timestamp | |

Rules: stats are written by a background worker (`generateDailyAdStats`, daily cron);
never updated directly from the client. Deducts each active campaign's `spent_amount`
by its `daily_budget` **once per day, regardless of how many ads it has** — verified by
test (`daily-ad-stats.service.spec.ts`).

---

## 10. Notifications System

| Field | Type | Notes |
|---|---|---|
| id | UUID PK | |
| advertiser_id | UUID FK | |
| title, message | varchar / text | |
| read | boolean | default false |
| created_at / updated_at | timestamp | |

Used for: campaign/ad approval or rejection, status changes, budget exhaustion.

---

## 11. Pricing Model (System Config)

Stored in `system_configs` (category `pricing`), admin-editable without a deploy.

| Objective | Mode | Rate |
|---|---|---|
| Reach | CPM | 1,500 MMK / 1,000 impressions |
| Traffic | CPC | 200 MMK / click |
| Engagement | CPE | 120 MMK / engagement |

**Planned, not yet seeded:** `ad_type_catalog` and `placement_catalog` categories, using
the same `system_configs` mechanism, scoped by `model_type`. Known values so far —
ad types: banner, interstitial, reward_video, native, splash (Display Advertising, per
requirement doc); placements: Home Page, Comic, Novel, Story Tellings, Magazine
(confirmed list, may not be exhaustive).

---

## 12. Budget Calculation Examples

Daily budget: 10,000 MMK.

| Objective | Mode | Formula | Result |
|---|---|---|---|
| Reach | CPM | (daily_budget / rate) × 1000 | ≈ 6,666 impressions/day |
| Traffic | CPC | daily_budget / rate | 50 clicks/day |
| Engagement | CPE | daily_budget / rate | ≈ 83 engagements/day |

These exact figures are covered by `daily-ad-stats.service.spec.ts` and match the
original business requirement's worked example.

---

## 13. Campaign Lifecycle Flow

```
Advertiser creates post / ad creative
  -> Create campaign (select model_type)
  -> Select objective
  -> Set budget & duration
  -> Define targeting (skipped for content_discovery)
  -> Submit for approval  (status: draft -> pending)
  -> Admin approves / rejects
  -> Campaign runs        (status: pending -> active)
  -> Budget deducted daily (cron)
  -> Stats collected daily (cron)
  -> Notifications sent (approval, rejection, budget exhaustion)
  -> Campaign auto-completes when spent_amount >= total_budget
```

---

## 14. Key System Rules

**Enforced today:**
- No ad delivery without admin approval — ads are created `pending`, only admin can move them to `active`.
- Budget is deducted incrementally, once per campaign per day, regardless of ad count.
- Campaign stops automatically on budget exhaustion (daily cron).
- Advertisers can only read/modify their own campaigns, posts, profiles, and ads; admin has unrestricted access.
- All money-moving logic (budget deduction, campaign completion) has test coverage.

**Stated but not yet enforced:**
- Advertiser cannot edit an already-approved campaign (§8).
- All money movement must be auditable — `transactions` table exists, but no real gateway confirms money actually moved.
- Ad creation does not verify the referenced campaign belongs to the caller (§4.2).

---

## 15. Development Roadmap

| Phase | Scope | Status |
|---|---|---|
| Phase 0 — Foundation | Auth roles, ownership, migrations, approval workflow | Done (payment gateway excluded, deferred) |
| Phase 1 — Display Advertising | `ad_creatives` table, catalog seeding, DTO wiring, ad-serving endpoint | Not started |
| Phase 2 — Content Discovery | Catalog config, integration with feed/recommendation system | Not started — blocked on identifying who owns that integration |
| Phase 3 — Brand & Campaign | Admin-created custom campaigns, negotiated pricing override | Not started |
| Phase 4 — Self-Service Promotion | `target_type` expansion to profile/course/product, Search Sponsored Result | Not started — deferred to last by design |
| Watch & Earn | Rewarded video → points ledger → wallet | Not scheduled — independent of the four models above |

Full rationale, sequencing logic, and build-order reasoning for each phase are in
[`AD_MODELS_DEVELOPMENT_GUIDE.md`](AD_MODELS_DEVELOPMENT_GUIDE.md).

---

## 16. Open Decisions Needed

| Question | Blocks | Status |
|---|---|---|
| Complete placement list | Phase 1 catalog seeding | Partially answered: Home Page, Comic, Novel, Story Tellings, Magazine (provisional) |
| Who owns the feed/recommendation system | Phase 2 planning | Unknown |
| Brand & Campaign approval owner (admin ops vs. advertiser request) | Phase 3 UI scope | Unanswered |
| Where profile/course/product entities live (this service vs. main platform) | Phase 4 schema shape | Unanswered |

---

## 17. Future Enhancements (unchanged from v1)

- Frequency capping
- Auction-based bidding
- Interest & lookalike targeting
- Fraud & click abuse detection
- Real-time analytics dashboard

---

**Document Version:** 2.0
**Last Updated:** 2026-08-31

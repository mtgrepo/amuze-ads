# Advertiser System - Project Status Document

**Last Updated:** 2026-02-06
**Branch:** developer_branches/min_khant

---

## Project Overview

NestJS-based backend application for managing online advertising campaigns.

**Tech Stack:**
- Framework: NestJS
- Database: PostgreSQL with TypeORM
- Authentication: JWT with bcrypt
- File Storage: MinIO
- Configuration: Environment-based

---

## Module Status

### COMPLETED MODULES

| Module | Entity | Service | Controller | DTOs | Status |
|--------|--------|---------|------------|------|--------|
| Advertiser | Done | Done | Done | Done | COMPLETE |
| AdminUser | Done | Done | Done | Done | COMPLETE |
| AdvertiserProfile | Done | Done | Done | Done | COMPLETE |
| AdvertiserPosts | Done | Done | Done | Done | COMPLETE |
| Notification | Done | Done | Done | Done | COMPLETE |
| SystemConfigs | Done | Done | Done | Done | COMPLETE |
| Auth | Done | Done | Done | Done | COMPLETE |
| Minio | - | Done | - | - | COMPLETE |

### PARTIALLY COMPLETE MODULES

| Module | Entity | Service | Controller | DTOs | Missing |
|--------|--------|---------|------------|------|---------|
| Transaction | Done | Partial | Partial | Done | getAll, getById, getByAdvertiser, update, delete |

### NOT IMPLEMENTED MODULES

| Module | Entity | Service | Controller | DTOs | Status |
|--------|--------|---------|------------|------|--------|
| Campaign | Done | Empty | Empty | Missing | NOT STARTED |
| AdSet | Done | Empty | Empty | Missing | NOT STARTED |
| Ad | Done | Empty | Empty | Missing | NOT STARTED |
| DailyAdStats | Done | Empty | Empty | Missing | NOT STARTED |

---

## Entity Relationships

```
Advertiser
├── AdvertiserProfile (1:N)
├── Transactions (1:N)
├── Notifications (1:N)
├── AdvertiserPosts (1:N)
│   └── Campaigns (1:N)
└── Campaigns (1:N)
    └── AdSets (1:N)
        └── Ads (1:N)
            └── AdvertiserAdStats (1:N)

AdminUser (standalone)

SystemConfig (standalone)
```

---

## Database Tables

| Table Name | Entity File | Status |
|------------|-------------|--------|
| advertisers | advertiser.entity.ts | Complete |
| admin_users | admin-user.entity.ts | Complete |
| advertiser_profiles | advertiser-profile.entity.ts | Complete |
| advertiser_posts | advertiser-post.entity.ts | Complete |
| campaigns | campaign.entity.ts | Complete |
| ad_sets | ad-sets.entity.ts | Complete |
| ads | ad.entity.ts | Complete |
| advertiser_ad_stats | daily-ad-stats.entity.ts | Complete |
| notifications | notification.entity.ts | Complete |
| transactions | transaction.entity.ts | Complete |
| system_configs | system-config.entity.ts | Complete |

---

## API Endpoints

### Advertiser Module
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /advertisers | Create advertiser |
| GET | /advertisers | Get all advertisers |
| GET | /advertisers/:id | Get advertiser by ID |
| PATCH | /advertisers/:id | Update advertiser |
| DELETE | /advertisers/:id | Delete advertiser |

### AdminUser Module
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /admin-users | Create admin |
| GET | /admin-users | Get all admins |
| GET | /admin-users/:id | Get admin by ID |
| PATCH | /admin-users/:id | Update admin |
| DELETE | /admin-users/:id | Delete admin |

### AdvertiserProfile Module
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /advertiser-profiles | Create profile (with file) |
| GET | /advertiser-profiles | Get all profiles |
| GET | /advertiser-profiles/:id | Get profile by ID |
| PATCH | /advertiser-profiles/:id | Update profile (with file) |
| DELETE | /advertiser-profiles/:id | Delete profile |

### AdvertiserPosts Module
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /advertiser-posts | Create post (with file) |
| GET | /advertiser-posts | Get all posts |
| GET | /advertiser-posts/:id | Get post by ID |
| PATCH | /advertiser-posts/:id | Update post (with file) |
| DELETE | /advertiser-posts/:id | Delete post |

### Notification Module
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /notifications | Create notification |
| GET | /notifications/advertiser/:advertiserId | Get by advertiser |
| PATCH | /notifications/:id/read | Mark as read |
| PATCH | /notifications/advertiser/:advertiserId/read-all | Mark all as read |

### SystemConfigs Module
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /system-configs | Create config |
| GET | /system-configs | Get all configs |
| GET | /system-configs/category/:category | Get by category |
| GET | /system-configs/key/:configKey | Get by config key |
| PATCH | /system-configs/:id | Update config |
| PATCH | /system-configs/:id/inactive | Inactive config |

### Transaction Module (Incomplete)
| Method | Endpoint | Description | Status |
|--------|----------|-------------|--------|
| POST | /transactions | Create transaction | Done |
| GET | /transactions | Get all transactions | TODO |
| GET | /transactions/:id | Get transaction by ID | TODO |
| GET | /transactions/advertiser/:advertiserId | Get by advertiser | TODO |
| PATCH | /transactions/:id | Update transaction | TODO |
| DELETE | /transactions/:id | Delete transaction | TODO |

### Auth Module
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /auth/login | Login (returns JWT) |

### Campaign Module (Not Implemented)
| Method | Endpoint | Description | Status |
|--------|----------|-------------|--------|
| POST | /campaigns | Create campaign | TODO |
| GET | /campaigns | Get all campaigns | TODO |
| GET | /campaigns/:id | Get campaign by ID | TODO |
| GET | /campaigns/advertiser/:advertiserId | Get by advertiser | TODO |
| PATCH | /campaigns/:id | Update campaign | TODO |
| DELETE | /campaigns/:id | Delete campaign | TODO |

### AdSet Module (Not Implemented)
| Method | Endpoint | Description | Status |
|--------|----------|-------------|--------|
| POST | /ad-sets | Create ad set | TODO |
| GET | /ad-sets | Get all ad sets | TODO |
| GET | /ad-sets/:id | Get ad set by ID | TODO |
| GET | /ad-sets/campaign/:campaignId | Get by campaign | TODO |
| PATCH | /ad-sets/:id | Update ad set | TODO |
| DELETE | /ad-sets/:id | Delete ad set | TODO |

### Ad Module (Not Implemented)
| Method | Endpoint | Description | Status |
|--------|----------|-------------|--------|
| POST | /ads | Create ad | TODO |
| GET | /ads | Get all ads | TODO |
| GET | /ads/:id | Get ad by ID | TODO |
| GET | /ads/ad-set/:adSetId | Get by ad set | TODO |
| PATCH | /ads/:id | Update ad | TODO |
| DELETE | /ads/:id | Delete ad | TODO |

### DailyAdStats Module (Not Implemented)
| Method | Endpoint | Description | Status |
|--------|----------|-------------|--------|
| POST | /daily-ad-stats | Create stats | TODO |
| GET | /daily-ad-stats/ad/:adId | Get by ad | TODO |
| GET | /daily-ad-stats/ad/:adId/range | Get by date range | TODO |

---

## System Configuration (Pricing Model)

Sample data for `system_configs` table:

### Pricing - Reach (CPM)
```json
{
  "category": "pricing",
  "configKey": "reach",
  "configValue": {
    "mode": "CPM",
    "rate": 1500,
    "currency": "MMK",
    "unit": 1000,
    "unitLabel": "impressions"
  },
  "description": "Cost per 1000 impressions for Reach objective"
}
```

### Pricing - Traffic (CPC)
```json
{
  "category": "pricing",
  "configKey": "traffic",
  "configValue": {
    "mode": "CPC",
    "rate": 200,
    "currency": "MMK",
    "unit": 1,
    "unitLabel": "click"
  },
  "description": "Cost per click for Traffic objective"
}
```

### Pricing - Engagement (CPE)
```json
{
  "category": "pricing",
  "configKey": "engagement",
  "configValue": {
    "mode": "CPE",
    "rate": 120,
    "currency": "MMK",
    "unit": 1,
    "unitLabel": "engagement"
  },
  "description": "Cost per engagement for Engagement objective"
}
```

---

## TODO List

### High Priority
- [ ] Implement Campaign module (service, controller, DTOs)
- [ ] Implement AdSet module (service, controller, DTOs)
- [ ] Implement Ad module (service, controller, DTOs)
- [ ] Implement DailyAdStats module (service, controller, DTOs)

### Medium Priority
- [ ] Complete Transaction module (add missing CRUD methods)
- [ ] Add modules to app.module.ts (Campaign, AdSet, Ad, DailyAdStats)

### Low Priority
- [ ] Add validation pipes globally
- [ ] Add Swagger documentation
- [ ] Add unit tests
- [ ] Add e2e tests
- [ ] Disable synchronize in production

---

## File Structure

```
src/
├── ads/
│   ├── entities/
│   │   └── ad.entity.ts ✅
│   ├── dto/ ❌
│   ├── ad.service.ts ❌
│   ├── ad.controller.ts ❌
│   └── ad.module.ts ❌
├── ad-sets/
│   ├── entities/
│   │   └── ad-sets.entity.ts ✅
│   ├── dto/ ❌
│   ├── ad-sets.service.ts ❌
│   ├── ad-sets.controller.ts ❌
│   └── ad-sets.module.ts ❌
├── admin-users/
│   ├── entities/
│   │   └── admin-user.entity.ts ✅
│   ├── dto/ ✅
│   ├── admin-user.service.ts ✅
│   ├── admin-user.controller.ts ✅
│   └── admin-user.module.ts ✅
├── advertiser-posts/
│   ├── entities/
│   │   └── advertiser-post.entity.ts ✅
│   ├── dto/ ✅
│   ├── advertiser-posts.service.ts ✅
│   ├── advertiser-posts.controller.ts ✅
│   └── advertiser-posts.module.ts ✅
├── advertiser-profile/
│   ├── entities/
│   │   └── advertiser-profile.entity.ts ✅
│   ├── dto/ ✅
│   ├── advertiser-profiles.service.ts ✅
│   ├── advertiser-profiles.controller.ts ✅
│   └── advertiser-profiles.module.ts ✅
├── advertisers/
│   ├── entities/
│   │   └── advertiser.entity.ts ✅
│   ├── dto/ ✅
│   ├── advertiser.service.ts ✅
│   ├── advertiser.controller.ts ✅
│   └── advertiser.module.ts ✅
├── auth/
│   ├── dto/ ✅
│   ├── auth.service.ts ✅
│   ├── auth.controller.ts ✅
│   ├── auth.module.ts ✅
│   ├── jwt.strategy.ts ✅
│   └── jwt-auth.guard.ts ✅
├── campaigns/
│   ├── entities/
│   │   └── campaign.entity.ts ✅
│   ├── dto/ ❌
│   ├── campaign.service.ts ❌
│   ├── campaign.controller.ts ❌
│   └── campaign.module.ts ❌
├── daily-ad-stats/
│   ├── entities/
│   │   └── daily-ad-stats.entity.ts ✅
│   ├── dto/ ❌
│   ├── daily-ad-stats.service.ts ❌
│   ├── daily-ad-stats.controller.ts ❌
│   └── daily-ad-stats.module.ts ❌
├── minio/
│   ├── minio.service.ts ✅
│   └── minio.module.ts ✅
├── notifications/
│   ├── entities/
│   │   └── notification.entity.ts ✅
│   ├── dto/ ✅
│   ├── notification.service.ts ✅
│   ├── notification.controller.ts ✅
│   └── notification.module.ts ✅
├── system-configs/
│   ├── entities/
│   │   └── system-config.entity.ts ✅
│   ├── dto/ ✅
│   ├── system-configs.service.ts ✅
│   ├── system-configs.controller.ts ✅
│   └── system-configs.module.ts ✅
├── transactions/
│   ├── entities/
│   │   └── transaction.entity.ts ✅
│   ├── dto/ ✅
│   ├── transaction.service.ts ⚠️ (partial)
│   ├── transaction.controller.ts ⚠️ (partial)
│   └── transaction.module.ts ✅
├── common/
│   └── utils/
│       └── password.utils.ts ✅
├── app.module.ts ✅
├── app.controller.ts ✅
├── app.service.ts ✅
└── main.ts ✅
```

Legend: ✅ Complete | ⚠️ Partial | ❌ Missing/Empty

---

## Environment Variables Required

```env
# Database
DB_HOST=
DB_PORT=
DB_USER=
DB_PASS=
DB_NAME=

# JWT
JWT_SECRET=

# MinIO
MINIO_ENDPOINT=
MINIO_PORT=
MINIO_ACCESS_KEY=
MINIO_SECRET_KEY=
MINIO_BUCKET_NAME=
MINIO_USE_SSL=
```

---

## Git Commit History (Recent)

```
8fd0eeb System Configuration Added
7845ead Another Update for Entities
11789e9 Database Setup Partial Complete
bac8246 Merge Conflict Fix
134f7d7 Post CRUD
83c7a1d Merge branch 'developer_branches/ingyin_phyo'
9d988bd Notification Complete
df39628 Transaction Complete
26a1c1b Minio Object Storage Complete
7706e0f JWT Auth Applied
```

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

## Module Status Summary

| Module | Status | Notes |
|--------|--------|-------|
| Advertisers | COMPLETE | All components fully implemented |
| Admin-Users | COMPLETE | All components fully implemented |
| Advertiser-Profile | COMPLETE | All components fully implemented |
| Advertiser-Posts | COMPLETE | All components fully implemented |
| Campaigns | COMPLETE | All components fully implemented |
| Ad-Sets | COMPLETE | All components fully implemented |
| Ads | COMPLETE | Create, Read, UpdateStatus (no delete needed) |
| Daily-Ad-Stats | COMPLETE | All components fully implemented |
| Transactions | COMPLETE | Only create needed |
| Notifications | COMPLETE | All components fully implemented |
| System-Configs | COMPLETE | All components fully implemented |
| Auth | COMPLETE | All components fully implemented |
| Minio | COMPLETE | Utility service fully implemented |

**Overall: 13/13 modules complete**

---

## Detailed Module Status

### COMPLETED MODULES

#### 1. Advertisers - COMPLETE
- Entity: Full (UUID, name, email, phone, status, verified, password, lastLogin, relationships)
- Service: Full CRUD
- Controller: Full endpoints with JwtAuthGuard
- DTOs: CreateAdvertiserDTO, UpdateAdvertiserDTO

#### 2. Admin-Users - COMPLETE
- Entity: Full (UUID, name, email, password, isActive)
- Service: Full CRUD + findByEmail
- Controller: Full endpoints with JwtAuthGuard
- DTOs: CreateAdminUserDTO, UpdateAdminUserDTO

#### 3. Advertiser-Profile - COMPLETE
- Entity: Full (UUID, advertiser_id FK, business details)
- Service: Full CRUD
- Controller: Full endpoints with file upload (Minio)
- DTOs: CreateAdvertiserProfileDto, UpdateAdvertiserProfileDto

#### 4. Advertiser-Posts - COMPLETE
- Entity: Full (UUID, advertiser_id FK, title, description, photo, status)
- Service: Full CRUD
- Controller: Full endpoints with file upload (Minio)
- DTOs: CreateAdvertiserPostDto, UpdateAdvertiserPostDto

#### 5. Campaigns - COMPLETE
- Entity: Full (UUID, name, objective, budgets, dates, status, relationships)
- Service: Full CRUD
- Controller: Full endpoints with date conversion
- DTOs: CreateCampaignDTO, UpdateCampaignDTO

#### 6. Ad-Sets - COMPLETE
- Entity: Full (UUID, targeting: age, gender, location, category, campaign_id FK)
- Service: Full CRUD
- Controller: Full endpoints with JwtAuthGuard
- DTOs: CreateAdSetsDTO, UpdateAdSetsDTO

#### 7. Daily-Ad-Stats - COMPLETE
- Entity: Full (UUID, ad_id FK, startDate, impressions, clicks, spent)
- Service: create, findByAdId, findByDateRange
- Controller: POST, GET by adId, GET by date range
- DTOs: CreateDailyAdStatsDTO

#### 8. Notifications - COMPLETE
- Entity: Full (UUID, advertiser_id FK, title, message, read)
- Service: create, findByAdvertiser, markAsRead, markAllAsRead
- Controller: Full endpoints with JwtAuthGuard
- DTOs: CreateNotificationDTO

#### 9. System-Configs - COMPLETE
- Entity: Full (UUID, category, configKey, configValue JSONB, description, isActive)
- Service: Full CRUD + getByCategory, getByConfigKey, inactiveById
- Controller: Full endpoints with JwtAuthGuard
- DTOs: CreateSystemConfigDTO, UpdateSystemConfigDTO

#### 10. Auth - COMPLETE
- Service: login with JWT token generation
- Controller: POST /auth/login
- Guards: JwtAuthGuard, JwtStrategy
- DTOs: LoginDTO

#### 11. Minio - COMPLETE
- Service: upload, getPresignedUrl, delete
- Global module for file storage

---

#### 12. Ads - COMPLETE
- Entity: Full (UUID, status, ad_set_id FK, relationships)
- Service: Full (createAd, findAdList, findAdById, updateStatus)
- Controller: Full endpoints with JwtAuthGuard
- DTOs: CreateAdDTO

#### 13. Transactions - COMPLETE
- Entity: Full (UUID, advertiser_id FK, paymentMethod, amount, referenceType, referenceId)
- Service: createTransaction (only create needed)
- Controller: POST endpoint with JwtAuthGuard
- DTOs: CreateTransactionDTO

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

## API Endpoints

### Advertiser Module
| Method | Endpoint | Description | Status |
|--------|----------|-------------|--------|
| POST | /advertisers | Create advertiser | Done |
| GET | /advertisers | Get all advertisers | Done |
| GET | /advertisers/:id | Get advertiser by ID | Done |
| PATCH | /advertisers/:id/update | Update advertiser | Done |
| DELETE | /advertisers/:id | Delete advertiser | Done |

### AdminUser Module
| Method | Endpoint | Description | Status |
|--------|----------|-------------|--------|
| POST | /admin-users | Create admin | Done |
| GET | /admin-users | Get all admins | Done |
| GET | /admin-users/:id | Get admin by ID | Done |
| PATCH | /admin-users/:id/update | Update admin | Done |
| DELETE | /admin-users/:id | Delete admin | Done |

### AdvertiserProfile Module
| Method | Endpoint | Description | Status |
|--------|----------|-------------|--------|
| POST | /advertiser-profiles | Create profile (with file) | Done |
| GET | /advertiser-profiles | Get all profiles | Done |
| GET | /advertiser-profiles/:id | Get profile by ID | Done |
| PATCH | /advertiser-profiles/:id | Update profile (with file) | Done |
| DELETE | /advertiser-profiles/:id | Delete profile | Done |

### AdvertiserPosts Module
| Method | Endpoint | Description | Status |
|--------|----------|-------------|--------|
| POST | /advertiser-posts | Create post (with file) | Done |
| GET | /advertiser-posts | Get all posts | Done |
| GET | /advertiser-posts/:id | Get post by ID | Done |
| PATCH | /advertiser-posts/:id | Update post (with file) | Done |
| DELETE | /advertiser-posts/:id | Delete post | Done |

### Campaign Module
| Method | Endpoint | Description | Status |
|--------|----------|-------------|--------|
| POST | /campaigns | Create campaign | Done |
| GET | /campaigns | Get all campaigns | Done |
| GET | /campaigns/:id | Get campaign by ID | Done |
| PATCH | /campaigns/:id/update | Update campaign | Done |
| DELETE | /campaigns/:id | Delete campaign | Done |

### AdSet Module
| Method | Endpoint | Description | Status |
|--------|----------|-------------|--------|
| POST | /ad-sets | Create ad set | Done |
| GET | /ad-sets | Get all ad sets | Done |
| GET | /ad-sets/:id | Get ad set by ID | Done |
| PATCH | /ad-sets/:id/update | Update ad set | Done |
| DELETE | /ad-sets/:id | Delete ad set | Done |

### Ad Module
| Method | Endpoint | Description | Status |
|--------|----------|-------------|--------|
| POST | /ads | Create ad | Done |
| GET | /ads | Get all ads | Done |
| GET | /ads/:id | Get ad by ID | Done |
| PATCH | /ads/:id/status | Update ad status | Done |

### DailyAdStats Module
| Method | Endpoint | Description | Status |
|--------|----------|-------------|--------|
| POST | /daily-ad-stats | Create stats | Done |
| GET | /daily-ad-stats/ad/:adId | Get by ad ID | Done |
| GET | /daily-ad-stats/ad/:adId/range | Get by date range | Done |

### Notification Module
| Method | Endpoint | Description | Status |
|--------|----------|-------------|--------|
| POST | /notifications | Create notification | Done |
| GET | /notifications/:advertiserId | Get by advertiser | Done |
| PATCH | /notifications/read/:notificationId | Mark as read | Done |
| PATCH | /notifications/read-all/:advertiserId | Mark all as read | Done |

### SystemConfigs Module
| Method | Endpoint | Description | Status |
|--------|----------|-------------|--------|
| POST | /system-configs | Create config | Done |
| GET | /system-configs | Get all configs | Done |
| GET | /system-configs/category/:category | Get by category | Done |
| GET | /system-configs/key/:configKey | Get by config key | Done |
| PATCH | /system-configs/:id | Update config | Done |
| PATCH | /system-configs/:id/inactive | Inactive config | Done |

### Transaction Module
| Method | Endpoint | Description | Status |
|--------|----------|-------------|--------|
| POST | /transactions | Create transaction | Done |

### Auth Module
| Method | Endpoint | Description | Status |
|--------|----------|-------------|--------|
| POST | /auth/login | Login (returns JWT) | Done |

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

### Future Enhancements
- [ ] Add validation pipes globally
- [ ] Add Swagger documentation
- [ ] Add unit tests
- [ ] Add e2e tests
- [ ] Disable synchronize in production

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

## File Structure

```
src/
├── ads/                        ✅ COMPLETE
├── ad-sets/                    ✅ COMPLETE
├── admin-users/                ✅ COMPLETE
├── advertiser-posts/           ✅ COMPLETE
├── advertiser-profile/         ✅ COMPLETE
├── advertisers/                ✅ COMPLETE
├── auth/                       ✅ COMPLETE
├── campaigns/                  ✅ COMPLETE
├── daily-ad-stats/             ✅ COMPLETE
├── minio/                      ✅ COMPLETE
├── notifications/              ✅ COMPLETE
├── system-configs/             ✅ COMPLETE
├── transactions/               ✅ COMPLETE
├── common/
│   └── utils/
│       └── password.utils.ts   ✅ COMPLETE
├── app.module.ts               ✅ COMPLETE
├── app.controller.ts           ✅ COMPLETE
├── app.service.ts              ✅ COMPLETE
└── main.ts                     ✅ COMPLETE
```

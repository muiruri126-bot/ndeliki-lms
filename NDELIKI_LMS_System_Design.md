# NDELIKI LIMITED — Loan Management System: Full Redesign & Implementation Plan

**Document Version:** 1.0  
**Date:** 2026-03-01  
**Author:** System Architect  
**Status:** Design & Implementation Blueprint  

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [High-Level Architecture](#2-high-level-architecture)
3. [Technology Stack Recommendation](#3-technology-stack-recommendation)
4. [User Roles & Permissions (RBAC)](#4-user-roles--permissions-rbac)
5. [Database Schema](#5-database-schema)
6. [Core Functional Modules](#6-core-functional-modules)
7. [REST API Specification](#7-rest-api-specification)
8. [Front-End UX Structure](#8-front-end-ux-structure)
9. [Notifications System](#9-notifications-system)
10. [Audit & Compliance](#10-audit--compliance)
11. [Migration Plan](#11-migration-plan)
12. [Security, Performance & Maintainability](#12-security-performance--maintainability)
13. [Deployment & Infrastructure](#13-deployment--infrastructure)
14. [Implementation Roadmap](#14-implementation-roadmap)

---

## 1. Executive Summary

### Current State

The existing NDELIKI LIMITED Loan Management System is a **single-page HTML file** (~6,300 lines) that runs entirely in the browser. It uses:

- **Bootstrap 5** for UI, **Chart.js** for charts, **jsPDF** for PDF export
- **localStorage** for all data (loans, users, sessions, password-reset tokens)
- **Hard-coded roles** (`admin` / `user`) with plain-text passwords in localStorage
- **Flat-rate interest calculation**: `totalDue = principal + (principal × rate / 100)`
- **No real backend**, no database, no server-side security

The system currently manages ~100 loans with borrower names, contacts, ID numbers, principals up to KES 50,000+, weekly repayment schedules, and payment histories.

### Target State

A **production-grade, multi-user, role-based, cloud-deployed** loan management system with:

- Secure server-side authentication and authorization
- Persistent relational database
- Separate Staff Portal and Borrower Self-Service Portal
- Configurable loan products (weekly/monthly, flat/reducing balance interest)
- Complete audit trail
- Email/SMS notifications
- Mobile-responsive design
- API-first architecture enabling future mobile apps and integrations

---

## 2. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLIENTS                                      │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │ Staff Portal  │  │  Borrower    │  │  Future: Mobile App      │  │
│  │ (React SPA)  │  │  Portal      │  │  (React Native / Flutter)│  │
│  │              │  │  (React SPA) │  │                          │  │
│  └──────┬───────┘  └──────┬───────┘  └───────────┬──────────────┘  │
│         │                 │                       │                  │
└─────────┼─────────────────┼───────────────────────┼──────────────────┘
          │ HTTPS           │ HTTPS                 │ HTTPS
          ▼                 ▼                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     REVERSE PROXY / CDN                             │
│                  (Nginx / Cloudflare / AWS ALB)                     │
│              TLS Termination · Rate Limiting · CORS                 │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     API GATEWAY / BACKEND                           │
│                     Node.js + Express.js                            │
│                                                                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌───────────┐             │
│  │   Auth   │ │ Borrower │ │   Loan   │ │  Payment  │             │
│  │ Service  │ │ Service  │ │ Service  │ │  Service  │             │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └─────┬─────┘             │
│       │             │            │              │                    │
│  ┌────┴─────┐ ┌─────┴────┐ ┌────┴─────┐ ┌─────┴─────┐            │
│  │  Report  │ │  Notif   │ │  Audit   │ │  Document │            │
│  │ Service  │ │ Service  │ │ Service  │ │  Service  │            │
│  └──────────┘ └──────────┘ └──────────┘ └───────────┘             │
│                                                                     │
│  Middleware: Auth · RBAC · Validation · Error Handling · Logging    │
└───────────────────────────┬─────────────────────────────────────────┘
                            │
              ┌─────────────┼──────────────┐
              ▼             ▼              ▼
┌──────────────────┐ ┌────────────┐ ┌──────────────┐
│   PostgreSQL     │ │   Redis    │ │ File Storage │
│   (Primary DB)   │ │  (Cache &  │ │ (S3 / Azure  │
│                  │ │  Sessions) │ │  Blob Store) │
│  - Users         │ │            │ │              │
│  - Borrowers     │ │  - JWT     │ │  - ID Docs   │
│  - Loans         │ │    Blacklist│ │  - Photos    │
│  - Payments      │ │  - Rate    │ │  - Statements│
│  - Audit Logs    │ │    Limits  │ │              │
│  - Documents     │ │  - Cached  │ │              │
│  - Notifications │ │    Reports │ │              │
└──────────────────┘ └────────────┘ └──────────────┘
```

### Architecture Principles

| Principle | Implementation |
|-----------|---------------|
| **Separation of Concerns** | API backend separate from front-end SPAs |
| **Stateless API** | JWT-based auth; no server-side session state (Redis for blacklist only) |
| **API-First** | All UI interactions go through documented REST endpoints |
| **Layered Backend** | Routes → Controllers → Services → Repositories → Database |
| **Secure by Default** | HTTPS everywhere, input validation at every layer, principle of least privilege |

---

## 3. Technology Stack Recommendation

### Recommended Stack (Option A — JavaScript/TypeScript Full-Stack)

| Layer | Technology | Justification |
|-------|-----------|---------------|
| **Backend Runtime** | **Node.js 20 LTS + Express.js** | Same language as front-end. Large ecosystem. Excellent for I/O-bound microfinance workloads. Team can share skills. |
| **Backend Language** | **TypeScript** | Type safety prevents bugs in financial calculations. Better IDE support. |
| **ORM** | **Prisma** | Type-safe database access, auto-generated migrations, excellent PostgreSQL support. |
| **Frontend** | **React 18 + TypeScript** | Component-based, massive ecosystem, great for complex dashboards. |
| **UI Framework** | **Tailwind CSS + shadcn/ui** | Utility-first CSS for rapid responsive design. shadcn/ui provides accessible, customizable components. |
| **Database** | **PostgreSQL 16** | ACID-compliant, excellent for financial data. JSON support for flexible fields. Free and battle-tested. |
| **Cache** | **Redis 7** | Session blacklist, rate limiting, report caching. |
| **File Storage** | **AWS S3 / Azure Blob** | Scalable document storage with pre-signed URLs for secure access. |
| **Charts** | **Recharts** (React charts library) | Declarative, React-native charting. Replaces Chart.js. |
| **PDF Generation** | **Puppeteer** or **@react-pdf/renderer** (server-side) | Server-generated PDFs, more reliable than client-side jsPDF. |
| **Email** | **Nodemailer + SendGrid/Mailgun** | Transactional emails for notifications. |
| **SMS** | **Africa's Talking API** or **Twilio** | SMS notifications, common in Kenyan microfinance. |
| **Testing** | **Jest + Supertest + React Testing Library + Playwright** | Full test coverage across stack. |

### Alternative Stack (Option B — Python/Django)

| Layer | Technology |
|-------|-----------|
| Backend | Django 5 + Django REST Framework |
| Frontend | React 18 (same) |
| Database | PostgreSQL (same) |
| ORM | Django ORM (built-in) |

**Why Option A over Option B:** The existing team already works with JavaScript (current app is pure JS). Node.js offers a unified language across the stack, reducing context-switching. Express.js is lightweight and well-suited for the scale of a microfinance operation (hundreds to low thousands of loans). Django is excellent but introduces Python as a second language.

---

## 4. User Roles & Permissions (RBAC)

### 4.1 Role Definitions

#### Role: SYSTEM_ADMIN

**Description:** Full system control. Manages users, configuration, and has override access.

| Module | Create | Read | Update | Delete | Special |
|--------|--------|------|--------|--------|---------|
| Users & Roles | ✅ | ✅ | ✅ | ✅ | Assign/revoke roles |
| System Config | — | ✅ | ✅ | — | Set interest methods, penalties, loan products |
| Borrowers | ✅ | ✅ All | ✅ | ✅ (soft) | Merge duplicates |
| Loans | ✅ | ✅ All | ✅ | ✅ (soft) | Override approval, write-off |
| Payments | ✅ | ✅ All | ✅ (reversal) | ✅ (reversal) | Reverse/void payments |
| Reports | — | ✅ All | — | — | Export all data |
| Audit Logs | — | ✅ | — | — | Read-only, cannot modify |
| Documents | ✅ | ✅ All | ✅ | ✅ | — |
| Notifications | — | ✅ | ✅ templates | — | Configure channels |
| Data Import/Export | ✅ | ✅ | — | — | Bulk import/export |

#### Role: LOAN_OFFICER

**Description:** Day-to-day loan operations. Creates borrowers, originates loans, manages collections.

| Module | Create | Read | Update | Delete | Special |
|--------|--------|------|--------|--------|---------|
| Users & Roles | — | Own profile | Own profile | — | — |
| Borrowers | ✅ | ✅ Assigned | ✅ Assigned | — | Flag risk |
| Loans | ✅ | ✅ Assigned | ✅ (within limits) | — | Submit for approval, approve ≤ limit |
| Payments | ✅ | ✅ Assigned | — | — | Record payments |
| Reports | — | ✅ Own portfolio | — | — | Portfolio summary |
| Audit Logs | — | ✅ Own actions | — | — | — |
| Documents | ✅ | ✅ Assigned borrowers | — | — | Upload KYC docs |

#### Role: ACCOUNTANT

**Description:** Financial operations, reconciliation, reporting.

| Module | Create | Read | Update | Delete | Special |
|--------|--------|------|--------|--------|---------|
| Users & Roles | — | Own profile | Own profile | — | — |
| Borrowers | — | ✅ All (read-only) | — | — | — |
| Loans | — | ✅ All (read-only) | — | — | — |
| Payments | ✅ | ✅ All | ✅ (adjustments) | — | Record adjustments, refunds |
| Reports | — | ✅ All financial | — | — | Generate & export reports |
| Audit Logs | — | ✅ Financial actions | — | — | — |
| Reconciliation | ✅ | ✅ | ✅ | — | Bank reconciliation |

#### Role: BORROWER

**Description:** External user. Self-service access to own data only.

| Module | Create | Read | Update | Delete | Special |
|--------|--------|------|--------|--------|---------|
| Own Profile | — | ✅ Own | ✅ (contact info) | — | — |
| Own Loans | — | ✅ Own | — | — | View schedule, statements |
| Own Payments | — | ✅ Own | — | — | View history |
| Own Documents | — | ✅ Own | — | — | Download own docs |
| Payment Requests | ✅ | ✅ Own | — | — | Initiate payment notification |
| Notifications | — | ✅ Own | — | — | View own alerts |

**Critical Data Isolation Rule:** A borrower MUST NEVER see any data belonging to another borrower. Every query for a borrower role MUST filter by `borrower_id = authenticated_user.borrower_id`.

#### Role: INVESTOR (Future)

| Module | Create | Read | Update | Delete |
|--------|--------|------|--------|--------|
| Portfolio | — | ✅ Funded loans (anonymized borrower data) | — | — |
| Returns | — | ✅ Own returns | — | — |
| Reports | — | ✅ Portfolio performance | — | — |

### 4.2 Permission Implementation

```typescript
// permissions.ts — Central permission definitions
export enum Permission {
  // Users
  USERS_CREATE        = 'users:create',
  USERS_READ          = 'users:read',
  USERS_UPDATE        = 'users:update',
  USERS_DELETE        = 'users:delete',
  
  // Borrowers
  BORROWERS_CREATE    = 'borrowers:create',
  BORROWERS_READ_ALL  = 'borrowers:read:all',
  BORROWERS_READ_OWN  = 'borrowers:read:own',
  BORROWERS_READ_ASSIGNED = 'borrowers:read:assigned',
  BORROWERS_UPDATE    = 'borrowers:update',
  BORROWERS_DELETE    = 'borrowers:delete',
  
  // Loans
  LOANS_CREATE        = 'loans:create',
  LOANS_READ_ALL      = 'loans:read:all',
  LOANS_READ_OWN      = 'loans:read:own',
  LOANS_READ_ASSIGNED = 'loans:read:assigned',
  LOANS_UPDATE        = 'loans:update',
  LOANS_APPROVE       = 'loans:approve',
  LOANS_WRITE_OFF     = 'loans:write_off',
  LOANS_DELETE        = 'loans:delete',
  
  // Payments
  PAYMENTS_CREATE     = 'payments:create',
  PAYMENTS_READ_ALL   = 'payments:read:all',
  PAYMENTS_READ_OWN   = 'payments:read:own',
  PAYMENTS_REVERSE    = 'payments:reverse',
  PAYMENTS_ADJUST     = 'payments:adjust',
  
  // Reports
  REPORTS_FINANCIAL   = 'reports:financial',
  REPORTS_PORTFOLIO   = 'reports:portfolio',
  REPORTS_EXPORT      = 'reports:export',
  
  // System
  SYSTEM_CONFIG       = 'system:config',
  AUDIT_READ          = 'audit:read',
  DATA_IMPORT         = 'data:import',
  DATA_EXPORT         = 'data:export',
  NOTIFICATIONS_CONFIG = 'notifications:config',
  DOCUMENTS_MANAGE    = 'documents:manage',
}

export const RolePermissions: Record<string, Permission[]> = {
  SYSTEM_ADMIN: [/* all permissions */],
  LOAN_OFFICER: [
    Permission.BORROWERS_CREATE,
    Permission.BORROWERS_READ_ASSIGNED,
    Permission.BORROWERS_UPDATE,
    Permission.LOANS_CREATE,
    Permission.LOANS_READ_ASSIGNED,
    Permission.LOANS_UPDATE,
    Permission.LOANS_APPROVE, // within delegated limit
    Permission.PAYMENTS_CREATE,
    Permission.PAYMENTS_READ_ALL,
    Permission.REPORTS_PORTFOLIO,
    Permission.DOCUMENTS_MANAGE,
  ],
  ACCOUNTANT: [
    Permission.BORROWERS_READ_ALL,
    Permission.LOANS_READ_ALL,
    Permission.PAYMENTS_CREATE,
    Permission.PAYMENTS_READ_ALL,
    Permission.PAYMENTS_ADJUST,
    Permission.REPORTS_FINANCIAL,
    Permission.REPORTS_EXPORT,
    Permission.AUDIT_READ,
  ],
  BORROWER: [
    Permission.BORROWERS_READ_OWN,
    Permission.LOANS_READ_OWN,
    Permission.PAYMENTS_READ_OWN,
  ],
};
```

### 4.3 RBAC Middleware

```typescript
// middleware/authorize.ts
export const authorize = (...requiredPermissions: Permission[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = req.user; // populated by auth middleware
    if (!user) return res.status(401).json({ error: 'Not authenticated' });
    
    const userPermissions = getUserPermissions(user.roles);
    const hasAll = requiredPermissions.every(p => userPermissions.includes(p));
    
    if (!hasAll) {
      auditService.log({
        action: 'ACCESS_DENIED',
        userId: user.id,
        resource: req.originalUrl,
        details: { required: requiredPermissions },
      });
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};

// Data-level isolation for borrowers
export const enforceBorrowerIsolation = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.user.roles.includes('BORROWER')) {
      // Inject borrower_id filter into all subsequent queries
      req.dataFilter = { borrowerId: req.user.borrowerId };
    }
    next();
  };
};
```

---

## 5. Database Schema

### 5.1 Entity Relationship Diagram (Text)

```
users ──────────┐
  │              │
  │ 1:N          │ N:M (via user_roles)
  ▼              ▼
user_roles ◄── roles
  │
  │ (user has borrower_id FK if role=BORROWER)
  │
  ▼
borrowers ─────────────────────┐
  │                             │
  │ 1:N                         │ 1:N
  ▼                             ▼
loans ──────────────┐      documents
  │                  │
  │ 1:N              │ 1:N
  ▼                  ▼
loan_schedule    payments
(installments)

loan_products (templates)

audit_logs (references users, any entity)

notifications (references users)

system_config (key-value settings)
```

### 5.2 Table Definitions

#### `users`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `UUID` | PK, DEFAULT gen_random_uuid() | |
| `email` | `VARCHAR(255)` | UNIQUE, NOT NULL | Primary login identifier |
| `phone` | `VARCHAR(20)` | UNIQUE | For SMS OTP |
| `password_hash` | `VARCHAR(255)` | NOT NULL | bcrypt hash, cost=12 |
| `first_name` | `VARCHAR(100)` | NOT NULL | |
| `last_name` | `VARCHAR(100)` | NOT NULL | |
| `is_active` | `BOOLEAN` | DEFAULT true | Soft disable |
| `is_email_verified` | `BOOLEAN` | DEFAULT false | |
| `mfa_enabled` | `BOOLEAN` | DEFAULT false | |
| `mfa_secret` | `VARCHAR(255)` | NULL | TOTP secret (encrypted) |
| `borrower_id` | `UUID` | FK → borrowers.id, NULL | Set if user is a borrower |
| `last_login_at` | `TIMESTAMPTZ` | NULL | |
| `failed_login_attempts` | `INTEGER` | DEFAULT 0 | Account lockout after 5 |
| `locked_until` | `TIMESTAMPTZ` | NULL | |
| `password_changed_at` | `TIMESTAMPTZ` | DEFAULT NOW() | Force password change |
| `created_at` | `TIMESTAMPTZ` | DEFAULT NOW() | |
| `updated_at` | `TIMESTAMPTZ` | DEFAULT NOW() | |

**Indexes:** `email` (unique), `phone` (unique), `borrower_id`

---

#### `roles`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `UUID` | PK | |
| `name` | `VARCHAR(50)` | UNIQUE, NOT NULL | SYSTEM_ADMIN, LOAN_OFFICER, ACCOUNTANT, BORROWER, INVESTOR |
| `description` | `VARCHAR(255)` | | |
| `permissions` | `JSONB` | NOT NULL | Array of permission strings |
| `is_system` | `BOOLEAN` | DEFAULT false | Cannot be deleted if true |
| `created_at` | `TIMESTAMPTZ` | DEFAULT NOW() | |

**Seed data:** 4 system roles pre-created.

---

#### `user_roles`

| Column | Type | Constraints |
|--------|------|-------------|
| `user_id` | `UUID` | PK (composite), FK → users.id ON DELETE CASCADE |
| `role_id` | `UUID` | PK (composite), FK → roles.id ON DELETE CASCADE |
| `assigned_at` | `TIMESTAMPTZ` | DEFAULT NOW() |
| `assigned_by` | `UUID` | FK → users.id |

---

#### `borrowers`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `UUID` | PK | |
| `full_name` | `VARCHAR(200)` | NOT NULL | Maps from current `name` field |
| `phone_primary` | `VARCHAR(20)` | NOT NULL | Maps from `contact` |
| `phone_secondary` | `VARCHAR(20)` | NULL | |
| `national_id` | `VARCHAR(20)` | UNIQUE, NOT NULL | Maps from `idnum` |
| `email` | `VARCHAR(255)` | NULL | |
| `date_of_birth` | `DATE` | NULL | |
| `gender` | `VARCHAR(10)` | NULL | |
| `address` | `TEXT` | NULL | |
| `county` | `VARCHAR(100)` | NULL | e.g., Kilifi |
| `sub_county` | `VARCHAR(100)` | NULL | |
| `occupation` | `VARCHAR(100)` | NULL | |
| `employer` | `VARCHAR(200)` | NULL | |
| `monthly_income` | `DECIMAL(15,2)` | NULL | |
| `next_of_kin_name` | `VARCHAR(200)` | NULL | |
| `next_of_kin_phone` | `VARCHAR(20)` | NULL | |
| `next_of_kin_relationship` | `VARCHAR(50)` | NULL | |
| `risk_rating` | `VARCHAR(20)` | DEFAULT 'STANDARD' | LOW, STANDARD, HIGH, BLACKLISTED |
| `notes` | `TEXT` | NULL | |
| `assigned_officer_id` | `UUID` | FK → users.id, NULL | Loan officer responsible |
| `is_active` | `BOOLEAN` | DEFAULT true | |
| `created_at` | `TIMESTAMPTZ` | DEFAULT NOW() | |
| `updated_at` | `TIMESTAMPTZ` | DEFAULT NOW() | |
| `created_by` | `UUID` | FK → users.id | |

**Indexes:** `national_id` (unique), `phone_primary`, `full_name` (GIN trigram for fuzzy search), `assigned_officer_id`, `risk_rating`

---

#### `loan_products`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `UUID` | PK | |
| `name` | `VARCHAR(100)` | NOT NULL | e.g., "Weekly Flat Rate", "Monthly Reducing" |
| `description` | `TEXT` | | |
| `interest_method` | `VARCHAR(20)` | NOT NULL | FLAT, REDUCING_BALANCE |
| `interest_rate_default` | `DECIMAL(5,2)` | NOT NULL | Default rate (%) |
| `interest_period` | `VARCHAR(20)` | NOT NULL | TOTAL, MONTHLY, ANNUAL |
| `repayment_frequency` | `VARCHAR(20)` | NOT NULL | WEEKLY, BIWEEKLY, MONTHLY |
| `min_principal` | `DECIMAL(15,2)` | DEFAULT 1000 | |
| `max_principal` | `DECIMAL(15,2)` | DEFAULT 1000000 | |
| `min_duration_units` | `INTEGER` | DEFAULT 1 | |
| `max_duration_units` | `INTEGER` | DEFAULT 52 | In repayment_frequency units |
| `penalty_rate` | `DECIMAL(5,2)` | DEFAULT 0 | Late payment penalty % |
| `penalty_grace_days` | `INTEGER` | DEFAULT 0 | Days before penalty applies |
| `requires_approval` | `BOOLEAN` | DEFAULT true | |
| `approval_limit` | `DECIMAL(15,2)` | NULL | Officer auto-approval limit |
| `is_active` | `BOOLEAN` | DEFAULT true | |
| `created_at` | `TIMESTAMPTZ` | DEFAULT NOW() | |

**Note:** The current system uses a single flat-rate model: `totalDue = principal + (principal × rate/100)`. This becomes the default "Weekly Flat Rate" product.

---

#### `loans`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `UUID` | PK | |
| `loan_number` | `VARCHAR(20)` | UNIQUE, NOT NULL | Human-readable: NDL-2026-0001 |
| `borrower_id` | `UUID` | FK → borrowers.id, NOT NULL | |
| `loan_product_id` | `UUID` | FK → loan_products.id, NOT NULL | |
| `officer_id` | `UUID` | FK → users.id, NOT NULL | Originating loan officer |
| `approved_by` | `UUID` | FK → users.id, NULL | |
| `principal` | `DECIMAL(15,2)` | NOT NULL | Maps from current `principal` |
| `interest_rate` | `DECIMAL(5,2)` | NOT NULL | Maps from current `rate` |
| `interest_method` | `VARCHAR(20)` | NOT NULL | FLAT or REDUCING_BALANCE |
| `interest_amount` | `DECIMAL(15,2)` | NOT NULL | Calculated total interest |
| `total_due` | `DECIMAL(15,2)` | NOT NULL | principal + interest_amount |
| `total_repaid` | `DECIMAL(15,2)` | DEFAULT 0 | Sum of confirmed payments |
| `outstanding_balance` | `DECIMAL(15,2)` | NOT NULL | total_due − total_repaid |
| `duration_value` | `INTEGER` | NOT NULL | Maps from current `weeks` |
| `duration_unit` | `VARCHAR(10)` | NOT NULL | WEEK, MONTH |
| `installment_amount` | `DECIMAL(15,2)` | NOT NULL | Per-period payment |
| `issued_date` | `DATE` | NOT NULL | Maps from `issued` |
| `first_payment_date` | `DATE` | NOT NULL | |
| `maturity_date` | `DATE` | NOT NULL | Maps from current `due` |
| `status` | `VARCHAR(20)` | NOT NULL, DEFAULT 'DRAFT' | See lifecycle below |
| `days_overdue` | `INTEGER` | DEFAULT 0 | Computed/cached daily |
| `penalty_amount` | `DECIMAL(15,2)` | DEFAULT 0 | Accumulated penalties |
| `disbursement_method` | `VARCHAR(30)` | NULL | CASH, BANK_TRANSFER, MPESA |
| `disbursement_reference` | `VARCHAR(100)` | NULL | |
| `comment` | `TEXT` | NULL | Maps from `comment` |
| `closed_at` | `TIMESTAMPTZ` | NULL | |
| `written_off_at` | `TIMESTAMPTZ` | NULL | |
| `written_off_by` | `UUID` | FK → users.id, NULL | |
| `created_at` | `TIMESTAMPTZ` | DEFAULT NOW() | |
| `updated_at` | `TIMESTAMPTZ` | DEFAULT NOW() | |

**Loan Status Lifecycle:**
```
DRAFT → PENDING_APPROVAL → APPROVED → ACTIVE → CLOSED
                  ↓                       ↓
              REJECTED              WRITTEN_OFF
                  ↓
              CANCELLED
```

**Indexes:** `loan_number` (unique), `borrower_id`, `officer_id`, `status`, `maturity_date`, `issued_date`, `(status, maturity_date)` composite for overdue queries

---

#### `loan_schedule` (Installments)

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `UUID` | PK | |
| `loan_id` | `UUID` | FK → loans.id ON DELETE CASCADE | |
| `installment_number` | `INTEGER` | NOT NULL | 1, 2, 3, ... |
| `due_date` | `DATE` | NOT NULL | |
| `principal_component` | `DECIMAL(15,2)` | NOT NULL | |
| `interest_component` | `DECIMAL(15,2)` | NOT NULL | |
| `total_due` | `DECIMAL(15,2)` | NOT NULL | principal + interest for this period |
| `amount_paid` | `DECIMAL(15,2)` | DEFAULT 0 | |
| `balance` | `DECIMAL(15,2)` | NOT NULL | Remaining for this installment |
| `status` | `VARCHAR(20)` | DEFAULT 'PENDING' | PENDING, PARTIAL, PAID, OVERDUE |
| `paid_date` | `DATE` | NULL | |

**Indexes:** `loan_id`, `(loan_id, installment_number)` unique, `due_date`, `status`

---

#### `payments`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `UUID` | PK | |
| `payment_number` | `VARCHAR(20)` | UNIQUE, NOT NULL | PAY-2026-00001 |
| `loan_id` | `UUID` | FK → loans.id, NOT NULL | |
| `borrower_id` | `UUID` | FK → borrowers.id, NOT NULL | Denormalized for quick queries |
| `amount` | `DECIMAL(15,2)` | NOT NULL | Maps from current payment `amount` |
| `payment_date` | `DATE` | NOT NULL | Maps from payment `date` |
| `payment_method` | `VARCHAR(30)` | NOT NULL, DEFAULT 'CASH' | CASH, MPESA, BANK_TRANSFER, CHEQUE |
| `reference_number` | `VARCHAR(100)` | NULL | M-Pesa code, cheque number, etc. |
| `status` | `VARCHAR(20)` | DEFAULT 'CONFIRMED' | PENDING, CONFIRMED, REVERSED, VOID |
| `note` | `TEXT` | NULL | Maps from payment `note` |
| `recorded_by` | `UUID` | FK → users.id, NOT NULL | |
| `reversed_by` | `UUID` | FK → users.id, NULL | |
| `reversed_at` | `TIMESTAMPTZ` | NULL | |
| `reversal_reason` | `TEXT` | NULL | |
| `created_at` | `TIMESTAMPTZ` | DEFAULT NOW() | |

**Indexes:** `loan_id`, `borrower_id`, `payment_date`, `status`, `payment_number` (unique), `reference_number`

---

#### `documents`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `UUID` | PK | |
| `borrower_id` | `UUID` | FK → borrowers.id, NOT NULL | |
| `loan_id` | `UUID` | FK → loans.id, NULL | NULL if borrower-level doc |
| `document_type` | `VARCHAR(50)` | NOT NULL | NATIONAL_ID, PASSPORT_PHOTO, LOAN_AGREEMENT, STATEMENT, OTHER |
| `file_name` | `VARCHAR(255)` | NOT NULL | Original filename |
| `file_path` | `VARCHAR(500)` | NOT NULL | S3/Blob path |
| `file_size` | `INTEGER` | NOT NULL | In bytes |
| `mime_type` | `VARCHAR(100)` | NOT NULL | |
| `uploaded_by` | `UUID` | FK → users.id | |
| `created_at` | `TIMESTAMPTZ` | DEFAULT NOW() | |

**Indexes:** `borrower_id`, `loan_id`, `document_type`

---

#### `audit_logs`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `UUID` | PK | |
| `user_id` | `UUID` | FK → users.id, NOT NULL | Who performed the action |
| `action` | `VARCHAR(50)` | NOT NULL | CREATE, UPDATE, DELETE, APPROVE, REJECT, LOGIN, PAYMENT, REVERSAL, etc. |
| `entity_type` | `VARCHAR(50)` | NOT NULL | LOAN, PAYMENT, BORROWER, USER, SYSTEM |
| `entity_id` | `UUID` | NULL | ID of affected record |
| `changes` | `JSONB` | NULL | `{ field: { old: x, new: y } }` |
| `ip_address` | `INET` | NULL | |
| `user_agent` | `TEXT` | NULL | |
| `created_at` | `TIMESTAMPTZ` | DEFAULT NOW() | |

**Indexes:** `user_id`, `entity_type`, `entity_id`, `action`, `created_at`, `(entity_type, entity_id)` composite

**Retention Policy:** Audit logs are never soft-deleted. Archive to cold storage after 7 years.

---

#### `notifications`

| Column | Type | Constraints | Notes |
|--------|------|-------------|-------|
| `id` | `UUID` | PK | |
| `user_id` | `UUID` | FK → users.id, NOT NULL | Recipient |
| `type` | `VARCHAR(50)` | NOT NULL | LOAN_APPROVED, PAYMENT_DUE, PAYMENT_RECEIVED, OVERDUE, etc. |
| `channel` | `VARCHAR(20)` | NOT NULL | EMAIL, SMS, IN_APP |
| `subject` | `VARCHAR(255)` | NULL | |
| `message` | `TEXT` | NOT NULL | |
| `reference_type` | `VARCHAR(50)` | NULL | LOAN, PAYMENT |
| `reference_id` | `UUID` | NULL | |
| `status` | `VARCHAR(20)` | DEFAULT 'PENDING' | PENDING, SENT, DELIVERED, FAILED, READ |
| `sent_at` | `TIMESTAMPTZ` | NULL | |
| `read_at` | `TIMESTAMPTZ` | NULL | |
| `created_at` | `TIMESTAMPTZ` | DEFAULT NOW() | |

**Indexes:** `user_id`, `(user_id, status)`, `type`, `created_at`

---

#### `system_config`

| Column | Type | Constraints |
|--------|------|-------------|
| `key` | `VARCHAR(100)` | PK |
| `value` | `JSONB` | NOT NULL |
| `description` | `TEXT` | |
| `updated_by` | `UUID` | FK → users.id |
| `updated_at` | `TIMESTAMPTZ` | DEFAULT NOW() |

**Sample rows:**
- `company_name` → `"NDELIKI LIMITED"`
- `company_tagline` → `"We grow, you grow"`
- `default_currency` → `"KES"`
- `penalty_calculation` → `{ "method": "percentage", "rate": 2, "frequency": "monthly", "grace_days": 7 }`

---

### 5.3 Prisma Schema (Excerpt)

```prisma
// schema.prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id                  String     @id @default(uuid()) @db.Uuid
  email               String     @unique @db.VarChar(255)
  phone               String?    @unique @db.VarChar(20)
  passwordHash        String     @map("password_hash") @db.VarChar(255)
  firstName           String     @map("first_name") @db.VarChar(100)
  lastName            String     @map("last_name") @db.VarChar(100)
  isActive            Boolean    @default(true) @map("is_active")
  isEmailVerified     Boolean    @default(false) @map("is_email_verified")
  mfaEnabled          Boolean    @default(false) @map("mfa_enabled")
  mfaSecret           String?    @map("mfa_secret") @db.VarChar(255)
  borrowerId          String?    @map("borrower_id") @db.Uuid
  lastLoginAt         DateTime?  @map("last_login_at") @db.Timestamptz()
  failedLoginAttempts Int        @default(0) @map("failed_login_attempts")
  lockedUntil         DateTime?  @map("locked_until") @db.Timestamptz()
  passwordChangedAt   DateTime   @default(now()) @map("password_changed_at") @db.Timestamptz()
  createdAt           DateTime   @default(now()) @map("created_at") @db.Timestamptz()
  updatedAt           DateTime   @updatedAt @map("updated_at") @db.Timestamptz()

  borrower            Borrower?  @relation(fields: [borrowerId], references: [id])
  userRoles           UserRole[]
  auditLogs           AuditLog[]
  recordedPayments    Payment[]  @relation("RecordedBy")

  @@map("users")
}

model Borrower {
  id                String    @id @default(uuid()) @db.Uuid
  fullName          String    @map("full_name") @db.VarChar(200)
  phonePrimary      String    @map("phone_primary") @db.VarChar(20)
  nationalId        String    @unique @map("national_id") @db.VarChar(20)
  email             String?   @db.VarChar(255)
  riskRating        String    @default("STANDARD") @map("risk_rating") @db.VarChar(20)
  assignedOfficerId String?   @map("assigned_officer_id") @db.Uuid
  isActive          Boolean   @default(true) @map("is_active")
  createdAt         DateTime  @default(now()) @map("created_at") @db.Timestamptz()
  updatedAt         DateTime  @updatedAt @map("updated_at") @db.Timestamptz()
  createdBy         String    @map("created_by") @db.Uuid

  loans             Loan[]
  documents         Document[]
  payments          Payment[]
  users             User[]

  @@map("borrowers")
}

model Loan {
  id                 String       @id @default(uuid()) @db.Uuid
  loanNumber         String       @unique @map("loan_number") @db.VarChar(20)
  borrowerId         String       @map("borrower_id") @db.Uuid
  loanProductId      String       @map("loan_product_id") @db.Uuid
  officerId          String       @map("officer_id") @db.Uuid
  approvedBy         String?      @map("approved_by") @db.Uuid
  principal          Decimal      @db.Decimal(15, 2)
  interestRate       Decimal      @map("interest_rate") @db.Decimal(5, 2)
  interestMethod     String       @map("interest_method") @db.VarChar(20)
  interestAmount     Decimal      @map("interest_amount") @db.Decimal(15, 2)
  totalDue           Decimal      @map("total_due") @db.Decimal(15, 2)
  totalRepaid        Decimal      @default(0) @map("total_repaid") @db.Decimal(15, 2)
  outstandingBalance Decimal      @map("outstanding_balance") @db.Decimal(15, 2)
  durationValue      Int          @map("duration_value")
  durationUnit       String       @map("duration_unit") @db.VarChar(10)
  installmentAmount  Decimal      @map("installment_amount") @db.Decimal(15, 2)
  issuedDate         DateTime     @map("issued_date") @db.Date
  maturityDate       DateTime     @map("maturity_date") @db.Date
  status             String       @default("DRAFT") @db.VarChar(20)
  comment            String?      @db.Text
  createdAt          DateTime     @default(now()) @map("created_at") @db.Timestamptz()
  updatedAt          DateTime     @updatedAt @map("updated_at") @db.Timestamptz()

  borrower           Borrower     @relation(fields: [borrowerId], references: [id])
  loanProduct        LoanProduct  @relation(fields: [loanProductId], references: [id])
  schedule           LoanSchedule[]
  payments           Payment[]
  documents          Document[]

  @@index([borrowerId])
  @@index([status])
  @@index([maturityDate])
  @@index([status, maturityDate])
  @@map("loans")
}
```

---

## 6. Core Functional Modules

### 6.1 Authentication & Security Module

**Current state:** Hard-coded `admin/admin123` and `user/user123` in localStorage.

**New implementation:**

```
Authentication Flow:
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Login   │────▶│ Validate │────▶│  Issue   │────▶│  Return  │
│  Form    │     │ Password │     │ JWT Pair │     │  Tokens  │
│          │     │ (bcrypt) │     │          │     │          │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
                      │                                  │
                      ▼                                  ▼
                 ┌──────────┐                    ┌──────────────┐
                 │ Check    │                    │ Access Token │
                 │ MFA/OTP  │                    │ (15 min)     │
                 │ if enabled│                    │ Refresh Token│
                 └──────────┘                    │ (7 days)     │
                                                 └──────────────┘
```

| Feature | Implementation |
|---------|---------------|
| Password storage | bcrypt with cost factor 12 |
| Token type | JWT (access + refresh token pair) |
| Access token TTL | 15 minutes |
| Refresh token TTL | 7 days (stored in HTTP-only cookie) |
| Account lockout | Lock after 5 failed attempts for 15 minutes |
| Password reset | (1) Secure email link with 30-min expiry token, (2) SMS OTP |
| 2FA/MFA | TOTP (Google Authenticator / Authy) — mandatory for SYSTEM_ADMIN and ACCOUNTANT |
| Session revocation | Redis-based JWT blacklist (for logout and password change) |
| CORS | Whitelist of allowed origins only |
| Rate limiting | 5 login attempts per IP per 15 minutes |

```typescript
// Example: Login controller
async login(req: Request, res: Response) {
  const { email, password, otpCode } = req.body;
  
  const user = await userService.findByEmail(email);
  if (!user || !user.isActive) throw new UnauthorizedError('Invalid credentials');
  
  // Check lockout
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw new UnauthorizedError('Account locked. Try again later.');
  }
  
  // Verify password
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    await userService.incrementFailedAttempts(user.id);
    throw new UnauthorizedError('Invalid credentials');
  }
  
  // Check MFA
  if (user.mfaEnabled) {
    if (!otpCode) return res.status(200).json({ requiresMfa: true });
    const mfaValid = speakeasy.totp.verify({ secret: user.mfaSecret, token: otpCode });
    if (!mfaValid) throw new UnauthorizedError('Invalid OTP code');
  }
  
  // Reset failed attempts
  await userService.resetFailedAttempts(user.id);
  
  // Issue tokens
  const accessToken = jwt.sign(
    { userId: user.id, roles: user.roles, borrowerId: user.borrowerId },
    process.env.JWT_SECRET,
    { expiresIn: '15m' }
  );
  const refreshToken = jwt.sign(
    { userId: user.id, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '7d' }
  );
  
  // Set refresh token as HTTP-only cookie
  res.cookie('refreshToken', refreshToken, {
    httpOnly: true, secure: true, sameSite: 'strict', maxAge: 7 * 24 * 60 * 60 * 1000
  });
  
  // Audit log
  await auditService.log({ action: 'LOGIN', userId: user.id, entityType: 'USER', entityId: user.id });
  
  return res.json({ accessToken, user: { id: user.id, email: user.email, roles: user.roles } });
}
```

### 6.2 Borrower Management Module

**Mapping from current app:** Currently, borrower data is stored inline in each loan object (name, contact, idnum). The new system separates borrowers as a first-class entity.

| Feature | Details |
|---------|---------|
| Onboarding | Create borrower profile with full KYC (name, ID, phone, address, next-of-kin) |
| Duplicate detection | Fuzzy match on `national_id` + `full_name` + `phone_primary` before inserting |
| KYC Documents | Upload ID copy, passport photo → stored in S3/Azure Blob |
| Borrower profile page | Shows: personal info, all loans (history + active), arrears summary, risk rating, documents |
| Risk flagging | Automatic: STANDARD → HIGH if >30 days overdue. Manual: officer can set to BLACKLISTED |
| Link to user account | When borrower portal is enabled, create a `user` record linked to `borrower.id` |

### 6.3 Loan Origination & Management Module

**Mapping from current app:** The Add Loan tab currently collects borrower info + loan terms and calculates total due, interest, weekly installment, due date using flat-rate interest.

**New Loan Creation Flow:**

```
Step 1: Select/Create Borrower
    ↓
Step 2: Select Loan Product (template)
    ↓
Step 3: Enter Loan Terms (principal, rate override, duration, issue date)
    ↓
Step 4: System auto-generates:
        - Repayment schedule (installment breakdown)
        - Total interest
        - Maturity date
    ↓
Step 5: Preview & Confirm → Status = DRAFT
    ↓
Step 6: Submit for Approval → Status = PENDING_APPROVAL
    ↓
Step 7: Admin/Senior approves → Status = APPROVED
    ↓
Step 8: Disburse funds → Status = ACTIVE
```

**Interest Calculation Methods:**

```typescript
// services/loanCalculator.ts

export function calculateLoan(params: {
  principal: number;
  annualRate: number;
  durationValue: number;
  durationUnit: 'WEEK' | 'MONTH';
  interestMethod: 'FLAT' | 'REDUCING_BALANCE';
}): LoanCalculation {
  const { principal, annualRate, durationValue, durationUnit, interestMethod } = params;
  
  if (interestMethod === 'FLAT') {
    // Current system's method: totalDue = principal + (principal * rate / 100)
    // where rate is the total interest rate for the loan period
    const interestAmount = principal * (annualRate / 100);
    const totalDue = principal + interestAmount;
    const installment = totalDue / durationValue;
    
    const schedule = [];
    for (let i = 1; i <= durationValue; i++) {
      schedule.push({
        installmentNumber: i,
        principalComponent: +(principal / durationValue).toFixed(2),
        interestComponent: +(interestAmount / durationValue).toFixed(2),
        totalDue: +installment.toFixed(2),
      });
    }
    
    return { interestAmount, totalDue, installmentAmount: installment, schedule };
  }
  
  if (interestMethod === 'REDUCING_BALANCE') {
    // Monthly reducing balance
    const periodsPerYear = durationUnit === 'MONTH' ? 12 : 52;
    const periodicRate = annualRate / 100 / periodsPerYear;
    
    // PMT formula: M = P * [r(1+r)^n] / [(1+r)^n - 1]
    const factor = Math.pow(1 + periodicRate, durationValue);
    const installment = principal * (periodicRate * factor) / (factor - 1);
    
    let balance = principal;
    let totalInterest = 0;
    const schedule = [];
    
    for (let i = 1; i <= durationValue; i++) {
      const interestComponent = balance * periodicRate;
      const principalComponent = installment - interestComponent;
      balance -= principalComponent;
      totalInterest += interestComponent;
      
      schedule.push({
        installmentNumber: i,
        principalComponent: +principalComponent.toFixed(2),
        interestComponent: +interestComponent.toFixed(2),
        totalDue: +installment.toFixed(2),
        runningBalance: +Math.max(balance, 0).toFixed(2),
      });
    }
    
    return {
      interestAmount: +totalInterest.toFixed(2),
      totalDue: +(principal + totalInterest).toFixed(2),
      installmentAmount: +installment.toFixed(2),
      schedule,
    };
  }
}
```

### 6.4 Repayments & Collections Module

**Mapping from current app:** The Repay Loan tab lets user select a borrower, see loan details + recent payments, enter amount + date + note.

**New Repayment Flow:**

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│ Select Loan     │────▶│ Show Loan Details │────▶│ Enter Payment   │
│ (search/filter) │     │ + Schedule        │     │ Amount + Method │
└─────────────────┘     │ + Payment History │     │ + Reference     │
                        └──────────────────┘     └────────┬────────┘
                                                          │
                        ┌─────────────────────────────────┘
                        ▼
┌─────────────────────────────────────────────────────────────────┐
│ Server-side processing:                                          │
│ 1. Validate payment ≤ outstanding_balance (or allow overpayment │
│    with warning)                                                 │
│ 2. Create payment record (status=CONFIRMED)                      │
│ 3. Allocate payment to installment schedule (oldest first)       │
│ 4. Update loan: total_repaid, outstanding_balance                │
│ 5. If outstanding_balance ≤ 0 → status = CLOSED                 │
│ 6. Log audit entry                                               │
│ 7. Send receipt notification (SMS/email to borrower)             │
└─────────────────────────────────────────────────────────────────┘
```

**Payment methods supported:**

| Method | Integration |
|--------|-------------|
| Cash | Manual entry by loan officer |
| M-Pesa | Callback API from Safaricom Daraja (auto-posts payment). Design a webhook endpoint. |
| Bank Transfer | Manual entry with reference number, or bank reconciliation import |
| Cheque | Manual entry with cheque number |

**Quick Amount Buttons (retained from current UI):**
- Weekly installment amount
- Half of outstanding balance
- Full outstanding balance

**Payment Reversal:** Admin-only action. Creates a reversal record, restores the loan balance, and logs audit entry with mandatory reason.

### 6.5 Dashboards & Reports Module

**Mapping from current app:** The Overview tab shows summary cards, overdue loans table, Chart.js bar chart, and "All Loans" table with CSV/PDF export.

**Staff Dashboard (SYSTEM_ADMIN / LOAN_OFFICER / ACCOUNTANT):**

```
┌─────────────────────────────────────────────────────────────────┐
│ DASHBOARD                                                        │
├──────────┬──────────┬──────────┬──────────┬──────────────────────┤
│ Total    │ Total    │ Total    │ Total    │ Portfolio at Risk    │
│ Borrowers│ Disbursed│ Repaid   │Out-      │ (PAR > 30 days)     │
│  120     │KES 5.2M  │KES 3.8M  │standing  │      12.3%          │
│          │          │          │KES 1.4M  │                      │
├──────────┴──────────┴──────────┴──────────┴──────────────────────┤
│                                                                   │
│ ┌─────────────────────────────┐  ┌──────────────────────────┐    │
│ │  Loan Trends (Bar Chart)    │  │  Loan Status (Pie Chart)  │   │
│ │  Monthly: Disbursed/Repaid  │  │  Active / Overdue / Paid  │   │
│ └─────────────────────────────┘  └──────────────────────────┘    │
│                                                                   │
│ ┌───────────────────────────────────────────────────────────────┐ │
│ │ OVERDUE LOANS (sorted by days overdue desc)                   │ │
│ │ Search: [________] Status: [All▼] Officer: [All▼]            │ │
│ │ ┌─────┬──────────┬─────────┬────────┬────────┬──────┬──────┐ │ │
│ │ │ ID  │ Borrower │ Balance │Days OD │ Officer│Status│Action│ │ │
│ │ ├─────┼──────────┼─────────┼────────┼────────┼──────┼──────┤ │ │
│ │ │ 018 │ R.Kazungu│ 12,000  │  383   │ Ben M. │ 🔴  │ ▶ 📋│ │ │
│ │ └─────┴──────────┴─────────┴────────┴────────┴──────┴──────┘ │ │
│ │ Showing 1-10 of 45  [◀ 1 2 3 4 5 ▶]                          │ │
│ └───────────────────────────────────────────────────────────────┘ │
│                                                                   │
│ Quick Actions: [📥 Export CSV] [📄 Export PDF] [📊 Detailed Report]│
└───────────────────────────────────────────────────────────────────┘
```

**Report Types (server-generated):**

| Report | Contents | Formats | Roles |
|--------|----------|---------|-------|
| Loan Portfolio Summary | All loans with status, balances | CSV, PDF | Admin, Accountant |
| Overdue Report | Loans past maturity, grouped by days overdue | CSV, PDF | Admin, Loan Officer |
| Collections Report | Payments received in date range | CSV, PDF | Admin, Accountant |
| Disbursement Report | Loans issued in date range | CSV, PDF | Admin, Accountant |
| Borrower Statement | Individual borrower loan + payment history | PDF | Admin, Officer, Borrower (own) |
| Officer Performance | Loans by officer, collection rates | CSV, PDF | Admin |
| PAR Report | Portfolio at Risk by aging buckets (1-30, 31-60, 61-90, 90+) | CSV, PDF | Admin, Accountant |

**Report generation approach:** Server-side using Puppeteer (HTML → PDF) or a library like `pdfkit`. Reports are generated on-demand or scheduled nightly for large datasets, and cached in Redis for repeated downloads.

### 6.6 Document Management Module

| Feature | Implementation |
|---------|---------------|
| Upload | Multipart form upload → validated (file type, size ≤ 5MB) → stored in S3/Azure Blob |
| Access | Pre-signed URLs with 15-minute expiry |
| Types | ID Copy, Passport Photo, Loan Agreement, Guarantor Docs |
| Virus scanning | ClamAV or cloud-based scanning before storage |
| Borrower access | Borrowers can download their own documents only |

---

## 7. REST API Specification

### 7.1 Base URL & Versioning

```
Production:  https://api.ndeliki.co.ke/v1
Staging:     https://api-staging.ndeliki.co.ke/v1
```

All responses follow a consistent envelope:

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "perPage": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

Error responses:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      { "field": "principal", "message": "Must be a positive number" }
    ]
  }
}
```

### 7.2 Authentication Endpoints

#### POST `/v1/auth/login`

**Auth:** Public  
**Rate Limit:** 5 req/15 min per IP

```json
// Request
{
  "email": "admin@ndeliki.co.ke",
  "password": "SecureP@ss123"
}

// Response 200
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "uuid",
      "email": "admin@ndeliki.co.ke",
      "firstName": "Benard",
      "lastName": "Muiruri",
      "roles": ["SYSTEM_ADMIN"]
    }
  }
}
// Refresh token set as HTTP-only cookie

// Response 200 (MFA required)
{
  "success": true, 
  "data": { "requiresMfa": true, "mfaSessionToken": "temp-token" }
}
```

#### POST `/v1/auth/mfa/verify`

**Auth:** MFA session token  

```json
// Request
{ "mfaSessionToken": "temp-token", "otpCode": "123456" }

// Response 200 → same as login success
```

#### POST `/v1/auth/refresh`

**Auth:** Refresh token (HTTP-only cookie)

```json
// Response 200
{ "success": true, "data": { "accessToken": "new-jwt..." } }
```

#### POST `/v1/auth/logout`

**Auth:** Bearer token  

```json
// Response 200
{ "success": true, "data": { "message": "Logged out successfully" } }
// Adds current JWT to Redis blacklist
```

#### POST `/v1/auth/forgot-password`

**Auth:** Public

```json
// Request
{ "email": "user@example.com" }

// Response 200 (always, to prevent user enumeration)
{ "success": true, "data": { "message": "If the email exists, a reset link has been sent." } }
```

#### POST `/v1/auth/reset-password`

**Auth:** Reset token (from email link)

```json
// Request
{ "token": "reset-token-from-email", "newPassword": "NewSecure@123" }

// Response 200
{ "success": true, "data": { "message": "Password reset successfully" } }
```

#### PUT `/v1/auth/change-password`

**Auth:** Bearer token (any authenticated user)

```json
// Request
{ "currentPassword": "OldP@ss", "newPassword": "NewP@ss123" }

// Response 200
{ "success": true, "data": { "message": "Password changed successfully" } }
```

---

### 7.3 User Management Endpoints

#### GET `/v1/users`

**Auth:** Bearer token  
**Roles:** SYSTEM_ADMIN  
**Query params:** `?page=1&perPage=20&search=john&role=LOAN_OFFICER&isActive=true`

```json
// Response 200
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "email": "john@ndeliki.co.ke",
      "firstName": "John",
      "lastName": "Doe",
      "phone": "0712345678",
      "roles": ["LOAN_OFFICER"],
      "isActive": true,
      "lastLoginAt": "2026-02-28T10:30:00Z",
      "createdAt": "2025-01-15T08:00:00Z"
    }
  ],
  "meta": { "page": 1, "perPage": 20, "total": 12 }
}
```

#### POST `/v1/users`

**Auth:** SYSTEM_ADMIN

```json
// Request
{
  "email": "officer@ndeliki.co.ke",
  "firstName": "Jane",
  "lastName": "Wanjiku",
  "phone": "0723456789",
  "password": "TempP@ss123",
  "roles": ["LOAN_OFFICER"],
  "mustChangePassword": true
}

// Response 201
{ "success": true, "data": { "id": "uuid", "email": "officer@ndeliki.co.ke", ... } }
```

#### GET `/v1/users/:id` — Read single user (SYSTEM_ADMIN or own profile)  
#### PUT `/v1/users/:id` — Update user (SYSTEM_ADMIN)  
#### DELETE `/v1/users/:id` — Deactivate user (SYSTEM_ADMIN, soft delete)

---

### 7.4 Borrower Endpoints

#### GET `/v1/borrowers`

**Auth:** LOAN_OFFICER (assigned), ACCOUNTANT (read-only), SYSTEM_ADMIN (all)  
**Query:** `?page=1&perPage=20&search=kazungu&riskRating=HIGH&officerId=uuid`

```json
// Response 200
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "fullName": "Doreen Kazungu",
      "phonePrimary": "0769170826",
      "nationalId": "12345678",
      "riskRating": "HIGH",
      "activeLoansCount": 1,
      "totalOutstanding": 22900.00,
      "assignedOfficer": { "id": "uuid", "name": "Ben Muiruri" },
      "createdAt": "2024-11-01T00:00:00Z"
    }
  ],
  "meta": { ... }
}
```

#### POST `/v1/borrowers`

**Auth:** LOAN_OFFICER, SYSTEM_ADMIN

```json
// Request
{
  "fullName": "Doreen Kazungu",
  "phonePrimary": "0769170826",
  "nationalId": "12345678",
  "email": "doreen@email.com",
  "address": "Kilifi Town",
  "county": "Kilifi",
  "occupation": "Business Owner",
  "nextOfKinName": "John Kazungu",
  "nextOfKinPhone": "0712345678",
  "nextOfKinRelationship": "Spouse"
}

// Response 201
{ "success": true, "data": { "id": "uuid", "fullName": "Doreen Kazungu", ... } }
```

#### GET `/v1/borrowers/:id` — Full profile with loan summary  
#### PUT `/v1/borrowers/:id` — Update borrower  
#### GET `/v1/borrowers/:id/loans` — All loans for this borrower  
#### GET `/v1/borrowers/:id/documents` — All documents  
#### POST `/v1/borrowers/:id/documents` — Upload document (multipart)

---

### 7.5 Loan Endpoints

#### GET `/v1/loans`

**Auth:** Role-dependent filtering  
**Query:** `?page=1&perPage=20&status=ACTIVE&borrowerId=uuid&officerId=uuid&overdueOnly=true&sort=maturityDate:asc&search=kazungu`

```json
// Response 200
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "loanNumber": "NDL-2026-0042",
      "borrower": { "id": "uuid", "fullName": "Purity Joseph", "phonePrimary": "0712..." },
      "loanProduct": { "id": "uuid", "name": "Weekly Flat Rate" },
      "principal": 13000.00,
      "interestRate": 30.00,
      "interestAmount": 3900.00,
      "totalDue": 16900.00,
      "totalRepaid": 0.00,
      "outstandingBalance": 16900.00,
      "durationValue": 4,
      "durationUnit": "WEEK",
      "installmentAmount": 4225.00,
      "issuedDate": "2025-08-01",
      "maturityDate": "2025-08-29",
      "status": "ACTIVE",
      "daysOverdue": 184,
      "officer": { "id": "uuid", "name": "Ben Muiruri" }
    }
  ],
  "meta": { ... }
}
```

#### POST `/v1/loans`

**Auth:** LOAN_OFFICER, SYSTEM_ADMIN

```json
// Request
{
  "borrowerId": "uuid",
  "loanProductId": "uuid",
  "principal": 10000,
  "interestRate": 30,
  "durationValue": 4,
  "durationUnit": "WEEK",
  "issuedDate": "2026-03-01",
  "comment": "Repeat borrower, good history",
  "disbursementMethod": "MPESA"
}

// Response 201
{
  "success": true,
  "data": {
    "id": "uuid",
    "loanNumber": "NDL-2026-0101",
    "status": "DRAFT",
    "principal": 10000.00,
    "interestRate": 30.00,
    "interestMethod": "FLAT",
    "interestAmount": 3000.00,
    "totalDue": 13000.00,
    "installmentAmount": 3250.00,
    "maturityDate": "2026-03-29",
    "schedule": [
      { "installmentNumber": 1, "dueDate": "2026-03-08", "totalDue": 3250.00 },
      { "installmentNumber": 2, "dueDate": "2026-03-15", "totalDue": 3250.00 },
      { "installmentNumber": 3, "dueDate": "2026-03-22", "totalDue": 3250.00 },
      { "installmentNumber": 4, "dueDate": "2026-03-29", "totalDue": 3250.00 }
    ]
  }
}
```

#### GET `/v1/loans/:id` — Full loan detail with schedule and payment history  
#### PUT `/v1/loans/:id` — Update loan (restricted by status + role)  
#### POST `/v1/loans/:id/submit` — Submit for approval (DRAFT → PENDING_APPROVAL)  
#### POST `/v1/loans/:id/approve` — Approve loan (SYSTEM_ADMIN or officer within limit)  
#### POST `/v1/loans/:id/reject` — Reject loan  
#### POST `/v1/loans/:id/activate` — Mark disbursed/active  
#### POST `/v1/loans/:id/write-off` — Write off (SYSTEM_ADMIN only)

#### GET `/v1/loans/:id/schedule` — Get installment schedule

```json
// Response 200
{
  "success": true,
  "data": [
    {
      "installmentNumber": 1,
      "dueDate": "2026-03-08",
      "principalComponent": 2500.00,
      "interestComponent": 750.00,
      "totalDue": 3250.00,
      "amountPaid": 3250.00,
      "balance": 0.00,
      "status": "PAID",
      "paidDate": "2026-03-07"
    },
    {
      "installmentNumber": 2,
      "dueDate": "2026-03-15",
      "principalComponent": 2500.00,
      "interestComponent": 750.00,
      "totalDue": 3250.00,
      "amountPaid": 2000.00,
      "balance": 1250.00,
      "status": "PARTIAL"
    }
  ]
}
```

---

### 7.6 Payment Endpoints

#### GET `/v1/payments`

**Auth:** Role-dependent  
**Query:** `?loanId=uuid&borrowerId=uuid&dateFrom=2026-01-01&dateTo=2026-03-01&paymentMethod=MPESA&status=CONFIRMED&page=1`

#### POST `/v1/payments`

**Auth:** LOAN_OFFICER, ACCOUNTANT, SYSTEM_ADMIN

```json
// Request
{
  "loanId": "uuid",
  "amount": 3250.00,
  "paymentDate": "2026-03-07",
  "paymentMethod": "MPESA",
  "referenceNumber": "SHG7832KLP",
  "note": "Weekly installment"
}

// Response 201
{
  "success": true,
  "data": {
    "id": "uuid",
    "paymentNumber": "PAY-2026-00234",
    "amount": 3250.00,
    "status": "CONFIRMED",
    "loan": {
      "id": "uuid",
      "loanNumber": "NDL-2026-0101",
      "outstandingBalance": 9750.00,
      "status": "ACTIVE"
    }
  }
}
```

#### POST `/v1/payments/:id/reverse`

**Auth:** SYSTEM_ADMIN only

```json
// Request
{ "reason": "Duplicate payment entry" }

// Response 200
{
  "success": true,
  "data": {
    "id": "uuid",
    "status": "REVERSED",
    "reversedBy": "uuid",
    "reversedAt": "2026-03-01T14:30:00Z"
  }
}
```

---

### 7.7 Report Endpoints

#### GET `/v1/reports/dashboard`

**Auth:** SYSTEM_ADMIN, LOAN_OFFICER, ACCOUNTANT

```json
// Response 200
{
  "success": true,
  "data": {
    "totalBorrowers": 120,
    "totalLoans": 87,
    "activeLoans": 70,
    "overdueLoans": 45,
    "paidLoans": 17,
    "totalDisbursed": 5870000.00,
    "totalRepaid": 3850000.00,
    "totalOutstanding": 2020000.00,
    "parRatio": 12.3,
    "monthlyTrends": [
      { "month": "2026-01", "disbursed": 450000, "repaid": 380000, "outstanding": 70000 },
      { "month": "2026-02", "disbursed": 520000, "repaid": 410000, "outstanding": 110000 }
    ],
    "statusDistribution": {
      "ACTIVE": 25,
      "OVERDUE": 45,
      "CLOSED": 17
    }
  }
}
```

#### GET `/v1/reports/overdue`  
**Query:** `?daysOverdueMin=30&daysOverdueMax=90&officerId=uuid&sort=daysOverdue:desc`

#### GET `/v1/reports/portfolio`  
Portfolio at Risk (PAR) report with aging buckets.

#### GET `/v1/reports/collections`  
**Query:** `?dateFrom=2026-01-01&dateTo=2026-03-01`

#### GET `/v1/reports/export`  
**Query:** `?reportType=portfolio&format=csv|pdf&dateFrom=...&dateTo=...`  
Returns file download.

---

### 7.8 Data Import/Export Endpoints

#### POST `/v1/data/import`

**Auth:** SYSTEM_ADMIN  
Replaces the current front-end CSV/JSON import.

```json
// Request (multipart/form-data)
// file: loans_export.csv
// importType: "loans" | "borrowers" | "payments"
// mode: "validate" | "execute"

// Response 200 (validate mode — dry run)
{
  "success": true,
  "data": {
    "totalRows": 87,
    "validRows": 82,
    "errors": [
      { "row": 19, "field": "due", "value": "+022025-03", "error": "Invalid date format" },
      { "row": 33, "field": "due", "value": "0025-07-15", "error": "Invalid date format" },
      { "row": 80, "field": "name", "value": "DoBeJaJoSeA MaFour", "error": "Possible test/garbage data" }
    ],
    "warnings": [
      { "row": 1, "message": "Borrower 'Wonderful People{ Brian Onyango}' - name contains special characters" },
      { "row": 2, "message": "Duplicate borrower ID '12345678' on rows 1 and 2" }
    ]
  }
}

// Response 200 (execute mode)
{
  "success": true,
  "data": {
    "imported": 82,
    "skipped": 5,
    "errors": [ ... ]
  }
}
```

#### GET `/v1/data/export`

**Auth:** SYSTEM_ADMIN, ACCOUNTANT  
**Query:** `?entity=loans&format=csv|json&status=ACTIVE`

Returns file download with `Content-Disposition: attachment`.

#### GET `/v1/data/templates/:type`

**Auth:** SYSTEM_ADMIN  
Download import template (CSV/JSON) for loans, borrowers, or payments.

---

### 7.9 Audit Log Endpoints

#### GET `/v1/audit-logs`

**Auth:** SYSTEM_ADMIN  
**Query:** `?userId=uuid&action=PAYMENT&entityType=LOAN&entityId=uuid&dateFrom=...&dateTo=...&page=1`

```json
// Response 200
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "user": { "id": "uuid", "name": "Ben Muiruri" },
      "action": "PAYMENT_CREATED",
      "entityType": "PAYMENT",
      "entityId": "uuid",
      "changes": null,
      "ipAddress": "196.201.214.xxx",
      "createdAt": "2026-02-28T14:30:00Z"
    },
    {
      "id": "uuid",
      "user": { "id": "uuid", "name": "Admin" },
      "action": "LOAN_UPDATED",
      "entityType": "LOAN",
      "entityId": "uuid",
      "changes": {
        "principal": { "old": 10000, "new": 12000 },
        "totalDue": { "old": 13000, "new": 15600 }
      },
      "ipAddress": "196.201.214.xxx",
      "createdAt": "2026-02-27T09:15:00Z"
    }
  ]
}
```

---

### 7.10 Borrower Self-Service Portal API

These endpoints serve the borrower-facing portal and enforce strict data isolation.

#### GET `/v1/portal/my-profile`

**Auth:** BORROWER  

```json
{
  "success": true,
  "data": {
    "fullName": "Doreen Kazungu",
    "phone": "0769170826",
    "email": "doreen@email.com",
    "nationalId": "1234****" // masked
  }
}
```

#### GET `/v1/portal/my-loans`

**Auth:** BORROWER  

```json
{
  "success": true,
  "data": [
    {
      "loanNumber": "NDL-2025-0011",
      "principal": 28000.00,
      "totalDue": 36360.00,
      "totalRepaid": 13460.00,
      "outstandingBalance": 22900.00,
      "maturityDate": "2024-12-24",
      "status": "OVERDUE",
      "daysOverdue": 432,
      "nextInstallmentDue": null,
      "installmentAmount": 4545.00
    }
  ]
}
```

#### GET `/v1/portal/my-loans/:loanId/schedule` — View repayment schedule  
#### GET `/v1/portal/my-loans/:loanId/payments` — View payment history  
#### GET `/v1/portal/my-loans/:loanId/statement` — Download PDF statement  
#### GET `/v1/portal/my-documents` — List own documents  
#### GET `/v1/portal/my-notifications` — List notifications  
#### POST `/v1/portal/payment-notification` — Notify that a payment was made (for staff verification)

```json
// Request
{
  "loanId": "uuid",
  "amount": 5000,
  "paymentMethod": "MPESA",
  "referenceNumber": "SHG7832KLP",
  "paymentDate": "2026-03-01",
  "note": "Sent via M-Pesa"
}

// Response 201
{ "success": true, "data": { "message": "Payment notification received. Staff will verify and confirm." } }
```

---

### 7.11 M-Pesa Integration Webhook

#### POST `/v1/webhooks/mpesa/callback`

**Auth:** Safaricom IP whitelist + API key  

```json
// Incoming from Safaricom Daraja
{
  "TransactionType": "Pay Bill",
  "TransID": "SHG7832KLP",
  "TransTime": "20260301143000",
  "TransAmount": "3250.00",
  "BusinessShortCode": "123456",
  "BillRefNumber": "NDL-2026-0101",  // Loan number used as account reference
  "MSISDN": "2547XXXXXXXX",
  "FirstName": "DOREEN"
}
```

Processing:
1. Validate signature/IP
2. Match `BillRefNumber` to `loans.loan_number`
3. Match `MSISDN` to borrower phone
4. Auto-create payment record (status=CONFIRMED)
5. Send SMS receipt to borrower
6. Log audit entry

---

## 8. Front-End UX Structure

### 8.1 Application Structure

```
ndeliki-lms-frontend/
├── src/
│   ├── app/                        # App shell, routing, providers
│   │   ├── layout.tsx
│   │   ├── (auth)/                 # Auth routes (no main nav)
│   │   │   ├── login/
│   │   │   ├── forgot-password/
│   │   │   └── reset-password/
│   │   ├── (staff)/                # Staff portal routes
│   │   │   ├── layout.tsx          # Sidebar nav + header
│   │   │   ├── dashboard/
│   │   │   ├── borrowers/
│   │   │   │   ├── page.tsx        # Borrower list
│   │   │   │   ├── [id]/page.tsx   # Borrower detail
│   │   │   │   └── new/page.tsx    # Add borrower
│   │   │   ├── loans/
│   │   │   │   ├── page.tsx        # Loan list
│   │   │   │   ├── [id]/page.tsx   # Loan detail (schedule + payments)
│   │   │   │   └── new/page.tsx    # Create loan (wizard)
│   │   │   ├── payments/
│   │   │   │   ├── page.tsx        # Payment list
│   │   │   │   └── new/page.tsx    # Record payment
│   │   │   ├── reports/
│   │   │   ├── users/              # Admin only
│   │   │   ├── settings/           # Admin only
│   │   │   ├── audit-logs/         # Admin only
│   │   │   └── import-export/      # Admin only
│   │   └── (portal)/               # Borrower self-service portal
│   │       ├── layout.tsx          # Simpler nav
│   │       ├── home/               # Loan summary
│   │       ├── loans/[id]/         # Loan detail
│   │       ├── payments/           # Payment history
│   │       └── profile/            # Own profile
│   ├── components/
│   │   ├── ui/                     # shadcn/ui components
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   └── PortalHeader.tsx
│   │   ├── dashboard/
│   │   │   ├── StatsCards.tsx
│   │   │   ├── LoanTrendsChart.tsx
│   │   │   ├── StatusPieChart.tsx
│   │   │   └── OverdueTable.tsx
│   │   ├── borrowers/
│   │   │   ├── BorrowerForm.tsx
│   │   │   ├── BorrowerTable.tsx
│   │   │   └── BorrowerProfile.tsx
│   │   ├── loans/
│   │   │   ├── LoanForm.tsx        # Multi-step wizard
│   │   │   ├── LoanTable.tsx
│   │   │   ├── LoanDetail.tsx
│   │   │   ├── LoanSchedule.tsx
│   │   │   ├── LoanStatusBadge.tsx
│   │   │   └── LoanPreview.tsx     # Retained from current app
│   │   ├── payments/
│   │   │   ├── PaymentForm.tsx
│   │   │   ├── QuickAmountButtons.tsx  # Retained from current app
│   │   │   └── PaymentHistory.tsx
│   │   └── common/
│   │       ├── DataTable.tsx        # Reusable table with search, sort, filter, pagination
│   │       ├── SearchInput.tsx
│   │       ├── StatusBadge.tsx
│   │       ├── CurrencyDisplay.tsx
│   │       ├── ConfirmDialog.tsx
│   │       └── FileUpload.tsx
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useLoans.ts
│   │   ├── useBorrowers.ts
│   │   ├── usePayments.ts
│   │   └── usePermissions.ts
│   ├── services/
│   │   ├── api.ts                  # Axios instance with interceptors
│   │   ├── authService.ts
│   │   ├── loanService.ts
│   │   ├── borrowerService.ts
│   │   └── paymentService.ts
│   ├── stores/
│   │   ├── authStore.ts            # Zustand
│   │   └── uiStore.ts
│   └── utils/
│       ├── formatters.ts           # Currency, date formatting
│       ├── validators.ts
│       └── constants.ts
```

### 8.2 Key Screen Wireframes

#### Staff Dashboard

```
┌─────────────────────────────────────────────────────────────────────┐
│ [☰] NDELIKI LIMITED                     🔔 3  👤 Ben Muiruri [▼]  │
├─────────┬───────────────────────────────────────────────────────────┤
│         │                                                           │
│ 📊 Dash │  DASHBOARD                                               │
│ 👥 Borr │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐       │
│ 💳 Loans│  │ 120     │ │KES 5.2M │ │KES 3.8M │ │KES 1.4M │       │
│ 💰 Pay  │  │Borrowers│ │Disbursed│ │ Repaid  │ │Outstand.│       │
│ 📈 Rpts │  └─────────┘ └─────────┘ └─────────┘ └─────────┘       │
│ ─────── │                                                           │
│ 👤 Users│  ┌────────────────────┐  ┌──────────────────────┐        │
│ ⚙ Sett  │  │ Monthly Trends     │  │ Loan Status          │        │
│ 📋 Audit│  │ ▓▓ ▓▓ ▓▓ ▓▓ ▓▓ ▓▓ │  │    🟢 Active: 25     │        │
│ 📥 Imprt│  │ Bar Chart          │  │    🔴 Overdue: 45    │        │
│         │  │                    │  │    ✅ Closed: 17      │        │
│         │  └────────────────────┘  └──────────────────────┘        │
│         │                                                           │
│         │  OVERDUE LOANS                              [Export ▼]   │
│         │  Search: [_____________] Days: [All ▼] Officer: [All ▼] │
│         │  ┌─────┬──────────┬─────────┬──────┬────────┬──────┐    │
│         │  │ #   │ Borrower │ Balance │ Days │Officer │Action│    │
│         │  ├─────┼──────────┼─────────┼──────┼────────┼──────┤    │
│         │  │ 018 │R.Kazungu │ 12,000  │ 383  │ Ben M. │ ▶   │    │
│         │  │ 005 │Mwanatumu │ 14,400  │ 554  │ Ben M. │ ▶   │    │
│         │  └─────┴──────────┴─────────┴──────┴────────┴──────┘    │
│         │  Page 1 of 5  [< 1 2 3 4 5 >]                           │
└─────────┴───────────────────────────────────────────────────────────┘
```

#### Loan Detail Page

```
┌─────────────────────────────────────────────────────────────────────┐
│ [← Back to Loans]    LOAN NDL-2026-0011                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  STATUS: 🔴 OVERDUE (432 days)        [Record Payment] [Edit] [...] │
│                                                                     │
│  ┌─── Borrower ───────────┐  ┌─── Loan Terms ──────────────────┐  │
│  │ Doreen Kazungu         │  │ Product:   Weekly Flat Rate      │  │
│  │ 📱 0769170826          │  │ Principal: KES 28,000.00         │  │
│  │ 🆔 12345678            │  │ Interest:  30% (Flat) = 8,360    │  │
│  │ [View Profile →]       │  │ Total Due: KES 36,360.00         │  │
│  └────────────────────────┘  │ Duration:  8 weeks               │  │
│                               │ Installment: KES 4,545.00/week  │  │
│                               │ Issued: 2024-10-29               │  │
│                               │ Maturity: 2024-12-24             │  │
│                               └──────────────────────────────────┘  │
│                                                                     │
│  ┌─── Payment Summary ──────────────────────────────────────────┐  │
│  │ Total Repaid: KES 13,460.00  ▓▓▓▓▓▓▓░░░░░░░░░░ 37%         │  │
│  │ Outstanding:  KES 22,900.00                                   │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  [Repayment Schedule]  [Payment History]  [Documents]              │
│                                                                     │
│  REPAYMENT SCHEDULE                                                │
│  ┌────┬────────────┬──────────┬──────────┬──────────┬──────────┐  │
│  │ #  │ Due Date   │ Amount   │ Paid     │ Balance  │ Status   │  │
│  ├────┼────────────┼──────────┼──────────┼──────────┼──────────┤  │
│  │ 1  │ 2024-11-05 │ 4,545.00 │ 4,545.00 │     0.00 │ ✅ Paid  │  │
│  │ 2  │ 2024-11-12 │ 4,545.00 │ 4,545.00 │     0.00 │ ✅ Paid  │  │
│  │ 3  │ 2024-11-19 │ 4,545.00 │ 4,370.00 │   175.00 │ 🟡 Partial│ │
│  │ 4  │ 2024-11-26 │ 4,545.00 │     0.00 │ 4,545.00 │ 🔴 Overdue│ │
│  │ ...│            │          │          │          │          │  │
│  └────┴────────────┴──────────┴──────────┴──────────┴──────────┘  │
│                                                                     │
│  PAYMENT HISTORY                                                   │
│  ┌────────────┬──────────┬────────┬───────────┬──────────────────┐  │
│  │ Date       │ Amount   │ Method │ Reference │ Recorded By      │  │
│  ├────────────┼──────────┼────────┼───────────┼──────────────────┤  │
│  │ 2024-11-04 │ 5,000.00 │ MPESA  │ SHG78..   │ Ben Muiruri      │  │
│  │ 2024-11-11 │ 4,545.00 │ Cash   │ —         │ Ben Muiruri      │  │
│  │ 2024-11-18 │ 3,915.00 │ MPESA  │ TKL23..   │ Ben Muiruri      │  │
│  └────────────┴──────────┴────────┴───────────┴──────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

#### Record Payment Screen

```
┌─────────────────────────────────────────────────────────────────────┐
│ RECORD PAYMENT                                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Select Loan: [🔍 Search by borrower name, ID, or loan number  ▼] │
│                                                                     │
│  ┌─── Selected Loan ────────────────────────────────────────────┐  │
│  │ NDL-2026-0042 • Purity Joseph • 0712...                       │  │
│  │ Principal: 13,000  Total Due: 16,900  Paid: 0  Balance: 16,900│ │
│  │ Status: 🔴 Overdue (184 days)   Installment: 4,225/week      │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  Payment Amount *     Payment Date *     Payment Method *          │
│  ┌──┬───────────┐    ┌──────────────┐    ┌──────────────────┐     │
│  │KES│ 4,225.00  │    │ 2026-03-01   │    │ M-Pesa         ▼│     │
│  └──┴───────────┘    └──────────────┘    └──────────────────┘     │
│                                                                     │
│  Quick Amount:  [Weekly: 4,225] [Half: 8,450] [Full: 16,900]      │
│                                                                     │
│  Reference Number          Payment Note                             │
│  ┌──────────────────┐     ┌──────────────────────────────────┐     │
│  │ SHG7832KLP       │     │ Weekly installment               │     │
│  └──────────────────┘     └──────────────────────────────────┘     │
│                                                                     │
│               [Cancel]  [✅ Record Payment]                         │
└─────────────────────────────────────────────────────────────────────┘
```

#### Borrower Self-Service Home Page

```
┌─────────────────────────────────────────────────────────────────────┐
│ NDELIKI LIMITED            🔔 1  👤 Doreen Kazungu [Logout]        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Welcome, Doreen                                         2026-03-01│
│                                                                     │
│  ┌── Your Summary ──────────────────────────────────────────────┐  │
│  │ Active Loans: 1    Total Outstanding: KES 22,900.00          │  │
│  │ Next Payment Due: OVERDUE                                     │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  YOUR LOANS                                                        │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │ Loan NDL-2025-0011                      🔴 OVERDUE (432 d)  │  │
│  │ Principal: KES 28,000     Balance: KES 22,900               │  │
│  │ Weekly Payment: KES 4,545                                    │  │
│  │ ▓▓▓▓▓▓▓░░░░░░░░░░░ 37% repaid                              │  │
│  │                                                               │  │
│  │ [View Details]  [View Schedule]  [Download Statement]         │  │
│  │ [📱 I've Made a Payment — Notify Staff]                      │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
│  RECENT PAYMENTS                                                   │
│  ┌────────────┬──────────┬────────┬──────────┐                    │
│  │ Date       │ Amount   │ Method │ Status   │                    │
│  ├────────────┼──────────┼────────┼──────────┤                    │
│  │ 2024-11-18 │ 3,915.00 │ MPESA  │ ✅ Conf. │                    │
│  │ 2024-11-11 │ 4,545.00 │ Cash   │ ✅ Conf. │                    │
│  │ 2024-11-04 │ 5,000.00 │ MPESA  │ ✅ Conf. │                    │
│  └────────────┴──────────┴────────┴──────────┘                    │
│                                                                     │
│  ℹ️ Need help? Contact us at support@ndeliki.co.ke or 0700 XXX XXX │
└─────────────────────────────────────────────────────────────────────┘
```

### 8.3 Key UX Decisions Retained from Current App

| Current Feature | New Implementation |
|----------------|-------------------|
| Quick stats cards (Add Loan tab) | Retained as Dashboard stats cards |
| Loan Preview (calculated totals before submit) | Retained in loan creation wizard Step 4 |
| Quick Amount buttons (weekly/half/full) | Retained in Record Payment form |
| Status badges (Active 🟡, Overdue 🔴, Paid ✅) | Retained with same color scheme |
| Search box above tables | Retained as `SearchInput` component with debounced search |
| Sort and pagination | Retained in reusable `DataTable` component |
| Loan trend bar chart | Retained using Recharts instead of Chart.js |
| CSV/PDF export buttons | Retained, now server-generated |
| Payment history in modal | Changed to dedicated tab on Loan Detail page |
| Edit loan in modal | Changed to inline edit on Loan Detail page |

---

## 9. Notifications System

### 9.1 Notification Types

| Event | Channel | Recipient | Template |
|-------|---------|-----------|----------|
| Loan Submitted for Approval | IN_APP, EMAIL | Admin/Senior Officer | "Loan {loanNumber} for {borrowerName} (KES {principal}) awaits your approval." |
| Loan Approved | SMS, EMAIL, IN_APP | Borrower, Officer | "Your loan {loanNumber} of KES {principal} has been approved." |
| Loan Rejected | SMS, EMAIL, IN_APP | Borrower, Officer | "Your loan application has been declined. Reason: {reason}" |
| Payment Received | SMS, IN_APP | Borrower | "Payment of KES {amount} received for loan {loanNumber}. Balance: KES {balance}." |
| Payment Due (3 days before) | SMS | Borrower | "Reminder: KES {installment} is due on {dueDate} for loan {loanNumber}." |
| Payment Due (today) | SMS | Borrower | "Your payment of KES {installment} is due today." |
| Overdue (7 days) | SMS, EMAIL | Borrower | "Your loan {loanNumber} is 7 days overdue. Outstanding: KES {balance}." |
| Overdue (30 days) | SMS, EMAIL | Borrower, Officer | "URGENT: Loan {loanNumber} is 30 days overdue." |
| Password Reset | EMAIL | Any user | Reset link |

### 9.2 Architecture

```
┌──────────────┐     ┌──────────────┐     ┌──────────────────┐
│ Event Source  │────▶│ Notification │────▶│ Channel Dispatch │
│ (Loan Service,│     │ Service      │     │                  │
│  Payment Svc) │     │ (Template +  │     │ ├─ Email (SendGrid)
│              │     │  Queue)      │     │ ├─ SMS (Africa's T.)
└──────────────┘     └──────────────┘     │ └─ In-App (DB + WS)
                                           └──────────────────┘
```

- **Notification Queue:** Use a simple in-process queue (Bull/BullMQ with Redis) or a managed queue (Azure Queue / AWS SQS) for reliability.
- **Templates:** Stored in DB or as Handlebars/Mustache files. Admin can edit templates via Settings page.
- **Scheduled notifications:** A cron job (node-cron or cloud scheduler) runs daily at 8:00 AM EAT:
  1. Query loans where next installment due date = today + 3 days → send reminders
  2. Query loans where installment due date < today and balance > 0 → send overdue alerts

---

## 10. Audit & Compliance

### 10.1 What Gets Logged

| Action | Entity | Details Captured |
|--------|--------|-----------------|
| User login/logout | USER | IP, user agent, success/failure |
| User created/modified/deactivated | USER | All changed fields |
| Borrower created/modified | BORROWER | All changed fields |
| Loan created | LOAN | Full loan snapshot |
| Loan status change | LOAN | Old status → new status, who approved |
| Loan edited | LOAN | Field-level diff (`{ old, new }`) |
| Loan written off | LOAN | Amount, reason, approved by |
| Payment recorded | PAYMENT | Full payment details |
| Payment reversed/voided | PAYMENT | Reason, original payment details |
| Data imported | SYSTEM | Row count, source file |
| Data exported | SYSTEM | Report type, filters used |
| Settings changed | SYSTEM | Old → new values |

### 10.2 Audit Log View

- Searchable by: user, action type, entity type, date range
- Filterable and paginated
- Read-only — no user (not even admin) can modify or delete audit logs
- Export to CSV for compliance reporting

### 10.3 Data Privacy & Protection

- **Kenya Data Protection Act 2019 compliance:**
  - Borrower consent to data collection recorded at onboarding
  - Right to access: borrower can view all their data via portal
  - Right to correction: borrower can request profile updates
  - Data retention policy: loan data retained 7 years after closure, then anonymized
  - National ID numbers encrypted at rest (AES-256)
- **PII Masking:** In reports and logs, national ID shows only last 4 digits unless explicitly accessed by authorized user

---

## 11. Migration Plan

### 11.1 Data Extraction from Current App

The current app stores all data in `localStorage` under the key `loans`. It can be exported as CSV or JSON from the "All Loans" table.

**Step 1: Export current data**

```javascript
// Run in browser console while app is open:
const loans = JSON.parse(localStorage.getItem('loans'));
const blob = new Blob([JSON.stringify(loans, null, 2)], { type: 'application/json' });
const a = document.createElement('a');
a.href = URL.createObjectURL(blob);
a.download = 'ndeliki_loans_export.json';
a.click();
```

### 11.2 Column Mapping

| Current Field | New Table | New Column | Transformation |
|--------------|-----------|-----------|----------------|
| `name` | `borrowers` | `full_name` | Trim whitespace, title-case |
| `contact` | `borrowers` | `phone_primary` | Validate format, add +254 prefix if missing |
| `idnum` | `borrowers` | `national_id` | Validate 7-8 chars |
| `principal` | `loans` | `principal` | Validate positive number |
| `rate` | `loans` | `interest_rate` | Validate 0-100 |
| `weeks` | `loans` | `duration_value` | Validate positive integer |
| `issued` | `loans` | `issued_date` | Parse date, fix malformed (e.g., "+022025-03" → "2025-03-01") |
| `due` | `loans` | `maturity_date` | Parse date, fix malformed (e.g., "0025-07-15" → "2025-07-15") |
| `repaid` | `loans` | `total_repaid` | Recalculate from payments array |
| `payments[]` | `payments` | Multiple columns | Map `amount`, `date`, `note` |
| `comment` | `loans` | `comment` | Trim |
| `id` (numeric) | `loans` | `loan_number` | Format as "NDL-LEGACY-{id}" |

### 11.3 Data Cleansing Steps

Based on analysis of the current data, these issues must be addressed:

| Issue | Examples Found | Fix |
|-------|---------------|-----|
| **Malformed dates** | `"+022025-03"` (loan 19), `"0025-07-15"` (loan 33) | Regex pattern matching and correction |
| **Duplicate borrowers** | "RIZIKI CHIZI MKALA" has loans 78 (Paid) and 88 (Active); "Dominic Nyiro Sammuel" has 72 (Paid) and 89 (Active) | Merge into single borrower record via national_id match |
| **Garbage/test data** | "Wonderful People{ Brian Onyango}" (loans 1, 2), "DoBeJaJoSeA MaFour" (loan 80) | Flag for manual review, possibly exclude |
| **Inconsistent name casing** | Mixed case across borrowers | Normalize to title case |
| **Whitespace in data** | "Rehema Ngao\t Mwanengo" (loan 96, tab character) | Trim and normalize whitespace |
| **Missing ID gaps** | Loan IDs skip (e.g., no 20, 32, 36, etc.) | Expected — just map to sequential loan numbers |
| **Repaid > Total Due** | Verify `sum(payments[].amount) == repaid` | Recalculate from payments |
| **Negative balances** | Check for any where `repaid > totalDue` | Cap at 0, flag overpayment for review |

### 11.4 Migration Script (Outline)

```typescript
// scripts/migrate-legacy-data.ts
import legacyData from './ndeliki_loans_export.json';

async function migrate() {
  const borrowerMap = new Map<string, string>(); // nationalId → borrower UUID
  
  for (const loan of legacyData) {
    // 1. Cleanse data
    const cleanName = cleanString(loan.name);
    const cleanContact = normalizePhone(loan.contact);
    const cleanId = loan.idnum?.trim();
    const cleanIssued = fixDate(loan.issued);
    const cleanDue = fixDate(loan.due);
    
    // 2. Upsert borrower (deduplicate by national ID)
    let borrowerId = borrowerMap.get(cleanId);
    if (!borrowerId) {
      const borrower = await prisma.borrower.create({
        data: {
          fullName: cleanName,
          phonePrimary: cleanContact,
          nationalId: cleanId,
          createdBy: adminUserId,
        }
      });
      borrowerId = borrower.id;
      borrowerMap.set(cleanId, borrowerId);
    }
    
    // 3. Create loan
    const principal = parseFloat(loan.principal) || 0;
    const rate = parseFloat(loan.rate) || 0;
    const totalDue = principal + (principal * rate / 100);
    const weeks = parseInt(loan.weeks) || 1;
    
    const newLoan = await prisma.loan.create({
      data: {
        loanNumber: `NDL-LEGACY-${String(loan.id).padStart(4, '0')}`,
        borrowerId,
        loanProductId: defaultProductId,
        officerId: adminUserId,
        principal,
        interestRate: rate,
        interestMethod: 'FLAT',
        interestAmount: principal * rate / 100,
        totalDue,
        totalRepaid: 0, // will recalculate
        outstandingBalance: totalDue,
        durationValue: weeks,
        durationUnit: 'WEEK',
        installmentAmount: totalDue / weeks,
        issuedDate: new Date(cleanIssued),
        maturityDate: new Date(cleanDue),
        firstPaymentDate: addDays(new Date(cleanIssued), 7),
        status: determineStatus(totalDue, loan.repaid, cleanDue),
        comment: loan.comment || null,
      }
    });
    
    // 4. Create payments
    let totalRepaid = 0;
    if (loan.payments && loan.payments.length > 0) {
      for (const payment of loan.payments) {
        const amount = parseFloat(payment.amount) || 0;
        totalRepaid += amount;
        
        await prisma.payment.create({
          data: {
            paymentNumber: `PAY-LEGACY-${payment.id}`,
            loanId: newLoan.id,
            borrowerId,
            amount,
            paymentDate: new Date(payment.date),
            paymentMethod: 'CASH',
            note: payment.note || 'Migrated from legacy system',
            recordedBy: adminUserId,
            status: 'CONFIRMED',
          }
        });
      }
    }
    
    // 5. Update loan totals
    const outstanding = Math.max(totalDue - totalRepaid, 0);
    await prisma.loan.update({
      where: { id: newLoan.id },
      data: {
        totalRepaid,
        outstandingBalance: outstanding,
        status: outstanding <= 0.01 ? 'CLOSED' : 
                (new Date(cleanDue) < new Date() && outstanding > 0) ? 'ACTIVE' : 'ACTIVE',
      }
    });
    
    // 6. Generate schedule retroactively
    await generateScheduleForLoan(newLoan.id, weeks, totalDue / weeks, new Date(cleanIssued));
  }
  
  console.log(`Migration complete: ${legacyData.length} loans, ${borrowerMap.size} borrowers`);
}

function fixDate(dateStr: string): string {
  if (!dateStr) return new Date().toISOString().split('T')[0];
  // Fix "+022025-03" → "2025-03-01"
  let fixed = dateStr.replace(/^\+0+/, '');
  // Fix "0025-07-15" → "2025-07-15"
  fixed = fixed.replace(/^00(\d{2})/, '20$1');
  // Validate
  const parsed = new Date(fixed);
  if (isNaN(parsed.getTime())) return new Date().toISOString().split('T')[0];
  return fixed;
}
```

### 11.5 Migration Phases

| Phase | Duration | Activities |
|-------|----------|------------|
| **Phase 0: Preparation** | 1 week | Export data, run cleansing script (dry run), review flagged records with business team |
| **Phase 1: Import** | 1 day | Run migration script against staging DB, validate counts and totals |
| **Phase 2: UAT** | 1 week | Staff test new system with migrated data, compare reports with old app |
| **Phase 3: Go-Live** | 1 day | Final export from old app, run migration against prod, switch DNS |
| **Phase 4: Parallel Run** | 2 weeks | Keep old HTML file accessible (read-only) for reference, staff use new system |
| **Phase 5: Decommission** | After Phase 4 | Archive old HTML file, remove localStorage remnants |

---

## 12. Security, Performance & Maintainability

### 12.1 Security Measures

| Category | Measure | Implementation |
|----------|---------|---------------|
| **Transport** | HTTPS everywhere | TLS 1.3 via Let's Encrypt or managed certificate |
| **Authentication** | JWT with short-lived tokens | Access: 15 min, Refresh: 7 days |
| **Password** | bcrypt hashing, cost=12 | Min 8 chars, 1 upper, 1 lower, 1 digit, 1 special |
| **MFA** | TOTP (Google Authenticator) | Mandatory for SYSTEM_ADMIN, ACCOUNTANT |
| **Account lockout** | 5 failed attempts → 15 min lock | Tracked in DB, resets on success |
| **Input validation** | Server-side validation on every endpoint | Zod schemas for request validation |
| **SQL injection** | Parameterized queries via Prisma ORM | Never concatenate SQL strings |
| **XSS** | React's built-in escaping + CSP headers | Content-Security-Policy header |
| **CSRF** | SameSite=Strict cookies + CSRF tokens | For any state-changing operations |
| **Rate limiting** | express-rate-limit + Redis | Global: 100 req/min, Auth: 5 req/15 min |
| **File uploads** | Type validation, size limit (5MB), virus scan | ClamAV scan before storage |
| **Encryption at rest** | DB field-level encryption for PII | National IDs encrypted with AES-256 |
| **Secrets management** | Environment variables, never in code | .env (dev), Azure Key Vault / AWS Secrets Manager (prod) |
| **Dependency security** | npm audit, Snyk, Dependabot | Automated PR for vulnerable packages |
| **CORS** | Whitelist of allowed origins | Only production and staging frontend URLs |
| **Security headers** | helmet.js middleware | X-Frame-Options, X-Content-Type-Options, etc. |
| **API logging** | Log all requests (sans PII/passwords) | Structured JSON logs |

### 12.2 Backend Code Organization

```
ndeliki-lms-backend/
├── src/
│   ├── index.ts                    # Application entry point
│   ├── app.ts                      # Express app setup
│   ├── config/
│   │   ├── database.ts             # Prisma client
│   │   ├── redis.ts                # Redis client
│   │   ├── env.ts                  # Environment validation (zod)
│   │   └── constants.ts
│   ├── middleware/
│   │   ├── authenticate.ts         # JWT verification
│   │   ├── authorize.ts            # RBAC permission check
│   │   ├── validate.ts             # Request body validation
│   │   ├── rateLimiter.ts
│   │   ├── errorHandler.ts         # Global error handler
│   │   └── requestLogger.ts
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.routes.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   └── auth.validation.ts  # Zod schemas
│   │   ├── users/
│   │   │   ├── user.routes.ts
│   │   │   ├── user.controller.ts
│   │   │   ├── user.service.ts
│   │   │   └── user.validation.ts
│   │   ├── borrowers/
│   │   │   ├── borrower.routes.ts
│   │   │   ├── borrower.controller.ts
│   │   │   ├── borrower.service.ts
│   │   │   └── borrower.validation.ts
│   │   ├── loans/
│   │   │   ├── loan.routes.ts
│   │   │   ├── loan.controller.ts
│   │   │   ├── loan.service.ts
│   │   │   ├── loan.validation.ts
│   │   │   └── loanCalculator.ts   # Interest & schedule generation
│   │   ├── payments/
│   │   │   ├── payment.routes.ts
│   │   │   ├── payment.controller.ts
│   │   │   ├── payment.service.ts
│   │   │   └── payment.validation.ts
│   │   ├── reports/
│   │   │   ├── report.routes.ts
│   │   │   ├── report.controller.ts
│   │   │   └── report.service.ts
│   │   ├── notifications/
│   │   │   ├── notification.service.ts
│   │   │   ├── email.service.ts
│   │   │   ├── sms.service.ts
│   │   │   └── templates/
│   │   ├── audit/
│   │   │   ├── audit.routes.ts
│   │   │   └── audit.service.ts
│   │   ├── documents/
│   │   │   ├── document.routes.ts
│   │   │   ├── document.controller.ts
│   │   │   └── document.service.ts
│   │   └── portal/                 # Borrower self-service
│   │       ├── portal.routes.ts
│   │       ├── portal.controller.ts
│   │       └── portal.service.ts
│   ├── jobs/
│   │   ├── overdueCheck.ts         # Daily cron: update overdue statuses
│   │   ├── notificationSender.ts   # Process notification queue
│   │   └── reportGenerator.ts      # Nightly report generation
│   ├── utils/
│   │   ├── errors.ts               # Custom error classes
│   │   ├── pagination.ts
│   │   ├── crypto.ts               # Field encryption helpers
│   │   └── dateUtils.ts
│   └── types/
│       └── express.d.ts            # Extend Express Request type
├── prisma/
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts                     # Seed roles, admin user, default loan product
├── scripts/
│   ├── migrate-legacy-data.ts
│   └── generate-test-data.ts
├── tests/
│   ├── unit/
│   │   ├── loanCalculator.test.ts
│   │   └── auth.service.test.ts
│   ├── integration/
│   │   ├── auth.test.ts
│   │   ├── loans.test.ts
│   │   └── payments.test.ts
│   └── fixtures/
│       └── testData.ts
├── .env.example
├── Dockerfile
├── docker-compose.yml
├── package.json
└── tsconfig.json
```

### 12.3 Testing Strategy

| Layer | Tool | Coverage Target | Focus Areas |
|-------|------|----------------|-------------|
| **Unit Tests** | Jest | 80%+ service layer | Loan calculator (interest, schedule), validation, permission checks |
| **Integration Tests** | Jest + Supertest | All API endpoints | Auth flow, CRUD operations, RBAC enforcement, data isolation |
| **Database Tests** | Prisma + test DB | Migrations, seeds | Schema integrity, constraints, cascades |
| **UI Component Tests** | React Testing Library | Key components | Forms, tables, permission-gated elements |
| **E2E Tests** | Playwright | Critical paths | Login → Create Borrower → Create Loan → Record Payment → Check Dashboard |
| **Load Tests** | k6 or Artillery | API endpoints | 100 concurrent users, response < 500ms |
| **Security Tests** | OWASP ZAP, npm audit | Known vulnerabilities | OWASP Top 10 |

### 12.4 Logging & Monitoring

| Concern | Tool | Details |
|---------|------|---------|
| **Application logs** | Winston (structured JSON) | Log levels: error, warn, info, debug |
| **Request logs** | Morgan + custom middleware | Method, path, status, duration, user ID (no PII) |
| **Error tracking** | Sentry | Unhandled exceptions, performance monitoring |
| **Uptime monitoring** | UptimeRobot / Azure Monitor | Health check endpoint `/v1/health` |
| **Metrics** | Prometheus + Grafana (or Azure Application Insights) | Request rate, response time, error rate, active users |
| **Alerting** | Email/Slack alerts on | Error rate > 1%, response time > 2s, disk > 80%, DB connection failures |

### 12.5 Health Check Endpoint

```typescript
// GET /v1/health
app.get('/v1/health', async (req, res) => {
  const health = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    services: {
      database: await checkDbConnection(),    // 'OK' or 'ERROR'
      redis: await checkRedisConnection(),    // 'OK' or 'ERROR'  
      fileStorage: await checkS3Connection(), // 'OK' or 'ERROR'
    },
    version: process.env.APP_VERSION || '1.0.0',
  };
  
  const allOk = Object.values(health.services).every(s => s === 'OK');
  res.status(allOk ? 200 : 503).json(health);
});
```

---

## 13. Deployment & Infrastructure

### 13.1 Recommended Cloud Setup (Azure — given Kenyan context)

```
┌─────────────────────────────────────────────────────────────┐
│                     Azure (East Africa / Europe)             │
│                                                              │
│  ┌──────────────────┐     ┌─────────────────────────────┐  │
│  │ Azure App Service │     │ Azure Database for PostgreSQL│  │
│  │ (Node.js Backend) │────▶│ Flexible Server              │  │
│  │ + Custom Domain   │     │ (Production: B2s, Dev: B1ms) │  │
│  │ + Managed TLS     │     └─────────────────────────────┘  │
│  └────────┬─────────┘                                        │
│           │              ┌──────────────────┐                │
│           │              │ Azure Cache for   │                │
│           ├─────────────▶│ Redis (Basic C0)  │                │
│           │              └──────────────────┘                │
│           │              ┌──────────────────┐                │
│           ├─────────────▶│ Azure Blob Storage│                │
│           │              │ (Documents)       │                │
│           │              └──────────────────┘                │
│           │              ┌──────────────────┐                │
│           └─────────────▶│ Azure Key Vault   │                │
│                          │ (Secrets)         │                │
│                          └──────────────────┘                │
│                                                              │
│  ┌──────────────────┐                                        │
│  │ Azure Static Web  │                                       │
│  │ Apps (React SPAs) │                                       │
│  │ + CDN + TLS       │                                       │
│  └──────────────────┘                                        │
│                                                              │
│  ┌──────────────────┐                                        │
│  │ Azure Monitor +   │                                       │
│  │ Application       │                                       │
│  │ Insights          │                                       │
│  └──────────────────┘                                        │
└─────────────────────────────────────────────────────────────┘

DNS: api.ndeliki.co.ke → Azure App Service
     app.ndeliki.co.ke → Azure Static Web Apps (staff)
     portal.ndeliki.co.ke → Azure Static Web Apps (borrower)
```

### 13.2 Alternative: Docker Compose (Budget-Friendly VPS)

For a simpler initial deployment on a VPS (e.g., Hetzner, DigitalOcean):

```yaml
# docker-compose.yml
version: '3.8'

services:
  api:
    build: ./backend
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=postgresql://ndeliki:pass@db:5432/ndeliki_lms
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=${JWT_SECRET}
      - S3_BUCKET=${S3_BUCKET}
    depends_on:
      - db
      - redis
    restart: unless-stopped

  frontend:
    build: ./frontend
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/conf.d/default.conf
      - /etc/letsencrypt:/etc/letsencrypt
    depends_on:
      - api
    restart: unless-stopped

  db:
    image: postgres:16-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_USER=ndeliki
      - POSTGRES_PASSWORD=${DB_PASSWORD}
      - POSTGRES_DB=ndeliki_lms
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    restart: unless-stopped

volumes:
  postgres_data:
```

### 13.3 CI/CD Pipeline

```
GitHub Repository
    │
    ├── Push to main ──────▶ GitHub Actions
    │                         │
    │                         ├── 1. Lint (ESLint, Prettier)
    │                         ├── 2. Type Check (tsc --noEmit)
    │                         ├── 3. Unit Tests (Jest)
    │                         ├── 4. Integration Tests (Jest + test DB)
    │                         ├── 5. Build (Backend + Frontend)
    │                         ├── 6. Security Scan (npm audit, Snyk)
    │                         └── 7. Deploy to Staging
    │
    └── Release tag ──────▶ Deploy to Production
```

### 13.4 Backup Strategy

| Component | Frequency | Retention | Method |
|-----------|-----------|-----------|--------|
| PostgreSQL | Daily full, hourly WAL | 30 days | pg_dump + Azure automated backup |
| Redis | N/A (cache only) | — | Rebuilt from source data |
| File Storage | Continuous | Indefinite | Azure Blob versioning / S3 versioning |
| Application Code | Every push | Indefinite | Git history |

---

## 14. Implementation Roadmap

### Phase 1: Foundation (Weeks 1–3)

| Task | Deliverable |
|------|-------------|
| Project setup | Monorepo with backend + frontend, Docker Compose for local dev |
| Database schema | Prisma schema, initial migration, seed script (roles, admin user, default product) |
| Auth module | Login, logout, JWT, refresh tokens, password reset, change password |
| RBAC middleware | Permission-based route guards |
| User management | CRUD for staff users (admin-only) |

### Phase 2: Core Business Logic (Weeks 4–6)

| Task | Deliverable |
|------|-------------|
| Borrower module | CRUD, search, deduplication, document upload |
| Loan module | Create, calculate (flat + reducing), schedule generation, status lifecycle |
| Payment module | Record payments, allocate to schedule, update balances |
| Loan calculator | Unit-tested interest calculation for both flat and reducing balance |

### Phase 3: Staff Frontend (Weeks 7–9)

| Task | Deliverable |
|------|-------------|
| Dashboard page | Stats cards, charts (Recharts), overdue table |
| Borrower pages | List, create, detail/profile |
| Loan pages | List, create (wizard), detail with schedule + payments |
| Payment pages | Record payment, payment history |
| Report pages | Dashboard reports, CSV/PDF export |

### Phase 4: Data Migration & Testing (Weeks 10–11)

| Task | Deliverable |
|------|-------------|
| Migration script | Legacy JSON → new DB, with cleansing |
| Data validation | Compare migrated totals with current app |
| Integration tests | Full API test coverage |
| UAT | Staff testing with real data |

### Phase 5: Extended Features (Weeks 12–14)

| Task | Deliverable |
|------|-------------|
| Borrower self-service portal | Login, view loans, payments, download statements |
| Notifications | Email + SMS for key events, cron for reminders |
| Audit log UI | Admin view of all actions |
| Import/export | CSV/JSON import with validation, server-generated exports |
| Admin settings | System config, loan products, notification templates |

### Phase 6: Deployment & Launch (Weeks 15–16)

| Task | Deliverable |
|------|-------------|
| Production infrastructure | Azure/VPS setup, DNS, TLS |
| CI/CD pipeline | GitHub Actions |
| Performance testing | Load test, optimize slow queries |
| Security review | OWASP checklist, penetration test basics |
| Go-live | Domain switch, staff training, monitoring |
| Post-launch | 2-week parallel run, bug fixes |

### Estimated Timeline: 16 weeks (4 months)

### Team Composition (Recommended Minimum)

| Role | Count | Responsibility |
|------|-------|---------------|
| Full-stack Developer (Lead) | 1 | Architecture, backend, code reviews |
| Frontend Developer | 1 | React UI, responsive design |
| QA / Tester | 0.5 | Test cases, UAT coordination |
| DevOps | 0.5 | Infrastructure, CI/CD, monitoring |
| Product Owner (Business) | 0.5 | Requirements validation, UAT, data cleansing decisions |

---

## Appendix A: Current Loan Default Product Configuration

Based on analysis of the existing system, the default loan product to seed is:

```json
{
  "name": "Weekly Flat Rate (Legacy)",
  "description": "Standard Ndeliki weekly repayment loan with flat interest",
  "interestMethod": "FLAT",
  "interestRateDefault": 30,
  "interestPeriod": "TOTAL",
  "repaymentFrequency": "WEEKLY",
  "minPrincipal": 1000,
  "maxPrincipal": 100000,
  "minDurationUnits": 1,
  "maxDurationUnits": 52,
  "penaltyRate": 0,
  "penaltyGraceDays": 0,
  "requiresApproval": true,
  "approvalLimit": 50000
}
```

**Interest calculation (matching current system):**
```
Total Due = Principal + (Principal × Rate / 100)
Weekly Installment = Total Due / Weeks
Due Date = Issue Date + (Weeks × 7 days)
```

## Appendix B: Environment Variables

```bash
# .env.example

# Server
NODE_ENV=production
PORT=3000
APP_VERSION=1.0.0

# Database
DATABASE_URL=postgresql://user:password@host:5432/ndeliki_lms

# Redis
REDIS_URL=redis://localhost:6379

# JWT
JWT_SECRET=your-256-bit-secret-here
JWT_REFRESH_SECRET=your-other-256-bit-secret
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# File Storage (S3 / Azure Blob)
STORAGE_TYPE=s3
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
AWS_REGION=eu-west-1
AWS_S3_BUCKET=ndeliki-documents

# Email (SendGrid)
SENDGRID_API_KEY=SG.xxx
EMAIL_FROM=noreply@ndeliki.co.ke
EMAIL_FROM_NAME=Ndeliki Limited

# SMS (Africa's Talking)
AT_API_KEY=xxx
AT_USERNAME=ndeliki
AT_SENDER_ID=NDELIKI

# CORS
CORS_ORIGINS=https://app.ndeliki.co.ke,https://portal.ndeliki.co.ke

# Encryption
ENCRYPTION_KEY=your-aes-256-key

# Sentry
SENTRY_DSN=https://xxx@sentry.io/xxx
```

---

*End of Design Document*

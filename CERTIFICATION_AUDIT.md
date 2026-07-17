# Bill Aura ERP V1.0 Certification Audit

Date: 2026-07-17

## Scope and discovery

- 454 TypeScript, TSX, and Prisma source files were discovered.
- Backend: 59 controller modules covering authentication, CRM, inventory, sales, purchases, accounting, reports, tax, HR, finance, platform, and operations.
- Frontend: React Router workspace routes, lazy-loaded feature modules, shared UI components, Zustand session state, React Query, and Axios API client.
- Persistence: Prisma/PostgreSQL with company-scoped core models and session, ledger, inventory, document, and reporting models.

## Dependency map

```text
React routes -> protected layouts -> feature pages -> apiClient -> Nest controllers
Nest controllers -> guards/middleware/interceptors -> services -> PrismaService -> PostgreSQL
Auth pages/session provider -> TokenService -> Axios refresh queue -> auth endpoints -> SessionService
Sales/Purchases/Expenses -> accounting services -> journal/ledger models -> report services
Inventory forms/services -> stock ledger and product/warehouse models
```

## Verified fixes

| Severity | Finding | Evidence and remediation |
| --- | --- | --- |
| High | Public database timing probes | Removed `PrismaTestController` from `backend/src/app.module.ts` and `DbTestController` from `backend/src/database/database.module.ts`; removed both controller files. |
| High | Refresh token exposed to browser storage | Refresh token is now an HttpOnly cookie; access token is memory-only. See `backend/src/auth/auth.controller.ts` and `frontend/src/services/auth/TokenService.ts`. |
| High | Password reset compared an OTP to its bcrypt hash directly | Reset now uses `bcrypt.compare`, validates a typed DTO, and revokes existing sessions. See `backend/src/auth/auth.service.ts`. |
| Medium | Concurrent refresh could race | Rotation uses a compare-and-swap `updateMany` condition. See `backend/src/auth/session.service.ts`. |

## Verification evidence

- Backend TypeScript check: passed (`npm run type-check`).
- Backend production build: passed (`npm run build`).
- Frontend TypeScript check: passed (`npm run type-check`).
- Frontend production build: passed (`npm run build`).
- Backend Jest execution: failed before test execution because Jest has no TypeScript transformer configuration. It attempts to parse `.spec.ts` as JavaScript.

## Release blockers

### Critical

None newly verified after removal of public database probes.

### High

1. The Jest suite cannot run. There is no usable test command or TypeScript transform configuration in `backend/package.json`; therefore accounting, inventory, reporting, and authentication behavior has not been regression-tested.
2. Several functional application routes are placeholders or map to unrelated screens, including `quotations`, `payments`, `vendor-payments`, `banking`, platform administration pages, and multiple report routes. See `frontend/src/app/router.tsx`.
3. End-to-end business workflows cannot be certified without a controlled database, seed data, authenticated test identities, and executable E2E tests.

### Medium

1. Static inspection found 742 instances matching debug/TODO/unsafe-any search terms. They require triage; the count is not treated as 742 defects.
2. Only controller/route discovery was completed in this pass. A complete field-by-field form, accounting posting, inventory valuation, and report-reconciliation audit remains required.

## Certification decision

**FAIL — do not release as a certified enterprise V1.0 build.** Builds compile, and the verified security issues above were remediated, but unavailable automated tests and placeholder production routes fail the stated release criteria.

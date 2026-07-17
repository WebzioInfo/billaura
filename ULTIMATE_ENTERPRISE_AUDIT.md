# Bill Aura ERP — Ultimate Enterprise Audit

Audit date: 2026-07-17  
Decision: **NO-GO for production certification**

## 1. Executive summary

The application builds, has broad feature coverage, and contains some meaningful controls (JWT validation, DTO validation pipe, Prisma constraints, transactional posting paths, and a refresh-token rotation flow). It does not meet the stated enterprise release criteria. The decisive blockers are tenant-context trust, unavailable automated tests, incomplete production routes, and unverified financial/inventory workflows.

This is a static-code and build audit. No authenticated database-backed E2E environment, seed dataset, coverage report, CI configuration, or deployed runtime was available; those items are explicitly **not certified**.

## 2. System inventory and dependency map

| Area | Direct evidence |
| --- | --- |
| Backend surface | 58 controllers, 64 services, and 35 DTO files under `backend/src`. |
| Frontend surface | 171 TSX components and 12 hooks; routes are declared in `frontend/src/app/router.tsx`. |
| Persistence | PostgreSQL Prisma schema in `backend/prisma/schema.prisma`; five committed migrations. |
| Core execution path | `Router -> ProtectedRoute/layout -> feature page -> apiClient -> Nest controller -> guard/context -> service -> Prisma -> PostgreSQL`. |
| Financial execution path | `sales/purchases/expenses -> accounting services -> JournalEntry/JournalLine -> report services`. |
| Session execution path | `Login/SessionProvider -> TokenService/apiClient -> auth controller -> SessionService -> Session`. |

## 3. Scores

Scores represent verified implementation evidence, not intent.

| Domain | Score | Evidence and limiting factor |
| --- | ---: | --- |
| Architecture | 5/10 | Domain modules exist, but duplicate accounting engines and placeholder routes weaken boundaries. |
| Backend | 5/10 | Nest controllers/services/DTOs are extensive; many controller inputs remain `any`. |
| Database | 6/10 | Good company-scoped uniqueness and cascades; no runtime migration/reconciliation evidence. |
| Authentication | 6/10 | Short-lived JWT, cookie refresh and rotation exist; tenant context is unsafe. |
| Security | 3/10 | Verified tenant-isolation flaw blocks certification. |
| Accounting | 3/10 | Balanced-posting checks exist but two engines have inconsistent validation and no executable regression evidence. |
| Inventory | 4/10 | Negative stock check exists; concurrent adjustment integrity is unproven. |
| Reporting | 4/10 | P&L query is parameterized; source-to-report reconciliation is untested. |
| Frontend | 5/10 | Lazy routes, boundaries, and protected layouts exist; many production routes are placeholders/misdirected. |
| UX | 4/10 | Broad UI surface, but incomplete routes prevent an end-to-end workflow review. |
| Accessibility | 3/10 | No automated accessibility tests; only partial static evidence. |
| Performance | 4/10 | Lazy loading and some pagination exist; no profiling/bundle budget/production metrics. |
| Testing | 1/10 | Jest cannot parse TypeScript test files; no E2E harness found. |
| DevOps | 3/10 | Build scripts and health endpoints exist; no Docker, CI/CD, or release workflow found. |
| Maintainability | 4/10 | Strong module breadth, but pervasive `any`, debug logging, and duplicated logic remain. |
| Scalability | 4/10 | Prisma indexes and pagination are present; correctness and concurrency gaps remain. |

## 4. Master defect register (verified findings)

| ID | Sev. | Category | File / line | Finding, impact, and recommended fix |
| --- | --- | --- | --- | --- |
| SEC-001 | Critical | Tenant isolation | `backend/src/common/middleware/tenant-context.middleware.ts:8-31` | Client header `x-company-id` takes precedence over signed token context. A signed user token can be paired with another company ID. Derive tenant exclusively from the authenticated JWT; permit company switching only after membership validation. |
| SEC-002 | Critical | Authorization | `backend/src/common/guards/tenant.guard.ts:10-19` | Guard checks only that `CompanyContext` is non-empty. It does not compare it to `request.user.tenantId` or validate membership. Replace with a guard that receives the authenticated request and validates the active membership. |
| SEC-003 | High | Authorization coverage | `backend/src/reports/reports.controller.ts:13-27`; 61 JWT-only guard occurrences | JWT-only controllers rely on untrusted `CompanyContext`; not all use `TenantGuard`/`TenantAccessGuard`. Apply one consistent authenticated-tenant guard to all company-scoped controllers. |
| ACC-001 | High | Accounting integrity | `backend/src/accounting/accounting-engine.service.ts:25-99` | A second posting engine uses JavaScript `number` arithmetic, does not validate account company ownership, and has different rules from `JournalPostingService`. Consolidate on one Decimal-based, tenant-validated posting service. |
| ACC-002 | High | Concurrency | `backend/src/accounting/journal-posting.service.ts:69-74` | Journal reference is generated with `count + 1`; concurrent transactions can create duplicate references because `JournalEntry.reference` is not unique. Use the sequence service/database uniqueness with retry. |
| INV-001 | High | Inventory concurrency | `backend/src/inventory/inventory.service.ts:31-75` | Adjustment reads stock then writes an absolute quantity. Concurrent adjustments can lose updates despite the enclosing transaction. Use row locking or atomic guarded increments with serializable retry. |
| QA-001 | High | Testability | `backend/package.json`; all `*.spec.ts` | `npx jest --runInBand` fails before running tests because no TypeScript transformer is configured. Add an explicit Jest/ts-jest or SWC transform and a `test` script. |
| FE-001 | High | Functional completeness | `frontend/src/app/router.tsx:237,244,261,288,293-296,301,313,315,319-320` | At least 12 application routes intentionally use `MaintenancePage`; the requested features are not production-complete. Implement them or remove them from supported navigation/release scope. |
| FE-002 | High | Functional correctness | `frontend/src/app/router.tsx:188-195,262,271,274` | Multiple paths render unrelated dashboards (for example platform companies -> PlatformDashboard, payments -> SalesDashboard). Implement route-specific pages before release. |
| TEST-002 | High | E2E coverage | `backend`, `frontend` configuration inventory | No Playwright/Cypress config, E2E tests, controlled seed data, or CI workflow was found. Establish critical transaction journeys before release. |
| SEC-004 | Medium | Input validation | `backend/src/crm/customers.controller.ts:145,208`; inventory batch/BOM/serial controllers | Public controller methods accept `@Body() data: any`, bypassing typed DTO intent and weakening auditability. Introduce explicit create/update DTOs with whitelist validation. |
| CQ-001 | Medium | Type safety | `backend/src/reports/reports.service.ts:13-60`; multiple services/controllers | Broad use of `any` obscures domain contracts. Replace high-risk API and financial boundaries with Prisma/domain DTO types. |
| FE-003 | Medium | XSS surface | `frontend/src/app/router.tsx:123-131` | Loading fallback uses `dangerouslySetInnerHTML`. Content is constant today, but CSP-compatible CSS should replace it to remove the injection sink. |
| CQ-002 | Medium | Production diagnostics | `frontend/src/components/pwa/ReloadPrompt.tsx:12-15` and other listed UI files | Console logging remains in production source. Route failures through structured telemetry/error boundaries with user-safe messages. |
| OPS-001 | Medium | Deployment | repository configuration inventory | No Dockerfile, Compose file, CI workflow, or test pipeline was found. Define reproducible build, migration, rollback, health, and monitoring procedures. |
| SEC-005 | Medium | Cookie deployment | `backend/src/auth/auth.controller.ts` | Cookie security relies on runtime environment settings. Production must set HTTPS, exact `ALLOWED_ORIGINS`, and `COOKIE_DOMAIN`; this cannot be certified from source alone. |
| DATA-001 | Medium | Reporting correctness | `backend/src/reports/reports.service.ts:12-128` | P&L uses parameterized raw SQL (positive), but no reconciliation tests compare it to journal source data. Add fixture-based report reconciliation tests. |
| ACC-003 | Medium | Accounting control | `backend/src/accounting/accounting-engine.service.ts:104-125` | Reversal uses the current date and no demonstrated idempotency/duplicate reversal control. Track reversal linkage/status and enforce one reversal per original entry. |
| INV-002 | Medium | Traceability | `backend/src/inventory/inventory.service.ts:60-71` | Stock ledger entry does not set warehouse ID although the stock row is warehouse-specific. Confirm schema/report use; persist warehouse linkage for auditable movement history. |
| AUTH-001 | Medium | Session security | `backend/src/auth/session.service.ts:69-121` | Rotation prevents concurrent use, but prior-token reuse cannot identify/revoke the token family after the old hash is replaced. Persist a token-family/reuse-detection record and revoke family on replay. |

## 5. Verified positive controls

- Global Nest validation pipe uses whitelist and rejects non-whitelisted DTO fields: `backend/src/main.ts`.
- JWT strategy validates expiry and signature: `backend/src/auth/jwt.strategy.ts`.
- `JournalPostingService` verifies account ownership, balanced Decimal debit/credit totals, non-group accounts, and is documented for transactional use: `backend/src/accounting/journal-posting.service.ts`.
- Stock adjustment rejects negative resulting stock: `backend/src/inventory/inventory.service.ts`.
- P&L raw SQL uses Prisma tagged-template parameterization: `backend/src/reports/reports.service.ts`.
- Frontend and backend production builds completed during this audit.

## 6. Required path to a 100/100 certification

1. Fix SEC-001 through SEC-003 and add cross-tenant authorization integration tests.
2. Consolidate ACC-001 engines, use Decimal end-to-end, implement unique/document sequence allocation, and test postings/reversals under concurrency.
3. Repair QA-001 and add unit, integration, accounting reconciliation, inventory concurrency, authorization, and browser E2E suites.
4. Replace every `MaintenancePage` and misdirected production route with the intended workflow, then execute each user journey.
5. Establish CI/CD, migrations with rollback policy, secret management, structured logging, monitoring, alerting, and backups/restore drills.
6. Run accessibility automation and keyboard/mobile reviews on every supported route.
7. Produce seeded, repeatable financial and inventory reconciliation fixtures before re-audit.

## 7. Certification conclusion

**NO-GO.** The project is not eligible for enterprise production certification until all critical/high defects are remediated and independently verified through executable automated and end-to-end evidence. This conclusion intentionally does not claim complete page, form, financial, inventory, or report certification because the required runtime evidence does not exist.

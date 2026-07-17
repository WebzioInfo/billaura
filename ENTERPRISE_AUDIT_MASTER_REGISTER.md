# Bill Aura ERP — Enterprise Audit Master Register

Status: **Audit in progress — Phase 1 complete only**  
Audit date: 2026-07-17  
Scope: `D:\Webzio\billaura\apps\` only

## Phase 1 — Project inventory

### Directly verified inventory

| Asset class | Count / evidence | Status |
| --- | --- | --- |
| Backend modules | 30 top-level source modules, including accounting, auth, CRM, inventory, purchases, sales, reports, finance, HR, platform, and shared infrastructure | Verified by directory inventory |
| Controllers | 58 files containing `@Controller` | Verified by source scan |
| Services | 64 `*service.ts` files | Verified by source scan |
| DTOs | 35 `*dto.ts` files | Verified by source scan |
| Frontend TSX | 171 components/pages | Verified by source scan |
| Frontend hooks | 12 `use*` hook files | Verified by source scan |
| Database schema | 111 Prisma models and 47 enums (declarations in `backend/prisma/schema.prisma`) | Verified by declaration scan |
| Database migrations | Five migration directories in `backend/prisma/migrations` | Verified; migration safety NOT VERIFIED |
| Build configuration | Nest/Prisma backend and Vite frontend scripts; Vercel configuration for each application | Verified from package/config files |
| Test/E2E configuration | No Jest config, test script, Playwright config, Cypress config, Dockerfile, Compose file, or CI workflow found in the permitted directory | Verified by configuration inventory |

### Dependency map — verified at architectural level

```text
Frontend router -> ProtectedRoute/layout -> feature page -> API client -> Nest controller
Nest controller -> guards/middleware/interceptors -> domain service -> PrismaService -> PostgreSQL
SessionProvider/API client -> AuthController -> SessionService -> Session model
Accounting and document services -> journal models -> report services
Inventory services -> stock/stock-ledger models
```

Detailed dependency direction, circular-dependency analysis, every page, API, DTO, and model behavior remain **NOT VERIFIED** pending their dedicated phases.

## Subsystem scores after Phase 1

Scores are provisional and only reflect inventory/configuration evidence.

| Subsystem | Score | Justification |
| --- | ---: | --- |
| Architecture | 4/10 | Broad modular structure exists, but dependency direction and module behavior are not yet verified. |
| Frontend | 4/10 | Vite, lazy router, feature folders, and 171 TSX files exist; page behavior is not verified. |
| Backend | 4/10 | Nest module/controller/service structure exists; API behavior is not verified. |
| Database | 5/10 | Prisma schema and migrations exist; data integrity/migration execution not verified. |
| Authentication | NOT VERIFIED | Deferred to authentication phase. |
| Authorization | NOT VERIFIED | Deferred to authorization phase. |
| Security | 3/10 | No test/CI evidence; previously discovered tenant-context concern remains open. |
| Accounting | NOT VERIFIED | Deferred to accounting phase. |
| Inventory | NOT VERIFIED | Deferred to inventory phase. |
| Reporting | NOT VERIFIED | Deferred to reporting phase. |
| UX / Accessibility | NOT VERIFIED | Deferred to frontend/UX phases. |
| Performance / Scalability | NOT VERIFIED | No profile or load evidence. |
| Testing | 1/10 | No test command/configuration or E2E framework configuration found. |
| DevOps | 2/10 | Build and Vercel config exist; no CI, Docker, release or rollback configuration found. |
| Documentation | 2/10 | `DEPLOYMENT.md` exists; content and operational completeness not yet verified. |
| Maintainability | 3/10 | Static source has broad module coverage; code-quality review is pending. |

## Master defect register

| ID | Severity | Category | Module | File path | Description / root cause | Business impact / risk | Recommended enterprise fix | Complexity | Status | Confidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| TEST-001 | High | Testability | Build tooling | `backend/package.json`; all backend `*.spec.ts` | Jest is installed but has no script or TypeScript transform configuration. Direct execution fails before tests run because TypeScript syntax is parsed as JavaScript. | No regression evidence for financial, security, or operational behavior. | Add an explicit test script and supported TypeScript Jest transform; run and publish coverage in CI. | Medium | Open | High |
| OPS-001 | Medium | DevOps | Deployment | repository configuration inventory | No Dockerfile, Compose, Playwright/Cypress, or CI workflow was found under the permitted directory. | Reproducible deployment, rollback, and quality gates are not evidenced. | Define CI, reproducible runtime, migration/rollback, monitoring, and release controls. | High | Open | High |
| SEC-001 | Critical | Tenant isolation | Request context | `backend/src/common/middleware/tenant-context.middleware.ts` | Client `x-company-id`/`x-tenant-id` is accepted before JWT-derived context. | A company-scoped request can be directed at a different tenant if downstream code uses the context. | Derive tenant from authenticated JWT only; validate any switch against membership after authentication. | Medium | Open | High |
| SEC-002 | Critical | Authorization | Tenant guard | `backend/src/common/guards/tenant.guard.ts` | Guard validates only presence of `CompanyContext` and does not compare it with authenticated tenant membership. | Cross-tenant data access or mutation risk. | Replace with request-aware guard comparing signed identity, active company, and membership. | Medium | Open | High |
| FE-001 | High | Functional completeness | Routing | `frontend/src/app/router.tsx` | Multiple supported routes render `MaintenancePage` or unrelated dashboards. | Users can navigate to unavailable or incorrect business workflows. | Implement/route each advertised workflow before release and cover navigation with browser tests. | High | Open | High |

## Next phase dependencies

Phase 2 (code-quality audit) requires source-by-source static review, beginning with cross-cutting backend/frontend code and then feature modules. Phase 3 will trace module dependencies and authorization boundaries. No subsystem has been certified PASS.

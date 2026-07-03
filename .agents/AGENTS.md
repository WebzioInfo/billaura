# BILL AURA ERP – MANDATORY SAAS ARCHITECTURE RULES (NON-NEGOTIABLE)

Before making any change, remember that Bill Aura is a **multi-tenant SaaS ERP**, not a single-company accounting application.

Every implementation, optimization, bug fix, database query, API endpoint, frontend component, report, and workflow must preserve SaaS architecture.

## MULTI-TENANCY
- Every record belongs to exactly one tenant (company).
- Never expose another tenant's data.
- Every database query must be tenant-aware.
- Every Create, Read, Update, Delete, Search, Filter, Report, Dashboard, Export, Import, Analytics, and AI feature must automatically respect the authenticated tenant.
- Never remove tenant filtering.
- Never bypass tenant isolation.
- Verify tenant context from authentication and enforce it throughout the request lifecycle.

## NO SINGLE-TENANT ASSUMPTIONS
Do not hardcode:
- Company IDs
- User IDs
- Branch IDs
- Warehouse IDs
- Account IDs
- Default organization values
All values must come from the authenticated tenant context.

## AUTHENTICATION
Verify:
- JWT authentication
- Refresh tokens
- Session persistence
- Company isolation
- Role-based permissions
- Branch permissions
- Department permissions
- Warehouse permissions
Every API must validate both authentication and tenant ownership before processing requests.

## CRUD
For every module ensure:
- Data is created for the correct tenant.
- Lists return only the authenticated tenant's data.
- Updates cannot affect another tenant.
- Deletes cannot remove another tenant's records.
- Reports aggregate only the tenant's information.

## FRONTEND
- The frontend must never cache or display another tenant's data.
- React Query cache keys must include tenant context where appropriate.
- Logging out or switching companies must clear cached tenant data.
- No stale data may appear after login or tenant changes.

## DATABASE
Every business table must maintain proper tenant relationships. Verify:
- Foreign keys
- Indexes
- Constraints
- Cascading rules
- Transaction integrity
Optimize tenant-based queries for scalability.

## API STANDARDIZATION
Every endpoint must consistently return:
```json
{
  "success": true,
  "message": "...",
  "data": ...,
  "meta": ...
}
```
Pagination, filtering, searching, and sorting must work independently for each tenant.

## SECURITY
Prevent:
- Cross-tenant data leaks
- Unauthorized access
- ID enumeration
- Privilege escalation
- Broken access control
- Missing ownership validation
Audit every controller and service for tenant enforcement.

## SCALABILITY
Design every implementation so Bill Aura can support enterprise-scale concurrent users and operations.
Optimize database queries, indexes, pagination, and React Query usage.

## CODE QUALITY
- Do not introduce shortcuts, mock data, or temporary fixes.
- Do not use hardcoded tenant values.
- Do not add unnecessary dependencies or third-party libraries.
- Refactor using only the existing technology stack: React, TypeScript, TanStack Query, Axios, Tailwind CSS, NestJS, Prisma, MySQL.

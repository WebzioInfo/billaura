import { Controller, Get, Query, UseGuards, BadRequestException } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { TenantGuard } from "./guards/tenant.guard";
import { CompanyContext } from "./context/company-context";
import { LookupService } from "./lookup.service";

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller("lookup")
export class LookupController {
  constructor(private readonly lookupService: LookupService) {}

  @Get("search")
  async search(
    @Query("entity") entity: string,
    @Query("q") q?: string,
    @Query("allowedAccountTypes") allowedAccountTypes?: string,
    @Query("allowedTypes") allowedTypes?: string,
  ) {
    if (!entity) {
      throw new BadRequestException("Entity parameter is required");
    }

    if (entity !== "ledger") {
      throw new BadRequestException(`Entity '${entity}' is not supported`);
    }

    const companyId = CompanyContext.getCompanyId();
    if (!companyId) {
      throw new BadRequestException("Company context is required");
    }

    const term = (q || "").trim().toLowerCase();

    const { data, total, limit } = await this.lookupService.searchLedger(
      companyId,
      term,
      allowedAccountTypes,
      allowedTypes
    );

    return {
      success: true,
      message: "Ledgers retrieved successfully",
      data,
      meta: {
        total,
        limit,
      },
    };
  }
}


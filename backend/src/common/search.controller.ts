import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { TenantGuard } from "./guards/tenant.guard";
import { CompanyContext } from "./context/company-context";
import { SearchService } from "./search.service";

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller("search")
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  async search(@Query("q") query: string) {
    const companyId = CompanyContext.getCompanyId() as string;
    const results = await this.searchService.search(companyId, query);
    return { success: true, results };
  }
}

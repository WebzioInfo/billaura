import { Controller, Get, UseGuards } from "@nestjs/common";
import { AiInsightsService } from "./ai.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { TenantGuard } from "../common/guards/tenant.guard";

@Controller("ai/insights")
@UseGuards(JwtAuthGuard, TenantGuard)
export class AiController {
  constructor(private readonly aiService: AiInsightsService) {}

  @Get()
  getInsights() {
    return this.aiService.generateInsights();
  }
}

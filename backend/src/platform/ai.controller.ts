import { Controller, Get, UseGuards } from "@nestjs/common";
import { AiInsightsService } from "./ai.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";

@Controller("ai/insights")
@UseGuards(JwtAuthGuard)
export class AiController {
  constructor(private readonly aiService: AiInsightsService) {}

  @Get()
  getInsights() {
    return this.aiService.generateInsights();
  }
}

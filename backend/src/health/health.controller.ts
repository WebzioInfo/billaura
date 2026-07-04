import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import { ApiTags } from "@nestjs/swagger";
import { HealthService } from "./health.service";

@ApiTags("health")
@Controller("health")
export class HealthController {
  constructor(private healthService: HealthService) {}

  @Get()
  async check() {
    const data = await this.healthService.checkAll();
    const response = {
      success: data.isHealthy,
      status: data.isHealthy ? "ok" : "error",
      message: data.isHealthy
        ? "System is healthy"
        : "System has degraded sub-components",
      data,
      timestamp: new Date().toISOString(),
    };

    if (!data.isHealthy) {
      throw new ServiceUnavailableException(response);
    }
    return response;
  }

  @Get("database")
  async checkDatabase() {
    const data = await this.healthService.checkDatabase();
    const isHealthy = data.status === "up";
    const response = {
      success: isHealthy,
      status: isHealthy ? "ok" : "error",
      message: data.message,
      data,
      timestamp: new Date().toISOString(),
    };

    if (!isHealthy) {
      throw new ServiceUnavailableException(response);
    }
    return response;
  }

  @Get("system")
  async checkSystem() {
    const data = await this.healthService.checkSystem();
    const isHealthy = data.status === "up";
    const response = {
      success: isHealthy,
      status: isHealthy ? "ok" : "error",
      message: isHealthy ? "System operational" : "System component failure",
      data,
      timestamp: new Date().toISOString(),
    };

    if (!isHealthy) {
      throw new ServiceUnavailableException(response);
    }
    return response;
  }
}

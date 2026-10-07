import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
  Put,
  Req,
} from "@nestjs/common";
import { ExpensesService } from "./expenses.service";
import {
  CreateExpenseDto,
  UpdateExpenseApprovalDto,
  UpdateExpenseDto,
  CreateExpenseCategoryDto,
  UpdateExpenseCategoryDto,
} from "./dto/expense.dto";
import { PaginationQueryDto } from "../common/dto/pagination-query.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { TenantGuard } from "../common/guards/tenant.guard";

@UseGuards(JwtAuthGuard, TenantGuard)
@Controller("expenses")
export class ExpensesController {
  constructor(private readonly expensesService: ExpensesService) {}

  // --- Category Endpoints ---

  @Get("categories")
  async findCategories() {
    const data = await this.expensesService.findCategories();
    return { success: true, data };
  }

  @Get("categories/:id")
  async findCategory(@Param("id") id: string) {
    const data = await this.expensesService.findCategory(id);
    return { success: true, data };
  }

  @Post("categories")
  async createCategory(@Body() dto: CreateExpenseCategoryDto) {
    const data = await this.expensesService.createCategory(dto);
    return { success: true, message: "Expense category created successfully", data };
  }

  @Put("categories/:id")
  async updateCategory(
    @Param("id") id: string,
    @Body() dto: UpdateExpenseCategoryDto,
  ) {
    const data = await this.expensesService.updateCategory(id, dto);
    return { success: true, message: "Expense category updated successfully", data };
  }

  @Delete("categories/:id")
  @HttpCode(HttpStatus.OK)
  async removeCategory(@Param("id") id: string) {
    await this.expensesService.removeCategory(id);
    return { success: true, message: "Expense category deleted successfully" };
  }

  // --- Expense Claims Endpoints ---

  @Get()
  async findAll(@Query() query: PaginationQueryDto) {
    const result = await this.expensesService.findAll(query);
    return { success: true, ...result };
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    const data = await this.expensesService.findOne(id);
    return { success: true, data };
  }

  @Post()
  async create(@Body() dto: CreateExpenseDto) {
    const data = await this.expensesService.create(dto);
    return { success: true, message: "Expense created successfully", data };
  }

  @Put(":id")
  async update(@Param("id") id: string, @Body() dto: UpdateExpenseDto) {
    const data = await this.expensesService.update(id, dto);
    return { success: true, message: "Expense updated successfully", data };
  }

  @Put(":id/approval")
  async updateApproval(
    @Param("id") id: string,
    @Body() dto: UpdateExpenseApprovalDto,
    @Req() req: any,
  ) {
    const data = await this.expensesService.updateApproval(id, dto, req.user.sub);
    return { success: true, message: "Expense approval updated successfully", data };
  }

  @Delete(":id")
  @HttpCode(HttpStatus.OK)
  async remove(@Param("id") id: string) {
    await this.expensesService.remove(id);
    return { success: true, message: "Expense deleted successfully" };
  }
}

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
    return this.expensesService.findCategories();
  }

  @Get("categories/:id")
  async findCategory(@Param("id") id: string) {
    return this.expensesService.findCategory(id);
  }

  @Post("categories")
  async createCategory(@Body() dto: CreateExpenseCategoryDto) {
    return this.expensesService.createCategory(dto);
  }

  @Put("categories/:id")
  async updateCategory(
    @Param("id") id: string,
    @Body() dto: UpdateExpenseCategoryDto,
  ) {
    return this.expensesService.updateCategory(id, dto);
  }

  @Delete("categories/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeCategory(@Param("id") id: string) {
    await this.expensesService.removeCategory(id);
  }

  // --- Expense Claims Endpoints ---

  @Get()
  async findAll(@Query() query: PaginationQueryDto) {
    return this.expensesService.findAll(query);
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    return this.expensesService.findOne(id);
  }

  @Post()
  async create(@Body() dto: CreateExpenseDto) {
    return this.expensesService.create(dto);
  }

  @Put(":id")
  async update(@Param("id") id: string, @Body() dto: UpdateExpenseDto) {
    return this.expensesService.update(id, dto);
  }

  @Put(":id/approval")
  async updateApproval(
    @Param("id") id: string,
    @Body() dto: UpdateExpenseApprovalDto,
    @Req() req: any,
  ) {
    return this.expensesService.updateApproval(id, dto, req.user.sub);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param("id") id: string) {
    await this.expensesService.remove(id);
  }
}

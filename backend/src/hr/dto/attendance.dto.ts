import {
  IsString,
  IsNotEmpty,
  IsDateString,
  IsEnum,
  IsOptional,
} from "class-validator";
import { AttendanceType } from "@prisma/client";

export class RecordAttendanceDto {
  @IsString()
  @IsNotEmpty()
  employeeId: string;

  @IsDateString()
  @IsNotEmpty()
  date: string;

  @IsEnum(AttendanceType)
  @IsNotEmpty()
  type: AttendanceType;

  @IsDateString()
  @IsOptional()
  checkIn?: string;

  @IsDateString()
  @IsOptional()
  checkOut?: string;

  @IsOptional()
  workingHours?: number;

  @IsOptional()
  breakTime?: number;

  @IsOptional()
  overtime?: number;

  @IsOptional()
  lateBy?: number;

  @IsOptional()
  earlyExit?: number;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class BulkRecordAttendanceDto {
  records: RecordAttendanceDto[];
}

import { AttendanceMetricsSummary } from './attendance-engine';

export interface PayrollCalculationInput {
  employee: {
    id: string;
    name?: string;
    joiningDate?: Date | string | null;
    relievingDate?: Date | string | null;
    basicSalary: number;
    allowances: number;
    bonus?: number;
    incentives?: number;
    pfNumber?: string | null;
    esiNumber?: string | null;
    panNumber?: string | null;
  };
  period: {
    startDate: Date | string;
    endDate: Date | string;
  };
  attendanceSummary: AttendanceMetricsSummary;
  customAdjustments?: {
    basicSalary?: number;
    allowances?: number;
    bonus?: number;
    incentives?: number;
    otAmount?: number;
    fine?: number; // Represent LOP Deduction
    advanceRecovery?: number;
    loanRecovery?: number;
    pf?: number;
    esi?: number;
    tax?: number;
    otherDeductions?: number;
  };
  statutoryConfig?: {
    pfRate?: number;
    esiRate?: number;
    esiCeilingLimit?: number;
    enablePfCap?: boolean;
  };
}

export interface PayrollCalculationResult {
  period: {
    startDate: string;
    endDate: string;
    daysInMonth: number;
    eligibleWorkingDays: number;
  };
  employee: {
    id: string;
    name?: string;
    joiningDate?: string | null;
    relievingDate?: string | null;
    monthlyBasic: number;
    monthlyAllowances: number;
  };
  attendance: {
    totalDays: number;
    eligibleWorkingDays: number;
    futureDays: number;
    preJoiningDays: number;
    postRelievingDays: number;
    present: number;
    absent: number;
    paidLeave: number;
    unpaidLeave: number;
    halfDay: number;
    holiday: number;
    weekOff: number;
    lateCount: number;
    lateMinutes: number;
    otHours: number;
    paidDays: number;
    lossOfPayDays: number;
    attendancePercentage: number;
  };
  earnings: {
    dailyBasic: number;
    dailyAllowance: number;
    dailyWage: number; // Combined daily rate for LOP calculation
    earnedBasic: number; // Full basic
    earnedAllowances: number; // Full allowances
    earnedOvertime: number;
    earnedBonus: number;
    earnedIncentives: number;
    totalGross: number;
  };
  deductions: {
    pf: number;
    esi: number;
    tax: number;
    fine: number; // LOP Deduction
    advanceRecovery: number;
    loanRecovery: number;
    otherDeductions: number;
    totalDeductions: number;
  };
  netSalary: number;
  formulaSnapshot: {
    dailySalaryFormula: string;
    earnedBasicFormula: string;
    grossFormula: string;
    deductionFormula: string;
    netFormula: string;
  };
  auditTrail: {
    calculatedAt: string;
    version: number;
    reason?: string;
  };
}

export class PayrollEngine {
  /**
   * Centralized Enterprise Payroll Calculation Engine.
   * Single source of truth for all payroll calculations across Bill Aura ERP.
   */
  static calculatePayroll(input: PayrollCalculationInput): PayrollCalculationResult {
    const {
      employee,
      period,
      attendanceSummary,
      customAdjustments = {},
      statutoryConfig = {},
    } = input;

    const startDate = new Date(period.startDate);
    const endDate = new Date(period.endDate);
    const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
    const daysInMonth = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

    const monthlyBasic = Number(employee.basicSalary) || 0;
    const monthlyAllowances = Number(employee.allowances) || 0;
    const totalBaseSalary = monthlyBasic + monthlyAllowances;

    // Daily wage rules
    const dailyBasic = +(monthlyBasic / daysInMonth).toFixed(2);
    const dailyAllowance = +(monthlyAllowances / daysInMonth).toFixed(2);
    const dailyWage = +(totalBaseSalary / daysInMonth).toFixed(2);

    const paidDays = attendanceSummary.totalPaidDays || 0;
    const lossOfPayDays = attendanceSummary.lossOfPayDays || 0;

    // Gross Salary = Full Monthly Base Salary + OT + Bonus + Incentives
    const earnedBasic = monthlyBasic;
    const earnedAllowances = monthlyAllowances;

    // Approved Overtime Calculation (1.5x hourly basic rate if not manually set)
    const defaultOtAmount = +((attendanceSummary.otHours || 0) * (dailyBasic / 8) * 1.5).toFixed(2);
    const earnedOvertime = customAdjustments.otAmount !== undefined
      ? Number(customAdjustments.otAmount)
      : defaultOtAmount;

    const earnedBonus = customAdjustments.bonus !== undefined
      ? Number(customAdjustments.bonus)
      : (Number(employee.bonus) || 0);

    const earnedIncentives = customAdjustments.incentives !== undefined
      ? Number(customAdjustments.incentives)
      : (Number(employee.incentives) || 0);

    const totalGross = +(earnedBasic + earnedAllowances + earnedOvertime + earnedBonus + earnedIncentives).toFixed(2);

    // 2. Calculate Statutory Deductions
    const pfRate = statutoryConfig.pfRate ?? 0.12;
    const enablePfCap = statutoryConfig.enablePfCap ?? true;
    let pf = 0;
    if (customAdjustments.pf !== undefined) {
      pf = Number(customAdjustments.pf);
    } else if (employee.pfNumber || earnedBasic > 0) {
      // PF computed on earned basic (which can be prorated if preferred, but here we cap it on full base basic)
      const pfBase = enablePfCap ? Math.min(15000, earnedBasic) : earnedBasic;
      pf = +(pfBase * pfRate).toFixed(2);
    }

    const esiRate = statutoryConfig.esiRate ?? 0.0075;
    const esiCeiling = statutoryConfig.esiCeilingLimit ?? 21000;
    let esi = 0;
    if (customAdjustments.esi !== undefined) {
      esi = Number(customAdjustments.esi);
    } else if ((employee.esiNumber || totalGross <= esiCeiling) && totalGross > 0) {
      esi = +(totalGross * esiRate).toFixed(2);
    }

    const tax = customAdjustments.tax !== undefined
      ? Number(customAdjustments.tax)
      : (totalGross > 50000 ? 2000 : totalGross > 25000 ? 1000 : 0);

    // LOP Deduction = Daily Wage * LOP Days
    const defaultFine = +(dailyWage * lossOfPayDays).toFixed(2);
    const fine = customAdjustments.fine !== undefined
      ? Number(customAdjustments.fine)
      : defaultFine;

    const advanceRecovery = Number(customAdjustments.advanceRecovery) || 0;
    const loanRecovery = Number(customAdjustments.loanRecovery) || 0;
    const otherDeductions = Number(customAdjustments.otherDeductions) || 0;

    const totalDeductions = +(pf + esi + tax + fine + advanceRecovery + loanRecovery + otherDeductions).toFixed(2);
    const netSalary = Math.max(0, +(totalGross - totalDeductions).toFixed(2));

    return {
      period: {
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        daysInMonth,
        eligibleWorkingDays: attendanceSummary.eligibleWorkingDays,
      },
      employee: {
        id: employee.id,
        name: employee.name,
        joiningDate: employee.joiningDate ? new Date(employee.joiningDate).toISOString().split('T')[0] : null,
        relievingDate: employee.relievingDate ? new Date(employee.relievingDate).toISOString().split('T')[0] : null,
        monthlyBasic,
        monthlyAllowances,
      },
      attendance: {
        totalDays: attendanceSummary.totalDays,
        eligibleWorkingDays: attendanceSummary.eligibleWorkingDays,
        futureDays: attendanceSummary.futureDays,
        preJoiningDays: attendanceSummary.preJoiningDays,
        postRelievingDays: attendanceSummary.postRelievingDays,
        present: attendanceSummary.present,
        absent: attendanceSummary.absent,
        paidLeave: attendanceSummary.paidLeave,
        unpaidLeave: attendanceSummary.unpaidLeave,
        halfDay: attendanceSummary.halfDay,
        holiday: attendanceSummary.holiday,
        weekOff: attendanceSummary.weekOff,
        lateCount: attendanceSummary.lateCount,
        lateMinutes: attendanceSummary.lateMinutes,
        otHours: attendanceSummary.otHours,
        paidDays,
        lossOfPayDays,
        attendancePercentage: attendanceSummary.attendancePercentage,
      },
      earnings: {
        dailyBasic,
        dailyAllowance,
        dailyWage,
        earnedBasic,
        earnedAllowances,
        earnedOvertime,
        earnedBonus,
        earnedIncentives,
        totalGross,
      },
      deductions: {
        pf,
        esi,
        tax,
        fine,
        advanceRecovery,
        loanRecovery,
        otherDeductions,
        totalDeductions,
      },
      netSalary,
      formulaSnapshot: {
        dailySalaryFormula: `Daily Wage = (Basic ${monthlyBasic} + Allowances ${monthlyAllowances}) / Days ${daysInMonth} = ${dailyWage}`,
        earnedBasicFormula: `Gross = Base Basic ${monthlyBasic} + Base Allowances ${monthlyAllowances} + OT ${earnedOvertime} + Bonus ${earnedBonus} = ${totalGross}`,
        grossFormula: `Gross = ${totalGross}`,
        deductionFormula: `LOP Deduction = Daily Wage ${dailyWage} * LOP Days ${lossOfPayDays} = ${fine}`,
        netFormula: `Net = Gross ${totalGross} - LOP ${fine} - Deductions ${totalDeductions - fine} = ${netSalary}`,
      },
      auditTrail: {
        calculatedAt: new Date().toISOString(),
        version: 2.0,
      },
    };
  }
}

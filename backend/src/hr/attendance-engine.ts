export interface RawAttendanceRecord {
  id?: string;
  employeeId: string;
  date: Date | string;
  type: string;
  status?: string;
  checkIn?: Date | string | null;
  checkOut?: Date | string | null;
  workingMinutes?: number | null;
  overtimeMinutes?: number | null;
  lateMinutes?: number | null;
  notes?: string | null;
}

export interface AttendanceMetricsSummary {
  present: number;
  absent: number;
  halfDay: number;
  paidLeave: number;
  unpaidLeave: number;
  leave: number; // Combined paid + unpaid
  holiday: number;
  weekOff: number;
  workFromHome: number;
  onDuty: number;
  training: number;
  lateCount: number;
  totalWorkingMinutes: number;
  totalWorkingHours: number;
  totalOvertimeMinutes: number;
  totalPaidDays: number;
  lossOfPayDays: number;
  totalDaysInPeriod: number;
  attendancePercentage: number;
}

export class AttendanceEngine {
  /**
   * Single Source of Truth for computing attendance metrics across ERP
   */
  static computeMetrics(records: RawAttendanceRecord[], totalDaysInPeriod?: number): AttendanceMetricsSummary {
    let present = 0;
    let absent = 0;
    let halfDay = 0;
    let paidLeave = 0;
    let unpaidLeave = 0;
    let holiday = 0;
    let weekOff = 0;
    let workFromHome = 0;
    let onDuty = 0;
    let training = 0;
    let lateCount = 0;
    let totalWorkingMinutes = 0;
    let totalOvertimeMinutes = 0;

    for (const record of records) {
      const status = (record.type || record.status || '').toUpperCase();

      switch (status) {
        case 'PRESENT':
          present++;
          break;
        case 'ABSENT':
          absent++;
          break;
        case 'HALF_DAY':
          halfDay++;
          break;
        case 'PAID_LEAVE':
        case 'LEAVE':
          paidLeave++;
          break;
        case 'UNPAID_LEAVE':
          unpaidLeave++;
          break;
        case 'HOLIDAY':
          holiday++;
          break;
        case 'WEEK_OFF':
        case 'WEEKLY_OFF':
          weekOff++;
          break;
        case 'WORK_FROM_HOME':
        case 'REMOTE':
          workFromHome++;
          break;
        case 'ON_DUTY':
        case 'BUSINESS_TRIP':
          onDuty++;
          break;
        case 'TRAINING':
          training++;
          break;
        default:
          if (status) {
            present++;
          }
          break;
      }

      let computedWorkingMins = record.workingMinutes;
      let computedOvertimeMins = record.overtimeMinutes;
      let computedLateMins = record.lateMinutes;

      if ((computedWorkingMins === undefined || computedWorkingMins === null) && record.checkIn && record.checkOut) {
        const ci = new Date(record.checkIn).getTime();
        const co = new Date(record.checkOut).getTime();
        if (!isNaN(ci) && !isNaN(co) && co > ci) {
          computedWorkingMins = Math.floor((co - ci) / 60000);
          if (computedWorkingMins > 480) {
            computedOvertimeMins = computedWorkingMins - 480;
          }
        }
      }

      if ((computedLateMins || 0) > 15) {
        lateCount++;
      }

      totalWorkingMinutes += computedWorkingMins || 0;
      totalOvertimeMinutes += computedOvertimeMins || 0;
    }

    const totalRecords = totalDaysInPeriod || records.length || 1;
    const leaveCombined = paidLeave + unpaidLeave;

    // Enterprise Statutory Paid Days Formula:
    // Present + Paid Leave + Holiday + Week Off + WFH + On Duty + Training + (Half Day * 0.5)
    const totalPaidDays = present + paidLeave + holiday + weekOff + workFromHome + onDuty + training + (halfDay * 0.5);

    // Loss of Pay Days
    const lossOfPayDays = absent + unpaidLeave + (halfDay * 0.5);

    // Standard Enterprise Attendance % = (Total Paid Days / Total Days in Period) * 100
    const attendancePercentage = totalRecords > 0 ? (totalPaidDays / totalRecords) * 100 : 0;

    return {
      present,
      absent,
      halfDay,
      paidLeave,
      unpaidLeave,
      leave: leaveCombined,
      holiday,
      weekOff,
      workFromHome,
      onDuty,
      training,
      lateCount,
      totalWorkingMinutes,
      totalWorkingHours: +(totalWorkingMinutes / 60).toFixed(1),
      totalOvertimeMinutes,
      totalPaidDays: +totalPaidDays.toFixed(1),
      lossOfPayDays: +lossOfPayDays.toFixed(1),
      totalDaysInPeriod: totalRecords,
      attendancePercentage: +attendancePercentage.toFixed(1),
    };
  }
}

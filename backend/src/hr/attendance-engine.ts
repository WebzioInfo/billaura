export interface RawAttendanceRecord {
  id?: string;
  employeeId: string;
  date: Date | string;
  type?: string;
  status?: string;
  checkIn?: Date | string | null;
  checkOut?: Date | string | null;
  workingHours?: number | null;
  workingMinutes?: number | null;
  overtimeMinutes?: number | null;
  overtime?: number | null;
  lateMinutes?: number | null;
  lateBy?: number | null;
  notes?: string | null;
  source?: string | null;
}

export interface AttendanceMetricsSummary {
  totalDays: number;
  eligibleWorkingDays: number;
  futureDays: number;
  preJoiningDays: number;
  postRelievingDays: number;
  present: number;
  absent: number;
  halfDay: number;
  paidLeave: number;
  unpaidLeave: number;
  leave: number;
  holiday: number;
  weekOff: number;
  workFromHome: number;
  onDuty: number;
  training: number;
  lateCount: number;
  lateMinutes: number;
  totalWorkingMinutes: number;
  totalWorkingHours: number;
  totalOvertimeMinutes: number;
  otHours: number;
  averageWorkingHours: number;
  totalPaidDays: number;
  lossOfPayDays: number;
  attendancePercentage: number;
}

export interface CalendarDayResult {
  date: string;
  dayOfWeek: number;
  dayName: string;
  status: 'NOT_EMPLOYED' | 'UPCOMING' | 'HOLIDAY' | 'WEEK_OFF' | 'LEAVE' | 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'LATE';
  statusLabel: string;
  leaveType: string | null;
  holidayName: string | null;
  checkIn: string | null;
  checkOut: string | null;
  workingHours: number;
  workingMinutes: number;
  lateMinutes: number;
  otHours: number;
  remarks: string | null;
  source: string;
  recordId?: string;
}

export class AttendanceEngine {
  /**
   * Static helper for computing basic metrics summary across raw attendance arrays
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
      let computedLateMins = record.lateMinutes || record.lateBy;

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
    const totalPaidDays = present + paidLeave + holiday + weekOff + workFromHome + onDuty + training + (halfDay * 0.5);
    const lossOfPayDays = absent + unpaidLeave + (halfDay * 0.5);
    const attendancePercentage = totalRecords > 0 ? (totalPaidDays / totalRecords) * 100 : 0;

    return {
      totalDays: totalRecords,
      eligibleWorkingDays: totalRecords,
      futureDays: 0,
      preJoiningDays: 0,
      postRelievingDays: 0,
      present,
      absent,
      halfDay,
      paidLeave,
      unpaidLeave,
      leave: paidLeave + unpaidLeave,
      holiday,
      weekOff,
      workFromHome,
      onDuty,
      training,
      lateCount,
      lateMinutes: 0,
      totalWorkingMinutes,
      totalWorkingHours: +(totalWorkingMinutes / 60).toFixed(1),
      totalOvertimeMinutes,
      otHours: +(totalOvertimeMinutes / 60).toFixed(1),
      averageWorkingHours: present + halfDay > 0 ? +((totalWorkingMinutes / 60) / (present + halfDay)).toFixed(1) : 0,
      totalPaidDays: +totalPaidDays.toFixed(1),
      lossOfPayDays: +lossOfPayDays.toFixed(1),
      attendancePercentage: +attendancePercentage.toFixed(1),
    };
  }

  /**
   * Deterministic HRMS Attendance Engine following Priority 1 to 8 rules.
   */
  static generateEmployeeCalendar(params: {
    employee: {
      id: string;
      name?: string;
      joiningDate?: Date | string | null;
      relievingDate?: Date | string | null;
      shift?: any;
    };
    startDate: Date | string;
    endDate: Date | string;
    todayDate?: Date | string;
    attendances?: RawAttendanceRecord[];
    leaves?: any[];
    holidays?: any[];
  }): {
    insights: AttendanceMetricsSummary;
    calendar: CalendarDayResult[];
  } {
    const {
      employee,
      startDate: startInput,
      endDate: endInput,
      todayDate: todayInput = new Date(),
      attendances = [],
      leaves = [],
      holidays = [],
    } = params;

    const startDate = new Date(startInput);
    startDate.setUTCHours(0, 0, 0, 0);

    const endDate = new Date(endInput);
    endDate.setUTCHours(23, 59, 59, 999);

    const todayDate = new Date(todayInput);
    todayDate.setUTCHours(23, 59, 59, 999);

    const joiningDate = employee.joiningDate ? new Date(employee.joiningDate) : null;
    if (joiningDate) joiningDate.setUTCHours(0, 0, 0, 0);

    const relievingDate = employee.relievingDate ? new Date(employee.relievingDate) : null;
    if (relievingDate) relievingDate.setUTCHours(23, 59, 59, 999);

    // Build Fast Lookups
    const attMap = new Map<string, RawAttendanceRecord>();
    attendances.forEach((a) => {
      if (a.date) {
        const dStr = new Date(a.date).toISOString().split('T')[0];
        attMap.set(dStr, a);
      }
    });

    const leaveMap = new Map<string, any>();
    leaves.forEach((l) => {
      if (l.startDate && l.endDate) {
        const lStart = new Date(l.startDate);
        const lEnd = new Date(l.endDate);
        const curr = new Date(lStart);
        while (curr <= lEnd) {
          leaveMap.set(curr.toISOString().split('T')[0], l);
          curr.setDate(curr.getDate() + 1);
        }
      }
    });

    const holidayMap = new Map<string, any>();
    holidays.forEach((h) => {
      if (h.date) {
        holidayMap.set(new Date(h.date).toISOString().split('T')[0], h);
      }
    });

    // Days Generator
    const dates: Date[] = [];
    const curr = new Date(startDate);
    while (curr <= endDate) {
      dates.push(new Date(curr));
      curr.setDate(curr.getDate() + 1);
    }

    const totalDays = dates.length;
    let preJoiningDays = 0;
    let postRelievingDays = 0;
    let futureDays = 0;
    let holidayCount = 0;
    let weekOffCount = 0;
    let paidLeaveCount = 0;
    let unpaidLeaveCount = 0;
    let presentCount = 0;
    let absentCount = 0;
    let halfDayCount = 0;
    let lateCount = 0;
    let totalLateMinutes = 0;
    let totalWorkingMinutes = 0;
    let totalOvertimeMinutes = 0;

    const calendar: CalendarDayResult[] = [];
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    for (const d of dates) {
      const dateStr = d.toISOString().split('T')[0];
      const dayOfWeek = d.getDay();
      const dayName = dayNames[dayOfWeek];

      const checkDate = new Date(d);
      checkDate.setUTCHours(12, 0, 0, 0);

      // --- Priority 1: Before Joining Date ---
      if (joiningDate && checkDate < joiningDate) {
        preJoiningDays++;
        calendar.push({
          date: dateStr,
          dayOfWeek,
          dayName,
          status: 'NOT_EMPLOYED',
          statusLabel: 'Not Employed',
          leaveType: null,
          holidayName: null,
          checkIn: null,
          checkOut: null,
          workingHours: 0,
          workingMinutes: 0,
          lateMinutes: 0,
          otHours: 0,
          remarks: 'Prior to joining date',
          source: 'SYSTEM',
        });
        continue;
      }

      // --- Priority 2: After Relieving Date ---
      if (relievingDate && checkDate > relievingDate) {
        postRelievingDays++;
        calendar.push({
          date: dateStr,
          dayOfWeek,
          dayName,
          status: 'NOT_EMPLOYED',
          statusLabel: 'Not Employed',
          leaveType: null,
          holidayName: null,
          checkIn: null,
          checkOut: null,
          workingHours: 0,
          workingMinutes: 0,
          lateMinutes: 0,
          otHours: 0,
          remarks: 'Post relieving date',
          source: 'SYSTEM',
        });
        continue;
      }

      // --- Priority 3: Future Dates (After Today) ---
      if (checkDate > todayDate) {
        futureDays++;
        calendar.push({
          date: dateStr,
          dayOfWeek,
          dayName,
          status: 'UPCOMING',
          statusLabel: 'Upcoming',
          leaveType: null,
          holidayName: null,
          checkIn: null,
          checkOut: null,
          workingHours: 0,
          workingMinutes: 0,
          lateMinutes: 0,
          otHours: 0,
          remarks: 'Upcoming date',
          source: 'SYSTEM',
        });
        continue;
      }

      // --- Priority 4: Company Holiday ---
      const holidayRec = holidayMap.get(dateStr);
      if (holidayRec) {
        holidayCount++;
        calendar.push({
          date: dateStr,
          dayOfWeek,
          dayName,
          status: 'HOLIDAY',
          statusLabel: holidayRec.name || 'Holiday',
          leaveType: null,
          holidayName: holidayRec.name || 'Holiday',
          checkIn: null,
          checkOut: null,
          workingHours: 0,
          workingMinutes: 0,
          lateMinutes: 0,
          otHours: 0,
          remarks: holidayRec.description || 'Company Holiday',
          source: 'CALENDAR',
        });
        continue;
      }

      // --- Priority 5: Weekly Off ---
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // Sunday / Saturday default
      if (isWeekend) {
        weekOffCount++;
        calendar.push({
          date: dateStr,
          dayOfWeek,
          dayName,
          status: 'WEEK_OFF',
          statusLabel: 'Weekly Off',
          leaveType: null,
          holidayName: null,
          checkIn: null,
          checkOut: null,
          workingHours: 0,
          workingMinutes: 0,
          lateMinutes: 0,
          otHours: 0,
          remarks: 'Scheduled Weekly Off',
          source: 'SHIFT',
        });
        continue;
      }

      // --- Priority 6: Approved Leave ---
      const leaveRec = leaveMap.get(dateStr);
      if (leaveRec && (leaveRec.status === 'APPROVED' || leaveRec.status === 'ACTIVE')) {
        const leaveTypeStr = leaveRec.type || 'PAID_LEAVE';
        if (leaveTypeStr.toUpperCase().includes('UNPAID') || leaveTypeStr.toUpperCase().includes('LOP')) {
          unpaidLeaveCount++;
        } else {
          paidLeaveCount++;
        }
        calendar.push({
          date: dateStr,
          dayOfWeek,
          dayName,
          status: 'LEAVE',
          statusLabel: leaveRec.type || 'Leave',
          leaveType: leaveRec.type || 'Leave',
          holidayName: null,
          checkIn: null,
          checkOut: null,
          workingHours: 0,
          workingMinutes: 0,
          lateMinutes: 0,
          otHours: 0,
          remarks: leaveRec.reason || 'Approved Leave',
          source: 'LEAVE_APPLICATION',
        });
        continue;
      }

      // --- Priority 7: Attendance Record Exists ---
      const attRec = attMap.get(dateStr);
      if (attRec) {
        let workMins = attRec.workingMinutes || 0;
        let otMins = attRec.overtimeMinutes || Math.round((attRec.overtime || 0) * 60);
        let lateMins = attRec.lateMinutes || attRec.lateBy || 0;

        if (workMins === 0 && attRec.checkIn && attRec.checkOut) {
          const ci = new Date(attRec.checkIn).getTime();
          const co = new Date(attRec.checkOut).getTime();
          if (!isNaN(ci) && !isNaN(co) && co > ci) {
            workMins = Math.floor((co - ci) / 60000);
            if (workMins > 480) {
              otMins = workMins - 480;
            }
          }
        }

        if (lateMins > 0) {
          lateCount++;
          totalLateMinutes += lateMins;
        }

        totalWorkingMinutes += workMins;
        totalOvertimeMinutes += otMins;

        const rawStatus = (attRec.type || attRec.status || 'PRESENT').toUpperCase();
        let finalStatus: CalendarDayResult['status'] = 'PRESENT';
        let statusLabel = 'Present';
        let leaveType: string | null = null;
        let holidayName: string | null = null;

        if (rawStatus === 'ABSENT' || rawStatus === 'A') {
          absentCount++;
          finalStatus = 'ABSENT';
          statusLabel = 'Absent';
        } else if (rawStatus.includes('LEAVE') || rawStatus === 'L') {
          if (rawStatus.includes('UNPAID') || rawStatus.includes('LOP')) {
            unpaidLeaveCount++;
          } else {
            paidLeaveCount++;
          }
          finalStatus = 'LEAVE';
          statusLabel = 'Leave';
          leaveType = attRec.type || 'Leave';
        } else if (rawStatus === 'HALF_DAY' || rawStatus === 'HD') {
          halfDayCount++;
          finalStatus = 'HALF_DAY';
          statusLabel = 'Half Day';
        } else if (rawStatus === 'HOLIDAY' || rawStatus === 'H') {
          holidayCount++;
          finalStatus = 'HOLIDAY';
          statusLabel = 'Holiday';
          holidayName = attRec.notes || 'Holiday';
        } else if (rawStatus === 'WEEK_OFF' || rawStatus === 'WEEKLY_OFF' || rawStatus === 'WO') {
          weekOffCount++;
          finalStatus = 'WEEK_OFF';
          statusLabel = 'Weekly Off';
        } else if (lateMins > 15) {
          presentCount++;
          finalStatus = 'LATE';
          statusLabel = 'Late';
        } else {
          presentCount++;
          finalStatus = 'PRESENT';
          statusLabel = 'Present';
        }

        calendar.push({
          date: dateStr,
          dayOfWeek,
          dayName,
          status: finalStatus,
          statusLabel,
          leaveType,
          holidayName,
          checkIn: attRec.checkIn ? new Date(attRec.checkIn).toISOString() : null,
          checkOut: attRec.checkOut ? new Date(attRec.checkOut).toISOString() : null,
          workingHours: +(workMins / 60).toFixed(1),
          workingMinutes: workMins,
          lateMinutes: lateMins,
          otHours: +(otMins / 60).toFixed(1),
          remarks: attRec.notes || null,
          source: attRec.source || 'BIOMETRIC',
          recordId: attRec.id,
        });
        continue;
      }

      // --- Priority 8: Expected Working Day Has Ended & No Attendance -> ABSENT ---
      absentCount++;
      calendar.push({
        date: dateStr,
        dayOfWeek,
        dayName,
        status: 'ABSENT',
        statusLabel: 'Absent',
        leaveType: null,
        holidayName: null,
        checkIn: null,
        checkOut: null,
        workingHours: 0,
        workingMinutes: 0,
        lateMinutes: 0,
        otHours: 0,
        remarks: 'No check-in record found',
        source: 'SYSTEM',
      });
    }

    // Accurate Attendance Score Formula
    const nonWorkingDays = futureDays + holidayCount + weekOffCount + preJoiningDays + postRelievingDays;
    const eligibleWorkingDays = Math.max(0, totalDays - nonWorkingDays);

    const paidDaysScore = presentCount + paidLeaveCount + holidayCount + weekOffCount + (halfDayCount * 0.5);
    const attendancePercentage = eligibleWorkingDays > 0
      ? +Math.min(100, Math.round(((presentCount + paidLeaveCount + (halfDayCount * 0.5)) / eligibleWorkingDays) * 100)).toFixed(1)
      : 100;

    const lossOfPayDays = absentCount + unpaidLeaveCount + (halfDayCount * 0.5);
    const avgWorkHrs = presentCount + halfDayCount > 0
      ? +((totalWorkingMinutes / 60) / (presentCount + halfDayCount)).toFixed(1)
      : 0;

    return {
      insights: {
        totalDays,
        eligibleWorkingDays,
        futureDays,
        preJoiningDays,
        postRelievingDays,
        present: presentCount,
        absent: absentCount,
        halfDay: halfDayCount,
        paidLeave: paidLeaveCount,
        unpaidLeave: unpaidLeaveCount,
        leave: paidLeaveCount + unpaidLeaveCount,
        holiday: holidayCount,
        weekOff: weekOffCount,
        workFromHome: 0,
        onDuty: 0,
        training: 0,
        lateCount,
        lateMinutes: totalLateMinutes,
        totalWorkingMinutes,
        totalWorkingHours: +(totalWorkingMinutes / 60).toFixed(1),
        totalOvertimeMinutes,
        otHours: +(totalOvertimeMinutes / 60).toFixed(1),
        averageWorkingHours: avgWorkHrs,
        totalPaidDays: +paidDaysScore.toFixed(1),
        lossOfPayDays: +lossOfPayDays.toFixed(1),
        attendancePercentage,
      },
      calendar,
    };
  }
}

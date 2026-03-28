// Export Utilities for Schedule

import { DayScheduleStructure, Shift, Role } from "@/lib/schedule/types";
import { SHIFTS, ROLES, WEEKDAYS_AR, MONTHS } from "@/lib/schedule/constants";
import { getDayOfWeek } from "@/lib/schedule/utils";

// Export to Excel format (returns data for API)
export function prepareExcelData(
  schedule: Record<number, DayScheduleStructure>,
  calendarMonth: number,
  calendarYear: number
) {
  const daysInMonth = new Date(calendarYear, calendarMonth, 0).getDate();
  const data: {
    day: number;
    dayName: string;
    shift: string;
    team: string;
    name: string;
    role: string;
  }[] = [];
  
  for (let day = 1; day <= daysInMonth; day++) {
    const daySchedule = schedule[day];
    if (!daySchedule) continue;
    
    const dayOfWeek = getDayOfWeek(day, calendarMonth, calendarYear);
    const dayName = WEEKDAYS_AR[dayOfWeek];
    
    for (const shiftData of SHIFTS) {
      const shiftStructure = daySchedule[shiftData.value];
      
      // Teams
      for (const team of shiftStructure.teams) {
        for (const member of team.members) {
          const roleInfo = ROLES.find(r => r.value === member.userRole);
          data.push({
            day,
            dayName,
            shift: shiftData.label,
            team: team.name,
            name: member.userName,
            role: roleInfo?.label || member.userRole
          });
        }
      }
      
      // Operations
      for (const member of shiftStructure.operations) {
        const roleInfo = ROLES.find(r => r.value === member.userRole);
        data.push({
          day,
          dayName,
          shift: shiftData.label,
          team: "العمليات",
          name: member.userName,
          role: roleInfo?.label || member.userRole
        });
      }
      
      // Sector
      if (shiftStructure.sector) {
        const roleInfo = ROLES.find(r => r.value === shiftStructure.sector!.userRole);
        data.push({
          day,
          dayName,
          shift: shiftData.label,
          team: "القطاع",
          name: shiftStructure.sector.userName,
          role: roleInfo?.label || shiftStructure.sector.userRole
        });
      }
    }
  }
  
  return data;
}

// Generate print-friendly HTML
export function generatePrintHtml(
  schedule: Record<number, DayScheduleStructure>,
  calendarMonth: number,
  calendarYear: number
) {
  const monthName = MONTHS.find(m => m.value === calendarMonth)?.label;
  const daysInMonth = new Date(calendarYear, calendarMonth, 0).getDate();
  
  const printContent = `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <title>جدول المناوبات - ${monthName} ${calendarYear}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; direction: rtl; padding: 20px; background: white; color: #1a1a1a; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #dc2626; padding-bottom: 20px; }
        .header h1 { color: #dc2626; font-size: 28px; margin-bottom: 10px; }
        .header h2 { color: #374151; font-size: 20px; }
        .day-section { margin-bottom: 25px; page-break-inside: avoid; }
        .day-header { background: #1a1a1a; color: white; padding: 10px 15px; font-size: 16px; font-weight: bold; border-radius: 8px 8px 0 0; }
        .shift-row { display: flex; border: 1px solid #e5e7eb; border-top: none; }
        .shift-label { width: 80px; padding: 10px; font-weight: bold; text-align: center; }
        .shift-morning { background: #fef3c7; color: #92400e; }
        .shift-evening { background: #ffedd5; color: #9a3412; }
        .shift-night { background: #f3e8ff; color: #7c3aed; }
        .shift-content { flex: 1; padding: 10px; display: flex; gap: 20px; flex-wrap: wrap; }
        .team-box { min-width: 150px; }
        .team-title { font-weight: bold; color: #0891b2; margin-bottom: 5px; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; }
        .member { padding: 3px 0; font-size: 13px; }
        .role-badge { display: inline-block; padding: 1px 6px; border-radius: 4px; font-size: 10px; margin-left: 5px; }
        .role-commander { background: #fecaca; color: #dc2626; }
        .role-leader { background: #fef08a; color: #a16207; }
        .role-scout { background: #bbf7d0; color: #166534; }
        .role-medic { background: #cffafe; color: #0e7490; }
        .operations-box { min-width: 150px; }
        .sector-box { min-width: 120px; }
        .footer { margin-top: 30px; text-align: center; color: #6b7280; font-size: 12px; border-top: 1px solid #e5e7eb; padding-top: 15px; }
        .legend { display: flex; justify-content: center; gap: 20px; margin: 20px 0; font-size: 12px; }
        .legend-item { display: flex; align-items: center; gap: 5px; }
        .legend-dot { width: 12px; height: 12px; border-radius: 50%; }
        @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🚑 مركز إسعاف 650</h1>
        <h2>جدول المناوبات - ${monthName} ${calendarYear}</h2>
      </div>
      
      <div class="legend">
        <div class="legend-item"><div class="legend-dot" style="background: #fef3c7;"></div> صباحي</div>
        <div class="legend-item"><div class="legend-dot" style="background: #ffedd5;"></div> مسائي</div>
        <div class="legend-item"><div class="legend-dot" style="background: #f3e8ff;"></div> ليلي</div>
      </div>
      
      ${generateDaysHtml(schedule, calendarMonth, calendarYear)}
      
      <div class="footer">
        تم الطباعة من نظام إدارة المناوبات - مركز إسعاف 650 | ${new Date().toLocaleDateString('ar-SA')}
      </div>
    </body>
    </html>
  `;
  
  return printContent;
}

function generateDaysHtml(
  schedule: Record<number, DayScheduleStructure>,
  calendarMonth: number,
  calendarYear: number
) {
  const daysInMonth = new Date(calendarYear, calendarMonth, 0).getDate();
  
  let html = '';
  
  for (let day = 1; day <= daysInMonth; day++) {
    const daySchedule = schedule[day];
    if (!daySchedule) continue;
    
    const dayOfWeek = getDayOfWeek(day, calendarMonth, calendarYear);
    const dayName = WEEKDAYS_AR[dayOfWeek];
    
    let shiftHtml = '';
    let hasPeople = false;
    
    for (const shift of SHIFTS) {
      const shiftStructure = daySchedule[shift.value];
      const shiftHasPeople = shiftStructure.teams.some(t => t.members.length > 0) || 
                            shiftStructure.operations.length > 0 || 
                            shiftStructure.sector;
      
      if (shiftHasPeople) {
        hasPeople = true;
        shiftHtml += `
          <div class="shift-row">
            <div class="shift-label shift-${shift.value}">${shift.label}</div>
            <div class="shift-content">
              ${generateTeamsHtml(shiftStructure)}
              ${generateOperationsHtml(shiftStructure)}
              ${generateSectorHtml(shiftStructure)}
            </div>
          </div>
        `;
      }
    }
    
    if (hasPeople) {
      html += `
        <div class="day-section">
          <div class="day-header">${day} ${dayName}</div>
          ${shiftHtml}
        </div>
      `;
    }
  }
  
  return html;
}

function generateTeamsHtml(shiftStructure: DayScheduleStructure['morning']): string {
  const teamsWithMembers = shiftStructure.teams.filter(t => t.members.length > 0);
  if (teamsWithMembers.length === 0) return '';
  
  return `
    <div class="team-box">
      ${teamsWithMembers.map(team => `
        <div style="margin-bottom: 10px;">
          <div class="team-title">${team.name}</div>
          ${team.members.map(m => {
            const roleClass = getRoleClass(m.userRole);
            const roleLabel = ROLES.find(r => r.value === m.userRole)?.label || '';
            return `<div class="member"><span class="role-badge ${roleClass}">${roleLabel}</span> ${m.userName}</div>`;
          }).join('')}
        </div>
      `).join('')}
    </div>
  `;
}

function generateOperationsHtml(shiftStructure: DayScheduleStructure['morning']): string {
  if (shiftStructure.operations.length === 0) return '';
  
  return `
    <div class="operations-box">
      <div class="team-title" style="color: #ea580c;">العمليات</div>
      ${shiftStructure.operations.map(m => {
        const roleClass = getRoleClass(m.userRole);
        const roleLabel = ROLES.find(r => r.value === m.userRole)?.label || '';
        return `<div class="member"><span class="role-badge ${roleClass}">${roleLabel}</span> ${m.userName}</div>`;
      }).join('')}
    </div>
  `;
}

function generateSectorHtml(shiftStructure: DayScheduleStructure['morning']): string {
  if (!shiftStructure.sector) return '';
  
  const roleClass = getRoleClass(shiftStructure.sector.userRole);
  
  return `
    <div class="sector-box">
      <div class="team-title" style="color: #dc2626;">القطاع</div>
      <div class="member"><span class="role-badge ${roleClass}">قائد قطاع</span> ${shiftStructure.sector.userName}</div>
    </div>
  `;
}

function getRoleClass(role: Role): string {
  switch (role) {
    case 'sector_commander': return 'role-commander';
    case 'team_leader': return 'role-leader';
    case 'scout': return 'role-scout';
    default: return 'role-medic';
  }
}

// Export statistics
export function calculateStatistics(schedule: Record<number, DayScheduleStructure>) {
  let totalPeople = 0;
  let totalShifts = 0;
  let totalDays = 0;
  const roleDistribution: Record<string, number> = {
    sector_commander: 0,
    team_leader: 0,
    scout: 0,
    medic: 0
  };
  
  Object.values(schedule).forEach(daySchedule => {
    let dayHasPeople = false;
    
    const shifts: Shift[] = ['morning', 'evening', 'night'];
    shifts.forEach(shift => {
      const shiftStructure = daySchedule[shift];
      let shiftCount = 0;
      
      shiftStructure.teams.forEach(team => {
        team.members.forEach(member => {
          totalPeople++;
          shiftCount++;
          roleDistribution[member.userRole]++;
        });
      });
      
      shiftStructure.operations.forEach(member => {
        totalPeople++;
        shiftCount++;
        roleDistribution[member.userRole]++;
      });
      
      if (shiftStructure.sector) {
        totalPeople++;
        shiftCount++;
        roleDistribution[shiftStructure.sector.userRole]++;
      }
      
      if (shiftCount > 0) {
        totalShifts++;
        dayHasPeople = true;
      }
    });
    
    if (dayHasPeople) totalDays++;
  });
  
  return {
    totalPeople,
    totalShifts,
    totalDays,
    roleDistribution,
    averagePeoplePerShift: totalShifts > 0 ? (totalPeople / totalShifts).toFixed(1) : 0
  };
}

// Schedule System Utilities

import { 
  Shift, Role, UserData, AvailabilityData, ShiftStructure, 
  DayScheduleStructure, TeamMember, AmbulanceTeam 
} from "./types";
import { 
  MAX_TEAM_MEMBERS, MAX_OPERATIONS, NUM_TEAMS, 
  FIRST_NAMES, LAST_NAMES, WEEKDAYS_AR 
} from "./constants";

// Deterministic seeded random for consistent SSR/CSR
export const seededRandom = (seed: number): number => {
  const x = Math.sin(seed * 9999) * 10000;
  return x - Math.floor(x);
};

// Get current date info
export const getCurrentDate = () => {
  const currentDate = new Date();
  return {
    currentMonth: currentDate.getMonth() + 1,
    currentYear: currentDate.getFullYear(),
    years: Array.from({ length: 5 }, (_, i) => currentDate.getFullYear() - 2 + i)
  };
};

// Create empty shift structure
export const createEmptyShiftStructure = (): ShiftStructure => ({
  teams: Array.from({ length: NUM_TEAMS }, (_, i) => ({
    id: i + 1,
    name: `فريق ${i + 1}`,
    members: [],
    maxMembers: MAX_TEAM_MEMBERS
  })),
  operations: [],
  sector: null
});

// Create empty day schedule
export const createEmptyDaySchedule = (): DayScheduleStructure => ({
  morning: createEmptyShiftStructure(),
  evening: createEmptyShiftStructure(),
  night: createEmptyShiftStructure()
});

// Generate deterministic users
export const generateUsers = (): UserData[] => {
  const users: UserData[] = [];
  let id = 1;
  let seed = 1;
  
  const roleDistribution: { role: Role; count: number }[] = [
    { role: "sector_commander", count: 10 },
    { role: "team_leader", count: 25 },
    { role: "scout", count: 35 },
    { role: "medic", count: 30 },
  ];
  
  const usedNames = new Set<string>();
  
  for (const { role, count } of roleDistribution) {
    for (let i = 0; i < count; i++) {
      let fullName = "";
      let attempts = 0;
      while (attempts < 100) {
        const firstNameIdx = Math.floor(seededRandom(seed++) * FIRST_NAMES.length);
        const lastNameIdx = Math.floor(seededRandom(seed++) * LAST_NAMES.length);
        fullName = `${FIRST_NAMES[firstNameIdx]} ${LAST_NAMES[lastNameIdx]}`;
        if (!usedNames.has(fullName)) {
          usedNames.add(fullName);
          break;
        }
        attempts++;
      }
      
      users.push({
        id: id.toString(),
        name: fullName || `${role}_${id}`,
        email: `user${id}@ambulance650.com`,
        role: role
      });
      id++;
    }
  }
  
  return users;
};

// Generate deterministic availabilities
export const generateAvailabilities = (users: UserData[], currentMonth: number, currentYear: number): AvailabilityData[] => {
  let seed = 1000;
  const shiftOptions: Shift[] = ["morning", "evening", "night"];
  
  return users.map((user, index) => {
    const generateDeterministicShifts = (): Shift[] => {
      const numShifts = Math.floor(seededRandom(seed++) * 4);
      const shifts: Shift[] = [];
      const shuffled = [...shiftOptions].sort(() => seededRandom(seed++) - 0.5);
      for (let i = 0; i < numShifts; i++) {
        shifts.push(shuffled[i]);
      }
      return shifts;
    };
    
    return {
      id: (index + 1).toString(),
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      month: currentMonth,
      year: currentYear,
      sunday: generateDeterministicShifts(),
      monday: generateDeterministicShifts(),
      tuesday: generateDeterministicShifts(),
      wednesday: generateDeterministicShifts(),
      thursday: generateDeterministicShifts(),
      friday: generateDeterministicShifts(),
      saturday: generateDeterministicShifts(),
      notes: null,
      createdAt: new Date().toISOString()
    };
  });
};

// Generate demo events
export const generateEvents = (): NotificationEvent[] => [
  { id: "1", type: "warning", title: "نقص في العدد", message: "يوم 15 من الشهر يحتاج 5 أشخاص إضافيين في الفترة الصباحية", time: "منذ 5 دقائق", read: false },
  { id: "2", type: "info", title: "تحديث الجدول", message: "تم تحديث جدول الشهر القادم بنجاح", time: "منذ 15 دقيقة", read: false },
  { id: "3", type: "success", title: "اكتمال الفريق", message: "جميع فرق الإسعاف مكتملة ليوم غد", time: "منذ ساعة", read: true },
  { id: "4", type: "error", title: "تعارض في المواعيد", message: "هناك تعارض في جدول أحمد علي - يرجى المراجعة", time: "منذ 2 ساعة", read: false },
  { id: "5", type: "info", title: "تذكير", message: "موعد تسليم جدول الشهر القادم بعد 3 أيام", time: "منذ 3 ساعات", read: true },
];

// Date utilities
export const getDaysInMonth = (month: number, year: number) => new Date(year, month, 0).getDate();

export const getDayOfWeek = (day: number, month: number, year: number): string => {
  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  return days[new Date(year, month - 1, day).getDay()];
};

export const getDayNameAr = (day: number, month: number, year: number): string => {
  const dayOfWeek = getDayOfWeek(day, month, year);
  return WEEKDAYS_AR[dayOfWeek] || "";
};

// Deep clone using structuredClone with fallback
export const deepClone = <T>(obj: T): T => {
  if (typeof structuredClone === 'function') {
    return structuredClone(obj);
  }
  // Fallback for older browsers
  return JSON.parse(JSON.stringify(obj));
};

// Schedule manipulation utilities
export const removePersonFromSchedule = (
  schedule: Record<number, DayScheduleStructure>,
  day: number,
  shift: Shift,
  personId: string,
  position: string,
  teamId: number | null
): Record<number, DayScheduleStructure> => {
  const newSchedule = deepClone(schedule);
  if (!newSchedule[day]) return schedule;
  
  const shiftStructure = newSchedule[day][shift];
  
  if (position === "العمليات") {
    shiftStructure.operations = shiftStructure.operations.filter(m => m.userId !== personId);
  } else if (position === "القطاع") {
    if (shiftStructure.sector?.userId === personId) {
      shiftStructure.sector = null;
    }
  } else {
    const team = shiftStructure.teams.find(t => t.id === teamId);
    if (team) {
      team.members = team.members.filter(m => m.userId !== personId);
    }
  }
  
  return newSchedule;
};

export const addPersonToSchedule = (
  schedule: Record<number, DayScheduleStructure>,
  day: number,
  shift: Shift,
  personId: string,
  personName: string,
  personRole: Role,
  position: string,
  teamId: number | null
): Record<number, DayScheduleStructure> => {
  const newSchedule = deepClone(schedule);
  
  if (!newSchedule[day]) {
    newSchedule[day] = createEmptyDaySchedule();
  }
  
  const shiftStructure = newSchedule[day][shift];
  
  if (position === "العمليات") {
    if (!shiftStructure.operations.some(m => m.userId === personId)) {
      shiftStructure.operations.push({
        userId: personId,
        userName: personName,
        userRole: personRole
      });
    }
  } else if (position === "القطاع") {
    shiftStructure.sector = {
      userId: personId,
      userName: personName,
      userRole: personRole
    };
  } else {
    const team = shiftStructure.teams.find(t => t.id === teamId);
    if (team && team.members.length < MAX_TEAM_MEMBERS) {
      if (!team.members.some(m => m.userId === personId)) {
        team.members.push({
          userId: personId,
          userName: personName,
          userRole: personRole
        });
      }
    }
  }
  
  return newSchedule;
};

// Count people in shift
export const getShiftPeopleCount = (shiftStructure: ShiftStructure): number => {
  let count = 0;
  for (const team of shiftStructure.teams) {
    count += team.members.length;
  }
  count += shiftStructure.operations.length;
  if (shiftStructure.sector) count++;
  return count;
};

// Count people in day
export const getDayPeopleCount = (daySchedule: DayScheduleStructure | undefined): number => {
  if (!daySchedule) return 0;
  return getShiftPeopleCount(daySchedule.morning) + 
         getShiftPeopleCount(daySchedule.evening) + 
         getShiftPeopleCount(daySchedule.night);
};

// Get role level
export const getRoleLevel = (role: Role): number => {
  const levels: Record<Role, number> = {
    sector_commander: 4,
    team_leader: 3,
    scout: 2,
    medic: 1
  };
  return levels[role] || 0;
};

// Format date for display
export const formatDate = (day: number, month: number, year: number): string => {
  const dayName = getDayNameAr(day, month, year);
  return `${day} ${dayName}`;
};

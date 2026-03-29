"use client";

import { createContext, useContext, useState, useCallback, useMemo, useEffect, ReactNode } from "react";
import { 
  Shift, Role, UserData, AvailabilityData, DayScheduleStructure, 
  NotificationEvent, SwapLog, SwapData, EmptySlot, ScheduledPerson 
} from "@/lib/schedule/types";
import { 
  generateUsers, generateAvailabilities, generateEvents, 
  getCurrentDate, createEmptyDaySchedule, deepClone,
  getDaysInMonth, getDayOfWeek, getDayPeopleCount, getRoleLevel,
  removePersonFromSchedule, addPersonToSchedule
} from "@/lib/schedule/utils";
import { MAX_TEAM_MEMBERS, MAX_OPERATIONS, WEEKDAYS_AR, SHIFTS } from "@/lib/schedule/constants";

// Generate initial data
const INITIAL_USERS = generateUsers();
const { currentMonth, currentYear } = getCurrentDate();
const INITIAL_AVAILABILITIES = generateAvailabilities(INITIAL_USERS, currentMonth, currentYear);
const INITIAL_EVENTS = generateEvents();
const DEMO_USER = INITIAL_USERS[0];

// Context Types
interface ScheduleContextType {
  // User
  user: UserData;
  isAdmin: boolean;
  
  // Theme
  isDarkMode: boolean;
  setIsDarkMode: (mode: boolean) => void;
  mounted: boolean;
  
  // Records
  records: AvailabilityData[];
  setRecords: React.Dispatch<React.SetStateAction<AvailabilityData[]>>;
  
  // Schedule
  schedule: Record<number, DayScheduleStructure>;
  setSchedule: React.Dispatch<React.SetStateAction<Record<number, DayScheduleStructure>>>;
  scheduleMonth: number;
  setScheduleMonth: React.Dispatch<React.SetStateAction<number>>;
  scheduleYear: number;
  setScheduleYear: React.Dispatch<React.SetStateAction<number>>;
  
  // Calendar
  calendarMonth: number;
  setCalendarMonth: React.Dispatch<React.SetStateAction<number>>;
  calendarYear: number;
  setCalendarYear: React.Dispatch<React.SetStateAction<number>>;
  
  // Notifications
  events: NotificationEvent[];
  setEvents: React.Dispatch<React.SetStateAction<NotificationEvent[]>>;
  unreadCount: number;
  markEventAsRead: (id: string) => void;
  markAllAsRead: () => void;
  addEvent: (event: Omit<NotificationEvent, 'id' | 'time' | 'read'>) => void;
  
  // Swap
  swapLogs: SwapLog[];
  swapData: SwapData | null;
  setSwapData: React.Dispatch<React.SetStateAction<SwapData | null>>;
  swapMode: 'swap' | 'replace' | 'join';
  setSwapMode: React.Dispatch<React.SetStateAction<'swap' | 'replace' | 'join'>>;
  selectedSwapTarget: ScheduledPerson | null;
  setSelectedSwapTarget: React.Dispatch<React.SetStateAction<ScheduledPerson | null>>;
  selectedEmptySlot: EmptySlot | null;
  setSelectedEmptySlot: React.Dispatch<React.SetStateAction<EmptySlot | null>>;
  performSwap: () => void;
  
  // Schedule Operations
  autoFillSchedule: () => void;
  clearSchedule: () => void;
  getAvailableForDay: (day: number, shift: Shift) => AvailabilityData[];
  getScheduleDayCount: (day: number) => number;
  getPersonScheduleDays: (personName: string) => { day: number; shift: Shift; role: string; position: string }[];
  
  // Computed
  getAllScheduledPeople: ScheduledPerson[];
  getAllEmptySlots: EmptySlot[];
}

const ScheduleContext = createContext<ScheduleContextType | null>(null);

export function ScheduleProvider({ children }: { children: ReactNode }) {
  // User state
  const [user] = useState<UserData>(DEMO_USER);
  const isAdmin = user?.isAdmin === true;
  
  // Theme state
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [mounted, setMounted] = useState(false);
  
  // Records state
  const [records, setRecords] = useState<AvailabilityData[]>(INITIAL_AVAILABILITIES);
  
  // Schedule state
  const [schedule, setSchedule] = useState<Record<number, DayScheduleStructure>>({});
  const [scheduleMonth, setScheduleMonth] = useState(currentMonth);
  const [scheduleYear, setScheduleYear] = useState(currentYear);
  
  // Calendar state
  const [calendarMonth, setCalendarMonth] = useState(currentMonth);
  const [calendarYear, setCalendarYear] = useState(currentYear);
  
  // Notifications state
  const [events, setEvents] = useState<NotificationEvent[]>(INITIAL_EVENTS);
  
  // Swap state
  const [swapLogs, setSwapLogs] = useState<SwapLog[]>([]);
  const [swapData, setSwapData] = useState<SwapData | null>(null);
  const [swapMode, setSwapMode] = useState<'swap' | 'replace' | 'join'>("swap");
  const [selectedSwapTarget, setSelectedSwapTarget] = useState<ScheduledPerson | null>(null);
  const [selectedEmptySlot, setSelectedEmptySlot] = useState<EmptySlot | null>(null);
  
  // Handle hydration
  useEffect(() => {
    setMounted(true);
    const savedMode = localStorage.getItem("darkMode");
    if (savedMode !== null) {
      setIsDarkMode(savedMode === "true");
    }
  }, []);
  
  useEffect(() => {
    if (mounted) {
      localStorage.setItem("darkMode", isDarkMode.toString());
      document.documentElement.classList.toggle("dark", isDarkMode);
    }
  }, [isDarkMode, mounted]);
  
  // Computed: unread notifications
  const unreadCount = useMemo(() => events.filter(e => !e.read).length, [events]);
  
  // Notification functions
  const markEventAsRead = useCallback((id: string) => {
    setEvents(prev => prev.map(e => e.id === id ? { ...e, read: true } : e));
  }, []);
  
  const markAllAsRead = useCallback(() => {
    setEvents(prev => prev.map(e => ({ ...e, read: true })));
  }, []);
  
  const addEvent = useCallback((event: Omit<NotificationEvent, 'id' | 'time' | 'read'>) => {
    const newEvent: NotificationEvent = {
      ...event,
      id: Date.now().toString(),
      time: "الآن",
      read: false
    };
    setEvents(prev => [newEvent, ...prev]);
  }, []);
  
  // Get available people for a day/shift
  const getAvailableForDay = useCallback((day: number, shift: Shift): AvailabilityData[] => {
    const dayOfWeek = getDayOfWeek(day, scheduleMonth, scheduleYear);
    return records.filter(r => (r[dayOfWeek as keyof AvailabilityData] as Shift[]).includes(shift));
  }, [records, scheduleMonth, scheduleYear]);
  
  // Get day count
  const getScheduleDayCount = useCallback((day: number): number => {
    return getDayPeopleCount(schedule[day]);
  }, [schedule]);
  
  // Get person schedule days
  const getPersonScheduleDays = useCallback((personName: string) => {
    const result: { day: number; shift: Shift; role: string; position: string }[] = [];
    const daysInMonth = getDaysInMonth(calendarMonth, calendarYear);
    
    for (let day = 1; day <= daysInMonth; day++) {
      const daySchedule = schedule[day];
      if (!daySchedule) continue;
      
      for (const shiftData of SHIFTS) {
        const shiftStructure = daySchedule[shiftData.value];
        
        for (const team of shiftStructure.teams) {
          for (const member of team.members) {
            if (member.userName.includes(personName)) {
              result.push({
                day,
                shift: shiftData.value,
                role: member.userRole,
                position: team.name
              });
            }
          }
        }
        
        for (const member of shiftStructure.operations) {
          if (member.userName.includes(personName)) {
            result.push({
              day,
              shift: shiftData.value,
              role: member.userRole,
              position: "العمليات"
            });
          }
        }
        
        if (shiftStructure.sector && shiftStructure.sector.userName.includes(personName)) {
          result.push({
            day,
            shift: shiftData.value,
            role: shiftStructure.sector.userRole,
            position: "القطاع"
          });
        }
      }
    }
    
    return result;
  }, [schedule, calendarMonth, calendarYear]);
  
  // Get all scheduled people
  const getAllScheduledPeople = useMemo((): ScheduledPerson[] => {
    const people: ScheduledPerson[] = [];
    const daysInMonth = getDaysInMonth(calendarMonth, calendarYear);
    
    for (let day = 1; day <= daysInMonth; day++) {
      const daySchedule = schedule[day];
      if (!daySchedule) continue;
      
      for (const shiftData of SHIFTS) {
        const shiftStructure = daySchedule[shiftData.value];
        
        shiftStructure.teams.forEach(team => {
          team.members.forEach(m => {
            people.push({
              day,
              shift: shiftData.value,
              personId: m.userId,
              personName: m.userName,
              personRole: m.userRole,
              position: team.name,
              teamId: team.id
            });
          });
        });
        
        shiftStructure.operations.forEach(m => {
          people.push({
            day,
            shift: shiftData.value,
            personId: m.userId,
            personName: m.userName,
            personRole: m.userRole,
            position: "العمليات",
            teamId: null
          });
        });
        
        if (shiftStructure.sector) {
          people.push({
            day,
            shift: shiftData.value,
            personId: shiftStructure.sector.userId,
            personName: shiftStructure.sector.userName,
            personRole: shiftStructure.sector.userRole,
            position: "القطاع",
            teamId: null
          });
        }
      }
    }
    
    return people;
  }, [schedule, calendarMonth, calendarYear]);
  
  // Get all empty slots
  const getAllEmptySlots = useMemo((): EmptySlot[] => {
    const slots: EmptySlot[] = [];
    const daysInMonth = getDaysInMonth(calendarMonth, calendarYear);
    
    for (let day = 1; day <= daysInMonth; day++) {
      const daySchedule = schedule[day];
      if (!daySchedule) continue;
      
      for (const shiftData of SHIFTS) {
        const shiftStructure = daySchedule[shiftData.value];
        
        shiftStructure.teams.forEach(team => {
          if (team.members.length < MAX_TEAM_MEMBERS) {
            slots.push({
              day,
              shift: shiftData.value,
              position: `${team.name} (${team.members.length}/${MAX_TEAM_MEMBERS})`,
              teamId: team.id,
              positionType: 'team'
            });
          }
        });
        
        if (shiftStructure.operations.length < MAX_OPERATIONS) {
          slots.push({
            day,
            shift: shiftData.value,
            position: `العمليات (${shiftStructure.operations.length}/${MAX_OPERATIONS})`,
            teamId: null,
            positionType: 'operations'
          });
        }
        
        if (!shiftStructure.sector) {
          slots.push({
            day,
            shift: shiftData.value,
            position: "القطاع (شاغر)",
            teamId: null,
            positionType: 'sector'
          });
        }
      }
    }
    
    return slots;
  }, [schedule, calendarMonth, calendarYear]);
  
  // Auto-fill schedule
  const autoFillSchedule = useCallback(() => {
    const daysInMonth = getDaysInMonth(scheduleMonth, scheduleYear);
    const newSchedule: Record<number, DayScheduleStructure> = {};
    
    for (let day = 1; day <= daysInMonth; day++) {
      newSchedule[day] = createEmptyDaySchedule();
      
      for (const shift of SHIFTS) {
        const available = getAvailableForDay(day, shift.value);
        const assigned = new Set<string>();
        
        const sortedAvailable = [...available].sort((a, b) => getRoleLevel(b.userRole) - getRoleLevel(a.userRole));
        
        for (const team of newSchedule[day][shift.value].teams) {
          for (const person of sortedAvailable) {
            if (!assigned.has(person.userId) && team.members.length < MAX_TEAM_MEMBERS) {
              team.members.push({
                userId: person.userId,
                userName: person.userName,
                userRole: person.userRole
              });
              assigned.add(person.userId);
            }
          }
        }
        
        for (const person of sortedAvailable) {
          if (!assigned.has(person.userId) && newSchedule[day][shift.value].operations.length < MAX_OPERATIONS) {
            newSchedule[day][shift.value].operations.push({
              userId: person.userId,
              userName: person.userName,
              userRole: person.userRole
            });
            assigned.add(person.userId);
          }
        }
        
        for (const person of sortedAvailable) {
          if (!assigned.has(person.userId) && !newSchedule[day][shift.value].sector) {
            newSchedule[day][shift.value].sector = {
              userId: person.userId,
              userName: person.userName,
              userRole: person.userRole
            };
            break;
          }
        }
      }
    }
    
    setSchedule(newSchedule);
    setCalendarMonth(scheduleMonth);
    setCalendarYear(scheduleYear);
  }, [scheduleMonth, scheduleYear, getAvailableForDay]);
  
  // Clear schedule
  const clearSchedule = useCallback(() => {
    setSchedule({});
  }, []);
  
  // Perform swap
  const performSwap = useCallback(() => {
    if (!swapData) return;
    
    // Handle join mode
    if (swapMode === "join" && selectedEmptySlot) {
      const { day: person1Day, shift: person1Shift, personId: person1Id, personName: person1Name, personRole: person1Role, position: person1Position, teamId: person1TeamId } = swapData;
      const { day: targetDay, shift: targetShift, position: targetPosition, teamId: targetTeamId, positionType } = selectedEmptySlot;
      
      setSchedule(prev => {
        let newSchedule = removePersonFromSchedule(prev, person1Day, person1Shift, person1Id, person1Position, person1TeamId);
        
        // Add to new position based on positionType
        if (positionType === 'team') {
          newSchedule = addPersonToSchedule(newSchedule, targetDay, targetShift, person1Id, person1Name, person1Role, targetPosition, targetTeamId);
        } else {
          newSchedule = addPersonToSchedule(newSchedule, targetDay, targetShift, person1Id, person1Name, person1Role, positionType === 'operations' ? "العمليات" : "القطاع", null);
        }
        
        return newSchedule;
      });
      
      setSwapData(null);
      setSelectedEmptySlot(null);
      return;
    }
    
    // Handle swap/replace modes
    if (!selectedSwapTarget) return;
    
    const { day: person1Day, shift: person1Shift, personId: person1Id, personName: person1Name, personRole: person1Role, position: person1Position, teamId: person1TeamId } = swapData;
    const { day: person2Day, shift: person2Shift, personId: person2Id, personName: person2Name, personRole: person2Role, position: person2Position, teamId: person2TeamId } = selectedSwapTarget;
    
    // Log the swap
    const swapLog: SwapLog = {
      id: Date.now().toString(),
      performedBy: user.id,
      performedByName: user.name,
      person1Id,
      person1Name,
      person1Role,
      person1Day,
      person1Shift,
      person1Position,
      person2Id,
      person2Name,
      person2Role,
      person2Day,
      person2Shift,
      person2Position,
      createdAt: new Date().toISOString()
    };
    
    setSwapLogs(prev => [swapLog, ...prev]);
    
    setSchedule(prev => {
      let newSchedule = removePersonFromSchedule(prev, person1Day, person1Shift, person1Id, person1Position, person1TeamId);
      
      if (swapMode === "swap") {
        newSchedule = removePersonFromSchedule(newSchedule, person2Day, person2Shift, person2Id, person2Position, person2TeamId);
        newSchedule = addPersonToSchedule(newSchedule, person2Day, person2Shift, person1Id, person1Name, person1Role, person2Position, person2TeamId);
        newSchedule = addPersonToSchedule(newSchedule, person1Day, person1Shift, person2Id, person2Name, person2Role, person1Position, person1TeamId);
      } else {
        newSchedule = removePersonFromSchedule(newSchedule, person2Day, person2Shift, person2Id, person2Position, person2TeamId);
        newSchedule = addPersonToSchedule(newSchedule, person2Day, person2Shift, person1Id, person1Name, person1Role, person2Position, person2TeamId);
      }
      
      return newSchedule;
    });
    
    setSwapData(null);
    setSelectedSwapTarget(null);
  }, [swapData, swapMode, selectedEmptySlot, selectedSwapTarget, user]);
  
  const value = useMemo(() => ({
    // User
    user,
    isAdmin,
    
    // Theme
    isDarkMode,
    setIsDarkMode,
    mounted,
    
    // Records
    records,
    setRecords,
    
    // Schedule
    schedule,
    setSchedule,
    scheduleMonth,
    setScheduleMonth,
    scheduleYear,
    setScheduleYear,
    
    // Calendar
    calendarMonth,
    setCalendarMonth,
    calendarYear,
    setCalendarYear,
    
    // Notifications
    events,
    setEvents,
    unreadCount,
    markEventAsRead,
    markAllAsRead,
    addEvent,
    
    // Swap
    swapLogs,
    swapData,
    setSwapData,
    swapMode,
    setSwapMode,
    selectedSwapTarget,
    setSelectedSwapTarget,
    selectedEmptySlot,
    setSelectedEmptySlot,
    performSwap,
    
    // Schedule Operations
    autoFillSchedule,
    clearSchedule,
    getAvailableForDay,
    getScheduleDayCount,
    getPersonScheduleDays,
    
    // Computed
    getAllScheduledPeople,
    getAllEmptySlots,
  }), [
    user, isAdmin, isDarkMode, mounted, records, schedule, scheduleMonth, scheduleYear,
    calendarMonth, calendarYear, events, unreadCount, swapLogs, swapData, swapMode,
    selectedSwapTarget, selectedEmptySlot, getAllScheduledPeople, getAllEmptySlots,
    markEventAsRead, markAllAsRead, addEvent, autoFillSchedule, clearSchedule,
    getAvailableForDay, getScheduleDayCount, getPersonScheduleDays, performSwap
  ]);
  
  return (
    <ScheduleContext.Provider value={value}>
      {children}
    </ScheduleContext.Provider>
  );
}

export function useScheduleContext() {
  const context = useContext(ScheduleContext);
  if (!context) {
    throw new Error('useScheduleContext must be used within a ScheduleProvider');
  }
  return context;
}

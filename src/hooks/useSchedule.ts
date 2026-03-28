"use client";

import { useCallback, useMemo } from "react";
import { useScheduleContext } from "@/contexts/ScheduleContext";
import { Shift, Role, AvailabilityData, DayScheduleStructure } from "@/lib/schedule/types";
import { MAX_TEAM_MEMBERS, MAX_OPERATIONS } from "@/lib/schedule/constants";
import { createEmptyDaySchedule, addPersonToSchedule } from "@/lib/schedule/utils";

// Hook for schedule operations
export function useSchedule() {
  const {
    schedule,
    setSchedule,
    scheduleMonth,
    setScheduleMonth,
    scheduleYear,
    setScheduleYear,
    autoFillSchedule,
    clearSchedule,
    getAvailableForDay,
    getScheduleDayCount,
  } = useScheduleContext();
  
  // Assign person to team
  const assignToTeam = useCallback((day: number, shift: Shift, teamId: number, userData: AvailabilityData) => {
    setSchedule(prev => {
      let newSchedule = { ...prev };
      if (!newSchedule[day]) {
        newSchedule[day] = createEmptyDaySchedule();
      }
      const team = newSchedule[day][shift].teams.find(t => t.id === teamId);
      if (!team) return prev;
      
      const existingIndex = team.members.findIndex(m => m.userId === userData.userId);
      if (existingIndex >= 0) {
        // Remove if already exists
        const newMembers = team.members.filter(m => m.userId !== userData.userId);
        team.members = newMembers;
      } else if (team.members.length < MAX_TEAM_MEMBERS) {
        team.members = [...team.members, {
          userId: userData.userId,
          userName: userData.userName,
          userRole: userData.userRole
        }];
      }
      return newSchedule;
    });
  }, [setSchedule]);
  
  // Assign person to operations
  const assignToOperations = useCallback((day: number, shift: Shift, userData: AvailabilityData) => {
    setSchedule(prev => {
      let newSchedule = { ...prev };
      if (!newSchedule[day]) {
        newSchedule[day] = createEmptyDaySchedule();
      }
      const ops = newSchedule[day][shift].operations;
      const existingIndex = ops.findIndex(m => m.userId === userData.userId);
      if (existingIndex >= 0) {
        newSchedule[day][shift].operations = ops.filter(m => m.userId !== userData.userId);
      } else if (ops.length < MAX_OPERATIONS) {
        newSchedule[day][shift].operations = [...ops, {
          userId: userData.userId,
          userName: userData.userName,
          userRole: userData.userRole
        }];
      }
      return newSchedule;
    });
  }, [setSchedule]);
  
  // Assign person to sector
  const assignToSector = useCallback((day: number, shift: Shift, userData: AvailabilityData) => {
    setSchedule(prev => {
      let newSchedule = { ...prev };
      if (!newSchedule[day]) {
        newSchedule[day] = createEmptyDaySchedule();
      }
      newSchedule[day][shift].sector = newSchedule[day][shift].sector?.userId === userData.userId
        ? null
        : { userId: userData.userId, userName: userData.userName, userRole: userData.userRole };
      return newSchedule;
    });
  }, [setSchedule]);
  
  return {
    schedule,
    setSchedule,
    scheduleMonth,
    setScheduleMonth,
    scheduleYear,
    setScheduleYear,
    autoFillSchedule,
    clearSchedule,
    getAvailableForDay,
    getScheduleDayCount,
    assignToTeam,
    assignToOperations,
    assignToSector,
  };
}

// Hook for swap operations
export function useSwap() {
  const {
    swapData,
    setSwapData,
    swapMode,
    setSwapMode,
    selectedSwapTarget,
    setSelectedSwapTarget,
    selectedEmptySlot,
    setSelectedEmptySlot,
    performSwap,
    getAllScheduledPeople,
    getAllEmptySlots,
    swapLogs,
    addEvent,
    user,
    calendarMonth,
    calendarYear,
  } = useScheduleContext();
  
  // Open swap dialog
  const openSwapDialog = useCallback((
    day: number,
    shift: Shift,
    personId: string,
    personName: string,
    personRole: Role,
    position: string,
    teamId: number | null = null
  ) => {
    setSwapData({
      day,
      shift,
      personId,
      personName,
      personRole,
      position,
      teamId
    });
    setSwapMode("swap");
    setSelectedSwapTarget(null);
    setSelectedEmptySlot(null);
  }, [setSwapData, setSwapMode, setSelectedSwapTarget, setSelectedEmptySlot]);
  
  // Get available swap targets
  const getAvailableSwapTargets = useCallback((searchTerm: string = "", filterDay: string = "all", filterShift: string = "all") => {
    if (!swapData) return [];
    
    return getAllScheduledPeople.filter(p => {
      if (p.personId === swapData.personId) return false;
      if (searchTerm && !p.personName.toLowerCase().includes(searchTerm.toLowerCase())) return false;
      if (filterDay !== "all" && p.day !== parseInt(filterDay)) return false;
      if (filterShift !== "all" && p.shift !== filterShift) return false;
      return true;
    });
  }, [swapData, getAllScheduledPeople]);
  
  // Get available empty slots
  const getAvailableEmptySlots = useCallback((filterDay: string = "all", filterShift: string = "all") => {
    return getAllEmptySlots.filter(slot => {
      if (filterDay !== "all" && slot.day !== parseInt(filterDay)) return false;
      if (filterShift !== "all" && slot.shift !== filterShift) return false;
      return true;
    });
  }, [getAllEmptySlots]);
  
  return {
    swapData,
    setSwapData,
    swapMode,
    setSwapMode,
    selectedSwapTarget,
    setSelectedSwapTarget,
    selectedEmptySlot,
    setSelectedEmptySlot,
    performSwap,
    openSwapDialog,
    getAvailableSwapTargets,
    getAvailableEmptySlots,
    swapLogs,
  };
}

// Hook for notifications
export function useNotifications() {
  const {
    events,
    setEvents,
    unreadCount,
    markEventAsRead,
    markAllAsRead,
    addEvent,
  } = useScheduleContext();
  
  return {
    events,
    setEvents,
    unreadCount,
    markEventAsRead,
    markAllAsRead,
    addEvent,
  };
}

// Hook for theme
export function useTheme() {
  const { isDarkMode, setIsDarkMode, mounted } = useScheduleContext();
  
  return {
    isDarkMode,
    setIsDarkMode,
    mounted,
  };
}

// Hook for calendar
export function useCalendar() {
  const {
    calendarMonth,
    setCalendarMonth,
    calendarYear,
    setCalendarYear,
    schedule,
    getScheduleDayCount,
    getPersonScheduleDays,
  } = useScheduleContext();
  
  return {
    calendarMonth,
    setCalendarMonth,
    calendarYear,
    setCalendarYear,
    schedule,
    getScheduleDayCount,
    getPersonScheduleDays,
  };
}

// Schedule System Types

import type { LucideIcon } from "lucide-react";

export type Shift = "morning" | "evening" | "night";
export type Role = "sector_commander" | "team_leader" | "scout" | "medic";

export interface UserData {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface AvailabilityData {
  id: string;
  userId: string;
  userName: string;
  userRole: Role;
  month: number;
  year: number;
  sunday: Shift[];
  monday: Shift[];
  tuesday: Shift[];
  wednesday: Shift[];
  thursday: Shift[];
  friday: Shift[];
  saturday: Shift[];
  notes: string | null;
  createdAt: string;
}

export interface TeamMember {
  userId: string;
  userName: string;
  userRole: Role;
}

export interface AmbulanceTeam {
  id: number;
  name: string;
  members: TeamMember[];
  maxMembers: number;
}

export interface ShiftStructure {
  teams: AmbulanceTeam[];
  operations: TeamMember[];
  sector: TeamMember | null;
}

export interface DayScheduleStructure {
  morning: ShiftStructure;
  evening: ShiftStructure;
  night: ShiftStructure;
}

export interface NotificationEvent {
  id: string;
  type: "warning" | "info" | "success" | "error";
  title: string;
  message: string;
  time: string;
  read: boolean;
}

export interface SwapLog {
  id: string;
  performedBy: string;
  performedByName: string;
  person1Id: string;
  person1Name: string;
  person1Role: Role;
  person1Day: number;
  person1Shift: Shift;
  person1Position: string;
  person2Id: string;
  person2Name: string;
  person2Role: Role;
  person2Day: number;
  person2Shift: Shift;
  person2Position: string;
  createdAt: string;
}

export interface SwapData {
  day: number;
  shift: Shift;
  personId: string;
  personName: string;
  personRole: Role;
  position: string;
  teamId: number | null;
}

export interface EmptySlot {
  day: number;
  shift: Shift;
  position: string;
  teamId: number | null;
  positionType: 'team' | 'operations' | 'sector';
}

export interface ScheduledPerson {
  day: number;
  shift: Shift;
  personId: string;
  personName: string;
  personRole: Role;
  position: string;
  teamId: number | null;
}

export interface ShiftInfo {
  value: Shift;
  label: string;
  icon: LucideIcon;
  iconClass: string;
  color: string;
  bgColor: string;
  activeBg: string;
}

export interface RoleInfo {
  value: Role;
  label: string;
  icon: LucideIcon;
  iconClass: string;
  color: string;
  bgColor: string;
  level: number;
}

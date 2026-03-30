"use client";

import { ReactNode, useState, useEffect, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  CalendarDays, User, LayoutDashboard, Send, Trash2, RefreshCw, Ambulance,
  Sun, Sunset, Moon, Award, Star, Crown,
  Moon as MoonIcon, Sun as SunIcon,
  Edit, Plus, Check, ClipboardList,
  Search, Calendar, Bell, X,
  AlertCircle, Info, CheckCircle, XCircle, Clock, ArrowRightLeft, LogOut,
  Users, UserPlus, Mail, ShieldCheck, Power, PowerOff, Save
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  isOperationsRole,
  isSectorRole,
  isTeamAssignableRole,
  type AppRole,
} from "@/lib/user-access";

type Shift = "morning" | "evening" | "night";
type Role = AppRole;

interface AvailabilityData {
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

interface TeamMember {
  userId: string;
  userName: string;
  userRole: Role;
}

interface AmbulanceTeam {
  id: number;
  name: string;
  members: TeamMember[];
  maxMembers: number;
}

interface ShiftStructure {
  teams: AmbulanceTeam[];
  operations: TeamMember[];
  sector: TeamMember | null;
}

interface DayScheduleStructure {
  morning: ShiftStructure;
  evening: ShiftStructure;
  night: ShiftStructure;
}

interface AssignmentTarget {
  type: "team" | "operations" | "sector";
  label: string;
  teamId: number | null;
  slotKey?: TeamSlotKey;
}

type TeamSlotKey = "leader" | "scout" | "medic-1" | "medic-2";

interface TeamSlotDefinition {
  key: TeamSlotKey;
  label: string;
  role: Extract<Role, "leader" | "scout" | "medic">;
}

interface AssignmentLocation {
  type: "team" | "operations" | "sector";
  teamId: number | null;
  slotKey?: TeamSlotKey;
}

interface DraggedAssignment {
  member: TeamMember;
  source: AssignmentLocation;
}

type DraggedPersonSource = "availability" | "manual";

interface NotificationEvent {
  id: string;
  type: "warning" | "info" | "success" | "error";
  title: string;
  message: string;
  time: string;
  read: boolean;
  createdAt: string;
  source: "local" | "remote";
  relatedRequestId?: string | null;
  requiresAction?: boolean;
}

interface SwapLog {
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

interface ManagedUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  isActive: boolean;
  isAdmin: boolean;
  createdAt: string;
}

interface ShiftLoadEntry {
  userId: string;
  userName: string;
  userRole: Role;
  count: number;
  overLimitBy: number;
}

interface UserAssignmentLocation {
  day: number;
  shift: Shift;
  location: AssignmentLocation;
}

interface TeamMinimumWarning {
  day: number;
  shift: Shift;
  teamId: number;
  assigned: number;
  missingRoles: Extract<Role, "leader" | "scout" | "medic">[];
  isOptional: boolean;
}

interface ShiftShortageEntry {
  day: number;
  shift: Shift;
  assigned: number;
  shortage: number;
  target: number;
}

interface GenerationSummary {
  completeTeams: number;
  staffedShifts: number;
  sectorAssignments: number;
  operationsAssignments: number;
  understaffedShifts: number;
  singleMissingShifts: number;
  overloadedUsers: number;
  underMinimumTeams: number;
}

interface AvailabilitySubmissionFeedback {
  status: "submitting" | "success" | "error";
  title: string;
  message: string;
}

interface ScheduledPersonOption {
  day: number;
  shift: Shift;
  personId: string;
  personName: string;
  personRole: Role;
  position: string;
  teamId: number | null;
  locationType: AssignmentLocation["type"];
  slotKey?: TeamSlotKey;
}

interface SmartNotification {
  id: string;
  userId: string;
  actorId: string | null;
  actorName: string | null;
  type: NotificationEvent["type"];
  title: string;
  message: string;
  relatedRequestId: string | null;
  requiresAction: boolean;
  readAt: string | null;
  createdAt: string;
}

interface ShiftRequestItem {
  id: string;
  month: number;
  year: number;
  type: "swap" | "join";
  status: "pending" | "approved" | "rejected" | "cancelled";
  requesterId: string;
  requesterName: string;
  requesterRole: Role;
  source: {
    day: number;
    shift: Shift;
    location: AssignmentLocation;
    positionLabel: string;
    personId: string | null;
    personName: string | null;
    personRole: Role | null;
  } | null;
  target: {
    day: number;
    shift: Shift;
    location: AssignmentLocation;
    positionLabel: string;
    personId: string | null;
    personName: string | null;
    personRole: Role | null;
  };
  note: string | null;
  resolutionNote: string | null;
  createdAt: string;
  updatedAt: string;
  respondedAt: string | null;
  respondedById: string | null;
  respondedByName: string | null;
  canApprove: boolean;
  canReject: boolean;
  canCancel: boolean;
}

const SHIFTS = [
  { value: "morning" as Shift, label: "صباحي", icon: <Sun className="h-4 w-4" />, color: "text-amber-400", bgColor: "bg-amber-500/10 border-amber-500/30", activeBg: "bg-amber-500/30 border-amber-500" },
  { value: "evening" as Shift, label: "مسائي", icon: <Sunset className="h-4 w-4" />, color: "text-orange-400", bgColor: "bg-orange-500/10 border-orange-500/30", activeBg: "bg-orange-500/30 border-orange-500" },
  { value: "night" as Shift, label: "ليلي", icon: <Moon className="h-4 w-4" />, color: "text-purple-400", bgColor: "bg-purple-500/10 border-purple-500/30", activeBg: "bg-purple-500/30 border-purple-500" },
];

const ROLES: { value: Role; label: string; icon: ReactNode; color: string; bgColor: string; level: number }[] = [
  { value: "leader", label: "قائد", icon: <Award className="h-3 w-3" />, color: "text-yellow-400", bgColor: "bg-yellow-500/20 border-yellow-500/50", level: 3 },
  { value: "scout", label: "كشاف", icon: <Star className="h-3 w-3" />, color: "text-emerald-400", bgColor: "bg-emerald-500/20 border-emerald-500/50", level: 2 },
  { value: "medic", label: "مسعف", icon: <Ambulance className="h-3 w-3" />, color: "text-cyan-400", bgColor: "bg-cyan-500/20 border-cyan-500/50", level: 1 },
  { value: "sector_lead", label: "قائد قطاع", icon: <Crown className="h-3 w-3" />, color: "text-rose-300", bgColor: "bg-rose-500/20 border-rose-500/40", level: 4 },
  { value: "operations", label: "عمليات", icon: <ClipboardList className="h-3 w-3" />, color: "text-violet-300", bgColor: "bg-violet-500/20 border-violet-500/40", level: 2 },
];

const WEEKDAYS = [
  { key: "sunday", label: "الأحد" },
  { key: "monday", label: "الإثنين" },
  { key: "tuesday", label: "الثلاثاء" },
  { key: "wednesday", label: "الأربعاء" },
  { key: "thursday", label: "الخميس" },
  { key: "friday", label: "الجمعة" },
  { key: "saturday", label: "السبت" },
];

const MONTHS = [
  { value: 1, label: "يناير" },
  { value: 2, label: "فبراير" },
  { value: 3, label: "مارس" },
  { value: 4, label: "أبريل" },
  { value: 5, label: "مايو" },
  { value: 6, label: "يونيو" },
  { value: 7, label: "يوليو" },
  { value: 8, label: "أغسطس" },
  { value: 9, label: "سبتمبر" },
  { value: 10, label: "أكتوبر" },
  { value: 11, label: "نوفمبر" },
  { value: 12, label: "ديسمبر" },
];

const WEEKDAYS_AR: Record<string, string> = {
  sunday: "الأحد",
  monday: "الإثنين",
  tuesday: "الثلاثاء",
  wednesday: "الأربعاء",
  thursday: "الخميس",
  friday: "الجمعة",
  saturday: "السبت"
};

const MAX_TEAM_MEMBERS = 4;
const MIN_TEAM_MEMBERS = 3;
const MAX_OPERATIONS = 4;
const NUM_TEAMS = 4;
const MAX_PEOPLE_PER_SHIFT = 21;
const MAX_SHIFTS_PER_PERSON = 26;
interface ShiftCapacityConfig {
  preferredTeams: number;
  maxTeams: number;
  preferredOperations: number;
  maxOperations: number;
}

const SHIFT_CAPACITY_CONFIG: Record<Shift, ShiftCapacityConfig> = {
  morning: {
    preferredTeams: 4,
    maxTeams: 4,
    preferredOperations: 4,
    maxOperations: 4,
  },
  evening: {
    preferredTeams: 3,
    maxTeams: 4,
    preferredOperations: 3,
    maxOperations: 4,
  },
  night: {
    preferredTeams: 2,
    maxTeams: 2,
    preferredOperations: 2,
    maxOperations: 4,
  },
};
const TEAM_ROLE_LIMITS: Record<Extract<Role, "leader" | "scout" | "medic">, number> = {
  leader: 1,
  scout: 1,
  medic: 2,
};
const TEAM_SLOT_DEFINITIONS: TeamSlotDefinition[] = [
  { key: "leader", label: "قائد", role: "leader" },
  { key: "scout", label: "كشاف", role: "scout" },
  { key: "medic-1", label: "مسعف أول", role: "medic" },
  { key: "medic-2", label: "مسعف ثاني", role: "medic" },
];

const currentDate = new Date();
const currentMonth = currentDate.getMonth() + 1;
const currentYear = currentDate.getFullYear();
const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

const createEmptyShiftStructure = (): ShiftStructure => ({
  teams: Array.from({ length: NUM_TEAMS }, (_, i) => ({
    id: i + 1,
    name: `فريق ${i + 1}`,
    members: [],
    maxMembers: MAX_TEAM_MEMBERS
  })),
  operations: [],
  sector: null
});

const getShiftAssignedMembers = (shiftStructure: ShiftStructure): TeamMember[] => [
  ...shiftStructure.teams.flatMap((team) => team.members),
  ...shiftStructure.operations,
  ...(shiftStructure.sector ? [shiftStructure.sector] : []),
];

const getShiftAssignedCount = (shiftStructure: ShiftStructure) =>
  getShiftAssignedMembers(shiftStructure).length;

const getMissingRequiredRoles = (
  team: AmbulanceTeam
): Extract<Role, "leader" | "scout" | "medic">[] => {
  const missing: Extract<Role, "leader" | "scout" | "medic">[] = [];

  if (!team.members.some((member) => member.userRole === "leader")) {
    missing.push("leader");
  }

  if (!team.members.some((member) => member.userRole === "scout")) {
    missing.push("scout");
  }

  if (!team.members.some((member) => member.userRole === "medic")) {
    missing.push("medic");
  }

  return missing;
};

const isTeamOperationallyReady = (team: AmbulanceTeam) => getMissingRequiredRoles(team).length === 0;

const getAssignmentCandidatePriority = (options: {
  alreadyAssigned: boolean;
  assignedElsewhere: Shift | null;
  hasTargets: boolean;
}) => {
  if (!options.alreadyAssigned && !options.assignedElsewhere && options.hasTargets) {
    return 0;
  }

  if (!options.alreadyAssigned && !options.assignedElsewhere) {
    return 1;
  }

  if (options.assignedElsewhere) {
    return 2;
  }

  if (options.alreadyAssigned) {
    return 3;
  }

  return 4;
};

const getShiftCapacity = (shift: Shift) => SHIFT_CAPACITY_CONFIG[shift];

const getShiftCoverageTarget = (shift: Shift, mode: "preferred" | "hard" = "preferred") => {
  const config = getShiftCapacity(shift);
  const teamCount = mode === "preferred" ? config.preferredTeams : config.maxTeams;
  const operationsCount = mode === "preferred" ? config.preferredOperations : config.maxOperations;

  return teamCount * MAX_TEAM_MEMBERS + operationsCount + 1;
};

const getTeamsForShift = (
  shiftStructure: ShiftStructure,
  shift: Shift,
  mode: "preferred" | "hard" = "hard"
) => {
  const config = getShiftCapacity(shift);
  const count = mode === "preferred" ? config.preferredTeams : config.maxTeams;
  return shiftStructure.teams.slice(0, count);
};

const isOptionalTeamForShift = (shift: Shift, teamId: number) => teamId > getShiftCapacity(shift).preferredTeams;

const getLocationKey = (location: AssignmentLocation) =>
  `${location.type}-${location.teamId ?? "none"}-${location.slotKey ?? "none"}`;

const getUserAssignmentCountInSchedule = (
  sourceSchedule: Record<number, DayScheduleStructure>,
  userId: string
) => {
  let count = 0;

  Object.values(sourceSchedule).forEach((daySchedule) => {
    SHIFTS.forEach((shift) => {
      const shiftStructure = daySchedule[shift.value];
      if (!shiftStructure) return;

      if (getShiftAssignedMembers(shiftStructure).some((member) => member.userId === userId)) {
        count += 1;
      }
    });
  });

  return count;
};

const getAssignedShiftForDayFromSchedule = (
  sourceSchedule: Record<number, DayScheduleStructure>,
  day: number,
  userId: string,
  excludeShift?: Shift
) => {
  const daySchedule = sourceSchedule[day];
  if (!daySchedule) return null;

  for (const shift of SHIFTS) {
    if (excludeShift && shift.value === excludeShift) continue;

    const shiftStructure = daySchedule[shift.value];
    if (!shiftStructure) continue;

    if (getShiftAssignedMembers(shiftStructure).some((member) => member.userId === userId)) {
      return shift.value;
    }
  }

  return null;
};

const buildScheduleDiagnostics = (sourceSchedule: Record<number, DayScheduleStructure>) => {
  const assignmentMap = new Map<string, ShiftLoadEntry>();
  const understaffedShifts: ShiftShortageEntry[] = [];
  const underMinimumTeams: TeamMinimumWarning[] = [];

  Object.entries(sourceSchedule).forEach(([dayKey, daySchedule]) => {
    const day = Number(dayKey);

    SHIFTS.forEach((shift) => {
      const shiftStructure = daySchedule[shift.value];
      if (!shiftStructure) return;

      getTeamsForShift(shiftStructure, shift.value, "hard").forEach((team) => {
        const missingRoles = getMissingRequiredRoles(team);
        if (team.members.length === 0 || missingRoles.length === 0) {
          return;
        }

        underMinimumTeams.push({
          day,
          shift: shift.value,
          teamId: team.id,
          assigned: team.members.length,
          missingRoles,
          isOptional: isOptionalTeamForShift(shift.value, team.id),
        });
      });

      const assignedMembers = getShiftAssignedMembers(shiftStructure);
      const assigned = assignedMembers.length;
      const target = getShiftCoverageTarget(shift.value, "preferred");
      const shortage = Math.max(0, target - assigned);

      assignedMembers.forEach((member) => {
        const existing = assignmentMap.get(member.userId);
        if (existing) {
          existing.count += 1;
          existing.overLimitBy = Math.max(0, existing.count - MAX_SHIFTS_PER_PERSON);
        } else {
          assignmentMap.set(member.userId, {
            userId: member.userId,
            userName: member.userName,
            userRole: member.userRole,
            count: 1,
            overLimitBy: 0,
          });
        }
      });

      if (shortage > 0) {
        understaffedShifts.push({
          day,
          shift: shift.value,
          assigned,
          shortage,
          target,
        });
      }
    });
  });

  understaffedShifts.sort((a, b) => {
    if (a.shortage !== b.shortage) return b.shortage - a.shortage;
    if (a.day !== b.day) return a.day - b.day;
    return SHIFTS.findIndex((item) => item.value === a.shift) - SHIFTS.findIndex((item) => item.value === b.shift);
  });

  const overloadedUsers = Array.from(assignmentMap.values())
    .filter((entry) => entry.count > MAX_SHIFTS_PER_PERSON)
    .sort((a, b) => {
      if (a.count !== b.count) return b.count - a.count;
      return a.userName.localeCompare(b.userName, "ar");
    });

  return {
    assignmentMap,
    overloadedUsers,
    understaffedShifts,
    singleMissingShifts: understaffedShifts.filter((entry) => entry.shortage === 1),
    underMinimumTeams,
  };
};

const formatEventTime = () =>
  new Intl.DateTimeFormat("ar", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date());

const buildEventId = () =>
  globalThis.crypto?.randomUUID?.() ?? `event-${Date.now()}-${Math.random().toString(16).slice(2)}`;

export function AppContent() {
  const { user, logout, refreshUser } = useAuth();
  
  const [selectedMonth, setSelectedMonth] = useState(currentMonth.toString());
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionFeedback, setSubmissionFeedback] = useState<AvailabilitySubmissionFeedback | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [availability, setAvailability] = useState<Record<string, Shift[]>>({
    sunday: [], monday: [], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: []
  });
  const [records, setRecords] = useState<AvailabilityData[]>([]);
  const [isLoadingRecords, setIsLoadingRecords] = useState(true);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(currentMonth);
  const [calendarYear, setCalendarYear] = useState(currentYear);
  const [activeTab, setActiveTab] = useState("form");
  const [scheduleMonth, setScheduleMonth] = useState(currentMonth);
  const [scheduleYear, setScheduleYear] = useState(currentYear);
  const [schedule, setSchedule] = useState<Record<number, DayScheduleStructure>>({});
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(false);
  const [isSavingSchedule, setIsSavingSchedule] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "all">("all");
  const [managedUsers, setManagedUsers] = useState<ManagedUser[]>([]);
  const [isLoadingManagedUsers, setIsLoadingManagedUsers] = useState(false);
  const [personnelSearchTerm, setPersonnelSearchTerm] = useState("");
  const [personnelRoleFilter, setPersonnelRoleFilter] = useState<Role | "all">("all");
  const [personnelStatusFilter, setPersonnelStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [showPersonnelDialog, setShowPersonnelDialog] = useState(false);
  const [editingPersonnelId, setEditingPersonnelId] = useState<string | null>(null);
  const [isSavingPersonnel, setIsSavingPersonnel] = useState(false);
  const [personnelBusyId, setPersonnelBusyId] = useState<string | null>(null);
  const [personnelForm, setPersonnelForm] = useState<{
    name: string;
    email: string;
    role: Role;
    password: string;
    isAdmin: boolean;
    isActive: boolean;
  }>({
    name: "",
    email: "",
    role: "medic",
    password: "",
    isAdmin: false,
    isActive: true,
  });
  // التقويم - البحث والتصفية
  const [calendarSearchTerm, setCalendarSearchTerm] = useState("");
  const [showDayDetailDialog, setShowDayDetailDialog] = useState(false);
  const [calendarDetailDay, setCalendarDetailDay] = useState<number | null>(null);
  
  // الإشعارات والأحداث
  const [showNotificationsPopup, setShowNotificationsPopup] = useState(false);
  const [showEventsPopup, setShowEventsPopup] = useState(false);
  const [events, setEvents] = useState<NotificationEvent[]>([]);
  const [smartNotifications, setSmartNotifications] = useState<SmartNotification[]>([]);
  const [shiftRequests, setShiftRequests] = useState<ShiftRequestItem[]>([]);
  const [showRequestsDialog, setShowRequestsDialog] = useState(false);
  const [isLoadingShiftRequests, setIsLoadingShiftRequests] = useState(false);
  const [isSubmittingShiftRequest, setIsSubmittingShiftRequest] = useState(false);
  const [shiftRequestNote, setShiftRequestNote] = useState("");
  
  // الاستبدالات
  const [swapLogs, setSwapLogs] = useState<SwapLog[]>([]);
  const [showSwapDialog, setShowSwapDialog] = useState(false);
  const [swapData, setSwapData] = useState<{
    day: number;
    shift: Shift;
    personId: string;
    personName: string;
    personRole: Role;
    position: string | null;
    teamId: number | null;
    locationType: AssignmentLocation["type"] | null;
    slotKey?: TeamSlotKey | null;
  } | null>(null);
  const [swapSearchTerm, setSwapSearchTerm] = useState("");
  const [swapFilterDay, setSwapFilterDay] = useState<string>("all");
  const [swapFilterShift, setSwapFilterShift] = useState<string>("all");
  const [swapMode, setSwapMode] = useState<"swap" | "join">("swap");
  const [showSwapConfirm, setShowSwapConfirm] = useState(false);
  const [selectedSwapTarget, setSelectedSwapTarget] = useState<ScheduledPersonOption | AssignmentTarget | null>(null);
  const [draggedAssignment, setDraggedAssignment] = useState<DraggedAssignment | null>(null);
  const [draggedAvailablePerson, setDraggedAvailablePerson] = useState<AvailabilityData | null>(null);
  const [draggedAvailableSource, setDraggedAvailableSource] = useState<DraggedPersonSource | null>(null);
  const [activeDropTarget, setActiveDropTarget] = useState<string | null>(null);
  const [focusedUserId, setFocusedUserId] = useState<string | null>(null);
  const [focusedTeamId, setFocusedTeamId] = useState<number | null>(null);
  const [assignRoleFilter, setAssignRoleFilter] = useState<Role | "all">("all");
  const [manualAssignSearchTerm, setManualAssignSearchTerm] = useState("");
  const isAdmin = user?.isAdmin === true;
  const skipNextScheduleSyncRef = useRef(false);
  const hasLoadedScheduleRef = useRef(false);
  const scheduleSaveRequestRef = useRef(0);
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

  useEffect(() => {
    if (!user) {
      setEvents([]);
      return;
    }

    setEvents((prev) =>
      prev.length > 0
        ? prev
        : [
            {
              id: buildEventId(),
              type: "info",
              title: "جاهزية النظام",
              message: `مرحبًا ${user.name}. يمكنك متابعة التفرغات والجدول والأحداث من هذه الواجهة.`,
              time: formatEventTime(),
              read: false,
              createdAt: new Date().toISOString(),
              source: "local" as const,
            },
          ]
    );
  }, [user]);

  const refreshAvailabilityRecords = useCallback(async () => {
    if (!user) {
      setRecords([]);
      setIsLoadingRecords(false);
      return;
    }

    try {
      setIsLoadingRecords(true);
      const params = new URLSearchParams({
        month: selectedMonth,
        year: selectedYear,
      });

      const response = await fetch(`/api/availability?${params.toString()}`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "تعذر تحميل التفرغات");
      }

      const normalizedRecords: AvailabilityData[] = (data.data || []).map((record: {
        id: string;
        userId: string;
        user?: { name?: string; role?: string };
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
      }) => ({
        id: record.id,
        userId: record.userId,
        userName: record.user?.name || "مستخدم",
        userRole: (record.user?.role as Role) || "medic",
        month: record.month,
        year: record.year,
        sunday: record.sunday || [],
        monday: record.monday || [],
        tuesday: record.tuesday || [],
        wednesday: record.wednesday || [],
        thursday: record.thursday || [],
        friday: record.friday || [],
        saturday: record.saturday || [],
        notes: record.notes,
        createdAt: record.createdAt,
      }));

      setRecords(normalizedRecords);
    } catch (error) {
      console.error(error);
      setRecords([]);
      toast.error("تعذر تحميل التفرغات من قاعدة البيانات");
    } finally {
      setIsLoadingRecords(false);
    }
  }, [selectedMonth, selectedYear, user]);

  const loadManagedUsers = useCallback(async () => {
    if (!user || !isAdmin) {
      setManagedUsers([]);
      setIsLoadingManagedUsers(false);
      return;
    }

    try {
      setIsLoadingManagedUsers(true);
      const response = await fetch("/api/users", {
        credentials: "include",
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "تعذر تحميل الكوادر");
      }

      setManagedUsers((data.users || []) as ManagedUser[]);
    } catch (error) {
      console.error(error);
      setManagedUsers([]);
      toast.error(error instanceof Error ? error.message : "تعذر تحميل الكوادر");
    } finally {
      setIsLoadingManagedUsers(false);
    }
  }, [isAdmin, user]);

  const loadSchedule = useCallback(async (options?: { silent?: boolean }) => {
    if (!user) {
      hasLoadedScheduleRef.current = false;
      skipNextScheduleSyncRef.current = true;
      setSchedule({});
      if (!options?.silent) {
        setIsLoadingSchedule(false);
      }
      return;
    }

    try {
      hasLoadedScheduleRef.current = false;
      if (!options?.silent) {
        setIsLoadingSchedule(true);
        setSchedule({});
      }
      skipNextScheduleSyncRef.current = true;

      const params = new URLSearchParams({
        month: scheduleMonth.toString(),
        year: scheduleYear.toString(),
      });

      const response = await fetch(`/api/schedule?${params.toString()}`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "تعذر تحميل الجدول");
      }

      skipNextScheduleSyncRef.current = true;
      setSchedule(((data.schedule?.data || {}) as Record<number, DayScheduleStructure>) ?? {});
    } catch (error) {
      console.error(error);
      skipNextScheduleSyncRef.current = true;
      if (!options?.silent) {
        setSchedule({});
        toast.error(error instanceof Error ? error.message : "تعذر تحميل الجدول");
      }
    } finally {
      hasLoadedScheduleRef.current = true;
      if (!options?.silent) {
        setIsLoadingSchedule(false);
      }
    }
  }, [scheduleMonth, scheduleYear, user]);

  const loadShiftCollaboration = useCallback(async (options?: { silent?: boolean }) => {
    if (!user) {
      setShiftRequests([]);
      setSmartNotifications([]);
      if (!options?.silent) {
        setIsLoadingShiftRequests(false);
      }
      return;
    }

    try {
      if (!options?.silent) {
        setIsLoadingShiftRequests(true);
      }
      const params = new URLSearchParams({
        month: selectedMonth,
        year: selectedYear,
      });

      const response = await fetch(`/api/shift-requests?${params.toString()}`, {
        credentials: "include",
        cache: "no-store",
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "تعذر تحميل طلبات المناوبات");
      }

      setShiftRequests((data.requests || []) as ShiftRequestItem[]);
      setSmartNotifications((data.notifications || []) as SmartNotification[]);
    } catch (error) {
      console.error(error);
      if (!options?.silent) {
        setShiftRequests([]);
        setSmartNotifications([]);
        toast.error(error instanceof Error ? error.message : "تعذر تحميل طلبات المناوبات");
      }
    } finally {
      if (!options?.silent) {
        setIsLoadingShiftRequests(false);
      }
    }
  }, [selectedMonth, selectedYear, user]);

  const persistSchedule = useCallback(
    async (
      nextSchedule: Record<number, DayScheduleStructure>,
      month: number,
      year: number,
      options?: { successMessage?: string }
    ) => {
      if (!user) return;

      const requestId = ++scheduleSaveRequestRef.current;
      setIsSavingSchedule(true);

      try {
        const hasScheduleEntries = Object.keys(nextSchedule).length > 0;
        const response = await fetch(
          hasScheduleEntries ? "/api/schedule" : `/api/schedule?month=${month}&year=${year}`,
          {
            method: hasScheduleEntries ? "PUT" : "DELETE",
            headers: hasScheduleEntries
              ? {
                  "Content-Type": "application/json",
                }
              : undefined,
            credentials: "include",
            body: hasScheduleEntries
              ? JSON.stringify({
                  month,
                  year,
                  data: nextSchedule,
                })
              : undefined,
          }
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || "تعذر حفظ الجدول");
        }

        if (options?.successMessage) {
          toast.success(options.successMessage);
        }

        return true;
      } catch (error) {
        console.error(error);
        toast.error(error instanceof Error ? error.message : "تعذر حفظ الجدول في قاعدة البيانات");
        return false;
      } finally {
        if (scheduleSaveRequestRef.current === requestId) {
          setIsSavingSchedule(false);
        }
      }
    },
    [user]
  );

  useEffect(() => {
    void refreshAvailabilityRecords();
  }, [refreshAvailabilityRecords]);

  useEffect(() => {
    void loadManagedUsers();
  }, [loadManagedUsers]);

  useEffect(() => {
    void loadSchedule();
  }, [loadSchedule]);

  useEffect(() => {
    void loadShiftCollaboration();
  }, [loadShiftCollaboration]);

  useEffect(() => {
    if (!user || isAdmin) {
      return;
    }

    const intervalId = globalThis.setInterval(() => {
      if (document.visibilityState !== "visible") {
        return;
      }

      void loadShiftCollaboration({ silent: true });
      void loadSchedule({ silent: true });
    }, 20000);

    return () => globalThis.clearInterval(intervalId);
  }, [isAdmin, loadSchedule, loadShiftCollaboration, user]);

  useEffect(() => {
    if (!user || !hasLoadedScheduleRef.current) {
      return;
    }

    if (skipNextScheduleSyncRef.current) {
      skipNextScheduleSyncRef.current = false;
      return;
    }

    const timeout = globalThis.setTimeout(() => {
      void persistSchedule(schedule, scheduleMonth, scheduleYear);
    }, 450);

    return () => globalThis.clearTimeout(timeout);
  }, [persistSchedule, schedule, scheduleMonth, scheduleYear, user]);

  useEffect(() => {
    if (!isAdmin && activeTab === "schedule") {
      setActiveTab("form");
    }
  }, [activeTab, isAdmin]);

  useEffect(() => {
    setSwapLogs([]);
    setSelectedDay(null);
    setSelectedShift(null);
    setCalendarDetailDay(null);
    setShowAssignDialog(false);
    setShowDayDetailDialog(false);
    setDraggedAssignment(null);
    setDraggedAvailablePerson(null);
    setDraggedAvailableSource(null);
    setActiveDropTarget(null);
    setFocusedUserId(null);
    setFocusedTeamId(null);
    setManualAssignSearchTerm("");
  }, [user?.id, selectedMonth, selectedYear, scheduleMonth, scheduleYear]);

  const handleAssignedMemberDragStart = (member: TeamMember, source: AssignmentLocation) => {
    setDraggedAvailablePerson(null);
    setDraggedAvailableSource(null);
    setDraggedAssignment({ member, source });
  };

  const handleAvailablePersonDragStart = (person: AvailabilityData, source: DraggedPersonSource) => {
    setDraggedAssignment(null);
    setDraggedAvailablePerson(person);
    setDraggedAvailableSource(source);
  };

  const clearDragState = () => {
    setDraggedAssignment(null);
    setDraggedAvailablePerson(null);
    setDraggedAvailableSource(null);
    setActiveDropTarget(null);
  };

  const getUserAssignmentsInSchedule = (userId: string): UserAssignmentLocation[] => {
    const assignments: UserAssignmentLocation[] = [];

    Object.entries(schedule).forEach(([dayKey, daySchedule]) => {
      const day = Number(dayKey);

      SHIFTS.forEach((shift) => {
        const shiftStructure = daySchedule[shift.value];
        if (!shiftStructure) return;

        const location = findAssignmentLocation(shiftStructure, userId);
        if (!location) return;

        assignments.push({
          day,
          shift: shift.value,
          location,
        });
      });
    });

    assignments.sort((a, b) => {
      if (a.day !== b.day) return a.day - b.day;
      return SHIFTS.findIndex((item) => item.value === a.shift) - SHIFTS.findIndex((item) => item.value === b.shift);
    });

    return assignments;
  };

  const openScheduleWarningTarget = (
    day: number,
    shift: Shift,
    options?: { focusUserId?: string; focusTeamId?: number | null }
  ) => {
    setActiveTab("schedule");
    setSelectedDay(day);
    setSelectedShift(shift);
    setFocusedUserId(options?.focusUserId ?? null);
    setFocusedTeamId(options?.focusTeamId ?? null);
    setShowAssignDialog(true);
    clearDragState();
  };

  const handleShortageWarningClick = (entry: ShiftShortageEntry) => {
    openScheduleWarningTarget(entry.day, entry.shift);
    toast(`تم فتح اليوم ${entry.day} • ${SHIFTS.find((shift) => shift.value === entry.shift)?.label}`);
  };

  const handleOverloadedUserWarningClick = (entry: ShiftLoadEntry) => {
    const assignments = getUserAssignmentsInSchedule(entry.userId);
    const targetAssignment =
      assignments[MAX_SHIFTS_PER_PERSON] ??
      assignments[assignments.length - 1] ??
      null;

    if (!targetAssignment) {
      toast.error("تعذر العثور على مناوبات هذا الشخص داخل الجدول الحالي");
      return;
    }

    openScheduleWarningTarget(targetAssignment.day, targetAssignment.shift, {
      focusUserId: entry.userId,
    });
    toast(`تم فتح تكليف ${entry.userName} داخل الجدول`);
  };

  const handleTeamMinimumWarningClick = (entry: TeamMinimumWarning) => {
    openScheduleWarningTarget(entry.day, entry.shift, {
      focusTeamId: entry.teamId,
    });
    toast(`تم فتح ${`فريق ${entry.teamId}`} في اليوم ${entry.day}`);
  };

  const handleAssignedMemberDrop = (
    target: AssignmentLocation,
    options?: { swapWith?: TeamMember }
  ) => {
    if (!draggedAssignment || !selectedDay || !selectedShift) return;

    moveOrSwapAssignedMember(selectedDay, selectedShift, draggedAssignment, target, options?.swapWith);
    clearDragState();
  };

  const toggleShift = (day: string, shift: Shift) => {
    setAvailability((prev) => {
      const dayShifts = prev[day] || [];
      const exists = dayShifts.includes(shift);
      return {
        ...prev,
        [day]: exists ? dayShifts.filter((s) => s !== shift) : [...dayShifts, shift]
      };
    });
  };

  const setActivePeriod = (month: number, year: number) => {
    setSelectedMonth(month.toString());
    setSelectedYear(year.toString());
    setScheduleMonth(month);
    setScheduleYear(year);
    setCalendarMonth(month);
    setCalendarYear(year);
    setSubmissionFeedback(null);
  };

  const appendEvent = (type: NotificationEvent["type"], title: string, message: string) => {
    setEvents((prev) => [
      {
        id: buildEventId(),
        type,
        title,
        message,
        time: formatEventTime(),
        read: false,
        createdAt: new Date().toISOString(),
        source: "local" as const,
      },
      ...prev,
    ].slice(0, 24));
  };

  const publishSchedule = useCallback(async () => {
    const hasSchedule = Object.keys(schedule).length > 0;
    const success = await persistSchedule(schedule, scheduleMonth, scheduleYear, {
      successMessage: hasSchedule
        ? "تم نشر الجدول وتحديثه في قاعدة البيانات"
        : "تم حذف الجدول المنشور من قاعدة البيانات",
    });

    if (!success) return;

    appendEvent(
      hasSchedule ? "success" : "warning",
      hasSchedule ? "نشر الجدول" : "حذف الجدول المنشور",
      hasSchedule
        ? `تم نشر جدول ${MONTHS.find((month) => month.value === scheduleMonth)?.label} ${scheduleYear} وأصبح ظاهرًا في صفحة التقويم.`
        : `تم حذف الجدول المنشور لشهر ${MONTHS.find((month) => month.value === scheduleMonth)?.label} ${scheduleYear}.`
    );
  }, [appendEvent, persistSchedule, schedule, scheduleMonth, scheduleYear]);

  const moveOrSwapAssignedMember = useCallback(
    (
      day: number,
      shift: Shift,
      dragged: DraggedAssignment,
      target: AssignmentLocation,
      swapWith?: TeamMember
    ) => {
      if (
        dragged.source.type === target.type &&
        dragged.source.teamId === target.teamId &&
        dragged.source.slotKey === target.slotKey &&
        (!swapWith || swapWith.userId === dragged.member.userId)
      ) {
        return;
      }

      let actionPerformed = false;
      let actionMessage = "";
      let actionTitle = "";
      let swapLogEntry: SwapLog | null = null;

      setSchedule((prev) => {
        const daySchedule = prev[day];
        if (!daySchedule) {
          return prev;
        }

        const nextDaySchedule = cloneDaySchedule(daySchedule);
        const shiftStructure = nextDaySchedule[shift];
        const sourceLocation = findAssignmentLocation(shiftStructure, dragged.member.userId);

        if (!sourceLocation) {
          return prev;
        }

        if (swapWith) {
          const targetMemberLocation = findAssignmentLocation(shiftStructure, swapWith.userId);
          if (!targetMemberLocation) {
            return prev;
          }

          removeMemberFromLocation(shiftStructure, sourceLocation, dragged.member.userId);
          removeMemberFromLocation(shiftStructure, targetMemberLocation, swapWith.userId);

          const sourceCanReceiveSwap = canPlaceMemberInLocation(shiftStructure, swapWith, shift, sourceLocation);
          const targetCanReceiveDragged = canPlaceMemberInLocation(shiftStructure, dragged.member, shift, target);

          if (!sourceCanReceiveSwap || !targetCanReceiveDragged) {
            addMemberToLocation(shiftStructure, dragged.member, sourceLocation);
            addMemberToLocation(shiftStructure, swapWith, targetMemberLocation);
            toast.error("لا يمكن تبديل هذين الاسمين بسبب قيود الرتب أو الخانات");
            return prev;
          }

          addMemberToLocation(shiftStructure, dragged.member, target);
          addMemberToLocation(shiftStructure, swapWith, sourceLocation);
          actionPerformed = true;
          actionTitle = "تبديل بالسحب والإفلات";
          actionMessage = `تم تبديل ${dragged.member.userName} مع ${swapWith.userName} داخل المناوبة.`;
          swapLogEntry = {
            id: buildEventId(),
            performedBy: user?.id || "system",
            performedByName: user?.name || "النظام",
            person1Id: dragged.member.userId,
            person1Name: dragged.member.userName,
            person1Role: dragged.member.userRole,
            person1Day: day,
            person1Shift: shift,
            person1Position: getLocationLabel(sourceLocation),
            person2Id: swapWith.userId,
            person2Name: swapWith.userName,
            person2Role: swapWith.userRole,
            person2Day: day,
            person2Shift: shift,
            person2Position: getLocationLabel(target),
            createdAt: new Date().toISOString(),
          };
        } else {
          removeMemberFromLocation(shiftStructure, sourceLocation, dragged.member.userId);

          if (!canPlaceMemberInLocation(shiftStructure, dragged.member, shift, target)) {
            addMemberToLocation(shiftStructure, dragged.member, sourceLocation);
            toast.error("لا يمكن نقل هذا الاسم إلى الخانة المطلوبة");
            return prev;
          }

          addMemberToLocation(shiftStructure, dragged.member, target);
          actionPerformed = true;
          actionTitle = "نقل داخل المناوبة";
          actionMessage = `تم نقل ${dragged.member.userName} إلى ${getLocationLabel(target)}.`;
        }

        return {
          ...prev,
          [day]: nextDaySchedule,
        };
      });

      if (actionPerformed) {
        if (swapLogEntry) {
          setSwapLogs((prev) => [swapLogEntry!, ...prev]);
        }
        toast.success(actionTitle);
        appendEvent("info", actionTitle, actionMessage);
      }
    },
    [appendEvent, user?.id, user?.name]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmissionFeedback({
      status: "submitting",
      title: editingId ? "جاري تحديث التفرغات" : "جاري إرسال التفرغات",
      message: "يرجى الانتظار حتى يكتمل حفظ بيانات التفرغ.",
    });

    try {
      const payload = {
        id: editingId,
        month: selectedMonth,
        year: selectedYear,
        sunday: availability.sunday || [],
        monday: availability.monday || [],
        tuesday: availability.tuesday || [],
        wednesday: availability.wednesday || [],
        thursday: availability.thursday || [],
        friday: availability.friday || [],
        saturday: availability.saturday || [],
        notes,
      };

      const response = await fetch("/api/availability", {
        method: editingId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "تعذر حفظ التفرغات");
      }

      const monthLabel = MONTHS.find((month) => month.value === Number(selectedMonth))?.label ?? selectedMonth;
      const successMessage = data.message || "تم حفظ التفرغات بنجاح";

      toast.success(data.message || "تم حفظ التفرغات بنجاح");
      setSubmissionFeedback({
        status: "success",
        title: editingId ? "تم تحديث التفرغات" : "تم إرسال التفرغات",
        message: monthLabel
          ? `${successMessage} لشهر ${monthLabel} ${selectedYear}.`
          : successMessage,
      });
      appendEvent(
        "success",
        editingId ? "تحديث التفرغات" : "حفظ التفرغات",
        `${editingId ? "تم تحديث" : "تم حفظ"} تفرغات ${user?.name || "المستخدم"} لشهر ${monthLabel} ${selectedYear}.`
      );
      setNotes("");
      setEditingId(null);
      setAvailability({ sunday: [], monday: [], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: [] });
      await refreshAvailabilityRecords();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "حدث خطأ أثناء حفظ التفرغات";
      toast.error(errorMessage);
      setSubmissionFeedback({
        status: "error",
        title: "لم يتم إرسال التفرغات",
        message: `${errorMessage}. حاول مرة أخرى بعد التأكد من البيانات.`,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (record: AvailabilityData) => {
    setEditingId(record.id);
    setAvailability({
      sunday: record.sunday,
      monday: record.monday,
      tuesday: record.tuesday,
      wednesday: record.wednesday,
      thursday: record.thursday,
      friday: record.friday,
      saturday: record.saturday
    });
    setNotes(record.notes || "");
    setActivePeriod(record.month, record.year);
    setActiveTab("form");
  };

  const handleDelete = async (id: string) => {
    const deletedRecord = records.find((record) => record.id === id);

    try {
      const response = await fetch(`/api/availability?id=${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "تعذر حذف التفرغ");
      }

      setRecords(records.filter(r => r.id !== id));
      toast.success(data.message || "تم الحذف بنجاح");
      appendEvent(
        "warning",
        "حذف تفرغ",
        `تم حذف سجل التفرغ${deletedRecord ? ` الخاص بـ ${deletedRecord.userName}` : ""}.`
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "حدث خطأ أثناء حذف التفرغ");
    }
  };

  const openCreatePersonnelDialog = () => {
    setEditingPersonnelId(null);
    setPersonnelForm({
      name: "",
      email: "",
      role: "medic",
      password: "",
      isAdmin: false,
      isActive: true,
    });
    setShowPersonnelDialog(true);
  };

  const openEditPersonnelDialog = (person: ManagedUser) => {
    setEditingPersonnelId(person.id);
    setPersonnelForm({
      name: person.name,
      email: person.email,
      role: person.role,
      password: "",
      isAdmin: person.isAdmin,
      isActive: person.isActive,
    });
    setShowPersonnelDialog(true);
  };

  const handlePersonnelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPersonnel(true);

    try {
      const trimmedPassword = personnelForm.password.trim();
      const payload = editingPersonnelId
        ? {
            id: editingPersonnelId,
            name: personnelForm.name.trim(),
            email: personnelForm.email.trim(),
            role: personnelForm.role,
            isAdmin: personnelForm.isAdmin,
            isActive: personnelForm.isActive,
            ...(trimmedPassword ? { password: trimmedPassword } : {}),
          }
        : {
            name: personnelForm.name.trim(),
            email: personnelForm.email.trim(),
            role: personnelForm.role,
            password: trimmedPassword,
            isAdmin: personnelForm.isAdmin,
            isActive: personnelForm.isActive,
          };

      const response = await fetch("/api/users", {
        method: editingPersonnelId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "تعذر حفظ بيانات الكادر");
      }

      await loadManagedUsers();
      await refreshAvailabilityRecords();

      if (editingPersonnelId && editingPersonnelId === user?.id) {
        await refreshUser();
      }

      setShowPersonnelDialog(false);
      setEditingPersonnelId(null);
      setPersonnelForm({
        name: "",
        email: "",
        role: "medic",
        password: "",
        isAdmin: false,
        isActive: true,
      });

      toast.success(data.message || "تم حفظ بيانات الكادر");
      appendEvent(
        "success",
        editingPersonnelId ? "تحديث كادر" : "إضافة كادر",
        editingPersonnelId
          ? `تم تحديث بيانات ${payload.name} وربطها بملفه التشغيلي.`
          : `تمت إضافة ${payload.name} إلى الكوادر وحفظ بياناته بنجاح.`
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "حدث خطأ أثناء حفظ الكادر");
    } finally {
      setIsSavingPersonnel(false);
    }
  };

  const handlePersonnelStatusToggle = async (person: ManagedUser) => {
    if (person.id === user?.id && person.isActive) {
      toast.error("لا يمكن تعطيل حسابك الحالي من هذه الشاشة");
      return;
    }

    try {
      setPersonnelBusyId(person.id);
      const response = await fetch("/api/users", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          id: person.id,
          isActive: !person.isActive,
        }),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "تعذر تحديث حالة الكادر");
      }

      await loadManagedUsers();
      toast.success(data.message || "تم تحديث حالة الكادر");
      appendEvent(
        person.isActive ? "warning" : "success",
        person.isActive ? "تعطيل كادر" : "تفعيل كادر",
        `${person.isActive ? "تم تعطيل" : "تم تفعيل"} ${person.name} من صفحة الإحصائيات.`
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "حدث خطأ أثناء تحديث الحالة");
    } finally {
      setPersonnelBusyId(null);
    }
  };

  const getRoleLevel = (role: Role): number => {
    const roleInfo = ROLES.find(r => r.value === role);
    return roleInfo?.level || 0;
  };

  const renderRole = (roleValue: string, compact = false) => {
    const roleInfo = ROLES.find((r) => r.value === roleValue);
    return (
      <span className={`inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-lg text-[10px] sm:text-xs font-medium border ${roleInfo?.bgColor} ${roleInfo?.color}`}>
        {roleInfo?.icon}
        {!compact && <span>{roleInfo?.label}</span>}
      </span>
    );
  };

  const totalShifts = Object.values(availability).flat().length;

  const getDaysInMonth = (month: number, year: number) => new Date(year, month, 0).getDate();

  const getDayOfWeek = (day: number, month: number, year: number): string => {
    const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    return days[new Date(year, month - 1, day).getDay()];
  };

  const cloneDaySchedule = (daySchedule: DayScheduleStructure): DayScheduleStructure => ({
    morning: {
      ...daySchedule.morning,
      teams: daySchedule.morning.teams.map((team) => ({ ...team, members: [...team.members] })),
      operations: [...daySchedule.morning.operations],
    },
    evening: {
      ...daySchedule.evening,
      teams: daySchedule.evening.teams.map((team) => ({ ...team, members: [...team.members] })),
      operations: [...daySchedule.evening.operations],
    },
    night: {
      ...daySchedule.night,
      teams: daySchedule.night.teams.map((team) => ({ ...team, members: [...team.members] })),
      operations: [...daySchedule.night.operations],
    },
  });

  const getTeamMembersByRole = (team: AmbulanceTeam, role: Extract<Role, "leader" | "scout" | "medic">) =>
    team.members.filter((member) => member.userRole === role);

  const getTeamSlotDefinitions = (team: AmbulanceTeam) => {
    const leaders = getTeamMembersByRole(team, "leader");
    const scouts = getTeamMembersByRole(team, "scout");
    const medics = getTeamMembersByRole(team, "medic");

    return TEAM_SLOT_DEFINITIONS.map((slot) => ({
      ...slot,
      member:
        slot.key === "leader"
          ? leaders[0] ?? null
          : slot.key === "scout"
            ? scouts[0] ?? null
            : slot.key === "medic-1"
              ? medics[0] ?? null
              : medics[1] ?? null,
    }));
  };

  const sortTeamMembers = (members: TeamMember[]) => {
    const priority: Record<Role, number> = {
      leader: 0,
      scout: 1,
      medic: 2,
      sector_lead: 3,
      operations: 4,
    };

    return [...members].sort((a, b) => {
      if (priority[a.userRole] !== priority[b.userRole]) {
        return priority[a.userRole] - priority[b.userRole];
      }

      return a.userName.localeCompare(b.userName, "ar");
    });
  };

  const getAcceptedRoleForSlot = (slotKey?: TeamSlotKey) => {
    if (!slotKey) return null;
    return TEAM_SLOT_DEFINITIONS.find((slot) => slot.key === slotKey)?.role ?? null;
  };

  const canAssignRoleToTeam = (
    team: AmbulanceTeam,
    role: Role,
    options?: { excludeUserId?: string; slotKey?: TeamSlotKey }
  ) => {
    if (!isTeamAssignableRole(role)) {
      return false;
    }

    const acceptedRole = getAcceptedRoleForSlot(options?.slotKey);
    if (acceptedRole && acceptedRole !== role) {
      return false;
    }

    const members = options?.excludeUserId
      ? team.members.filter((member) => member.userId !== options.excludeUserId)
      : team.members;

    if (members.length >= team.maxMembers) {
      return false;
    }

    const roleLimit = TEAM_ROLE_LIMITS[role];
    const roleCount = members.filter((member) => member.userRole === role).length;
    return roleCount < roleLimit;
  };

  const getLocationLabel = (location: AssignmentLocation) => {
    if (location.type === "sector") return "القطاع";
    if (location.type === "operations") return "العمليات";
    if (location.type === "team") {
      const slotLabel = TEAM_SLOT_DEFINITIONS.find((slot) => slot.key === location.slotKey)?.label;
      return `${location.teamId ? `فريق ${location.teamId}` : "فريق"}${slotLabel ? ` • ${slotLabel}` : ""}`;
    }

    return "المناوبة";
  };

  const toAssignmentTarget = (location: AssignmentLocation): AssignmentTarget => ({
    type: location.type,
    label: getLocationLabel(location),
    teamId: location.teamId,
    slotKey: location.slotKey,
  });

  const findAssignmentLocation = (
    shiftStructure: ShiftStructure,
    userId: string
  ): AssignmentLocation | null => {
    if (shiftStructure.sector?.userId === userId) {
      return { type: "sector", teamId: null };
    }

    if (shiftStructure.operations.some((member) => member.userId === userId)) {
      return { type: "operations", teamId: null };
    }

    for (const team of shiftStructure.teams) {
      const slot = getTeamSlotDefinitions(team).find((item) => item.member?.userId === userId);
      if (slot) {
        return { type: "team", teamId: team.id, slotKey: slot.key };
      }
    }

    return null;
  };

  const removeMemberFromLocation = (
    shiftStructure: ShiftStructure,
    location: AssignmentLocation,
    userId: string
  ) => {
    if (location.type === "sector") {
      if (shiftStructure.sector?.userId === userId) {
        shiftStructure.sector = null;
      }
      return;
    }

    if (location.type === "operations") {
      shiftStructure.operations = shiftStructure.operations.filter((member) => member.userId !== userId);
      return;
    }

    if (location.type === "team" && location.teamId) {
      const team = shiftStructure.teams.find((item) => item.id === location.teamId);
      if (team) {
        team.members = team.members.filter((member) => member.userId !== userId);
      }
    }
  };

  const canPlaceMemberInLocation = (
    shiftStructure: ShiftStructure,
    member: TeamMember,
    shift: Shift,
    target: AssignmentLocation,
    options?: { excludeUserId?: string }
  ) => {
    if (target.type === "sector") {
      return (
        isSectorRole(member.userRole) &&
        (!shiftStructure.sector || shiftStructure.sector.userId === options?.excludeUserId)
      );
    }

    if (target.type === "operations") {
      const operationsCount = options?.excludeUserId
        ? shiftStructure.operations.filter((item) => item.userId !== options.excludeUserId).length
        : shiftStructure.operations.length;
      return member.userRole !== "sector_lead" && operationsCount < getShiftCapacity(shift).maxOperations;
    }

    if (target.type === "team" && target.teamId) {
      const team = getTeamsForShift(shiftStructure, shift, "hard").find((item) => item.id === target.teamId);
      return Boolean(team && canAssignRoleToTeam(team, member.userRole, { excludeUserId: options?.excludeUserId, slotKey: target.slotKey }));
    }

    return false;
  };

  const addMemberToLocation = (shiftStructure: ShiftStructure, member: TeamMember, target: AssignmentLocation) => {
    if (target.type === "sector") {
      shiftStructure.sector = member;
      return;
    }

    if (target.type === "operations") {
      shiftStructure.operations.push(member);
      return;
    }

    if (target.type === "team" && target.teamId) {
      const team = shiftStructure.teams.find((item) => item.id === target.teamId);
      if (team) {
        team.members = sortTeamMembers([...team.members, member]);
      }
    }
  };

  const getAvailableForDay = (day: number, shift: Shift): AvailabilityData[] => {
    const dayOfWeek = getDayOfWeek(day, scheduleMonth, scheduleYear);
    const uniquePeople = new Map<string, AvailabilityData>();

    records.forEach((record) => {
      const shifts = record[dayOfWeek as keyof AvailabilityData] as Shift[];
      if (!shifts.includes(shift)) return;
      if (!uniquePeople.has(record.userId)) {
        uniquePeople.set(record.userId, record);
      }
    });

    return Array.from(uniquePeople.values()).sort((a, b) => {
      const roleDiff = getRoleLevel(b.userRole) - getRoleLevel(a.userRole);
      if (roleDiff !== 0) return roleDiff;
      return a.userName.localeCompare(b.userName, "ar");
    });
  };

  const isPersonAvailableForShift = (day: number, shift: Shift, userId: string) =>
    getAvailableForDay(day, shift).some((person) => person.userId === userId);

  const buildAvailabilityDataFromManagedUser = (person: ManagedUser): AvailabilityData => ({
    id: `manual-${person.id}-${selectedDay ?? 0}-${selectedShift ?? "morning"}`,
    userId: person.id,
    userName: person.name,
    userRole: person.role,
    month: scheduleMonth,
    year: scheduleYear,
    sunday: [],
    monday: [],
    tuesday: [],
    wednesday: [],
    thursday: [],
    friday: [],
    saturday: [],
    notes: "إضافة يدوية من لوحة الجدول",
    createdAt: new Date().toISOString(),
  });

  const getScheduleDayCount = (day: number): number => {
    const daySchedule = schedule[day];
    if (!daySchedule) return 0;
    
    let count = 0;
    for (const shift of SHIFTS) {
      const shiftStructure = daySchedule[shift.value];
      for (const team of shiftStructure.teams) {
        count += team.members.length;
      }
      count += shiftStructure.operations.length;
      if (shiftStructure.sector) count++;
    }
    return count;
  };

  const getShiftStructure = (day: number, shift: Shift): ShiftStructure => {
    return schedule[day]?.[shift] ?? createEmptyShiftStructure();
  };

  const isPersonAssignedToShift = (day: number, shift: Shift, userId: string) => {
    const shiftStructure = getShiftStructure(day, shift);

    if (shiftStructure.sector?.userId === userId) {
      return true;
    }

    if (shiftStructure.operations.some((member) => member.userId === userId)) {
      return true;
    }

    return shiftStructure.teams.some((team) =>
      team.members.some((member) => member.userId === userId)
    );
  };

  const getAvailableTargets = (day: number, shift: Shift, person: AvailabilityData): AssignmentTarget[] => {
    const shiftStructure = getShiftStructure(day, shift);
    const targets: AssignmentTarget[] = [];
    const shiftCapacity = getShiftCapacity(shift);

    if (isTeamAssignableRole(person.userRole)) {
      getTeamsForShift(shiftStructure, shift, "hard").forEach((team) => {
        if (canAssignRoleToTeam(team, person.userRole)) {
          targets.push({
            type: "team",
            label: isOptionalTeamForShift(shift, team.id) ? `${team.name} (اختياري)` : team.name,
            teamId: team.id,
          });
        }
      });
    }

    if (shiftStructure.operations.length < shiftCapacity.maxOperations && person.userRole !== "sector_lead") {
      targets.push({
        type: "operations",
        label:
          shiftStructure.operations.length >= shiftCapacity.preferredOperations
            ? "العمليات (اختياري)"
            : "العمليات",
        teamId: null,
      });
    }

    if (!shiftStructure.sector && isSectorRole(person.userRole)) {
      targets.push({
        type: "sector",
        label: "القطاع",
        teamId: null,
      });
    }

    return targets;
  };

  const assignPersonToShift = (
    day: number,
    shift: Shift,
    person: AvailabilityData,
    target: AssignmentTarget,
    options?: { allowOutsideAvailability?: boolean; source?: DraggedPersonSource | "buttons" }
  ) => {
    let assignmentSucceeded = false;
    let failureMessage: string | null = null;
    let overLimitMessage: string | null = null;

    const assignedElsewhereSameDay = getAssignedShiftForDayFromSchedule(schedule, day, person.userId, shift);
    if (assignedElsewhereSameDay) {
      toast.error("هذا الشخص مكلّف بالفعل في مناوبة أخرى ضمن اليوم نفسه");
      return;
    }

    const addedOutsideAvailability =
      options?.allowOutsideAvailability === true &&
      !isPersonAvailableForShift(day, shift, person.userId);

    setSchedule((prev) => {
      const existingDayAssignment = getAssignedShiftForDayFromSchedule(prev, day, person.userId, shift);
      if (existingDayAssignment) {
        failureMessage = "هذا الشخص مكلّف بالفعل في مناوبة أخرى ضمن اليوم نفسه";
        return prev;
      }

      const nextDaySchedule = prev[day]
        ? cloneDaySchedule(prev[day])
        : {
            morning: createEmptyShiftStructure(),
            evening: createEmptyShiftStructure(),
            night: createEmptyShiftStructure(),
          };

      const shiftStructure = nextDaySchedule[shift];
      const shiftCapacity = getShiftCapacity(shift);

      if (getShiftAssignedMembers(shiftStructure).some((member) => member.userId === person.userId)) {
        failureMessage = "هذا الشخص مضاف بالفعل إلى هذه المناوبة";
        return prev;
      }

      const member: TeamMember = {
        userId: person.userId,
        userName: person.userName,
        userRole: person.userRole,
      };

      if (target.type === "team" && target.teamId) {
        const team = getTeamsForShift(shiftStructure, shift, "hard").find((item) => item.id === target.teamId);
        if (!team || !canAssignRoleToTeam(team, person.userRole, { slotKey: target.slotKey })) {
          failureMessage = "لا يمكن إضافة هذه الرتبة إلى هذا الفريق وفق التركيبة المعتمدة";
          return prev;
        }
        team.members = sortTeamMembers([...team.members, member]);
      } else if (target.type === "operations") {
        if (person.userRole === "sector_lead") {
          failureMessage = "رتبة قائد القطاع تُخصص لخانة القطاع";
          return prev;
        }
        if (shiftStructure.operations.length >= shiftCapacity.maxOperations) {
          failureMessage = "قسم العمليات ممتلئ";
          return prev;
        }
        shiftStructure.operations.push(member);
      } else if (target.type === "sector") {
        if (!isSectorRole(person.userRole)) {
          failureMessage = "هذه الرتبة لا يمكن وضعها في خانة القطاع";
          return prev;
        }
        if (shiftStructure.sector) {
          failureMessage = "تم حجز خانة القطاع بالفعل";
          return prev;
        }
        shiftStructure.sector = member;
      }

      const projectedCount = getUserAssignmentCountInSchedule(
        {
          ...prev,
          [day]: nextDaySchedule,
        },
        person.userId
      );

      if (projectedCount > MAX_SHIFTS_PER_PERSON) {
        overLimitMessage = `تحذير: ${person.userName} أصبح لديه ${projectedCount} مناوبة، وهذا أعلى من الحد الأعلى الموصى به (${MAX_SHIFTS_PER_PERSON}).`;
      }

      assignmentSucceeded = true;

      return {
        ...prev,
        [day]: nextDaySchedule,
      };
    });

    if (!assignmentSucceeded) {
      if (failureMessage) {
        toast.error(failureMessage);
      }
      return;
    }

    toast.success(`تمت إضافة ${person.userName} إلى ${target.label}`);

    if (addedOutsideAvailability) {
      appendEvent(
        "warning",
        "إضافة يدوية خارج التفرغ",
        `تمت إضافة ${person.userName} يدويًا إلى ${target.label} في اليوم ${day} ضمن الفترة ${SHIFTS.find((item) => item.value === shift)?.label} رغم عدم وجوده ضمن التفرغات المسجلة لهذه المناوبة.`
      );
      toast(`تمت إضافة ${person.userName} يدويًا خارج التفرغ المسجل`);
    } else {
      appendEvent(
        "success",
        "تعيين جديد",
        `تمت إضافة ${person.userName} إلى ${target.label} في اليوم ${day} ضمن الفترة ${SHIFTS.find((item) => item.value === shift)?.label}.`
      );
    }

    if (overLimitMessage) {
      toast(overLimitMessage);
      appendEvent("warning", "تجاوز الحد الأعلى للمناوبات", overLimitMessage);
    }
  };

  const handleDropOnLocation = (
    target: AssignmentLocation,
    options?: { swapWith?: TeamMember }
  ) => {
    if (!selectedDay || !selectedShift) return;

    if (draggedAssignment) {
      handleAssignedMemberDrop(target, options);
      return;
    }

    if (draggedAvailablePerson) {
      assignPersonToShift(
        selectedDay,
        selectedShift,
        draggedAvailablePerson,
        toAssignmentTarget(target),
        {
          allowOutsideAvailability: draggedAvailableSource === "manual",
          source: draggedAvailableSource ?? "buttons",
        }
      );
      clearDragState();
    }
  };

  const removePersonFromShift = (
    day: number,
    shift: Shift,
    personId: string,
    targetType: AssignmentTarget["type"],
    teamId: number | null = null
  ) => {
    setSchedule((prev) => {
      const daySchedule = prev[day];
      if (!daySchedule) {
        return prev;
      }

      const nextDaySchedule = cloneDaySchedule(daySchedule);

      const shiftStructure = nextDaySchedule[shift];

      if (targetType === "team" && teamId) {
        const team = shiftStructure.teams.find((item) => item.id === teamId);
        if (team) {
          team.members = team.members.filter((member) => member.userId !== personId);
        }
      } else if (targetType === "operations") {
        shiftStructure.operations = shiftStructure.operations.filter((member) => member.userId !== personId);
      } else if (targetType === "sector" && shiftStructure.sector?.userId === personId) {
        shiftStructure.sector = null;
      }

      return {
        ...prev,
        [day]: nextDaySchedule,
      };
    });

    toast.success("تمت إزالة الشخص من المناوبة");
    appendEvent(
      "warning",
      "إزالة من مناوبة",
      `تمت إزالة أحد الأفراد من اليوم ${day} ضمن الفترة ${SHIFTS.find((item) => item.value === shift)?.label}.`
    );
  };

  const autoFillSchedule = () => {
    if (isLoadingRecords) {
      toast.error("انتظر حتى يكتمل تحميل التفرغات أولًا");
      return;
    }

    if (records.length === 0) {
      toast.error("لا توجد تفرغات محفوظة لهذه الفترة لإنشاء الجدول");
      return;
    }

    const daysInMonth = getDaysInMonth(scheduleMonth, scheduleYear);
    const newSchedule: Record<number, DayScheduleStructure> = {};
    const assignmentCounts = new Map<string, number>();
    const roleAssignmentCounts = new Map<Role, Map<string, number>>([
      ["leader", new Map()],
      ["scout", new Map()],
      ["medic", new Map()],
      ["sector_lead", new Map()],
      ["operations", new Map()],
    ]);
    let completeTeams = 0;
    let staffedShifts = 0;
    let sectorAssignments = 0;
    let operationsAssignments = 0;

    const getUsageScore = (personId: string, role: Role) => ({
      total: assignmentCounts.get(personId) ?? 0,
      roleSpecific: roleAssignmentCounts.get(role)?.get(personId) ?? 0,
      exceededCap: (assignmentCounts.get(personId) ?? 0) >= MAX_SHIFTS_PER_PERSON ? 1 : 0,
    });

    const markAssigned = (personId: string, role: Role) => {
      assignmentCounts.set(personId, (assignmentCounts.get(personId) ?? 0) + 1);
      const roleMap = roleAssignmentCounts.get(role);
      if (roleMap) {
        roleMap.set(personId, (roleMap.get(personId) ?? 0) + 1);
      }
    };

    const pickCandidate = (pool: AvailabilityData[], role: Role, assignedToday: Set<string>) =>
      pool
        .filter((person) => !assignedToday.has(person.userId))
        .sort((a, b) => {
          const aUsage = getUsageScore(a.userId, role);
          const bUsage = getUsageScore(b.userId, role);

          if (aUsage.exceededCap !== bUsage.exceededCap) return aUsage.exceededCap - bUsage.exceededCap;
          if (aUsage.total !== bUsage.total) return aUsage.total - bUsage.total;
          if (aUsage.roleSpecific !== bUsage.roleSpecific) return aUsage.roleSpecific - bUsage.roleSpecific;
          return a.userName.localeCompare(b.userName, "ar");
        })[0];
    
    for (let day = 1; day <= daysInMonth; day++) {
      newSchedule[day] = {
        morning: createEmptyShiftStructure(),
        evening: createEmptyShiftStructure(),
        night: createEmptyShiftStructure()
      };

      const assignedToday = new Set<string>();
      const shiftsByPriority = SHIFTS.map((shift) => ({
        shift,
        available: getAvailableForDay(day, shift.value),
      })).sort((a, b) => a.available.length - b.available.length);

      for (const { shift, available } of shiftsByPriority) {
        const shiftStructure = newSchedule[day][shift.value];
        const shiftCapacity = getShiftCapacity(shift.value);
        const leaders = available.filter((person) => person.userRole === "leader");
        const scouts = available.filter((person) => person.userRole === "scout");
        const medics = available.filter((person) => person.userRole === "medic");
        const sectorLeads = available.filter((person) => person.userRole === "sector_lead");
        const operationsStaff = available.filter((person) => person.userRole === "operations");
        const remaining = [...operationsStaff, ...leaders, ...scouts, ...medics]
          .filter((person) => !assignedToday.has(person.userId))
          .sort((a, b) => {
            const aUsage = getUsageScore(a.userId, a.userRole);
            const bUsage = getUsageScore(b.userId, b.userRole);

            if (a.userRole === "operations" && b.userRole !== "operations") return -1;
            if (a.userRole !== "operations" && b.userRole === "operations") return 1;
            if (aUsage.exceededCap !== bUsage.exceededCap) return aUsage.exceededCap - bUsage.exceededCap;
            if (aUsage.total !== bUsage.total) return aUsage.total - bUsage.total;
            if (aUsage.roleSpecific !== bUsage.roleSpecific) return aUsage.roleSpecific - bUsage.roleSpecific;
            return a.userName.localeCompare(b.userName, "ar");
          });

        const targetTeams = getTeamsForShift(shiftStructure, shift.value, "preferred");

        for (const requiredRole of ["leader", "scout", "medic"] as const) {
          for (const team of targetTeams) {
            const pool = requiredRole === "leader" ? leaders : requiredRole === "scout" ? scouts : medics;
            const candidate = pickCandidate(pool, requiredRole, assignedToday);

            if (!candidate || team.members.length >= MAX_TEAM_MEMBERS) continue;

            team.members.push({
              userId: candidate.userId,
              userName: candidate.userName,
              userRole: candidate.userRole,
            });
            team.members = sortTeamMembers(team.members);
            assignedToday.add(candidate.userId);
            markAssigned(candidate.userId, candidate.userRole);
          }
        }

        for (const team of targetTeams) {
          const candidate = pickCandidate(medics, "medic", assignedToday);
          if (!candidate || team.members.length >= MAX_TEAM_MEMBERS || !isTeamOperationallyReady(team)) continue;

          team.members.push({
            userId: candidate.userId,
            userName: candidate.userName,
            userRole: candidate.userRole,
          });
          team.members = sortTeamMembers(team.members);
          assignedToday.add(candidate.userId);
          markAssigned(candidate.userId, candidate.userRole);
        }

        completeTeams += targetTeams.filter((team) => isTeamOperationallyReady(team)).length;

        const extraLeader = pickCandidate([...sectorLeads, ...leaders], "sector_lead", assignedToday);
        if (extraLeader) {
          shiftStructure.sector = {
            userId: extraLeader.userId,
            userName: extraLeader.userName,
            userRole: extraLeader.userRole,
          };
          assignedToday.add(extraLeader.userId);
          markAssigned(extraLeader.userId, extraLeader.userRole);
          sectorAssignments += 1;
        }

        for (const person of remaining) {
          if (shiftStructure.operations.length < shiftCapacity.preferredOperations) {
            shiftStructure.operations.push({
              userId: person.userId,
              userName: person.userName,
              userRole: person.userRole,
            });
            assignedToday.add(person.userId);
            markAssigned(person.userId, person.userRole);
            operationsAssignments += 1;
          }
        }

        if (
          shiftStructure.teams.some((team) => team.members.length > 0) ||
          shiftStructure.operations.length > 0 ||
          shiftStructure.sector
        ) {
          staffedShifts += 1;
        }
      }
    }
    
    skipNextScheduleSyncRef.current = true;
    setSchedule(newSchedule);
    setCalendarMonth(scheduleMonth);
    setCalendarYear(scheduleYear);
    void persistSchedule(newSchedule, scheduleMonth, scheduleYear);
    const diagnostics = buildScheduleDiagnostics(newSchedule);
    toast.success(
      `تم إنشاء الجدول: ${completeTeams} فريق مستوفٍ للحد الأدنى، ${staffedShifts} مناوبة مغطاة، ${sectorAssignments} تكليف قطاع`
    );
    appendEvent(
      "success",
      "إنشاء الجدول الشهري",
      `تم إنشاء جدول ${MONTHS.find((month) => month.value === scheduleMonth)?.label} ${scheduleYear} مع ${completeTeams} فريق مستوفٍ للحد الأدنى و${staffedShifts} مناوبة مغطاة.`
    );

    if (diagnostics.overloadedUsers.length > 0) {
      const sampleUsers = diagnostics.overloadedUsers
        .slice(0, 3)
        .map((entry) => `${entry.userName} (${entry.count})`)
        .join("، ");

      const warningMessage = `يوجد ${diagnostics.overloadedUsers.length} أفراد تجاوزوا حد ${MAX_SHIFTS_PER_PERSON} مناوبة بعد التوليد.${sampleUsers ? ` أمثلة: ${sampleUsers}.` : ""}`;
      toast(warningMessage);
      appendEvent("warning", "تجاوز حد المناوبات", warningMessage);
    }

    if (diagnostics.singleMissingShifts.length > 0) {
      appendEvent(
        "warning",
        "مناوبات ناقصة بفرد واحد",
        `تم اكتشاف ${diagnostics.singleMissingShifts.length} مناوبات ينقصها فرد واحد فقط للوصول إلى السعة التشغيلية المستهدفة الخاصة بكل فترة.`
      );
    } else if (diagnostics.understaffedShifts.length > 0) {
      appendEvent(
        "warning",
        "نقص في تغطية المناوبات",
        `تم اكتشاف ${diagnostics.understaffedShifts.length} مناوبات أقل من السعة التشغيلية المستهدفة الخاصة بها.`
      );
    }

    if (diagnostics.underMinimumTeams.length > 0) {
      appendEvent(
        "warning",
        "فرق أقل من الحد الأدنى",
        `تم اكتشاف ${diagnostics.underMinimumTeams.length} فرق لا تستوفي الحد الأدنى التشغيلي: قائد + كشاف + مسعف.`
      );
    }
  };

  const clearSchedule = () => {
    skipNextScheduleSyncRef.current = true;
    setSchedule({});
    void persistSchedule({}, scheduleMonth, scheduleYear);
    toast.success("تم مسح الجدول");
    appendEvent("warning", "مسح الجدول", "تم مسح الجدول الحالي وإفراغ جميع التعيينات المولدة.");
  };

  const filteredRecords = records.filter(record => {
    const matchesSearch = record.userName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "all" || record.userRole === roleFilter;
    return matchesSearch && matchesRole;
  });

  const roleStats = ROLES.map(role => ({
    ...role,
    count: records.filter(r => r.userRole === role.value).length
  }));

  const filteredManagedUsers = useMemo(() => {
    return managedUsers.filter((person) => {
      const matchesSearch =
        person.name.toLowerCase().includes(personnelSearchTerm.toLowerCase()) ||
        person.email.toLowerCase().includes(personnelSearchTerm.toLowerCase());
      const matchesRole = personnelRoleFilter === "all" || person.role === personnelRoleFilter;
      const matchesStatus =
        personnelStatusFilter === "all" ||
        (personnelStatusFilter === "active" ? person.isActive : !person.isActive);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [managedUsers, personnelRoleFilter, personnelSearchTerm, personnelStatusFilter]);

  const managedUserStats = useMemo(
    () => ({
      total: managedUsers.length,
      active: managedUsers.filter((person) => person.isActive).length,
      admins: managedUsers.filter((person) => person.isAdmin).length,
      sectorLeads: managedUsers.filter((person) => person.role === "sector_lead").length,
    }),
    [managedUsers]
  );

  const availableRoleCounts = useMemo(
    () => ({
      leader: records.filter((record) => record.userRole === "leader").length,
      scout: records.filter((record) => record.userRole === "scout").length,
      medic: records.filter((record) => record.userRole === "medic").length,
      sectorLead: records.filter((record) => record.userRole === "sector_lead").length,
      operations: records.filter((record) => record.userRole === "operations").length,
    }),
    [records]
  );

  const possibleBalancedTeams = useMemo(
    () =>
      Math.min(
        availableRoleCounts.leader,
        availableRoleCounts.scout,
        Math.floor(availableRoleCounts.medic / 2)
      ),
    [availableRoleCounts]
  );

  const scheduleDiagnostics = useMemo(() => buildScheduleDiagnostics(schedule), [schedule]);

  const generatedScheduleSummary = useMemo<GenerationSummary>(() => {
    let completeTeams = 0;
    let staffedShifts = 0;
    let sectorAssignments = 0;
    let operationsAssignments = 0;

    Object.values(schedule).forEach((daySchedule) => {
      SHIFTS.forEach((shift) => {
        const shiftStructure = daySchedule[shift.value];
        if (!shiftStructure) return;

        const hasCoverage =
          shiftStructure.sector !== null ||
          shiftStructure.operations.length > 0 ||
          shiftStructure.teams.some((team) => team.members.length > 0);

        if (hasCoverage) staffedShifts += 1;
        if (shiftStructure.sector) sectorAssignments += 1;
        operationsAssignments += shiftStructure.operations.length;
        completeTeams += getTeamsForShift(shiftStructure, shift.value, "hard").filter((team) => isTeamOperationallyReady(team)).length;
      });
    });

    return {
      completeTeams,
      staffedShifts,
      sectorAssignments,
      operationsAssignments,
      understaffedShifts: scheduleDiagnostics.understaffedShifts.length,
      singleMissingShifts: scheduleDiagnostics.singleMissingShifts.length,
      overloadedUsers: scheduleDiagnostics.overloadedUsers.length,
      underMinimumTeams: scheduleDiagnostics.underMinimumTeams.length,
    };
  }, [schedule, scheduleDiagnostics.overloadedUsers.length, scheduleDiagnostics.singleMissingShifts.length, scheduleDiagnostics.underMinimumTeams.length, scheduleDiagnostics.understaffedShifts.length]);

  const calendarSearchResults = useMemo(() => {
    const term = calendarSearchTerm.trim().toLowerCase();
    if (!term) return [] as { day: number; shift: Shift }[];

    const results: { day: number; shift: Shift }[] = [];
    const daysInMonth = getDaysInMonth(calendarMonth, calendarYear);

    for (let day = 1; day <= daysInMonth; day++) {
      const daySchedule = schedule[day];
      if (!daySchedule) continue;

      for (const shift of SHIFTS) {
        const shiftStructure = daySchedule[shift.value];
        const matchesTeam = shiftStructure.teams.some((team) =>
          team.members.some((member) => member.userName.toLowerCase().includes(term))
        );
        const matchesOperations = shiftStructure.operations.some((member) =>
          member.userName.toLowerCase().includes(term)
        );
        const matchesSector = Boolean(
          shiftStructure.sector?.userName.toLowerCase().includes(term)
        );

        if (matchesTeam || matchesOperations || matchesSector) {
          results.push({ day, shift: shift.value });
        }
      }
    }

    return results;
  }, [calendarMonth, calendarSearchTerm, calendarYear, schedule]);
  const remoteEvents = useMemo<NotificationEvent[]>(
    () =>
      smartNotifications.map((notification) => ({
        id: notification.id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        time: new Intl.DateTimeFormat("ar", {
          hour: "numeric",
          minute: "2-digit",
        }).format(new Date(notification.createdAt)),
        read: Boolean(notification.readAt),
        createdAt: notification.createdAt,
        source: "remote",
        relatedRequestId: notification.relatedRequestId,
        requiresAction: false,
      })),
    [smartNotifications]
  );
  const displayEvents = useMemo(
    () =>
      [...remoteEvents, ...events].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    [events, remoteEvents]
  );
  const unreadEvents = displayEvents.filter((event) => !event.read).length;
  const adminShiftLogCount = isAdmin ? shiftRequests.length : 0;
  const scheduledDaysCount = Object.keys(schedule).length;
  const eventSummaryCards = useMemo(
    () => [
      {
        label: "سجلات التفرغ",
        value: records.length,
        tone: "text-cyan-300",
      },
      {
        label: "أيام مجدولة",
        value: scheduledDaysCount,
        tone: "text-emerald-300",
      },
      {
        label: "فرق مستوفية",
        value: generatedScheduleSummary.completeTeams,
        tone: "text-amber-300",
      },
      {
        label: "غير مقروء",
        value: unreadEvents,
        tone: "text-rose-300",
      },
    ],
    [generatedScheduleSummary.completeTeams, records.length, scheduledDaysCount, unreadEvents]
  );

  const syncNotificationReadState = async (payload: { notificationId?: string; action: "read" | "read-all" }) => {
    const response = await fetch("/api/notifications", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({
        month: selectedMonth,
        year: selectedYear,
        notificationId: payload.notificationId,
        action: payload.action,
      }),
    });
    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.error || "تعذر تحديث الإشعارات");
    }

    setSmartNotifications((data.notifications || []) as SmartNotification[]);
  };

  const markEventAsRead = (event: NotificationEvent) => {
    if (event.source === "remote") {
      void syncNotificationReadState({ notificationId: event.id, action: "read" }).catch((error) => {
        console.error(error);
        toast.error(error instanceof Error ? error.message : "تعذر تحديث حالة الإشعار");
      });
      return;
    }

    setEvents((prev) => prev.map((item) => (item.id === event.id ? { ...item, read: true } : item)));
  };

  const markAllEventsAsRead = () => {
    setEvents((prev) => prev.map((event) => ({ ...event, read: true })));

    if (smartNotifications.some((notification) => !notification.readAt)) {
      void syncNotificationReadState({ action: "read-all" }).catch((error) => {
        console.error(error);
        toast.error(error instanceof Error ? error.message : "تعذر تحديث الإشعارات");
      });
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case "warning": return <AlertCircle className="h-5 w-5 text-amber-400" />;
      case "info": return <Info className="h-5 w-5 text-blue-400" />;
      case "success": return <CheckCircle className="h-5 w-5 text-green-400" />;
      case "error": return <XCircle className="h-5 w-5 text-red-400" />;
      default: return <Bell className="h-5 w-5 text-slate-300" />;
    }
  };

  const getEventBg = (type: string) => {
    switch (type) {
      case "warning": return "border-amber-400/20 bg-amber-400/10";
      case "info": return "border-sky-400/20 bg-sky-400/10";
      case "success": return "border-emerald-400/20 bg-emerald-400/10";
      case "error": return "border-rose-400/20 bg-rose-400/10";
      default: return "border-white/10 bg-white/5";
    }
  };

  const getSearchSuggestions = (term: string): AvailabilityData[] => {
    if (!term.trim()) return [];
    return records
      .filter(r => r.userName.toLowerCase().includes(term.toLowerCase()))
      .slice(0, 5);
  };

  const searchSuggestions = getSearchSuggestions(calendarSearchTerm);

  const openSwapDialog = (payload: {
    day: number;
    shift: Shift;
    personId: string;
    personName: string;
    personRole: Role;
    position: string | null;
    teamId?: number | null;
    locationType?: AssignmentLocation["type"] | null;
    slotKey?: TeamSlotKey | null;
    initialMode?: "swap" | "join";
  }) => {
    setSwapData({
      day: payload.day,
      shift: payload.shift,
      personId: payload.personId,
      personName: payload.personName,
      personRole: payload.personRole,
      position: payload.position,
      teamId: payload.teamId ?? null,
      locationType: payload.locationType ?? null,
      slotKey: payload.slotKey ?? null,
    });
    setSwapSearchTerm("");
    setSwapFilterDay("all");
    setSwapFilterShift("all");
    setShiftRequestNote("");
    setSwapMode(payload.initialMode ?? "swap");
    setSelectedSwapTarget(null);
    setShowSwapDialog(true);
  };

  const getAllScheduledPeople = useMemo<ScheduledPersonOption[]>(() => {
    const people: ScheduledPersonOption[] = [];
    
    const daysInMonth = getDaysInMonth(calendarMonth, calendarYear);
    
    for (let day = 1; day <= daysInMonth; day++) {
      const daySchedule = schedule[day];
      if (!daySchedule) continue;
      
      for (const shiftData of SHIFTS) {
        const shiftStructure = daySchedule[shiftData.value];
        
        shiftStructure.teams.forEach(team => {
          getTeamSlotDefinitions(team).forEach((slot) => {
            if (!slot.member) return;

            people.push({
              day,
              shift: shiftData.value,
              personId: slot.member.userId,
              personName: slot.member.userName,
              personRole: slot.member.userRole,
              position: getLocationLabel({ type: "team", teamId: team.id, slotKey: slot.key }),
              teamId: team.id,
              locationType: "team",
              slotKey: slot.key,
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
            teamId: null,
            locationType: "operations",
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
            teamId: null,
            locationType: "sector",
          });
        }
      }
    }
    
    return people;
  }, [schedule, calendarMonth, calendarYear]);

  const currentUserAvailabilityRecord = useMemo(
    () => records.find((record) => record.userId === user?.id) ?? null,
    [records, user?.id]
  );

  const currentUserAvailabilityProfile = useMemo<AvailabilityData | null>(() => {
    if (!user) return null;

    return {
      id: currentUserAvailabilityRecord?.id ?? `self-${user.id}`,
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      month: scheduleMonth,
      year: scheduleYear,
      sunday: currentUserAvailabilityRecord?.sunday ?? [],
      monday: currentUserAvailabilityRecord?.monday ?? [],
      tuesday: currentUserAvailabilityRecord?.tuesday ?? [],
      wednesday: currentUserAvailabilityRecord?.wednesday ?? [],
      thursday: currentUserAvailabilityRecord?.thursday ?? [],
      friday: currentUserAvailabilityRecord?.friday ?? [],
      saturday: currentUserAvailabilityRecord?.saturday ?? [],
      notes: currentUserAvailabilityRecord?.notes ?? null,
      createdAt: currentUserAvailabilityRecord?.createdAt ?? new Date().toISOString(),
    };
  }, [currentUserAvailabilityRecord, scheduleMonth, scheduleYear, user]);

  const canSwapWithCandidate = useCallback(
    (sourcePerson: NonNullable<typeof swapData>, candidate: ScheduledPersonOption) => {
      if (!sourcePerson.locationType || candidate.personId === sourcePerson.personId) {
        return false;
      }

      const nextSchedule = JSON.parse(JSON.stringify(schedule)) as Record<number, DayScheduleStructure>;
      const sourceDaySchedule = nextSchedule[sourcePerson.day];
      const targetDaySchedule = nextSchedule[candidate.day];

      if (!sourceDaySchedule || !targetDaySchedule) {
        return false;
      }

      const sourceLocation: AssignmentLocation = {
        type: sourcePerson.locationType,
        teamId: sourcePerson.teamId,
        slotKey: sourcePerson.slotKey ?? undefined,
      };
      const targetLocation: AssignmentLocation = {
        type: candidate.locationType,
        teamId: candidate.teamId,
        slotKey: candidate.slotKey,
      };

      if (
        sourcePerson.day === candidate.day &&
        sourcePerson.shift === candidate.shift &&
        sourceLocation.type === targetLocation.type &&
        sourceLocation.teamId === targetLocation.teamId &&
        sourceLocation.slotKey === targetLocation.slotKey
      ) {
        return false;
      }

      const sourceShiftStructure = nextSchedule[sourcePerson.day][sourcePerson.shift];
      const targetShiftStructure = nextSchedule[candidate.day][candidate.shift];
      const sourceMember: TeamMember = {
        userId: sourcePerson.personId,
        userName: sourcePerson.personName,
        userRole: sourcePerson.personRole,
      };
      const targetMember: TeamMember = {
        userId: candidate.personId,
        userName: candidate.personName,
        userRole: candidate.personRole,
      };

      removeMemberFromLocation(sourceShiftStructure, sourceLocation, sourcePerson.personId);
      if (
        sourcePerson.day !== candidate.day ||
        sourcePerson.shift !== candidate.shift ||
        sourceLocation.type !== targetLocation.type ||
        sourceLocation.teamId !== targetLocation.teamId ||
        sourceLocation.slotKey !== targetLocation.slotKey
      ) {
        removeMemberFromLocation(targetShiftStructure, targetLocation, candidate.personId);
      }

      return (
        canPlaceMemberInLocation(targetShiftStructure, sourceMember, candidate.shift, targetLocation) &&
        canPlaceMemberInLocation(sourceShiftStructure, targetMember, sourcePerson.shift, sourceLocation)
      );
    },
    [schedule]
  );

  const getCurrentUserJoinTargets = useCallback(
    (day: number, shift: Shift) => {
      if (!user || !currentUserAvailabilityProfile) return [] as AssignmentTarget[];

      const dayOfWeek = getDayOfWeek(day, scheduleMonth, scheduleYear);
      const shiftsForDay = currentUserAvailabilityProfile[dayOfWeek as keyof AvailabilityData] as Shift[] | undefined;

      if (!Array.isArray(shiftsForDay) || !shiftsForDay.includes(shift)) {
        return [] as AssignmentTarget[];
      }

      if (getAssignedShiftForDayFromSchedule(schedule, day, user.id)) {
        return [] as AssignmentTarget[];
      }

      if (isPersonAssignedToShift(day, shift, user.id)) {
        return [] as AssignmentTarget[];
      }

      return getAvailableTargets(day, shift, currentUserAvailabilityProfile);
    },
    [currentUserAvailabilityProfile, schedule, scheduleMonth, scheduleYear, user]
  );

  const availableSwapTargets = useMemo(() => {
    if (!swapData || swapMode !== "swap") return [] as ScheduledPersonOption[];

    const term = swapSearchTerm.trim().toLowerCase();

    return getAllScheduledPeople
      .filter((person) => canSwapWithCandidate(swapData, person))
      .filter((person) => {
        if (!term) return true;

        return (
          person.personName.toLowerCase().includes(term) ||
          person.position.toLowerCase().includes(term)
        );
      })
      .slice(0, 30);
  }, [canSwapWithCandidate, getAllScheduledPeople, swapData, swapMode, swapSearchTerm]);

  const availableJoinTargets = useMemo(() => {
    if (!swapData || swapMode !== "join") return [] as AssignmentTarget[];

    const term = swapSearchTerm.trim().toLowerCase();
    return getCurrentUserJoinTargets(swapData.day, swapData.shift)
      .filter((target) => (!term ? true : target.label.toLowerCase().includes(term)));
  }, [getCurrentUserJoinTargets, swapData, swapMode, swapSearchTerm]);

  const submitShiftRequest = useCallback(async () => {
    if (!swapData || !user) return;

    if (swapMode === "swap" && (!selectedSwapTarget || "type" in selectedSwapTarget)) {
      toast.error("اختر الشخص الذي تريد التبديل معه");
      return;
    }

    if (swapMode === "join" && (!selectedSwapTarget || !("type" in selectedSwapTarget))) {
      toast.error("اختر المكان الشاغر الذي تريد الانضمام إليه");
      return;
    }

    try {
      setIsSubmittingShiftRequest(true);
      const joinTarget =
        swapMode === "join" && selectedSwapTarget && "type" in selectedSwapTarget
          ? selectedSwapTarget
          : null;

      const body =
        swapMode === "swap" && selectedSwapTarget && !("type" in selectedSwapTarget)
          ? {
              month: selectedMonth,
              year: selectedYear,
              type: "swap",
              note: shiftRequestNote,
              source: {
                day: swapData.day,
                shift: swapData.shift,
                location: {
                  type: swapData.locationType,
                  teamId: swapData.teamId,
                  slotKey: swapData.slotKey,
                },
                positionLabel: swapData.position,
                personId: swapData.personId,
                personName: swapData.personName,
                personRole: swapData.personRole,
              },
              target: {
                day: selectedSwapTarget.day,
                shift: selectedSwapTarget.shift,
                location: {
                  type: selectedSwapTarget.locationType,
                  teamId: selectedSwapTarget.teamId,
                  slotKey: selectedSwapTarget.slotKey,
                },
                positionLabel: selectedSwapTarget.position,
                personId: selectedSwapTarget.personId,
                personName: selectedSwapTarget.personName,
                personRole: selectedSwapTarget.personRole,
              },
            }
          : {
              month: selectedMonth,
              year: selectedYear,
              type: "join",
              note: shiftRequestNote,
              target: {
                day: swapData.day,
                shift: swapData.shift,
                location: {
                  type: joinTarget?.type,
                  teamId: joinTarget?.teamId,
                  slotKey: joinTarget?.slotKey,
                },
                positionLabel: joinTarget?.label,
                personId: null,
                personName: null,
                personRole: null,
              },
            };

      const response = await fetch("/api/shift-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || "تعذر إرسال الطلب");
      }

      toast.success(data.message || "تم إرسال الطلب بنجاح");
      setShowSwapConfirm(false);
      setShowSwapDialog(false);
      setSelectedSwapTarget(null);
      setShiftRequestNote("");
      await loadShiftCollaboration();
      await loadSchedule();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "تعذر تنفيذ الطلب");
    } finally {
      setIsSubmittingShiftRequest(false);
    }
  }, [loadSchedule, loadShiftCollaboration, selectedMonth, selectedSwapTarget, selectedYear, shiftRequestNote, swapData, swapMode, user]);

  const handleLogout = () => {
    logout();
    toast.success("تم تسجيل الخروج بنجاح");
  };

  const DayCard = ({ day }: { day: typeof WEEKDAYS[0] }) => {
    const dayShifts = availability[day.key] || [];
    const allSelected = dayShifts.length === 3;
    
    return (
      <div className={`rounded-[1.6rem] p-4 sm:p-5 lg:p-6 transition-all ${isDarkMode ? "border border-white/10 bg-white/[0.05] shadow-[0_18px_40px_rgba(2,6,23,0.18)] backdrop-blur-xl" : "border border-gray-200 bg-white"}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h4 className={`font-bold text-lg sm:text-xl lg:text-2xl ${isDarkMode ? "text-white" : "text-gray-900"}`}>
              {day.label}
            </h4>
            {dayShifts.length > 0 && (
              <Badge className="px-2 text-xs">
                {dayShifts.length}
              </Badge>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setAvailability(prev => ({
              ...prev,
              [day.key]: allSelected ? [] : ["morning", "evening", "night"]
            }))}
            aria-label={allSelected ? `إلغاء تحديد كل المناوبات ليوم ${day.label}` : `تحديد كل المناوبات ليوم ${day.label}`}
            className="h-8 w-8 p-0"
          >
            {allSelected ? <Check className="h-5 w-5 text-green-500" /> : <Plus className="h-5 w-5" />}
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-2 lg:gap-3">
          {SHIFTS.map((shift) => {
            const isActive = dayShifts.includes(shift.value);
            return (
              <button
                key={shift.value}
            type="button"
            onClick={() => toggleShift(day.key, shift.value)}
                className={`flex min-h-[80px] flex-col items-center justify-center gap-2 rounded-[1.2rem] border p-3 transition-all active:scale-95 lg:min-h-[100px] sm:p-4 lg:p-5 ${
                  isActive
                    ? `${shift.activeBg} ${shift.color} border-white/10 shadow-[0_18px_40px_rgba(2,6,23,0.18)]`
                    : isDarkMode
                      ? `border-white/[0.08] bg-white/[0.03] text-slate-400 hover:bg-white/[0.05]`
                      : "border-gray-200 bg-gray-50 text-gray-500"
                }`}
              >
                <div className="h-5 w-5 lg:h-6 lg:w-6">{shift.icon}</div>
                <span className="text-sm lg:text-base font-medium">{shift.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const ScheduleDayCard = ({ day }: { day: number }) => {
    const dayOfWeek = getDayOfWeek(day, scheduleMonth, scheduleYear);
    const daySchedule = schedule[day];
    const dayName = WEEKDAYS_AR[dayOfWeek] || "";
    
    const getShiftCount = (shift: Shift) => {
      if (!daySchedule) return 0;
      const s = daySchedule[shift];
      return getShiftAssignedCount(s);
    };
    
    return (
      <div className={`min-w-0 overflow-hidden rounded-[1.35rem] p-2 sm:p-3 lg:p-4 ${isDarkMode ? "border border-white/10 bg-white/[0.05] shadow-[0_16px_38px_rgba(2,6,23,0.18)] backdrop-blur-xl" : "border border-gray-200 bg-white"}`}>
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <span className={`block truncate text-sm sm:text-base lg:text-lg font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
              {day}
            </span>
            <span className={`mt-0.5 block truncate text-[10px] sm:text-xs ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}>
              {dayName}
            </span>
          </div>
        </div>
        <div className="space-y-2">
          {SHIFTS.map((shift) => {
            const count = getShiftCount(shift.value);
            const available = getAvailableForDay(day, shift.value).length;
            const target = getShiftCoverageTarget(shift.value, "preferred");
            const shortage = Math.max(0, target - count);
            const coverageLabel =
              count === 0
                ? "بدون تغطية"
                : shortage === 0
                  ? "مكتملة"
                  : shortage === 1
                    ? "ناقص فرد واحد"
                    : `ناقص ${shortage}`;

            return (
              <button
                key={shift.value}
                onClick={() => {
                  setSelectedDay(day);
                  setSelectedShift(shift.value);
                  setFocusedUserId(null);
                  setFocusedTeamId(null);
                  setShowAssignDialog(true);
                }}
                className={`w-full min-w-0 overflow-hidden rounded-[1rem] p-2.5 text-right transition-all hover:scale-[1.01] ${
                  isDarkMode
                    ? count > 0 ? `${shift.activeBg} border border-white/10` : "border border-white/[0.08] bg-white/[0.03]"
                    : count > 0 ? "bg-gray-100" : "bg-gray-50"
                }`}
              >
                <div className="flex min-w-0 items-center justify-between gap-2">
                  <div className={`flex min-w-0 flex-1 items-center gap-1.5 ${shift.color}`}>
                    <span className="shrink-0">{shift.icon}</span>
                    <span className="truncate text-xs sm:text-sm font-medium">{shift.label}</span>
                  </div>
                  <div className="ml-1 flex shrink-0 items-center gap-1.5">
                    <span className={`text-[10px] sm:text-xs ${isDarkMode ? "text-slate-500" : "text-gray-400"}`}>
                      {available} متاح
                    </span>
                    <Badge variant="outline" className={`text-[10px] sm:text-xs px-1.5 py-0.5 ${
                      shortage === 0
                        ? "bg-green-500/20 text-green-400"
                        : shortage === 1
                          ? "bg-amber-500/20 text-amber-300"
                          : count > 0
                            ? "bg-rose-500/20 text-rose-300"
                          : ""
                    }`}>
                      {count}/{target}
                    </Badge>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className={`text-[10px] sm:text-xs ${
                    shortage === 0
                      ? "text-emerald-300"
                      : shortage === 1
                        ? "text-amber-300"
                        : "text-rose-300"
                  }`}>
                    {coverageLabel}
                  </span>
                  {shortage > 0 && count > 0 && (
                    <span className="text-[10px] sm:text-xs text-slate-500">
                      ينقص {shortage}
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const CalendarDayCard = ({ day }: { day: number }) => {
    const dayOfWeek = getDayOfWeek(day, calendarMonth, calendarYear);
    const daySchedule = schedule[day];
    const dayName = WEEKDAYS_AR[dayOfWeek] || "";
    const totalPeople = getScheduleDayCount(day);
    
    const isSearchMatch = calendarSearchTerm.trim().length > 0 && calendarSearchResults.some(r => r.day === day);
    const hasSearchTerm = calendarSearchTerm.trim().length > 0;
    
    return (
      <button
        onClick={() => {
          setCalendarDetailDay(day);
          setShowDayDetailDialog(true);
        }}
        className={`aspect-square flex min-w-0 flex-col overflow-hidden rounded-[1.2rem] p-1.5 text-right transition-all hover:scale-[1.02] sm:p-2 lg:p-3 ${
          isSearchMatch
            ? "bg-red-500/20 border-2 border-red-500 animate-pulse ring-2 ring-red-500/50"
            : hasSearchTerm && !isSearchMatch
              ? isDarkMode
                ? "border border-white/[0.06] bg-white/[0.03] opacity-40"
                : "bg-gray-100 border border-gray-200 opacity-40"
              : totalPeople > 0
                ? isDarkMode
                  ? "border border-emerald-400/20 bg-emerald-400/10"
                  : "bg-green-50 border border-green-200"
                : isDarkMode
                  ? "border border-white/10 bg-white/[0.05] shadow-[0_12px_28px_rgba(2,6,23,0.14)] backdrop-blur-xl"
                  : "bg-white border border-gray-200"
        }`}
      >
        <div className="flex min-w-0 flex-col items-start gap-0.5 flex-1">
          <span className={`block max-w-full truncate text-base sm:text-lg font-bold leading-none ${
            isSearchMatch 
              ? "text-red-400" 
            : hasSearchTerm && !isSearchMatch
                ? isDarkMode ? "text-slate-600" : "text-gray-400"
                : isDarkMode ? "text-white" : "text-gray-900"
          }`}>
            {day}
          </span>
          <span className={`block max-w-full truncate text-[9px] sm:text-[10px] lg:text-xs leading-none ${
            isSearchMatch
              ? "text-red-400/80"
            : hasSearchTerm && !isSearchMatch
                ? isDarkMode ? "text-slate-600" : "text-gray-400"
                : isDarkMode ? "text-slate-500" : "text-gray-400"
          }`}>
            {dayName}
          </span>
        </div>
        <div className="flex items-end justify-between mt-auto">
          {daySchedule && (
            <div className="flex gap-0.5">
              {SHIFTS.map((shift) => {
                const shiftStructure = daySchedule[shift.value];
                const hasPeople = shiftStructure.teams.some(t => t.members.length > 0) || 
                                 shiftStructure.operations.length > 0 || 
                                 shiftStructure.sector;
                const shiftHasMatch = isSearchMatch && calendarSearchResults.some(r => r.day === day && r.shift === shift.value);
                return (
                  <div
                    key={shift.value}
                    className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${
                      shiftHasMatch 
                        ? "bg-red-500 ring-2 ring-red-500/50" 
                        : hasPeople 
                          ? shift.activeBg 
                          : "bg-white/15"
                    }`}
                  />
                );
              })}
            </div>
          )}
          {totalPeople > 0 && (
            <Badge className={`text-[8px] sm:text-[10px] lg:text-xs px-1 sm:px-1.5 ${
              isSearchMatch 
                ? "bg-red-600 text-white" 
                : totalPeople >= MAX_PEOPLE_PER_SHIFT 
                  ? "bg-green-600" 
                  : "bg-amber-600"
            } text-white`}>
              {totalPeople}
            </Badge>
          )}
        </div>
      </button>
    );
  };

  const renderAssignedMemberCard = (member: TeamMember, location: AssignmentLocation) => (
    <div
      draggable={isAdmin}
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "move";
        handleAssignedMemberDragStart(member, location);
      }}
      onDragEnd={clearDragState}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        handleDropOnLocation(location, { swapWith: member });
      }}
      className={`flex min-w-0 items-start justify-between gap-3 rounded-[1rem] border px-3 py-3 ${
        focusedUserId === member.userId
          ? "border-[#ff6f7c] bg-[#ff6f7c]/12 shadow-[0_0_0_1px_rgba(255,111,124,0.35)]"
          : "border-white/[0.08] bg-white/[0.04]"
      } ${isAdmin ? "cursor-grab active:cursor-grabbing" : ""}`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-medium break-words leading-6 text-white">{member.userName}</p>
          {isAdmin && <ArrowRightLeft className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />}
        </div>
        {focusedUserId === member.userId && (
          <p className="mt-1 text-[11px] text-[#ff9aa5]">العنصر المستهدف من التحذير</p>
        )}
        <div className="mt-1">{renderRole(member.userRole, true)}</div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() =>
          removePersonFromShift(
            selectedDay || 1,
            selectedShift || "morning",
            member.userId,
            location.type,
            location.teamId
          )
        }
        aria-label={`إزالة ${member.userName} من المناوبة`}
        className="h-9 w-9 rounded-xl border-none bg-red-500/10 p-0 text-red-300 hover:bg-red-500/15 hover:text-red-200"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );

  const getRequestStatusLabel = (status: ShiftRequestItem["status"]) => {
    switch (status) {
      case "pending":
        return "معلق قديم";
      case "approved":
        return "منفذ";
      case "rejected":
        return "مرفوض";
      case "cancelled":
        return "ملغى";
      default:
        return status;
    }
  };

  const getRequestStatusClass = (status: ShiftRequestItem["status"]) => {
    switch (status) {
      case "pending":
        return "border-amber-400/30 bg-amber-500/10 text-amber-200";
      case "approved":
        return "border-emerald-400/30 bg-emerald-500/10 text-emerald-200";
      case "rejected":
        return "border-rose-400/30 bg-rose-500/10 text-rose-200";
      case "cancelled":
        return "border-slate-400/30 bg-slate-500/10 text-slate-200";
      default:
        return "border-white/10 bg-white/5 text-slate-200";
    }
  };

  const getShiftLabel = (shift: Shift) => SHIFTS.find((entry) => entry.value === shift)?.label ?? shift;

  const getRequestHeadline = (request: ShiftRequestItem) =>
    request.type === "swap"
      ? `تبديل مع ${request.target.personName ?? "الطرف الآخر"}`
      : `انضمام إلى ${request.target.positionLabel}`;

  const executedSwapCount = shiftRequests.filter(
    (request) => request.type === "swap" && request.status === "approved"
  ).length;
  const executedJoinCount = shiftRequests.filter(
    (request) => request.type === "join" && request.status === "approved"
  ).length;
  const legacyPendingCount = shiftRequests.filter((request) => request.status === "pending").length;

  const renderRequestsDialog = () => (
    <Dialog open={showRequestsDialog} onOpenChange={setShowRequestsDialog}>
      <DialogContent className="w-[96vw] max-w-5xl overflow-hidden border-white/10 bg-[linear-gradient(180deg,rgba(21,31,53,0.96),rgba(10,16,30,0.94))] p-0 shadow-[0_36px_90px_rgba(2,6,23,0.48)]">
        <div className="border-b border-white/10 px-6 py-5">
          <DialogHeader className="text-right">
            <DialogTitle className="flex items-center gap-3 text-lg text-white lg:text-xl">
              <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3">
                <ArrowRightLeft className="h-5 w-5 text-[#ff6f7c]" />
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span>مركز مراقبة المناوبات</span>
                  <Badge className="bg-sky-600 text-white">للإدارة فقط</Badge>
                </div>
                <p className="mt-2 text-sm font-normal leading-7 text-slate-300">
                  كل التبديلات والانضمامات تُطبَّق مباشرة على الجدول، ويظهر هنا سجلها الإداري الكامل للتتبّع والمراجعة.
                </p>
              </div>
            </DialogTitle>
          </DialogHeader>
        </div>

        <div className="grid gap-4 px-4 py-4 lg:grid-cols-[0.95fr_1.65fr] lg:px-6 lg:py-6">
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="glass-panel-soft rounded-[1.4rem] p-4">
                <p className="text-xs text-slate-400">العمليات المسجلة</p>
                <p className="mt-2 text-2xl font-bold text-sky-300">{shiftRequests.length}</p>
              </div>
              <div className="glass-panel-soft rounded-[1.4rem] p-4">
                <p className="text-xs text-slate-400">تبديلات منفذة</p>
                <p className="mt-2 text-2xl font-bold text-emerald-300">{executedSwapCount}</p>
              </div>
              <div className="glass-panel-soft rounded-[1.4rem] p-4">
                <p className="text-xs text-slate-400">انضمامات مباشرة</p>
                <p className="mt-2 text-2xl font-bold text-amber-300">{executedJoinCount}</p>
              </div>
            </div>

            <div className="glass-panel-soft rounded-[1.6rem] p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-white">آلية التنفيذ الحالية</h3>
                  <p className="mt-1 text-xs leading-6 text-slate-400">
                    لا يوجد انتظار لموافقات. المستخدم ينفّذ التبديل أو الانضمام مباشرة، والنظام يحدّث الجدول ويرسل الإشعارات فورًا.
                  </p>
                </div>
                <Badge variant="outline">Live</Badge>
              </div>
              <div className="space-y-3 text-sm">
                <div className="rounded-[1.2rem] border border-white/[0.08] bg-white/[0.03] px-4 py-3">
                  <span className="text-slate-300">الطلبات الظاهرة هنا ليست للمستخدمين، بل سجل مراقبة خاص بالإدارة.</span>
                </div>
                <div className="rounded-[1.2rem] border border-white/[0.08] bg-white/[0.03] px-4 py-3">
                  <span className="text-slate-300">الشخص الذي تم التبديل معه تصله إشعار مباشر بمناوبته الجديدة بعد التنفيذ.</span>
                </div>
                {legacyPendingCount > 0 && (
                  <div className="rounded-[1.2rem] border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-amber-100">
                    يوجد {legacyPendingCount} سجل قديم من النظام السابق ما زال حالته معلقة، لكنه لا يتطلب أي إجراء من الواجهة الحالية.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="glass-panel-soft rounded-[1.8rem] p-4 lg:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white">سجل العمليات</h3>
                <p className="mt-1 text-xs leading-6 text-slate-400">كل عملية تبديل أو انضمام تمت في هذه الفترة مع الحالة والوقت والتفاصيل.</p>
              </div>
              <Badge variant="outline">{shiftRequests.length}</Badge>
            </div>

            <ScrollArea className="max-h-[56vh] pr-1">
              <div className="space-y-3">
                {isLoadingShiftRequests ? (
                  <div className="rounded-[1.4rem] border border-white/10 bg-white/[0.04] px-6 py-10 text-center text-slate-400">
                    <RefreshCw className="mx-auto mb-3 h-10 w-10 animate-spin opacity-70" />
                    <p>جارٍ تحميل سجل المناوبات...</p>
                  </div>
                ) : shiftRequests.length === 0 ? (
                  <div className="rounded-[1.4rem] border border-white/10 bg-white/[0.04] px-6 py-10 text-center text-slate-400">
                    <ArrowRightLeft className="mx-auto mb-3 h-12 w-12 opacity-50" />
                    <p>لا توجد عمليات تبديل أو انضمام مسجلة لهذه الفترة بعد.</p>
                  </div>
                ) : (
                  shiftRequests.map((request) => (
                    <div key={request.id} className="rounded-[1.4rem] border border-white/10 bg-white/[0.04] p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-bold text-white">{getRequestHeadline(request)}</p>
                            <Badge variant="outline" className={getRequestStatusClass(request.status)}>
                              {getRequestStatusLabel(request.status)}
                            </Badge>
                          </div>
                          <p className="mt-2 text-xs leading-7 text-slate-300">
                            {request.type === "swap"
                              ? `${request.requesterName} بدّل مناوبته يوم ${request.source?.day} (${getShiftLabel(request.source?.shift || "morning")}) مع ${request.target.personName ?? "الطرف الآخر"} يوم ${request.target.day} (${getShiftLabel(request.target.shift)}).`
                              : `${request.requesterName} انضم إلى ${request.target.positionLabel} يوم ${request.target.day} (${getShiftLabel(request.target.shift)}).`}
                          </p>
                          {request.note && (
                            <p className="mt-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs leading-6 text-slate-300">
                              ملاحظة: {request.note}
                            </p>
                          )}
                          {request.resolutionNote && (
                            <p className="mt-2 text-xs leading-6 text-slate-500">
                              توضيح التنفيذ: {request.resolutionNote}
                            </p>
                          )}
                        </div>
                        <div className="shrink-0 text-left text-[11px] text-slate-500">
                          <p>{new Intl.DateTimeFormat("ar", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(request.createdAt))}</p>
                          {request.respondedAt && (
                            <p className="mt-1">تم التنفيذ عبر {request.respondedByName ?? "النظام"}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        <div className="border-t border-white/10 px-4 py-4">
          <Button onClick={() => setShowRequestsDialog(false)} className="w-full">
            إغلاق
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  const renderNotificationsPopup = () => (
    <Dialog open={showNotificationsPopup} onOpenChange={setShowNotificationsPopup}>
      <DialogContent className="w-[95vw] max-w-2xl overflow-hidden border-white/10 bg-[linear-gradient(180deg,rgba(21,31,53,0.96),rgba(10,16,30,0.94))] p-0 shadow-[0_32px_80px_rgba(2,6,23,0.45)]">
        <div className="border-b border-white/10 px-6 py-5">
          <DialogHeader className="text-right">
            <DialogTitle className="flex items-center gap-3 text-lg text-white lg:text-xl">
              <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3">
                <Bell className="h-5 w-5 text-[#ff6f7c]" />
              </div>
              <div className="flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span>الإشعارات</span>
                  {unreadEvents > 0 && <Badge>{unreadEvents} جديد</Badge>}
                </div>
                <p className="mt-2 text-sm font-normal leading-7 text-slate-300">
                  متابعة آخر التنبيهات والإجراءات التي جرت داخل النظام.
                </p>
              </div>
            </DialogTitle>
          </DialogHeader>
        </div>

        <ScrollArea className="max-h-[60vh] px-4 py-4 lg:max-h-[70vh]">
          <div className="space-y-3 pb-1">
            {displayEvents.length === 0 ? (
              <div className="glass-panel-soft rounded-[1.6rem] px-6 py-10 text-center text-slate-400">
                <Bell className="mx-auto mb-3 h-12 w-12 opacity-50" />
                <p>لا توجد إشعارات حاليًا</p>
              </div>
            ) : (
              displayEvents.map((event) => (
                <button
                  key={event.id}
                  type="button"
                  onClick={() => markEventAsRead(event)}
                  className={`w-full rounded-[1.4rem] border p-4 text-right transition-all hover:-translate-y-0.5 ${getEventBg(event.type)} ${!event.read ? "shadow-[0_18px_42px_rgba(255,95,109,0.14)]" : ""}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`rounded-2xl border p-3 ${getEventBg(event.type)}`}>
                      {getEventIcon(event.type)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white lg:text-base">{event.title}</h4>
                          {!event.read && <span className="h-2 w-2 rounded-full bg-[#ff6f7c]" />}
                        </div>
                        <div className="flex shrink-0 items-center gap-1 text-[11px] text-slate-400">
                          <Clock className="h-3.5 w-3.5" />
                          {event.time}
                        </div>
                      </div>
                      <p className="text-xs leading-7 text-slate-300 lg:text-sm">{event.message}</p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </ScrollArea>

        <div className="border-t border-white/10 px-4 py-4">
          <div className="flex gap-2">
            <Button variant="outline" onClick={markAllEventsAsRead} className="flex-1">
              تحديد الكل كمقروء
            </Button>
            <Button onClick={() => setShowNotificationsPopup(false)} className="flex-1">
              إغلاق
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  const renderEventsPopup = () => (
    <Dialog open={showEventsPopup} onOpenChange={setShowEventsPopup}>
      <DialogContent className="w-[96vw] max-w-5xl overflow-hidden border-white/10 bg-[linear-gradient(180deg,rgba(21,31,53,0.96),rgba(10,16,30,0.94))] p-0 shadow-[0_36px_90px_rgba(2,6,23,0.48)]">
        <div className="border-b border-white/10 px-6 py-5">
          <DialogHeader className="text-right">
            <DialogTitle className="flex items-center gap-3 text-lg text-white lg:text-xl">
              <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3">
                <CalendarDays className="h-5 w-5 text-[#ff6f7c]" />
              </div>
              <div className="flex-1">
                <span>مركز الأحداث التشغيلية</span>
                <p className="mt-2 text-sm font-normal leading-7 text-slate-300">
                  نظرة سريعة على حالة النظام وآخر الأنشطة التي تمت على التفرغات والجدول.
                </p>
              </div>
            </DialogTitle>
          </DialogHeader>
        </div>

        <div className="grid gap-4 px-4 py-4 lg:grid-cols-[1.1fr_1.5fr] lg:px-6 lg:py-6">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {eventSummaryCards.map((card) => (
                <div key={card.label} className="glass-panel-soft rounded-[1.4rem] p-4">
                  <p className="text-xs text-slate-400">{card.label}</p>
                  <p className={`mt-2 text-2xl font-bold ${card.tone}`}>{card.value}</p>
                </div>
              ))}
            </div>

            <div className="glass-panel-soft rounded-[1.6rem] p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-white">مؤشرات سريعة</h3>
                  <p className="mt-1 text-xs leading-6 text-slate-400">هذه القراءة تتحدث مباشرة من بيانات التطبيق الحالية.</p>
                </div>
                <Badge variant="outline">Live</Badge>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3">
                  <span className="text-slate-300">المناوبات المغطاة</span>
                  <span className="font-bold text-emerald-300">{generatedScheduleSummary.staffedShifts}</span>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3">
                  <span className="text-slate-300">تكليفات القطاع</span>
                  <span className="font-bold text-amber-300">{generatedScheduleSummary.sectorAssignments}</span>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3">
                  <span className="text-slate-300">مقاعد العمليات</span>
                  <span className="font-bold text-sky-300">{generatedScheduleSummary.operationsAssignments}</span>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3">
                  <span className="text-slate-300">سجل التبديلات</span>
                  <span className="font-bold text-rose-300">{shiftRequests.length}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="glass-panel-soft rounded-[1.8rem] p-4 lg:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-white">آخر الأحداث</h3>
                <p className="mt-1 text-xs leading-6 text-slate-400">يتم تحديث هذا السجل عند تنفيذ العمليات المهمة داخل النظام.</p>
              </div>
              {unreadEvents > 0 && <Badge>{unreadEvents} غير مقروء</Badge>}
            </div>

            <ScrollArea className="max-h-[52vh] pr-1">
              <div className="space-y-3">
                {displayEvents.map((event, index) => (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => markEventAsRead(event)}
                    className={`relative w-full rounded-[1.4rem] border p-4 text-right transition-all hover:-translate-y-0.5 ${getEventBg(event.type)}`}
                  >
                    <div className="absolute right-0 top-4 bottom-4 w-1 rounded-full bg-white/12" />
                    <div className="flex items-start gap-3">
                      <div className={`rounded-2xl border p-3 ${getEventBg(event.type)}`}>
                        {getEventIcon(event.type)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-slate-400">#{String(index + 1).padStart(2, "0")}</span>
                            <h4 className="text-sm font-bold text-white lg:text-base">{event.title}</h4>
                            {!event.read && <span className="h-2 w-2 rounded-full bg-[#ff6f7c]" />}
                          </div>
                          <div className="flex shrink-0 items-center gap-1 text-[11px] text-slate-400">
                            <Clock className="h-3.5 w-3.5" />
                            {event.time}
                          </div>
                        </div>
                        <p className="text-xs leading-7 text-slate-300 lg:text-sm">{event.message}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>

        <div className="border-t border-white/10 px-4 py-4">
          <div className="flex gap-2">
            <Button variant="outline" onClick={markAllEventsAsRead} className="flex-1">
              تعليم الكل كمقروء
            </Button>
            <Button onClick={() => setShowEventsPopup(false)} className="flex-1">
              إغلاق
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );

  const renderSwapDialog = () => {
    if (!swapData) return null;

    const selectedTargetName =
      selectedSwapTarget && !("type" in selectedSwapTarget)
        ? selectedSwapTarget.personName
        : selectedSwapTarget && "type" in selectedSwapTarget
          ? selectedSwapTarget.label
          : null;

    return (
      <>
        <Dialog open={showSwapDialog} onOpenChange={setShowSwapDialog}>
          <DialogContent className="w-[96vw] max-w-5xl max-h-[92vh] overflow-hidden border-white/10 bg-[linear-gradient(180deg,rgba(21,31,53,0.96),rgba(10,16,30,0.94))]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-lg text-white lg:text-xl">
                <ArrowRightLeft className="h-5 w-5 lg:h-6 lg:w-6 text-red-500" />
                إدارة المناوبة: {swapData.personName}
              </DialogTitle>
            </DialogHeader>

            <div className="mb-4 rounded-[1.5rem] border border-white/10 bg-white/[0.05] p-3 backdrop-blur-xl lg:p-4">
              <p className="mb-3 text-sm font-bold text-slate-200">اختر نوع العملية:</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setSwapMode("swap")}
                  className={`p-3 rounded-xl text-center transition-all ${
                    swapMode === "swap"
                      ? "bg-red-600 text-white ring-2 ring-red-400"
                      : isDarkMode
                        ? "border border-white/10 bg-white/[0.05] text-zinc-300 hover:bg-white/[0.08]"
                        : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
                  }`}
                >
                  <ArrowRightLeft className="h-5 w-5 mx-auto mb-1" />
                  <span className="text-sm font-bold">تبديل فوري</span>
                  <p className="text-[10px] opacity-80 mt-1">يطبَّق مباشرة ويصل إشعار للطرف الآخر</p>
                </button>
                <button
                  onClick={() => setSwapMode("join")}
                  className={`p-3 rounded-xl text-center transition-all ${
                    swapMode === "join"
                      ? "bg-green-600 text-white ring-2 ring-green-400"
                      : isDarkMode
                        ? "border border-white/10 bg-white/[0.05] text-zinc-300 hover:bg-white/[0.08]"
                        : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
                  }`}
                >
                  <Plus className="h-5 w-5 mx-auto mb-1" />
                  <span className="text-sm font-bold">انضمام فوري</span>
                  <p className="text-[10px] opacity-80 mt-1">يثبَّت مباشرة إذا كانت الشروط متحققة</p>
                </button>
              </div>
            </div>

            <div className="mb-4 space-y-3">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <Input
                  value={swapSearchTerm}
                  onChange={(event) => setSwapSearchTerm(event.target.value)}
                  placeholder={swapMode === "swap" ? "ابحث باسم الشخص أو موقعه..." : "ابحث باسم الخانة..."}
                  className={`${searchInputClass} pr-10`}
                />
              </div>
              <Textarea
                value={shiftRequestNote}
                onChange={(event) => setShiftRequestNote(event.target.value)}
                placeholder="ملاحظة اختيارية توضح سبب الطلب أو أي تنسيق لازم..."
                className={searchInputClass}
              />
            </div>

            <ScrollArea className="max-h-[42vh]">
              {swapMode === "join" ? (
                <div className="space-y-3 p-2">
                  <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
                    الأماكن الشاغرة المتاحة لك داخل هذه المناوبة:
                  </p>
                  {availableJoinTargets.length === 0 ? (
                    <div className="rounded-[1.4rem] border border-white/10 bg-white/[0.04] px-6 py-10 text-center text-slate-400">
                      <Plus className="mx-auto mb-3 h-10 w-10 opacity-50" />
                      <p>لا توجد خانات متاحة ومناسبة لك الآن.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {availableJoinTargets.map((target, idx) => (
                        <button
                          key={`${target.type}-${target.teamId ?? "none"}-${target.slotKey ?? idx}`}
                          onClick={() => setSelectedSwapTarget(target)}
                          className={`min-w-0 rounded-xl border p-3 text-right transition-all ${
                            selectedSwapTarget && "type" in selectedSwapTarget && selectedSwapTarget.label === target.label
                              ? "border-emerald-400/40 bg-emerald-500/10"
                              : isDarkMode
                                ? "border border-white/10 bg-white/[0.05] hover:bg-white/[0.08]"
                                : "bg-white hover:bg-gray-50 border border-gray-200"
                          }`}
                        >
                          <p className={`font-medium text-sm break-words ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                            {target.label}
                          </p>
                          <p className={`mt-2 text-xs break-words ${isDarkMode ? "text-zinc-400" : "text-gray-500"}`}>
                            يوم {swapData.day} - {WEEKDAYS_AR[getDayOfWeek(swapData.day, calendarMonth, calendarYear)]}
                          </p>
                          <p className={`text-xs break-words ${isDarkMode ? "text-zinc-500" : "text-gray-400"}`}>
                            {getShiftLabel(swapData.shift)}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3 p-2">
                  <p className={`text-sm ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>
                    الأشخاص المتوافقون مع عملية التبديل:
                  </p>
                  {availableSwapTargets.length === 0 ? (
                    <div className="rounded-[1.4rem] border border-white/10 bg-white/[0.04] px-6 py-10 text-center text-slate-400">
                      <ArrowRightLeft className="mx-auto mb-3 h-10 w-10 opacity-50" />
                      <p>لا توجد خيارات تبديل مناسبة الآن.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                      {availableSwapTargets.map((person) => (
                        <button
                          key={`${person.personId}-${person.day}-${person.shift}-${person.position}`}
                          onClick={() => setSelectedSwapTarget(person)}
                          className={`min-w-0 p-3 rounded-xl text-right transition-all ${
                            selectedSwapTarget &&
                            !("type" in selectedSwapTarget) &&
                            selectedSwapTarget.personId === person.personId &&
                            selectedSwapTarget.day === person.day &&
                            selectedSwapTarget.shift === person.shift
                              ? "border-rose-400/40 bg-rose-500/10"
                              : isDarkMode
                                ? "border border-white/10 bg-white/[0.05] hover:bg-white/[0.08]"
                                : "bg-white hover:bg-gray-50 border border-gray-200"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <p className={`font-medium text-sm break-words ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                                {person.personName}
                              </p>
                              <p className={`text-xs break-words ${isDarkMode ? "text-zinc-400" : "text-gray-500"}`}>
                                يوم {person.day} - {WEEKDAYS_AR[getDayOfWeek(person.day, calendarMonth, calendarYear)]}
                              </p>
                              <p className={`text-xs break-words ${isDarkMode ? "text-zinc-500" : "text-gray-400"}`}>
                                {person.position} • {getShiftLabel(person.shift)}
                              </p>
                            </div>
                            {renderRole(person.personRole, true)}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </ScrollArea>

            <div className="mt-4 rounded-[1.4rem] border border-white/10 bg-white/[0.04] p-4">
              <p className="text-sm font-medium text-white">النتيجة المتوقعة</p>
              <p className="mt-2 text-xs leading-7 text-slate-300">
                {swapMode === "swap"
                  ? selectedTargetName
                    ? `سيتم تبديل مناوبة ${swapData.personName} مع ${selectedTargetName} مباشرة، وسيُحدَّث الجدول فورًا مع إرسال إشعار للطرف الآخر.`
                    : "اختر الطرف الآخر أولًا ليتم تجهيز تبديل مباشر وقابل للتتبع."
                  : selectedTargetName
                    ? `إذا بقيت الخانة متاحة وكانت شروط الانضمام متحققة، سيتم تثبيت انضمامك إلى ${selectedTargetName} مباشرة مع إشعار ذكي وسجل محفوظ.`
                    : "اختر الخانة الشاغرة أولًا لتجهيز الانضمام المباشر."}
              </p>
            </div>

            <div className="flex gap-2 pt-3">
              <Button variant="outline" onClick={() => setShowSwapDialog(false)} className="flex-1">
                إلغاء
              </Button>
              <Button onClick={() => setShowSwapConfirm(true)} disabled={!selectedSwapTarget} className="flex-1">
                متابعة
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showSwapConfirm} onOpenChange={setShowSwapConfirm}>
          <DialogContent className="max-w-md border-white/10 bg-[linear-gradient(180deg,rgba(21,31,53,0.96),rgba(10,16,30,0.94))]">
            <DialogHeader>
              <DialogTitle className="text-lg text-white">
                تأكيد {swapMode === "swap" ? "التبديل الفوري" : "الانضمام"}
              </DialogTitle>
            </DialogHeader>
            <div className="rounded-[1.4rem] border border-white/10 bg-white/[0.05] p-4">
              {swapMode === "swap" ? (
                <p className={`text-sm ${isDarkMode ? "text-slate-200" : "text-gray-600"}`}>
                  سيتم تبديل مناوبة <strong>{swapData.personName}</strong> مع <strong>{selectedTargetName}</strong> الآن، وسيصل إشعار مباشر للطرف الآخر بعد تحديث الجدول.
                </p>
              ) : (
                <p className={`text-sm ${isDarkMode ? "text-slate-200" : "text-gray-600"}`}>
                  سيتم التحقق من الخانة المختارة، وإذا بقيت متاحة ستتم إضافة <strong>{swapData.personName}</strong> مباشرة إلى <strong>{selectedTargetName}</strong>.
                </p>
              )}
            </div>
            <div className="flex gap-2 pt-3">
              <Button variant="outline" onClick={() => setShowSwapConfirm(false)} className="flex-1">
                إلغاء
              </Button>
              <Button onClick={() => void submitShiftRequest()} disabled={isSubmittingShiftRequest} className="flex-1">
                {isSubmittingShiftRequest ? (
                  <>
                    <RefreshCw className="ml-2 h-4 w-4 animate-spin" />
                    جاري التنفيذ...
                  </>
                ) : (
                  "تنفيذ الآن"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </>
    );
  };

  // Main render
  const daysInScheduleMonth = getDaysInMonth(scheduleMonth, scheduleYear);
  const daysInCalendarMonth = getDaysInMonth(calendarMonth, calendarYear);
  const isDataEmpty = !isLoadingRecords && records.length === 0;
  const selectedShiftLabel = SHIFTS.find((shift) => shift.value === selectedShift)?.label ?? "";
  const selectedDayName = selectedDay ? WEEKDAYS_AR[getDayOfWeek(selectedDay, scheduleMonth, scheduleYear)] : "";
  const selectedShiftStructure = selectedDay && selectedShift
    ? getShiftStructure(selectedDay, selectedShift)
    : null;
  const selectedShiftAvailablePeople = selectedDay && selectedShift
    ? getAvailableForDay(selectedDay, selectedShift)
    : [];
  const selectedShiftCapacity = selectedShift ? getShiftCapacity(selectedShift) : null;
  const selectedShiftPreferredTarget = selectedShift ? getShiftCoverageTarget(selectedShift, "preferred") : MAX_PEOPLE_PER_SHIFT;
  const selectedShiftHardTarget = selectedShift ? getShiftCoverageTarget(selectedShift, "hard") : MAX_PEOPLE_PER_SHIFT;
  const selectedAssignedCount = selectedShiftStructure
    ? getShiftAssignedCount(selectedShiftStructure)
    : 0;
  const selectedShiftShortage = Math.max(0, selectedShiftPreferredTarget - selectedAssignedCount);
  const selectedShiftOverloadedMembers = selectedShiftStructure
    ? getShiftAssignedMembers(selectedShiftStructure).filter(
        (member) => (scheduleDiagnostics.assignmentMap.get(member.userId)?.count ?? 0) > MAX_SHIFTS_PER_PERSON
      )
    : [];
  const selectedShiftAvailableEntries =
    selectedDay && selectedShift
      ? selectedShiftAvailablePeople
          .filter((person) => assignRoleFilter === "all" || person.userRole === assignRoleFilter)
          .map((person) => {
            const alreadyAssigned = isPersonAssignedToShift(selectedDay, selectedShift, person.userId);
            const assignedElsewhere = getAssignedShiftForDayFromSchedule(
              schedule,
              selectedDay,
              person.userId,
              selectedShift
            );
            const targets =
              alreadyAssigned || assignedElsewhere
                ? []
                : getAvailableTargets(selectedDay, selectedShift, person);
            const monthlyCount = scheduleDiagnostics.assignmentMap.get(person.userId)?.count ?? 0;

            return {
              person,
              alreadyAssigned,
              assignedElsewhere,
              targets,
              monthlyCount,
            };
          })
          .sort((a, b) => {
            const priorityDiff =
              getAssignmentCandidatePriority({
                alreadyAssigned: a.alreadyAssigned,
                assignedElsewhere: a.assignedElsewhere,
                hasTargets: a.targets.length > 0,
              }) -
              getAssignmentCandidatePriority({
                alreadyAssigned: b.alreadyAssigned,
                assignedElsewhere: b.assignedElsewhere,
                hasTargets: b.targets.length > 0,
              });

            if (priorityDiff !== 0) return priorityDiff;

            const roleDiff = getRoleLevel(b.person.userRole) - getRoleLevel(a.person.userRole);
            if (roleDiff !== 0) return roleDiff;

            if (a.monthlyCount !== b.monthlyCount) return a.monthlyCount - b.monthlyCount;

            return a.person.userName.localeCompare(b.person.userName, "ar");
          })
      : [];
  const manualAssignmentCandidates =
    selectedDay && selectedShift && manualAssignSearchTerm.trim().length > 0
      ? managedUsers
          .filter((person) => {
            if (!person.isActive) return false;
            if (assignRoleFilter !== "all" && person.role !== assignRoleFilter) return false;

            const term = manualAssignSearchTerm.trim().toLowerCase();
            return (
              person.name.toLowerCase().includes(term) ||
              person.email.toLowerCase().includes(term)
            );
          })
          .map((person) => {
            const availabilityRecord = buildAvailabilityDataFromManagedUser(person);
            const alreadyInShift = isPersonAssignedToShift(selectedDay, selectedShift, person.id);
            const assignedElsewhere = getAssignedShiftForDayFromSchedule(schedule, selectedDay, person.id, selectedShift);
            const isAvailable = selectedShiftAvailablePeople.some((item) => item.userId === person.id);

            return {
              person,
              availabilityRecord,
              alreadyInShift,
              assignedElsewhere,
              isAvailable,
              targets:
                alreadyInShift || assignedElsewhere
                  ? []
                  : getAvailableTargets(selectedDay, selectedShift, availabilityRecord),
              monthlyCount: scheduleDiagnostics.assignmentMap.get(person.id)?.count ?? 0,
            };
          })
          .sort((a, b) => {
            const priorityDiff =
              getAssignmentCandidatePriority({
                alreadyAssigned: a.alreadyInShift,
                assignedElsewhere: a.assignedElsewhere,
                hasTargets: a.targets.length > 0,
              }) -
              getAssignmentCandidatePriority({
                alreadyAssigned: b.alreadyInShift,
                assignedElsewhere: b.assignedElsewhere,
                hasTargets: b.targets.length > 0,
              });

            if (priorityDiff !== 0) return priorityDiff;

            const roleDiff = getRoleLevel(b.person.role) - getRoleLevel(a.person.role);
            if (roleDiff !== 0) return roleDiff;

            if (a.monthlyCount !== b.monthlyCount) return a.monthlyCount - b.monthlyCount;

            return a.person.name.localeCompare(b.person.name, "ar");
          })
          .slice(0, 8)
      : [];
  const surfaceClass = isDarkMode
    ? "bg-[rgba(17,26,48,0.72)] border-white/10 shadow-[0_24px_70px_rgba(2,6,23,0.35)] backdrop-blur-2xl"
    : "bg-white/90 border-slate-200 shadow-[0_20px_50px_rgba(148,163,184,0.16)]";
  const softSurfaceClass = isDarkMode
    ? "bg-white/[0.05] border-white/10 backdrop-blur-xl"
    : "bg-white/90 border-slate-200";
  const topBarClass = isDarkMode
    ? "border-white/10 bg-[rgba(12,20,38,0.75)] backdrop-blur-2xl"
    : "border-slate-200 bg-white/85 backdrop-blur-xl";
  const selectTriggerClass = isDarkMode
    ? "bg-white/[0.05] border-white/10 text-white"
    : "bg-white border-gray-200";
  const searchInputClass = isDarkMode
    ? "bg-white/[0.05] border-white/10 text-white placeholder:text-slate-500"
    : "bg-white border-gray-200";
  const mutedTextClass = isDarkMode ? "text-slate-400" : "text-gray-500";
  const assignHeaderClass = "border-white/10 bg-[rgba(12,20,38,0.82)] backdrop-blur-2xl";
  const assignPanelClass = "bg-[rgba(17,26,48,0.78)] border-white/10 shadow-[0_24px_70px_rgba(2,6,23,0.35)] backdrop-blur-2xl";

  return (
    <div className={`app-stage relative min-h-screen overflow-hidden ${isDarkMode ? "bg-transparent text-white" : "bg-gray-50 text-gray-900"}`}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.06),transparent_24%)]" />
      <div className="absolute inset-0 opacity-20 [background-image:linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] [background-size:120px_120px]" />

      {/* Header */}
      <header className={`sticky top-0 z-50 border-b ${topBarClass}`}>
        <div className="container mx-auto px-3 sm:px-4 py-2 sm:py-3">
          <div className="flex items-center justify-between gap-2">
            {/* Logo */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="rounded-[1.2rem] bg-[linear-gradient(135deg,#ff6d78_0%,#ff506a_100%)] p-2.5 shadow-[0_18px_42px_rgba(255,95,109,0.28)]">
                <Ambulance className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold text-glow sm:text-xl">مركز إسعاف 650</h1>
                <p className={`text-[10px] sm:text-xs ${mutedTextClass}`}>نظام إدارة المناوبات</p>
              </div>
            </div>

            {/* User Info */}
            <div className="flex items-center gap-2 sm:gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowEventsPopup(true)}
                className="hidden sm:inline-flex"
              >
                <CalendarDays className="h-4 w-4" />
                الأحداث
              </Button>

              {isAdmin && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowRequestsDialog(true)}
                  className="relative border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
                >
                  <ArrowRightLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">مراقبة المناوبات</span>
                  {adminShiftLogCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-sky-500 px-1 text-[10px] text-white">
                      {adminShiftLogCount}
                    </span>
                  )}
                </Button>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowNotificationsPopup(true)}
                className="relative border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
              >
                <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
                {unreadEvents > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
                    {unreadEvents}
                  </span>
                )}
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowEventsPopup(true)}
                className="sm:hidden border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
              >
                <CalendarDays className="h-4 w-4 sm:h-5 sm:w-5" />
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
              >
                {isDarkMode ? <SunIcon className="h-4 w-4 sm:h-5 sm:w-5" /> : <MoonIcon className="h-4 w-4 sm:h-5 sm:w-5" />}
              </Button>

              <div className={`flex items-center gap-2 rounded-2xl border px-2 py-1.5 sm:px-3 ${softSurfaceClass}`}>
                <div className="text-right hidden sm:block">
                  <p className="text-xs sm:text-sm font-medium">{user?.name}</p>
                  <div className="mt-1 flex items-center justify-end gap-2">
                    <p className={`text-[10px] sm:text-xs ${mutedTextClass}`}>{ROLES.find(r => r.value === user?.role)?.label}</p>
                    {user?.isAdmin && (
                      <Badge variant="outline" className="border-red-400/30 bg-red-500/10 text-[10px] text-red-200">
                        Admin
                      </Badge>
                    )}
                  </div>
                </div>
                {renderRole(user?.role || "medic", true)}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  aria-label="تسجيل الخروج"
                  className="h-9 w-9 rounded-xl border-none bg-transparent p-0 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 container mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
          <TabsList className={`grid w-full ${isAdmin ? "grid-cols-4" : "grid-cols-3"} p-1.5 ${softSurfaceClass}`}>
            <TabsTrigger value="form" className="text-xs sm:text-sm">
              <CalendarDays className="h-4 w-4 sm:ml-2" />
              <span className="hidden sm:inline">التفرغات</span>
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="schedule" className="text-xs sm:text-sm">
                <RefreshCw className="h-4 w-4 sm:ml-2" />
                <span className="hidden sm:inline">إنشاء الجدول</span>
              </TabsTrigger>
            )}
            <TabsTrigger value="calendar" className="text-xs sm:text-sm">
              <Calendar className="h-4 w-4 sm:ml-2" />
              <span className="hidden sm:inline">التقويم</span>
            </TabsTrigger>
            <TabsTrigger value="dashboard" className="text-xs sm:text-sm">
              <LayoutDashboard className="h-4 w-4 sm:ml-2" />
              <span className="hidden sm:inline">الإحصائيات</span>
            </TabsTrigger>
          </TabsList>

          {/* Form Tab */}
          <TabsContent value="form">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className={surfaceClass}>
                <CardHeader>
                  <CardTitle className="text-lg sm:text-xl">نموذج التفرغات الشهرية</CardTitle>
                  <CardDescription>حدد أوقات تفرغك خلال الأسبوع. يتم حفظ التغييرات وعرضها مباشرة داخل النظام.</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:max-w-2xl">
                      <div className="min-w-0">
                        <label className={`mb-2 block text-sm font-medium ${isDarkMode ? "text-slate-200" : "text-gray-700"}`}>الشهر</label>
                        <Select value={selectedMonth} onValueChange={(value) => setActivePeriod(parseInt(value, 10), parseInt(selectedYear, 10))}>
                          <SelectTrigger className={`w-full ${selectTriggerClass}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {MONTHS.map(month => (
                              <SelectItem key={month.value} value={month.value.toString()}>{month.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="min-w-0">
                        <label className={`mb-2 block text-sm font-medium ${isDarkMode ? "text-slate-200" : "text-gray-700"}`}>السنة</label>
                        <Select value={selectedYear} onValueChange={(value) => setActivePeriod(parseInt(selectedMonth, 10), parseInt(value, 10))}>
                          <SelectTrigger className={`w-full ${selectTriggerClass}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {years.map(year => (
                              <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-4">
                      {WEEKDAYS.map(day => (
                        <DayCard key={day.key} day={day} />
                      ))}
                    </div>

                    <div>
                      <label className={`mb-2 block text-sm font-medium ${isDarkMode ? "text-slate-200" : "text-gray-700"}`}>ملاحظات</label>
                      <Textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="أي ملاحظات أو تعليقات..."
                        className={searchInputClass}
                      />
                    </div>

                    <AnimatePresence initial={false}>
                      {submissionFeedback && (
                        <motion.div
                          key={submissionFeedback.status}
                          initial={{ opacity: 0, y: -8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={{ duration: 0.2 }}
                          aria-live="polite"
                          className={`rounded-2xl border px-4 py-3 ${
                            submissionFeedback.status === "success"
                              ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"
                              : submissionFeedback.status === "error"
                                ? "border-rose-400/30 bg-rose-500/10 text-rose-100"
                                : "border-sky-400/30 bg-sky-500/10 text-sky-100"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            {submissionFeedback.status === "success" ? (
                              <CheckCircle className="mt-0.5 h-5 w-5 shrink-0" />
                            ) : submissionFeedback.status === "error" ? (
                              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                            ) : (
                              <RefreshCw className="mt-0.5 h-5 w-5 shrink-0 animate-spin" />
                            )}
                            <div className="min-w-0">
                              <p className="font-semibold">{submissionFeedback.title}</p>
                              <p className="mt-1 text-sm leading-6 opacity-90">
                                {submissionFeedback.message}
                              </p>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="flex items-center justify-between gap-4">
                      <Badge className="bg-red-600 text-white">
                        إجمالي الفترات: {totalShifts}
                      </Badge>
                      <Button type="submit" disabled={isSubmitting} className="bg-red-600 hover:bg-red-700">
                        {isSubmitting ? (
                          <>
                            <RefreshCw className="h-4 w-4 ml-2 animate-spin" />
                            جاري الحفظ...
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4 ml-2" />
                            إرسال التفرغات
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>

          {/* Schedule Tab */}
          {isAdmin && (
          <TabsContent value="schedule">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              <Card className={surfaceClass}>
                <CardContent className="p-4 sm:p-5">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="font-semibold">إنشاء جدول المناوبات</p>
                      <p className={`text-sm ${mutedTextClass}`}>
                        هذه الصفحة تبني الجدول من تفرغات الفترة المختارة نفسها، لذلك تم توحيد الشهر والسنة بين التفرغات والجدول والتقويم.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <Badge variant="outline">{MONTHS.find((m) => m.value === scheduleMonth)?.label} {scheduleYear}</Badge>
                      <Badge className="bg-red-600 text-white">التفرغات المتاحة: {records.length}</Badge>
                      <Badge variant="outline">قادة: {availableRoleCounts.leader}</Badge>
                      <Badge variant="outline">كشافون: {availableRoleCounts.scout}</Badge>
                      <Badge variant="outline">مسعفون: {availableRoleCounts.medic}</Badge>
                      <Badge variant="outline">قادة قطاع: {availableRoleCounts.sectorLead}</Badge>
                      <Badge variant="outline">عمليات: {availableRoleCounts.operations}</Badge>
                      <Badge className="bg-blue-600 text-white">فرق متوازنة ممكنة: {possibleBalancedTeams}</Badge>
                      <Badge className={Object.keys(schedule).length > 0 ? "bg-green-600 text-white" : "bg-zinc-600 text-white"}>
                        الأيام المولدة: {Object.keys(schedule).length}
                      </Badge>
                      {isLoadingSchedule && <Badge variant="outline">جاري تحميل الجدول...</Badge>}
                      {isSavingSchedule && <Badge className="bg-sky-600 text-white">جاري حفظ الجدول</Badge>}
                      {Object.keys(schedule).length > 0 && (
                        <>
                          <Badge className="bg-emerald-600 text-white">فرق مستوفية: {generatedScheduleSummary.completeTeams}</Badge>
                          <Badge variant="outline">مناوبات مغطاة: {generatedScheduleSummary.staffedShifts}</Badge>
                          <Badge className={generatedScheduleSummary.singleMissingShifts > 0 ? "bg-amber-600 text-white" : "bg-emerald-600 text-white"}>
                            ناقص فرد واحد: {generatedScheduleSummary.singleMissingShifts}
                          </Badge>
                          <Badge className={generatedScheduleSummary.understaffedShifts > 0 ? "bg-rose-600 text-white" : "bg-emerald-600 text-white"}>
                            مناوبات ناقصة: {generatedScheduleSummary.understaffedShifts}
                          </Badge>
                          <Badge className={generatedScheduleSummary.underMinimumTeams > 0 ? "bg-amber-600 text-white" : "bg-emerald-600 text-white"}>
                            فرق أقل من 3: {generatedScheduleSummary.underMinimumTeams}
                          </Badge>
                          <Badge className={generatedScheduleSummary.overloadedUsers > 0 ? "bg-amber-600 text-white" : "bg-emerald-600 text-white"}>
                            تجاوز 26: {generatedScheduleSummary.overloadedUsers}
                          </Badge>
                        </>
                      )}
                    </div>
                  </div>
                  <div className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${isDarkMode ? "border-white/10 bg-white/[0.04] text-slate-300" : "border-gray-200 bg-gray-50 text-gray-600"}`}>
                    التوليد التلقائي يعطي الأولوية للمناوبات الأقل توفرًا أولًا، ويمنع وضع الشخص نفسه في أكثر من مناوبة في اليوم نفسه، ثم يبني الفرق بصيغة:
                    <span className="mx-1 font-semibold text-red-500">قائد + كشاف + مسعف + مسعف</span>
                    ثم يفضّل رتبة <span className="mx-1 font-semibold text-rose-300">قائد قطاع</span> لخانة القطاع ورتبة <span className="mx-1 font-semibold text-violet-300">عمليات</span> لقسم العمليات.
                    <span className="mx-1">الصباح: 4 فرق و4 عمليات. المساء: 3 فرق و3 عمليات مع رابع اختياري. الليل: فريقان فقط، والعمليات فيه 2 مستهدفة مع إمكانية رفعها يدويًا حتى 4 عند الحاجة.</span>
                    <span className="mx-1">كل فريق إسعاف صالح تشغيليًا يجب أن يضم على الأقل: قائد + كشاف + مسعف.</span>
                    <span className="mx-1">الحد الأعلى الموصى به لكل فرد هو {MAX_SHIFTS_PER_PERSON} مناوبة شهريًا، وتظهر التحذيرات عند تجاوزه أو عند وجود نقص في المناوبة.</span>
                    <span className="mx-1">كل تعديل على الجدول والتقويم يتم حفظه واسترجاعه تلقائيًا داخل النظام.</span>
                  </div>
                </CardContent>
              </Card>

              <div className="flex flex-wrap gap-2">
                <Select value={scheduleMonth.toString()} onValueChange={(v) => setActivePeriod(parseInt(v, 10), scheduleYear)}>
                  <SelectTrigger className={`w-32 ${selectTriggerClass}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map(m => <SelectItem key={m.value} value={m.value.toString()}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={scheduleYear.toString()} onValueChange={(v) => setActivePeriod(scheduleMonth, parseInt(v, 10))}>
                  <SelectTrigger className={`w-28 ${selectTriggerClass}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button onClick={autoFillSchedule} disabled={isLoadingRecords || isDataEmpty} className="bg-red-600 hover:bg-red-700 disabled:opacity-60">
                  <RefreshCw className="h-4 w-4 ml-2" />
                  إنشاء تلقائي
                </Button>
                <Button onClick={() => void publishSchedule()} disabled={isLoadingSchedule || isSavingSchedule} className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60">
                  <Save className="h-4 w-4 ml-2" />
                  نشر الجدول
                </Button>
                <Button variant="outline" onClick={clearSchedule} disabled={Object.keys(schedule).length === 0}>
                  <Trash2 className="h-4 w-4 ml-2" />
                  مسح
                </Button>
              </div>

              {Object.keys(schedule).length > 0 && (
                <Card className={surfaceClass}>
                  <CardContent className="space-y-4 p-4 sm:p-5">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <p className="font-semibold">تنبيهات الجدول</p>
                        <p className={`text-sm ${mutedTextClass}`}>
                          هذه التنبيهات تساعد الإدارة على اكتشاف تجاوز الحد الشهري أو النقص في تغطية المناوبات قبل النشر.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge className={scheduleDiagnostics.overloadedUsers.length > 0 ? "bg-amber-600 text-white" : "bg-emerald-600 text-white"}>
                          تجاوز 26: {scheduleDiagnostics.overloadedUsers.length}
                        </Badge>
                        <Badge className={scheduleDiagnostics.singleMissingShifts.length > 0 ? "bg-amber-600 text-white" : "bg-emerald-600 text-white"}>
                          ناقص فرد واحد: {scheduleDiagnostics.singleMissingShifts.length}
                        </Badge>
                        <Badge className={scheduleDiagnostics.underMinimumTeams.length > 0 ? "bg-amber-600 text-white" : "bg-emerald-600 text-white"}>
                          فرق أقل من 3: {scheduleDiagnostics.underMinimumTeams.length}
                        </Badge>
                        <Badge className={scheduleDiagnostics.understaffedShifts.length > 0 ? "bg-rose-600 text-white" : "bg-emerald-600 text-white"}>
                          إجمالي النقص: {scheduleDiagnostics.understaffedShifts.length}
                        </Badge>
                      </div>
                    </div>

                    <div className="grid gap-4 xl:grid-cols-3">
                      <div className={`rounded-[1.4rem] border p-4 ${softSurfaceClass}`}>
                        <div className="mb-3 flex items-center justify-between gap-2">
                          <p className="font-medium text-white">الأفراد المتجاوزون للحد الشهري</p>
                          <Badge variant="outline">{MAX_SHIFTS_PER_PERSON} الحد الأعلى</Badge>
                        </div>
                        {scheduleDiagnostics.overloadedUsers.length === 0 ? (
                          <p className={`text-sm ${mutedTextClass}`}>لا يوجد أي فرد تجاوز الحد الأعلى الحالي.</p>
                        ) : (
                          <div className="space-y-2">
                            {scheduleDiagnostics.overloadedUsers.slice(0, 6).map((entry) => (
                              <button
                                key={entry.userId}
                                type="button"
                                onClick={() => handleOverloadedUserWarningClick(entry)}
                                className="flex w-full items-center justify-between gap-3 rounded-xl border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-right text-sm transition-colors hover:bg-amber-400/15"
                              >
                                <div className="min-w-0">
                                  <p className="truncate font-medium text-white">{entry.userName}</p>
                                  <p className="text-xs text-amber-100">تجاوز الحد بـ {entry.overLimitBy} مناوبة • اضغط للانتقال</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  {renderRole(entry.userRole, true)}
                                  <Badge className="bg-amber-600 text-white">{entry.count}</Badge>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className={`rounded-[1.4rem] border p-4 ${softSurfaceClass}`}>
                        <div className="mb-3 flex items-center justify-between gap-2">
                          <p className="font-medium text-white">فرق أقل من الحد الأدنى</p>
                          <Badge variant="outline">3 أفراد على الأقل</Badge>
                        </div>
                        {scheduleDiagnostics.underMinimumTeams.length === 0 ? (
                          <p className={`text-sm ${mutedTextClass}`}>كل الفرق المضافة تستوفي الحد الأدنى التشغيلي.</p>
                        ) : (
                          <div className="space-y-2">
                            {scheduleDiagnostics.underMinimumTeams.slice(0, 6).map((entry) => (
                              <button
                                key={`${entry.day}-${entry.shift}-${entry.teamId}`}
                                type="button"
                                onClick={() => handleTeamMinimumWarningClick(entry)}
                                className="flex w-full items-center justify-between gap-3 rounded-xl border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-right text-sm transition-colors hover:bg-amber-400/15"
                              >
                                <div className="min-w-0">
                                  <p className="truncate font-medium text-white">
                                    اليوم {entry.day} • {SHIFTS.find((shift) => shift.value === entry.shift)?.label} • فريق {entry.teamId}
                                    {entry.isOptional ? " (اختياري)" : ""}
                                  </p>
                                  <p className="text-xs text-amber-100">
                                    ينقصه: {entry.missingRoles.map((role) => ROLES.find((item) => item.value === role)?.label).join("، ")} • اضغط للانتقال
                                  </p>
                                </div>
                                <Badge className="bg-amber-600 text-white">{entry.assigned}/{MIN_TEAM_MEMBERS}</Badge>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className={`rounded-[1.4rem] border p-4 ${softSurfaceClass}`}>
                        <div className="mb-3 flex items-center justify-between gap-2">
                          <p className="font-medium text-white">أكثر المناوبات نقصًا</p>
                          <Badge variant="outline">حسب السعة التشغيلية</Badge>
                        </div>
                        {scheduleDiagnostics.understaffedShifts.length === 0 ? (
                          <p className={`text-sm ${mutedTextClass}`}>كل المناوبات الحالية مكتملة بدون نقص.</p>
                        ) : (
                          <div className="space-y-2">
                            {scheduleDiagnostics.understaffedShifts.slice(0, 6).map((entry) => (
                              <button
                                key={`${entry.day}-${entry.shift}`}
                                type="button"
                                onClick={() => handleShortageWarningClick(entry)}
                                className={`flex items-center justify-between gap-3 rounded-xl border px-3 py-2 text-sm ${
                                  entry.shortage === 1
                                    ? "border-amber-400/20 bg-amber-400/10"
                                    : "border-rose-400/20 bg-rose-400/10"
                                } transition-colors hover:bg-white/10`}
                              >
                                <div className="min-w-0">
                                  <p className="truncate font-medium text-white">
                                    اليوم {entry.day} • {SHIFTS.find((shift) => shift.value === entry.shift)?.label}
                                  </p>
                                  <p className={`text-xs ${entry.shortage === 1 ? "text-amber-100" : "text-rose-100"}`}>
                                    {entry.shortage === 1 ? "ناقص فرد واحد فقط" : `ينقص ${entry.shortage} أفراد`} • المستهدف {entry.target} • اضغط للانتقال
                                  </p>
                                </div>
                                <Badge className={entry.shortage === 1 ? "bg-amber-600 text-white" : "bg-rose-600 text-white"}>
                                  {entry.assigned}/{entry.target}
                                </Badge>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {isLoadingRecords || isLoadingSchedule ? (
                <Card className={surfaceClass}>
                  <CardContent className="py-10 text-center">
                    <RefreshCw className="mx-auto mb-3 h-8 w-8 animate-spin text-red-500" />
                    <p className={mutedTextClass}>
                      {isLoadingRecords ? "جاري تحميل التفرغات..." : "جاري تحميل الجدول..."}
                    </p>
                  </CardContent>
                </Card>
              ) : isDataEmpty ? (
                <Card className={surfaceClass}>
                  <CardContent className="py-10 text-center">
                    <CalendarDays className="mx-auto mb-3 h-10 w-10 text-red-500/70" />
                    <p className="font-medium">لا توجد تفرغات محفوظة لهذا الشهر</p>
                    <p className={`mt-2 text-sm ${mutedTextClass}`}>
                      أضف التفرغات أولًا، ثم أنشئ الجدول من البيانات المحفوظة.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
                  {Array.from({ length: daysInScheduleMonth }).map((_, i) => (
                    <ScheduleDayCard key={i} day={i + 1} />
                  ))}
                </div>
              )}
            </motion.div>
          </TabsContent>
          )}

          {/* Calendar Tab */}
          <TabsContent value="calendar">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              <div className="flex flex-wrap gap-2">
                <Select value={calendarMonth.toString()} onValueChange={(v) => setActivePeriod(parseInt(v, 10), calendarYear)}>
                  <SelectTrigger className={`w-32 ${selectTriggerClass}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map(m => <SelectItem key={m.value} value={m.value.toString()}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={calendarYear.toString()} onValueChange={(v) => setActivePeriod(calendarMonth, parseInt(v, 10))}>
                  <SelectTrigger className={`w-28 ${selectTriggerClass}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
                <div className="relative flex-1 max-w-xs">
                  <Search className={`absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 ${isDarkMode ? "text-slate-500" : "text-gray-400"}`} />
                  <Input
                    value={calendarSearchTerm}
                    onChange={(e) => setCalendarSearchTerm(e.target.value)}
                    placeholder="البحث عن شخص..."
                    className={`${searchInputClass} pr-10`}
                  />
                </div>
              </div>

              {isLoadingSchedule ? (
                <Card className={surfaceClass}>
                  <CardContent className="py-10 text-center">
                    <RefreshCw className="mx-auto mb-3 h-8 w-8 animate-spin text-red-500" />
                    <p className={mutedTextClass}>جاري تحميل بيانات التقويم...</p>
                  </CardContent>
                </Card>
              ) : Object.keys(schedule).length === 0 ? (
                <Card className={surfaceClass}>
                  <CardContent className="py-10 text-center">
                    <Calendar className="mx-auto mb-3 h-10 w-10 text-red-500/70" />
                    <p className="font-medium">لا يوجد جدول مولّد بعد</p>
                    <p className={`mt-2 text-sm ${mutedTextClass}`}>
                      التقويم يعرض الجدول المحفوظ لنفس الشهر والسنة المختارين.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-7 gap-2">
                  {Array.from({ length: daysInCalendarMonth }).map((_, i) => (
                    <CalendarDayCard key={i} day={i + 1} />
                  ))}
                </div>
              )}
            </motion.div>
          </TabsContent>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {roleStats.map(stat => (
                  <Card key={stat.value} className={surfaceClass}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className={`text-xs ${mutedTextClass}`}>{stat.label}</p>
                          <p className="text-2xl font-bold">{stat.count}</p>
                        </div>
                        <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                          {stat.icon}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {isAdmin && (
                <Card className={surfaceClass}>
                  <CardHeader>
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <Users className="h-5 w-5 text-[#ff6f7c]" />
                          إدارة الكوادر
                        </CardTitle>
                        <CardDescription>
                          من هنا يمكن للإدارة تعديل الاسم والرتبة وحالة الكادر، أو إضافة كادر جديد مع حفظ البيانات مباشرة.
                        </CardDescription>
                      </div>
                      <Button onClick={openCreatePersonnelDialog} className="bg-red-600 hover:bg-red-700">
                        <UserPlus className="ml-2 h-4 w-4" />
                        إضافة كادر
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                      <div className={`rounded-2xl border p-4 ${softSurfaceClass}`}>
                        <p className={`text-xs ${mutedTextClass}`}>إجمالي الكوادر</p>
                        <p className="mt-2 text-2xl font-bold">{managedUserStats.total}</p>
                      </div>
                      <div className={`rounded-2xl border p-4 ${softSurfaceClass}`}>
                        <p className={`text-xs ${mutedTextClass}`}>الكوادر النشطة</p>
                        <p className="mt-2 text-2xl font-bold text-emerald-300">{managedUserStats.active}</p>
                      </div>
                      <div className={`rounded-2xl border p-4 ${softSurfaceClass}`}>
                        <p className={`text-xs ${mutedTextClass}`}>حسابات الإدارة</p>
                        <p className="mt-2 text-2xl font-bold text-red-300">{managedUserStats.admins}</p>
                      </div>
                      <div className={`rounded-2xl border p-4 ${softSurfaceClass}`}>
                        <p className={`text-xs ${mutedTextClass}`}>قادة القطاع</p>
                        <p className="mt-2 text-2xl font-bold text-rose-300">{managedUserStats.sectorLeads}</p>
                      </div>
                    </div>

                    <div className="flex flex-col gap-3 xl:flex-row">
                      <div className="relative flex-1">
                        <Search className={`absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 ${isDarkMode ? "text-slate-500" : "text-gray-400"}`} />
                        <Input
                          value={personnelSearchTerm}
                          onChange={(e) => setPersonnelSearchTerm(e.target.value)}
                          placeholder="بحث بالاسم أو البريد..."
                          className={`${searchInputClass} pr-10`}
                        />
                      </div>
                      <Select value={personnelRoleFilter} onValueChange={(value) => setPersonnelRoleFilter(value as Role | "all")}>
                        <SelectTrigger className={`w-full xl:w-36 ${selectTriggerClass}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">كل الرتب</SelectItem>
                          {ROLES.map((role) => (
                            <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={personnelStatusFilter} onValueChange={(value) => setPersonnelStatusFilter(value as "all" | "active" | "inactive")}>
                        <SelectTrigger className={`w-full xl:w-36 ${selectTriggerClass}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">كل الحالات</SelectItem>
                          <SelectItem value="active">نشط</SelectItem>
                          <SelectItem value="inactive">معطل</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {isLoadingManagedUsers ? (
                      <div className="py-10 text-center">
                        <RefreshCw className="mx-auto mb-3 h-8 w-8 animate-spin text-red-500" />
                        <p className={mutedTextClass}>جاري تحميل الكوادر...</p>
                      </div>
                    ) : filteredManagedUsers.length === 0 ? (
                      <div className="py-10 text-center">
                        <Users className="mx-auto mb-3 h-10 w-10 text-red-500/70" />
                        <p className="font-medium">لا توجد كوادر مطابقة للفلاتر الحالية</p>
                        <p className={`mt-2 text-sm ${mutedTextClass}`}>
                          يمكنك تعديل معايير البحث أو إضافة كادر جديد من الزر العلوي.
                        </p>
                      </div>
                    ) : (
                      <ScrollArea className="h-[420px]">
                        <div className="space-y-3">
                          {filteredManagedUsers.map((person) => (
                            <div
                              key={person.id}
                              className={`rounded-[1.4rem] border p-4 transition-colors ${softSurfaceClass}`}
                            >
                              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                <div className="min-w-0 flex-1 space-y-2">
                                  <div className="flex flex-wrap items-center gap-2">
                                    <p className="text-base font-semibold">{person.name}</p>
                                    {renderRole(person.role)}
                                    {person.isAdmin && (
                                      <Badge variant="outline" className="border-red-400/30 bg-red-500/10 text-red-200">
                                        صلاحية إدارة
                                      </Badge>
                                    )}
                                    <Badge variant="outline" className={person.isActive ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300" : "border-rose-400/30 bg-rose-400/10 text-rose-300"}>
                                      {person.isActive ? "نشط" : "معطل"}
                                    </Badge>
                                  </div>
                                  <div className={`flex flex-wrap items-center gap-3 text-sm ${mutedTextClass}`}>
                                    <span className="inline-flex items-center gap-1.5">
                                      <Mail className="h-4 w-4" />
                                      {person.email}
                                    </span>
                                    <span className="inline-flex items-center gap-1.5">
                                      <Clock className="h-4 w-4" />
                                      {new Intl.DateTimeFormat("ar", {
                                        year: "numeric",
                                        month: "long",
                                        day: "numeric",
                                      }).format(new Date(person.createdAt))}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  <Button variant="outline" onClick={() => openEditPersonnelDialog(person)}>
                                    <Edit className="ml-2 h-4 w-4" />
                                    تعديل
                                  </Button>
                                  <Button
                                    variant="outline"
                                    onClick={() => handlePersonnelStatusToggle(person)}
                                    disabled={personnelBusyId === person.id}
                                    className={person.isActive ? "text-amber-300" : "text-emerald-300"}
                                  >
                                    {personnelBusyId === person.id ? (
                                      <RefreshCw className="ml-2 h-4 w-4 animate-spin" />
                                    ) : person.isActive ? (
                                      <PowerOff className="ml-2 h-4 w-4" />
                                    ) : (
                                      <Power className="ml-2 h-4 w-4" />
                                    )}
                                    {person.isActive ? "تعطيل" : "تفعيل"}
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    )}
                  </CardContent>
                </Card>
              )}

              <Card className={surfaceClass}>
                <CardHeader>
                  <CardTitle className="text-lg">إحصائيات الجدول</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className={isDarkMode ? "text-zinc-400" : "text-gray-500"}>إجمالي التفرغات المحمّلة</span>
                      <Badge className="bg-red-600">{records.length}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={isDarkMode ? "text-zinc-400" : "text-gray-500"}>الأيام المجدولة</span>
                      <Badge className="bg-green-600">{Object.keys(schedule).length}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={mutedTextClass}>التبديلات</span>
                      <Badge className="bg-amber-600">{shiftRequests.length}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Records */}
              <Card className={surfaceClass}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">سجلات التفرغات</CardTitle>
                    <div className="flex gap-2">
                      <div className="relative">
                        <Search className={`absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 ${isDarkMode ? "text-slate-500" : "text-gray-400"}`} />
                        <Input
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          placeholder="بحث..."
                          className={`w-40 ${searchInputClass} pr-10`}
                        />
                      </div>
                      <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as Role | "all")}>
                        <SelectTrigger className={`w-28 ${selectTriggerClass}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">الكل</SelectItem>
                          {ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoadingRecords ? (
                    <div className="py-10 text-center">
                      <RefreshCw className="mx-auto mb-3 h-8 w-8 animate-spin text-red-500" />
                      <p className={mutedTextClass}>جاري تحميل السجلات...</p>
                    </div>
                  ) : filteredRecords.length === 0 ? (
                    <div className="py-10 text-center">
                      <ClipboardList className="mx-auto mb-3 h-10 w-10 text-red-500/70" />
                      <p className="font-medium">لا توجد سجلات لعرضها</p>
                      <p className={`mt-2 text-sm ${mutedTextClass}`}>
                        السجلات المعروضة هنا هي آخر البيانات المحفوظة داخل النظام.
                      </p>
                    </div>
                  ) : (
                    <ScrollArea className="h-96">
                      <div className="space-y-2">
                        {filteredRecords.slice(0, 50).map(record => (
                          <div
                            key={record.id}
                            className={`p-3 rounded-lg flex items-center justify-between ${
                              isDarkMode ? "bg-zinc-800 hover:bg-zinc-700" : "bg-gray-50 hover:bg-gray-100"
                            } transition-colors`}
                          >
                            <div className="flex items-center gap-3">
                              {renderRole(record.userRole)}
                              <div>
                                <p className="font-medium">{record.userName}</p>
                                <p className={`text-xs ${isDarkMode ? "text-zinc-500" : "text-gray-400"}`}>
                                  {MONTHS.find(m => m.value === record.month)?.label} {record.year}
                                </p>
                              </div>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(record)}
                                aria-label={`تعديل سجل ${record.userName}`}
                                className="h-8 w-8 p-0"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(record.id)}
                                aria-label={`حذف سجل ${record.userName}`}
                                className="h-8 w-8 p-0 text-red-500 hover:text-red-400"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className={`relative z-10 border-t py-4 text-center ${topBarClass}`}>
        <p className={`text-sm ${isDarkMode ? "text-slate-400/80" : "text-gray-400"}`}>
          © 2024 مركز إسعاف 650 - جميع الحقوق محفوظة
        </p>
      </footer>

      {/* Dialogs */}
      <Dialog
        open={showPersonnelDialog}
        onOpenChange={(open) => {
          setShowPersonnelDialog(open);
          if (!open) {
            setEditingPersonnelId(null);
            setPersonnelForm({
              name: "",
              email: "",
              role: "medic",
              password: "",
              isAdmin: false,
              isActive: true,
            });
          }
        }}
      >
        <DialogContent className="w-[calc(100vw-1rem)] max-h-[92vh] max-w-2xl grid-rows-[auto_minmax(0,1fr)] overflow-hidden border-white/10 bg-[linear-gradient(180deg,rgba(21,31,53,0.96),rgba(10,16,30,0.94))] p-0 shadow-[0_32px_80px_rgba(2,6,23,0.45)] sm:w-[95vw]">
          <div className="shrink-0 border-b border-white/10 px-4 py-5 sm:px-6">
            <DialogHeader className="text-right">
              <DialogTitle className="flex min-w-0 items-center gap-3 text-lg text-white lg:text-xl">
                <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-3">
                  {editingPersonnelId ? (
                    <ShieldCheck className="h-5 w-5 text-[#ff6f7c]" />
                  ) : (
                    <UserPlus className="h-5 w-5 text-[#ff6f7c]" />
                  )}
                </div>
                <span className="min-w-0 break-words">
                  {editingPersonnelId ? "تعديل بيانات الكادر" : "إضافة كادر جديد"}
                </span>
              </DialogTitle>
            </DialogHeader>
            <p className="mt-3 text-sm leading-7 text-slate-300">
              {editingPersonnelId
                ? "يمكنك تعديل كل بيانات الكادر من هنا، بما فيها البريد وكلمة المرور والرتبة والصلاحيات، وسيتم حفظ التعديلات مباشرة."
                : "أدخل بيانات الكادر الجديد لإنشاء حسابه وحفظ ملفه التشغيلي داخل النظام."}
            </p>
          </div>

          <form onSubmit={handlePersonnelSubmit} className="min-h-0 space-y-5 overflow-y-auto overflow-x-hidden px-4 py-6 text-right sm:px-6">
            <div className="grid min-w-0 gap-4 md:grid-cols-2">
              <div className="min-w-0 space-y-2">
                <label className="text-sm font-medium text-slate-200">الاسم الكامل</label>
                <Input
                  value={personnelForm.name}
                  onChange={(e) => setPersonnelForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="اسم الكادر"
                  className={searchInputClass}
                  required
                />
              </div>

              <div className="min-w-0 space-y-2">
                <label className="text-sm font-medium text-slate-200">الرتبة</label>
                <Select
                  value={personnelForm.role}
                  onValueChange={(value) => setPersonnelForm((prev) => ({ ...prev, role: value as Role }))}
                >
                  <SelectTrigger className={`w-full ${selectTriggerClass}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((role) => (
                      <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="min-w-0 space-y-2">
                <label className="text-sm font-medium text-slate-200">البريد الإلكتروني</label>
                <Input
                  value={personnelForm.email}
                  onChange={(e) => setPersonnelForm((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="name@example.com"
                  type="email"
                  className={searchInputClass}
                  required
                />
                <p className="text-xs text-slate-500">
                  سيتم حفظ البريد في ملف الكادر وفي نظام الدخول نفسه.
                </p>
              </div>

              <div className="min-w-0 space-y-2">
                <label className="text-sm font-medium text-slate-200">
                  {editingPersonnelId ? "كلمة المرور" : "كلمة المرور الأولية"}
                </label>
                <Input
                  value={personnelForm.password}
                  onChange={(e) => setPersonnelForm((prev) => ({ ...prev, password: e.target.value }))}
                  placeholder={editingPersonnelId ? "اتركها فارغة إذا لم ترغب بتغييرها" : "6 أحرف على الأقل"}
                  type="password"
                  className={searchInputClass}
                  required={!editingPersonnelId}
                />
                <p className="text-xs text-slate-500">
                  {editingPersonnelId
                    ? "إذا كتبت كلمة مرور جديدة فسيتم تحديثها مباشرة، وإذا تركتها فارغة فستبقى الحالية كما هي."
                    : "سيتم استخدام هذه الكلمة عند إنشاء الحساب لأول مرة."}
                </p>
              </div>
            </div>

            <div className="grid min-w-0 gap-4 md:grid-cols-2">
              <div className={`min-w-0 rounded-2xl border p-4 ${softSurfaceClass}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 space-y-1 text-right">
                    <p className="text-sm font-medium text-white">صلاحية الإدارة</p>
                    <p className={`text-xs leading-6 ${mutedTextClass}`}>
                      من يملك هذه الصلاحية فقط يمكنه إنشاء الحسابات أو تعديل الكوادر داخل الموقع، بغض النظر عن رتبته.
                    </p>
                  </div>
                  <Switch
                    checked={personnelForm.isAdmin}
                    onCheckedChange={(checked) => setPersonnelForm((prev) => ({ ...prev, isAdmin: checked }))}
                  />
                </div>
              </div>

              <div className={`min-w-0 rounded-2xl border p-4 ${softSurfaceClass}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 space-y-1 text-right">
                    <p className="text-sm font-medium text-white">حالة الحساب</p>
                    <p className={`text-xs leading-6 ${mutedTextClass}`}>
                      عند التعطيل يبقى الكادر محفوظًا لكن يُمنع من استخدام الموقع حتى يتم تفعيله من جديد.
                    </p>
                  </div>
                  <Switch
                    checked={personnelForm.isActive}
                    onCheckedChange={(checked) => setPersonnelForm((prev) => ({ ...prev, isActive: checked }))}
                  />
                </div>
              </div>
            </div>

            <div className={`rounded-2xl border p-4 text-sm leading-7 ${softSurfaceClass}`}>
              <p className="font-medium text-white">آلية الحفظ</p>
              <p className={`mt-2 ${mutedTextClass}`}>
                الاسم والبريد وكلمة المرور والرتبة وصلاحية الإدارة وحالة الحساب يتم حفظها وربطها مباشرة، وتبقى متاحة في صفحة الإحصائيات والتفرغات.
              </p>
            </div>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => setShowPersonnelDialog(false)}>
                إلغاء
              </Button>
              <Button type="submit" disabled={isSavingPersonnel} className="bg-red-600 hover:bg-red-700">
                {isSavingPersonnel ? (
                  <>
                    <RefreshCw className="ml-2 h-4 w-4 animate-spin" />
                    جاري الحفظ...
                  </>
                ) : editingPersonnelId ? (
                  <>
                    <ShieldCheck className="ml-2 h-4 w-4" />
                    حفظ التعديلات
                  </>
                ) : (
                  <>
                    <UserPlus className="ml-2 h-4 w-4" />
                    إضافة الكادر
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {renderNotificationsPopup()}
      {renderEventsPopup()}
      {isAdmin && renderRequestsDialog()}
      {renderSwapDialog()}

      {showAssignDialog && (
        <div className="fixed inset-0 z-50 bg-[rgba(6,11,22,0.9)] backdrop-blur-xl">
          <div className={`sticky top-0 z-10 border-b px-6 py-5 ${assignHeaderClass}`}>
            <div className="mx-auto flex max-w-[1800px] items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <h2 className="text-glow text-2xl font-bold text-white sm:text-3xl">إدارة المناوبة</h2>
                <p className={`mt-2 max-w-4xl text-sm leading-7 ${isDarkMode ? "text-slate-300" : "text-gray-500"}`}>
                  {selectedDay
                    ? `اليوم ${selectedDay}${selectedDayName ? ` (${selectedDayName})` : ""} • الفترة ${selectedShiftLabel || "غير محددة"} • يمكنك إضافة الأشخاص يدويًا أو تبديلهم بالسحب والإفلات بين الخانات، وسيظهر التغيير مباشرة في التقويم بعد نشر الجدول.`
                    : "اختر يومًا ومناوبة لعرض الأشخاص المتاحين وإدارة التوزيع."}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge variant="outline">المتاحون: {selectedShiftAvailablePeople.length}</Badge>
                  <Badge variant="outline">المعيّنون: {selectedAssignedCount}/{selectedShiftPreferredTarget}</Badge>
                  <Badge variant="outline">السعة القصوى: {selectedShiftHardTarget}</Badge>
                  <Badge variant="outline">
                    الفرق: {selectedShiftCapacity ? `${selectedShiftCapacity.preferredTeams}/${selectedShiftCapacity.maxTeams}` : NUM_TEAMS}
                  </Badge>
                  <Badge className={selectedShiftShortage === 0 ? "bg-emerald-600 text-white" : selectedShiftShortage === 1 ? "bg-amber-600 text-white" : "bg-rose-600 text-white"}>
                    {selectedShiftShortage === 0
                      ? "المناوبة مكتملة"
                      : selectedShiftShortage === 1
                        ? "ناقص فرد واحد"
                        : `ينقص ${selectedShiftShortage}`}
                  </Badge>
                  <Badge className={selectedShiftOverloadedMembers.length > 0 ? "bg-amber-600 text-white" : "bg-emerald-600 text-white"}>
                    تجاوز 26 داخل المناوبة: {selectedShiftOverloadedMembers.length}
                  </Badge>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  setShowAssignDialog(false);
                  setFocusedUserId(null);
                  setFocusedTeamId(null);
                  clearDragState();
                }}
                className="shrink-0"
              >
                <X className="ml-2 h-4 w-4" />
                إغلاق
              </Button>
            </div>
          </div>

          <div className="h-[calc(100vh-144px)] overflow-y-auto px-4 py-5 sm:px-6 sm:py-6">
            <div className="mx-auto grid max-w-[1800px] gap-6 xl:grid-cols-[1.45fr_1fr]">
              <div className={`min-w-0 rounded-[1.9rem] border p-4 sm:p-5 ${assignPanelClass}`}>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-white">التوزيع الحالي</h3>
                    <p className="mt-1 text-xs leading-6 text-slate-400">إدارة الفرق والقطاع والعمليات داخل هذه المناوبة.</p>
                  </div>
                  <Badge variant="outline">حي</Badge>
                </div>

                {selectedShiftStructure ? (
                  <div className="space-y-4">
                    {(selectedShiftShortage > 0 || selectedShiftOverloadedMembers.length > 0) && (
                      <div className="grid gap-3 lg:grid-cols-2">
                        <div className={`rounded-[1.25rem] border px-4 py-3 text-sm ${
                          selectedShiftShortage === 0
                            ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-100"
                            : selectedShiftShortage === 1
                            ? "border-amber-400/20 bg-amber-400/10 text-amber-100"
                            : "border-rose-400/20 bg-rose-400/10 text-rose-100"
                        }`}>
                          <p className="font-medium text-white">تنبيه التغطية</p>
                          <p className="mt-2 leading-7">
                            {selectedShiftShortage === 0
                              ? "المناوبة مكتملة."
                              : selectedShiftShortage === 1
                                ? `هذه المناوبة ناقصها فرد واحد فقط للوصول إلى السعة التشغيلية المستهدفة ${selectedShiftPreferredTarget}.`
                                : `هذه المناوبة ناقصها ${selectedShiftShortage} أفراد عن السعة التشغيلية المستهدفة ${selectedShiftPreferredTarget}.`}
                          </p>
                        </div>

                        <div className={`rounded-[1.25rem] border px-4 py-3 text-sm ${
                          selectedShiftOverloadedMembers.length > 0
                            ? "border-amber-400/20 bg-amber-400/10 text-amber-100"
                            : "border-white/10 bg-white/[0.04] text-slate-300"
                        }`}>
                          <p className="font-medium text-white">تنبيه الحد الشهري</p>
                          {selectedShiftOverloadedMembers.length === 0 ? (
                            <p className="mt-2 leading-7">لا يوجد داخل هذه المناوبة من تجاوز حد {MAX_SHIFTS_PER_PERSON} مناوبة.</p>
                          ) : (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {selectedShiftOverloadedMembers.map((member) => (
                                <Badge key={member.userId} className="bg-amber-600 text-white">
                                  {member.userName} • {scheduleDiagnostics.assignmentMap.get(member.userId)?.count ?? 0}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="min-w-0 rounded-[1.4rem] border border-white/10 bg-white/[0.05] p-4">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-slate-100">القطاع</span>
                        <Badge variant="outline">{selectedShiftStructure.sector ? "1/1" : "0/1"}</Badge>
                      </div>
                      <div
                        onDragOver={(e) => {
                          e.preventDefault();
                          setActiveDropTarget(getLocationKey({ type: "sector", teamId: null }));
                        }}
                        onDragLeave={() => {
                          if (activeDropTarget === getLocationKey({ type: "sector", teamId: null })) {
                            setActiveDropTarget(null);
                          }
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          handleDropOnLocation({ type: "sector", teamId: null });
                        }}
                        className={`rounded-[1rem] border border-dashed p-2 transition-colors ${
                          activeDropTarget === getLocationKey({ type: "sector", teamId: null })
                            ? "border-[#ff6f7c] bg-[#ff6f7c]/10"
                            : "border-white/10"
                        }`}
                      >
                        {selectedShiftStructure.sector ? (
                          renderAssignedMemberCard(selectedShiftStructure.sector, { type: "sector", teamId: null })
                        ) : (
                          <p className="px-2 py-3 text-xs text-slate-400">لا يوجد مسؤول قطاع بعد. يمكن السحب والإفلات هنا.</p>
                        )}
                      </div>
                    </div>

                    <div className="min-w-0 rounded-[1.4rem] border border-white/10 bg-white/[0.05] p-4">
                      <div className="mb-3 flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-slate-100">العمليات</span>
                        <Badge variant="outline">
                          {selectedShiftStructure.operations.length}/{selectedShiftCapacity?.maxOperations ?? MAX_OPERATIONS}
                        </Badge>
                      </div>
                      <div className="mb-3 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-[11px] leading-6 text-slate-400">
                        المستهدف التشغيلي لهذه الفترة: {selectedShiftCapacity?.preferredOperations ?? MAX_OPERATIONS} عمليات، مع إمكانية رفع العدد حتى {selectedShiftCapacity?.maxOperations ?? MAX_OPERATIONS} عند الحاجة.
                      </div>
                      <div
                        onDragOver={(e) => {
                          e.preventDefault();
                          setActiveDropTarget(getLocationKey({ type: "operations", teamId: null }));
                        }}
                        onDragLeave={() => {
                          if (activeDropTarget === getLocationKey({ type: "operations", teamId: null })) {
                            setActiveDropTarget(null);
                          }
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          handleDropOnLocation({ type: "operations", teamId: null });
                        }}
                        className={`rounded-[1rem] border border-dashed p-2 transition-colors ${
                          activeDropTarget === getLocationKey({ type: "operations", teamId: null })
                            ? "border-[#ff6f7c] bg-[#ff6f7c]/10"
                            : "border-white/10"
                        }`}
                      >
                        {selectedShiftStructure.operations.length === 0 ? (
                          <p className="px-2 py-3 text-xs text-slate-400">لا يوجد أشخاص في العمليات. يمكن السحب والإفلات هنا.</p>
                        ) : (
                          <div className="space-y-2">
                            {selectedShiftStructure.operations.map((member) => (
                              <div key={member.userId}>
                                {renderAssignedMemberCard(member, { type: "operations", teamId: null })}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-2">
                      {getTeamsForShift(selectedShiftStructure, selectedShift || "morning", "hard").map((team) => {
                        const missingRoles = getMissingRequiredRoles(team);
                        const isReady = missingRoles.length === 0;

                        return (
                        <div
                          key={team.id}
                          className={`min-w-0 rounded-[1.4rem] border p-4 ${
                            focusedTeamId === team.id
                              ? "border-[#ff6f7c] bg-[#ff6f7c]/10 shadow-[0_0_0_1px_rgba(255,111,124,0.35)]"
                              : "border-white/10 bg-white/[0.05]"
                          }`}
                        >
                          <div className="mb-3 flex items-center justify-between gap-2">
                            <span className="min-w-0 truncate text-sm font-medium text-slate-100">
                              {team.name}
                              {selectedShift && isOptionalTeamForShift(selectedShift, team.id) ? " (اختياري)" : ""}
                            </span>
                            <Badge className={isReady ? "bg-emerald-600 text-white" : team.members.length === 0 ? "bg-zinc-600 text-white" : "bg-amber-600 text-white"}>
                              {team.members.length}/{team.maxMembers}
                            </Badge>
                          </div>
                          <div className="mb-3 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-[11px] leading-6 text-slate-400">
                            التركيبة المعتمدة: قائد، كشاف، مسعف أول، مسعف ثاني.
                            {selectedShift && isOptionalTeamForShift(selectedShift, team.id) ? " هذا الفريق اختياري في هذه الفترة." : ""}
                            {" "}
                            الحد الأدنى الصالح: قائد + كشاف + مسعف.
                            {team.members.length > 0 && !isReady
                              ? ` ينقص هذا الفريق: ${missingRoles.map((role) => ROLES.find((item) => item.value === role)?.label).join("، ")}.`
                              : ""}
                            {focusedTeamId === team.id ? " هذا هو الفريق المستهدف من التحذير." : ""}
                          </div>
                          <div className="space-y-2">
                            {getTeamSlotDefinitions(team).map((slot) => (
                              <div key={`${team.id}-${slot.key}`}>
                                <div className="mb-1 flex items-center justify-between gap-2 px-1">
                                  <span className="text-xs font-medium text-slate-300">{slot.label}</span>
                                  <span className="text-[11px] text-slate-500">{ROLES.find((role) => role.value === slot.role)?.label}</span>
                                </div>
                                <div
                                  onDragOver={(e) => {
                                    e.preventDefault();
                                    setActiveDropTarget(getLocationKey({ type: "team", teamId: team.id, slotKey: slot.key }));
                                  }}
                                  onDragLeave={() => {
                                    if (activeDropTarget === getLocationKey({ type: "team", teamId: team.id, slotKey: slot.key })) {
                                      setActiveDropTarget(null);
                                    }
                                  }}
                                  onDrop={(e) => {
                                    e.preventDefault();
                                    handleDropOnLocation({ type: "team", teamId: team.id, slotKey: slot.key });
                                  }}
                                  className={`rounded-[1rem] border border-dashed p-2 ${
                                    activeDropTarget === getLocationKey({ type: "team", teamId: team.id, slotKey: slot.key })
                                      ? "border-[#ff6f7c] bg-[#ff6f7c]/10"
                                      : slot.member
                                        ? "border-white/[0.08] bg-white/[0.02]"
                                        : "border-white/10 bg-white/[0.01]"
                                  }`}
                                >
                                  {slot.member ? (
                                    renderAssignedMemberCard(slot.member, { type: "team", teamId: team.id, slotKey: slot.key })
                                  ) : (
                                    <p className="px-2 py-3 text-xs text-slate-400">الخانة فارغة. يمكن السحب والإفلات هنا.</p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )})}
                    </div>
                  </div>
                ) : (
                  <div className="glass-panel-soft rounded-[1.5rem] px-6 py-10 text-center">
                    <p className="text-sm text-slate-400">اختر يومًا ومناوبة لعرض التوزيع الحالي.</p>
                  </div>
                )}
              </div>

              <div className={`min-w-0 rounded-[1.9rem] border p-4 sm:p-5 ${assignPanelClass}`}>
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-white">الأشخاص المتاحون للإضافة</h3>
                    <p className="mt-1 text-xs leading-6 text-slate-400">اختر الشخص ثم الخانة المناسبة لإضافته مباشرة داخل هذه المناوبة. الأسماء غير المضافة تظهر أولًا تلقائيًا لتسهيل العمل.</p>
                  </div>
                  <Badge variant="outline">
                    {selectedShiftAvailableEntries.length}/{selectedShiftAvailablePeople.length} ظاهر
                  </Badge>
                </div>
                <div className="mb-4 flex flex-col gap-3 rounded-[1.2rem] border border-white/10 bg-white/[0.03] p-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs leading-6 text-slate-400">
                    فلتر الرتبة يطبّق على قائمة المتاحين وعلى الإضافة اليدوية أيضًا.
                  </p>
                  <Select value={assignRoleFilter} onValueChange={(value) => setAssignRoleFilter(value as Role | "all")}>
                    <SelectTrigger className={`w-full sm:w-44 ${selectTriggerClass}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">كل الرتب</SelectItem>
                      {ROLES.map((role) => (
                        <SelectItem key={role.value} value={role.value}>{role.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-3">
                    {selectedShiftAvailablePeople.length === 0 ? (
                    <div className="glass-panel-soft rounded-[1.5rem] py-16 text-center">
                      <User className="mx-auto mb-3 h-10 w-10 text-red-500/70" />
                      <p className="font-medium">لا يوجد أشخاص متاحون لهذه المناوبة</p>
                      <p className="mt-2 text-sm text-slate-400">
                        غيّر الفترة أو أضف تفرغات أكثر من صفحة التفرغات، أو استخدم الإضافة اليدوية بالأسفل.
                      </p>
                    </div>
                  ) : selectedShiftAvailableEntries.length === 0 ? (
                    <div className="glass-panel-soft rounded-[1.5rem] py-16 text-center">
                      <User className="mx-auto mb-3 h-10 w-10 text-amber-400/70" />
                      <p className="font-medium">لا توجد أسماء مطابقة لهذا الفلتر</p>
                      <p className="mt-2 text-sm text-slate-400">
                        غيّر فلتر الرتبة لعرض بقية الأسماء المتاحة أو استخدم الإضافة اليدوية بالأسفل.
                      </p>
                    </div>
                  ) : (
                    <>
                    {selectedShiftAvailableEntries.map((entry) => {
                      const { person, alreadyAssigned, assignedElsewhere, targets, monthlyCount } = entry;

                      return (
                        <div
                          key={person.userId}
                          draggable={!alreadyAssigned && !assignedElsewhere && targets.length > 0}
                          onDragStart={(event) => {
                            if (alreadyAssigned || assignedElsewhere || targets.length === 0) return;
                            event.dataTransfer.effectAllowed = "move";
                            handleAvailablePersonDragStart(person, "availability");
                          }}
                          onDragEnd={clearDragState}
                          className={`min-w-0 rounded-[1.4rem] border border-white/10 bg-white/[0.05] p-4 shadow-[0_14px_32px_rgba(2,6,23,0.14)] ${
                            !alreadyAssigned && !assignedElsewhere && targets.length > 0 ? "cursor-grab active:cursor-grabbing" : ""
                          }`}
                        >
                          <div className="mb-3 flex min-w-0 items-start justify-between gap-3">
                            <div className="min-w-0 flex-1">
                              <p className="text-base font-medium break-words leading-6 text-white">{person.userName}</p>
                              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs break-words text-slate-500">
                                <span>{MONTHS.find((m) => m.value === person.month)?.label} {person.year}</span>
                                <span>•</span>
                                <span>إجمالي المناوبات: {monthlyCount}</span>
                              </div>
                            </div>
                            {renderRole(person.userRole, true)}
                          </div>

                          {alreadyAssigned ? (
                            <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-xs text-emerald-200">
                              تمت إضافته بالفعل إلى هذه المناوبة.
                            </div>
                          ) : assignedElsewhere ? (
                            <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs text-amber-100">
                              هذا الشخص مكلّف بالفعل في الفترة {SHIFTS.find((item) => item.value === assignedElsewhere)?.label} من اليوم نفسه.
                            </div>
                          ) : targets.length === 0 ? (
                            <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs text-amber-100">
                              لا توجد خانات متاحة لهذا الشخص حاليًا.
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {monthlyCount > MAX_SHIFTS_PER_PERSON && (
                                <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs text-amber-100">
                                  تنبيه: هذا الشخص تجاوز بالفعل حد {MAX_SHIFTS_PER_PERSON} مناوبة هذا الشهر.
                                </div>
                              )}
                              <div className="rounded-xl border border-sky-400/20 bg-sky-400/10 px-3 py-2 text-xs text-sky-100">
                                يمكنك سحب البطاقة وإفلاتها مباشرة في الخانة المطلوبة، أو استخدام الإضافة اليدوية من الأزرار التالية.
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {targets.map((target) => (
                                  <Button
                                    key={`${person.userId}-${target.type}-${target.teamId ?? "none"}-${target.slotKey ?? "all"}`}
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      assignPersonToShift(selectedDay || 1, selectedShift || "morning", person, target, {
                                        source: "buttons",
                                      })
                                    }
                                    className="max-w-full border-white/10 bg-white/[0.04] hover:bg-white/[0.08]"
                                  >
                                    <Plus className="ml-1 h-3.5 w-3.5" />
                                    {target.label}
                                  </Button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    </>
                  )}

                  <div className="min-w-0 rounded-[1.4rem] border border-dashed border-white/10 bg-white/[0.03] p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <h4 className="text-base font-semibold text-white">إضافة يدوية</h4>
                        <p className="mt-1 text-xs leading-6 text-slate-400">
                          ابحث عن أي كادر نشط لإضافته يدويًا حتى لو لم يكن ضمن التفرغ، وسيتم تسجيل تحذير واضح بذلك.
                        </p>
                      </div>
                      <Badge variant="outline">بحث يدوي</Badge>
                    </div>

                    <div className="relative">
                      <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                      <Input
                        value={manualAssignSearchTerm}
                        onChange={(event) => setManualAssignSearchTerm(event.target.value)}
                        placeholder="ابحث بالاسم أو البريد..."
                        className={`${searchInputClass} pr-10`}
                      />
                    </div>

                    {manualAssignSearchTerm.trim().length === 0 ? (
                      <p className="mt-3 text-xs text-slate-500">ابدأ بكتابة اسم الكادر أو بريده لعرض نتائج الإضافة اليدوية.</p>
                    ) : manualAssignmentCandidates.length === 0 ? (
                      <p className="mt-3 text-xs text-slate-500">لا توجد نتائج مطابقة لبحثك أو لفلتر الرتبة الحالي، أو أن النتائج الحالية غير نشطة.</p>
                    ) : (
                      <div className="mt-4 space-y-3">
                        {manualAssignmentCandidates.map((entry) => (
                          <div
                              key={entry.person.id}
                              draggable={!entry.alreadyInShift && !entry.assignedElsewhere && entry.targets.length > 0}
                              onDragStart={(event) => {
                                if (entry.alreadyInShift || entry.assignedElsewhere || entry.targets.length === 0) return;
                                event.dataTransfer.effectAllowed = "move";
                                handleAvailablePersonDragStart(entry.availabilityRecord, "manual");
                              }}
                              onDragEnd={clearDragState}
                              className={`rounded-[1.2rem] border border-white/10 bg-white/[0.04] p-3 ${
                                !entry.alreadyInShift && !entry.assignedElsewhere && entry.targets.length > 0 ? "cursor-grab active:cursor-grabbing" : ""
                              }`}
                            >
                              <div className="mb-3 flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="break-words font-medium text-white">{entry.person.name}</p>
                                  <p className="mt-1 break-words text-xs text-slate-500">{entry.person.email}</p>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                  {renderRole(entry.person.role, true)}
                                  <Badge className={entry.isAvailable ? "bg-emerald-600 text-white" : "bg-amber-600 text-white"}>
                                    {entry.isAvailable ? "ضمن التفرغ" : "خارج التفرغ"}
                                  </Badge>
                                </div>
                              </div>

                              <div className="mb-3 flex flex-wrap gap-2 text-xs">
                                <Badge variant="outline">إجمالي المناوبات: {entry.monthlyCount}</Badge>
                                {entry.monthlyCount > MAX_SHIFTS_PER_PERSON && (
                                  <Badge className="bg-amber-600 text-white">تجاوز الحد</Badge>
                                )}
                              </div>

                              {entry.alreadyInShift ? (
                                <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-xs text-emerald-200">
                                  هذا الكادر مضاف بالفعل إلى هذه المناوبة.
                                </div>
                              ) : entry.assignedElsewhere ? (
                                <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs text-amber-100">
                                  هذا الكادر لديه تكليف آخر في اليوم نفسه ضمن الفترة {SHIFTS.find((item) => item.value === entry.assignedElsewhere)?.label}.
                                </div>
                              ) : entry.targets.length === 0 ? (
                                <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs text-amber-100">
                                  لا توجد خانات مناسبة لهذا الكادر حاليًا.
                                </div>
                              ) : (
                                <div className="space-y-3">
                                  {!entry.isAvailable && (
                                    <div className="rounded-xl border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs text-amber-100">
                                      سيتم اعتباره إضافة يدوية خارج التفرغ وسيظهر ذلك في سجل الأحداث.
                                    </div>
                                  )}
                                  <div className="flex flex-wrap gap-2">
                                    {entry.targets.map((target) => (
                                      <Button
                                        key={`${entry.person.id}-${target.type}-${target.teamId ?? "none"}-${target.slotKey ?? "all"}`}
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        onClick={() =>
                                          assignPersonToShift(
                                            selectedDay || 1,
                                            selectedShift || "morning",
                                            entry.availabilityRecord,
                                            target,
                                            {
                                              allowOutsideAvailability: !entry.isAvailable,
                                              source: "manual",
                                            }
                                          )
                                        }
                                        className="max-w-full border-white/10 bg-white/[0.04] hover:bg-white/[0.08]"
                                      >
                                        <Plus className="ml-1 h-3.5 w-3.5" />
                                        {target.label}
                                      </Button>
                                    ))}
                                  </div>
                                </div>
                              )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Day Detail Dialog */}
      <Dialog open={showDayDetailDialog} onOpenChange={setShowDayDetailDialog}>
        <DialogContent className="w-[95vw] max-w-4xl border-white/10 bg-[linear-gradient(180deg,rgba(21,31,53,0.96),rgba(10,16,30,0.94))]">
          <DialogHeader>
            <DialogTitle className="text-white">
              تفاصيل يوم {calendarDetailDay} - {MONTHS.find(m => m.value === calendarMonth)?.label}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            {schedule[calendarDetailDay || 0] ? (
              <div className="space-y-4 p-2">
                {SHIFTS.map(shift => {
                  const shiftStructure = schedule[calendarDetailDay || 0]?.[shift.value];
                  if (!shiftStructure) return null;
                  const currentUserAssignment = user
                    ? getAllScheduledPeople.find(
                        (person) =>
                          person.personId === user.id &&
                          person.day === (calendarDetailDay || 0) &&
                          person.shift === shift.value
                      ) ?? null
                    : null;
                  const currentUserJoinTargets = calendarDetailDay
                    ? getCurrentUserJoinTargets(calendarDetailDay, shift.value)
                    : [];
                  
                  const hasPeople = shiftStructure.teams.some(t => t.members.length > 0) ||
                                   shiftStructure.operations.length > 0 ||
                                   shiftStructure.sector;
                  
                  if (!hasPeople && !currentUserAssignment && currentUserJoinTargets.length === 0) return null;
                  
                  return (
                    <div key={shift.value} className={`min-w-0 rounded-[1.4rem] border p-4 ${isDarkMode ? "border-white/10 bg-white/[0.05]" : "bg-gray-50"}`}>
                      <h4 className={`font-bold mb-2 flex items-center gap-2 ${shift.color}`}>
                        {shift.icon}
                        {shift.label}
                      </h4>
                      
                      {shiftStructure.teams.some(t => t.members.length > 0) && (
                        <div className="mb-3">
                          <p className={`text-xs mb-2 ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>فرق الإسعاف</p>
                          <div className="grid gap-2 lg:grid-cols-2">
                            {shiftStructure.teams.map(team => (
                              team.members.length > 0 && (
                                <div key={team.id} className={`min-w-0 rounded-xl border p-3 ${isDarkMode ? "border-white/[0.08] bg-white/[0.04]" : "bg-white border"}`}>
                                  <p className={`text-xs font-medium mb-1 ${isDarkMode ? "text-cyan-400" : "text-cyan-600"}`}>
                                    {team.name}
                                  </p>
                                  {getMissingRequiredRoles(team).length > 0 && (
                                    <p className="mb-2 text-[11px] text-amber-300">
                                      ينقص هذا الفريق: {getMissingRequiredRoles(team).map((role) => ROLES.find((item) => item.value === role)?.label).join("، ")}
                                    </p>
                                  )}
                                  {team.members.map(m => (
                                    <div key={m.userId} className="mb-1 flex min-w-0 items-center justify-between gap-1">
                                      <span className="min-w-0 break-words text-xs">{m.userName}</span>
                                      {renderRole(m.userRole, true)}
                                    </div>
                                  ))}
                                </div>
                              )
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {shiftStructure.operations.length > 0 && (
                        <div className="mb-3">
                          <p className={`text-xs mb-2 ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>العمليات</p>
                          <div className="flex flex-wrap gap-2">
                            {shiftStructure.operations.map(m => (
                              <span key={m.userId} className={`rounded-full border px-2.5 py-1 text-xs ${isDarkMode ? "border-white/[0.08] bg-white/[0.04]" : "bg-white border"}`}>
                                {m.userName}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {shiftStructure.sector && (
                        <div>
                          <p className={`text-xs mb-2 ${isDarkMode ? "text-slate-400" : "text-gray-500"}`}>القطاع</p>
                          <span className={`rounded-full border px-2.5 py-1 text-xs ${isDarkMode ? "border-white/[0.08] bg-white/[0.04]" : "bg-white border"}`}>
                            {shiftStructure.sector.userName}
                          </span>
                        </div>
                      )}

                      {(currentUserAssignment || currentUserJoinTargets.length > 0) && (
                        <div className="mt-4 rounded-[1.2rem] border border-white/10 bg-white/[0.04] p-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-white">إجراءاتك على هذه المناوبة</p>
                            <Badge className="bg-emerald-600 text-white">تنفيذ فوري</Badge>
                          </div>
                          <p className="mt-2 text-xs leading-6 text-slate-400">
                            يمكنك من هنا تبديل مناوبتك مباشرة مع شخص آخر، أو الانضمام فورًا إذا كانت هناك خانة مناسبة لك وما زلت ضمن التفرغ المسجل.
                          </p>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {currentUserAssignment && (
                              <Button
                                size="sm"
                                onClick={() =>
                                  openSwapDialog({
                                    day: currentUserAssignment.day,
                                    shift: currentUserAssignment.shift,
                                    personId: currentUserAssignment.personId,
                                    personName: currentUserAssignment.personName,
                                    personRole: currentUserAssignment.personRole,
                                    position: currentUserAssignment.position,
                                    teamId: currentUserAssignment.teamId,
                                    locationType: currentUserAssignment.locationType,
                                    slotKey: currentUserAssignment.slotKey ?? null,
                                    initialMode: "swap",
                                  })
                                }
                                className="bg-red-600 hover:bg-red-700"
                              >
                                <ArrowRightLeft className="ml-2 h-4 w-4" />
                                تبديل فوري
                              </Button>
                            )}
                            {!currentUserAssignment && currentUserJoinTargets.length > 0 && user && (
                              <Button
                                size="sm"
                                onClick={() =>
                                  openSwapDialog({
                                    day: calendarDetailDay || 0,
                                    shift: shift.value,
                                    personId: user.id,
                                    personName: user.name,
                                    personRole: user.role,
                                    position: null,
                                    teamId: null,
                                    locationType: null,
                                    initialMode: "join",
                                  })
                                }
                                className="bg-emerald-600 hover:bg-emerald-700"
                              >
                                <Plus className="ml-2 h-4 w-4" />
                                انضمام فوري
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <CalendarDays className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className={isDarkMode ? "text-slate-400" : "text-gray-400"}>لا يوجد جدول لهذا اليوم</p>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}

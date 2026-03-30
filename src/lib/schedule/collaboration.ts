import { getDayOfWeek } from "@/lib/schedule/utils";
import {
  isSectorRole,
  isTeamAssignableRole,
  type AppRole,
} from "@/lib/user-access";

export type Shift = "morning" | "evening" | "night";
export type Role = AppRole;
export type PositionType = "team" | "operations" | "sector";
export type TeamSlotKey = "leader" | "scout" | "medic-1" | "medic-2";
export type CollaborationRequestType = "swap" | "join";
export type CollaborationRequestStatus = "pending" | "approved" | "rejected" | "cancelled";
export type CollaborationNotificationType = "warning" | "info" | "success" | "error";

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

export interface AssignmentLocation {
  type: PositionType;
  teamId: number | null;
  slotKey?: TeamSlotKey | null;
}

export interface ScheduledAssignment {
  day: number;
  shift: Shift;
  location: AssignmentLocation;
  positionLabel: string;
  personId: string;
  personName: string;
  personRole: Role;
}

export interface CollaborationRequestPayload {
  day: number;
  shift: Shift;
  location: AssignmentLocation;
  positionLabel: string;
  personId: string | null;
  personName: string | null;
  personRole: Role | null;
}

export interface ShiftCollaborationRequest {
  id: string;
  month: number;
  year: number;
  type: CollaborationRequestType;
  status: CollaborationRequestStatus;
  requesterId: string;
  requesterName: string;
  requesterRole: Role;
  source: CollaborationRequestPayload | null;
  target: CollaborationRequestPayload;
  note: string | null;
  resolutionNote: string | null;
  createdAt: string;
  updatedAt: string;
  respondedAt: string | null;
  respondedById: string | null;
  respondedByName: string | null;
}

export interface ShiftSmartNotification {
  id: string;
  userId: string;
  actorId: string | null;
  actorName: string | null;
  type: CollaborationNotificationType;
  title: string;
  message: string;
  relatedRequestId: string | null;
  requiresAction: boolean;
  readAt: string | null;
  createdAt: string;
}

export interface ScheduleCollaborationState {
  requests: ShiftCollaborationRequest[];
  notifications: ShiftSmartNotification[];
  lastUpdatedAt: string | null;
}

export interface ScheduleDocument {
  days: Record<number, DayScheduleStructure>;
  collaboration: ScheduleCollaborationState;
}

interface TeamSlotDefinition {
  key: TeamSlotKey;
  label: string;
  role: Extract<Role, "leader" | "scout" | "medic">;
}

interface ShiftCapacityConfig {
  preferredTeams: number;
  maxTeams: number;
  preferredOperations: number;
  maxOperations: number;
}

const MAX_TEAM_MEMBERS = 4;
const NUM_TEAMS = 4;
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

export const buildEmptyCollaborationState = (): ScheduleCollaborationState => ({
  requests: [],
  notifications: [],
  lastUpdatedAt: null,
});

export const createEmptyShiftStructure = (): ShiftStructure => ({
  teams: Array.from({ length: NUM_TEAMS }, (_, index) => ({
    id: index + 1,
    name: `فريق ${index + 1}`,
    members: [],
    maxMembers: MAX_TEAM_MEMBERS,
  })),
  operations: [],
  sector: null,
});

export const createEmptyDaySchedule = (): DayScheduleStructure => ({
  morning: createEmptyShiftStructure(),
  evening: createEmptyShiftStructure(),
  night: createEmptyShiftStructure(),
});

export const parseScheduleDocument = (value: string | null | undefined): ScheduleDocument => {
  if (!value) {
    return {
      days: {},
      collaboration: buildEmptyCollaborationState(),
    };
  }

  try {
    const parsed = JSON.parse(value);

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {
        days: {},
        collaboration: buildEmptyCollaborationState(),
      };
    }

    if ("days" in parsed || "collaboration" in parsed) {
      const normalized = parsed as {
        days?: Record<number, DayScheduleStructure>;
        collaboration?: Partial<ScheduleCollaborationState>;
      };

      return {
        days: normalized.days && typeof normalized.days === "object" ? normalized.days : {},
        collaboration: {
          requests: Array.isArray(normalized.collaboration?.requests)
            ? normalized.collaboration?.requests
            : [],
          notifications: Array.isArray(normalized.collaboration?.notifications)
            ? normalized.collaboration?.notifications
            : [],
          lastUpdatedAt: normalized.collaboration?.lastUpdatedAt ?? null,
        },
      };
    }

    return {
      days: parsed as Record<number, DayScheduleStructure>,
      collaboration: buildEmptyCollaborationState(),
    };
  } catch {
    return {
      days: {},
      collaboration: buildEmptyCollaborationState(),
    };
  }
};

export const serializeScheduleDocument = (document: ScheduleDocument) =>
  JSON.stringify({
    days: document.days,
    collaboration: {
      requests: [...document.collaboration.requests]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 200),
      notifications: [...document.collaboration.notifications]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 400),
      lastUpdatedAt: document.collaboration.lastUpdatedAt ?? null,
    },
  });

const cloneDays = (days: Record<number, DayScheduleStructure>) => {
  if (typeof structuredClone === "function") {
    return structuredClone(days);
  }

  return JSON.parse(JSON.stringify(days)) as Record<number, DayScheduleStructure>;
};

const getShiftCapacity = (shift: Shift) => SHIFT_CAPACITY_CONFIG[shift];

const getTeamsForShift = (
  shiftStructure: ShiftStructure,
  shift: Shift,
  mode: "preferred" | "hard" = "hard"
) => {
  const config = getShiftCapacity(shift);
  const count = mode === "preferred" ? config.preferredTeams : config.maxTeams;
  return shiftStructure.teams.slice(0, count);
};

const getAcceptedRoleForSlot = (slotKey?: TeamSlotKey | null) =>
  TEAM_SLOT_DEFINITIONS.find((slot) => slot.key === slotKey)?.role ?? null;

const getTeamMembersByRole = (team: AmbulanceTeam, role: Extract<Role, "leader" | "scout" | "medic">) =>
  team.members.filter((member) => member.userRole === role);

export const getTeamSlotDefinitions = (team: AmbulanceTeam) => {
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

const canAssignRoleToTeam = (
  team: AmbulanceTeam,
  role: Role,
  options?: { slotKey?: TeamSlotKey | null }
) => {
  if (!isTeamAssignableRole(role)) {
    return false;
  }

  const acceptedRole = getAcceptedRoleForSlot(options?.slotKey);
  if (acceptedRole && acceptedRole !== role) {
    return false;
  }

  if (team.members.length >= team.maxMembers) {
    return false;
  }

  const roleLimit = TEAM_ROLE_LIMITS[role];
  const roleCount = team.members.filter((member) => member.userRole === role).length;
  return roleCount < roleLimit;
};

export const getLocationLabel = (location: AssignmentLocation) => {
  if (location.type === "sector") return "القطاع";
  if (location.type === "operations") return "العمليات";

  const slotLabel = TEAM_SLOT_DEFINITIONS.find((slot) => slot.key === location.slotKey)?.label;
  return `${location.teamId ? `فريق ${location.teamId}` : "فريق"}${slotLabel ? ` • ${slotLabel}` : ""}`;
};

export const findAssignmentLocation = (
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
    const slot = getTeamSlotDefinitions(team).find((entry) => entry.member?.userId === userId);
    if (slot) {
      return {
        type: "team",
        teamId: team.id,
        slotKey: slot.key,
      };
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

  if (location.teamId) {
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
  target: AssignmentLocation
) => {
  if (target.type === "sector") {
    return isSectorRole(member.userRole) && !shiftStructure.sector;
  }

  if (target.type === "operations") {
    return member.userRole !== "sector_lead" && shiftStructure.operations.length < getShiftCapacity(shift).maxOperations;
  }

  if (target.teamId) {
    const team = getTeamsForShift(shiftStructure, shift, "hard").find((item) => item.id === target.teamId);
    return Boolean(team && canAssignRoleToTeam(team, member.userRole, { slotKey: target.slotKey }));
  }

  return false;
};

const addMemberToLocation = (
  shiftStructure: ShiftStructure,
  member: TeamMember,
  target: AssignmentLocation
) => {
  if (target.type === "sector") {
    shiftStructure.sector = member;
    return;
  }

  if (target.type === "operations") {
    shiftStructure.operations.push(member);
    return;
  }

  if (target.teamId) {
    const team = shiftStructure.teams.find((item) => item.id === target.teamId);
    if (team) {
      team.members = sortTeamMembers([...team.members, member]);
    }
  }
};

export const listScheduledAssignments = (
  days: Record<number, DayScheduleStructure>
): ScheduledAssignment[] => {
  const results: ScheduledAssignment[] = [];

  Object.entries(days).forEach(([dayKey, daySchedule]) => {
    const day = Number(dayKey);

    (["morning", "evening", "night"] as Shift[]).forEach((shift) => {
      const shiftStructure = daySchedule[shift];

      shiftStructure.teams.forEach((team) => {
        getTeamSlotDefinitions(team).forEach((slot) => {
          if (!slot.member) return;

          results.push({
            day,
            shift,
            location: {
              type: "team",
              teamId: team.id,
              slotKey: slot.key,
            },
            positionLabel: getLocationLabel({
              type: "team",
              teamId: team.id,
              slotKey: slot.key,
            }),
            personId: slot.member.userId,
            personName: slot.member.userName,
            personRole: slot.member.userRole,
          });
        });
      });

      shiftStructure.operations.forEach((member) => {
        results.push({
          day,
          shift,
          location: {
            type: "operations",
            teamId: null,
          },
          positionLabel: "العمليات",
          personId: member.userId,
          personName: member.userName,
          personRole: member.userRole,
        });
      });

      if (shiftStructure.sector) {
        results.push({
          day,
          shift,
          location: {
            type: "sector",
            teamId: null,
          },
          positionLabel: "القطاع",
          personId: shiftStructure.sector.userId,
          personName: shiftStructure.sector.userName,
          personRole: shiftStructure.sector.userRole,
        });
      }
    });
  });

  return results.sort((a, b) => {
    if (a.day !== b.day) return a.day - b.day;
    if (a.shift !== b.shift) return a.shift.localeCompare(b.shift);
    return a.personName.localeCompare(b.personName, "ar");
  });
};

export const getUserAssignmentsForMonth = (
  days: Record<number, DayScheduleStructure>,
  userId: string
) => listScheduledAssignments(days).filter((assignment) => assignment.personId === userId);

export const findAssignmentAtLocation = (
  days: Record<number, DayScheduleStructure>,
  day: number,
  shift: Shift,
  location: AssignmentLocation
) => {
  const daySchedule = days[day];
  if (!daySchedule) return null;

  const shiftStructure = daySchedule[shift];
  if (!shiftStructure) return null;

  if (location.type === "sector" && shiftStructure.sector) {
    return {
      day,
      shift,
      location,
      positionLabel: "القطاع",
      personId: shiftStructure.sector.userId,
      personName: shiftStructure.sector.userName,
      personRole: shiftStructure.sector.userRole,
    } satisfies ScheduledAssignment;
  }

  if (location.type === "operations") {
    return null;
  }

  if (location.teamId) {
    const team = shiftStructure.teams.find((entry) => entry.id === location.teamId);
    const slot = team ? getTeamSlotDefinitions(team).find((entry) => entry.key === location.slotKey) : null;

    if (slot?.member) {
      return {
        day,
        shift,
        location,
        positionLabel: getLocationLabel(location),
        personId: slot.member.userId,
        personName: slot.member.userName,
        personRole: slot.member.userRole,
      } satisfies ScheduledAssignment;
    }
  }

  return null;
};

export const getUserAssignedShiftForDay = (
  days: Record<number, DayScheduleStructure>,
  day: number,
  userId: string,
  excludeShift?: Shift
) => {
  const daySchedule = days[day];
  if (!daySchedule) return null;

  for (const shift of ["morning", "evening", "night"] as Shift[]) {
    if (excludeShift && shift === excludeShift) continue;

    const location = findAssignmentLocation(daySchedule[shift], userId);
    if (location) {
      return shift;
    }
  }

  return null;
};

export const getJoinTargetsForRole = (
  days: Record<number, DayScheduleStructure>,
  day: number,
  shift: Shift,
  role: Role
) => {
  const daySchedule = days[day] ?? createEmptyDaySchedule();
  const shiftStructure = daySchedule[shift];
  const targets: AssignmentLocation[] = [];

  if (isTeamAssignableRole(role)) {
    getTeamsForShift(shiftStructure, shift, "hard").forEach((team) => {
      getTeamSlotDefinitions(team).forEach((slot) => {
        if (slot.member) return;
        if (!canAssignRoleToTeam(team, role, { slotKey: slot.key })) return;

        targets.push({
          type: "team",
          teamId: team.id,
          slotKey: slot.key,
        });
      });
    });
  }

  if (role !== "sector_lead" && shiftStructure.operations.length < getShiftCapacity(shift).maxOperations) {
    targets.push({
      type: "operations",
      teamId: null,
    });
  }

  if (isSectorRole(role) && !shiftStructure.sector) {
    targets.push({
      type: "sector",
      teamId: null,
    });
  }

  return targets;
};

export const applyJoinRequest = (
  days: Record<number, DayScheduleStructure>,
  member: TeamMember,
  target: CollaborationRequestPayload
) => {
  const nextDays = cloneDays(days);
  const daySchedule = nextDays[target.day] ?? createEmptyDaySchedule();
  nextDays[target.day] = daySchedule;

  const duplicateShift = findAssignmentLocation(daySchedule[target.shift], member.userId);
  if (duplicateShift) {
    throw new Error("أنت مضاف بالفعل إلى هذه المناوبة");
  }

  const assignedElsewhereSameDay = getUserAssignedShiftForDay(nextDays, target.day, member.userId, target.shift);
  if (assignedElsewhereSameDay) {
    throw new Error("لديك مناوبة أخرى في اليوم نفسه، لذلك لا يمكن الانضمام");
  }

  if (!canPlaceMemberInLocation(daySchedule[target.shift], member, target.shift, target.location)) {
    throw new Error("لم يعد هذا المكان الشاغر متاحًا للانضمام");
  }

  addMemberToLocation(daySchedule[target.shift], member, target.location);
  return nextDays;
};

export const applySwapRequest = (
  days: Record<number, DayScheduleStructure>,
  source: CollaborationRequestPayload,
  target: CollaborationRequestPayload
) => {
  const nextDays = cloneDays(days);
  const sourceDaySchedule = nextDays[source.day];
  const targetDaySchedule = nextDays[target.day];

  if (!sourceDaySchedule || !targetDaySchedule) {
    throw new Error("تعذر العثور على المناوبات المطلوبة لإتمام التبديل");
  }

  const sourceShiftStructure = sourceDaySchedule[source.shift];
  const targetShiftStructure = targetDaySchedule[target.shift];
  const allAssignments = listScheduledAssignments(nextDays);
  const sourceMember =
    source.personId
      ? allAssignments.find(
          (entry) =>
            entry.personId === source.personId &&
            entry.day === source.day &&
            entry.shift === source.shift &&
            entry.location.type === source.location.type &&
            entry.location.teamId === source.location.teamId &&
            (entry.location.slotKey ?? null) === (source.location.slotKey ?? null)
        ) ?? null
      : null;
  const targetMember =
    target.personId
      ? allAssignments.find(
          (entry) =>
            entry.personId === target.personId &&
            entry.day === target.day &&
            entry.shift === target.shift &&
            entry.location.type === target.location.type &&
            entry.location.teamId === target.location.teamId &&
            (entry.location.slotKey ?? null) === (target.location.slotKey ?? null)
        ) ?? null
      : null;

  if (!sourceMember) {
    throw new Error("موقع المناوبة الأول تغيّر منذ إنشاء الطلب");
  }

  if (!targetMember) {
    throw new Error("موقع المناوبة الثانية تغيّر منذ إنشاء الطلب");
  }

  if (sourceMember.personId === targetMember.personId) {
    throw new Error("لا يمكن تبديل الشخص مع نفسه");
  }

  removeMemberFromLocation(sourceShiftStructure, source.location, sourceMember.personId);
  if (
    source.day !== target.day ||
    source.shift !== target.shift ||
    source.location.type !== target.location.type ||
    source.location.teamId !== target.location.teamId ||
    source.location.slotKey !== target.location.slotKey
  ) {
    removeMemberFromLocation(targetShiftStructure, target.location, targetMember.personId);
  }

  const draggedSourceMember: TeamMember = {
    userId: sourceMember.personId,
    userName: sourceMember.personName,
    userRole: sourceMember.personRole,
  };
  const draggedTargetMember: TeamMember = {
    userId: targetMember.personId,
    userName: targetMember.personName,
    userRole: targetMember.personRole,
  };

  if (!canPlaceMemberInLocation(targetShiftStructure, draggedSourceMember, target.shift, target.location)) {
    throw new Error("لا يمكن نقل صاحب الطلب إلى موقع المناوبة المطلوبة وفق قيود الرتبة والخانة");
  }

  if (!canPlaceMemberInLocation(sourceShiftStructure, draggedTargetMember, source.shift, source.location)) {
    throw new Error("لا يمكن نقل الطرف الآخر إلى موقع صاحب الطلب وفق قيود الرتبة والخانة");
  }

  addMemberToLocation(targetShiftStructure, draggedSourceMember, target.location);
  addMemberToLocation(sourceShiftStructure, draggedTargetMember, source.location);

  return nextDays;
};

export const isUserAvailableForShift = (
  availability: {
    sunday: string;
    monday: string;
    tuesday: string;
    wednesday: string;
    thursday: string;
    friday: string;
    saturday: string;
  } | null,
  day: number,
  month: number,
  year: number,
  shift: Shift
) => {
  if (!availability) return false;

  const dayOfWeek = getDayOfWeek(day, month, year) as keyof typeof availability;
  const value = availability[dayOfWeek];
  if (!value) return false;

  try {
    const parsed = JSON.parse(value) as Shift[];
    return Array.isArray(parsed) && parsed.includes(shift);
  } catch {
    return false;
  }
};

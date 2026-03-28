"use client";

import { useState, useEffect, useMemo } from "react";
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
import { 
  CalendarDays, User, LayoutDashboard, Send, Trash2, RefreshCw, Ambulance, 
  Sun, Sunset, Moon, Award, Crown, Star,
  Printer, Moon as MoonIcon, Sun as SunIcon, BarChart3, Users,
  Edit, ChevronLeft, ChevronRight, Plus, Check, Save, FileSpreadsheet,
  ClipboardList, Truck, Radio, MapPin, Search, X, Calendar, Bell,
  AlertCircle, Info, CheckCircle, XCircle, Clock, ArrowRightLeft, FileText, Download, LogOut
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

type Shift = "morning" | "evening" | "night";
type Role = "sector_commander" | "team_leader" | "scout" | "medic";

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

interface NotificationEvent {
  id: string;
  type: "warning" | "info" | "success" | "error";
  title: string;
  message: string;
  time: string;
  read: boolean;
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

const SHIFTS = [
  { value: "morning" as Shift, label: "صباحي", icon: <Sun className="h-4 w-4" />, color: "text-amber-400", bgColor: "bg-amber-500/10 border-amber-500/30", activeBg: "bg-amber-500/30 border-amber-500" },
  { value: "evening" as Shift, label: "مسائي", icon: <Sunset className="h-4 w-4" />, color: "text-orange-400", bgColor: "bg-orange-500/10 border-orange-500/30", activeBg: "bg-orange-500/30 border-orange-500" },
  { value: "night" as Shift, label: "ليلي", icon: <Moon className="h-4 w-4" />, color: "text-purple-400", bgColor: "bg-purple-500/10 border-purple-500/30", activeBg: "bg-purple-500/30 border-purple-500" },
];

const ROLES: { value: Role; label: string; icon: JSX.Element; color: string; bgColor: string; level: number }[] = [
  { value: "sector_commander", label: "قائد قطاع", icon: <Crown className="h-3 w-3" />, color: "text-red-400", bgColor: "bg-red-500/20 border-red-500/50", level: 4 },
  { value: "team_leader", label: "قائد فريق", icon: <Award className="h-3 w-3" />, color: "text-yellow-400", bgColor: "bg-yellow-500/20 border-yellow-500/50", level: 3 },
  { value: "scout", label: "كشاف", icon: <Star className="h-3 w-3" />, color: "text-emerald-400", bgColor: "bg-emerald-500/20 border-emerald-500/50", level: 2 },
  { value: "medic", label: "مسعف", icon: <Ambulance className="h-3 w-3" />, color: "text-cyan-400", bgColor: "bg-cyan-500/20 border-cyan-500/50", level: 1 },
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
const MAX_OPERATIONS = 4;
const NUM_TEAMS = 4;
const MAX_PEOPLE_PER_SHIFT = 21;

// Deterministic seeded random for consistent SSR/CSR
const seededRandom = (seed: number): number => {
  const x = Math.sin(seed * 9999) * 10000;
  return x - Math.floor(x);
};

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

const FIRST_NAMES = [
  "أحمد", "محمد", "علي", "خالد", "سعد", "فهد", "عبدالله", "عبدالرحمن", "سلمان", "ناصر",
  "عمر", "يوسف", "حسين", "حسن", "محمود", "إبراهيم", "عيسى", "يحيى", "زياد", "طارق",
  "بندر", "تركي", "سعود", "فيصل", "ماجد", "عبدالعزيز", "عبدالمجيد", "عبدالملك", "راشد", "حمود",
  "سلطان", "فواز", "مشعل", "رائد", "سامي", "هاني", "جمال", "عادل", "خلف", "مبارك",
  "دخيل", "هذال", "عتيق", "مرزوق", "سليم", "عزيز", "زايد", "هادي", "جاسر", "شافي",
  "مفلح", "عواد", "سالم", "حمد", "صالح", "عامر", "جبر", "نواف", "طلال", "منصور",
  "غازي", "ضيف", "سيف", "مطر", "حمدان", "عبدالوهاب", "سريع", "براك", "هلال", "عقاب",
  "جروان", "شبيب", "ماهر", "فلاح", "جابر", "ناجي", "عطية", "مفرح", "صنهات", "مقبل",
  "عليان", "جازي"
];

const LAST_NAMES = [
  "الغامدي", "الشمري", "العتيبي", "القرني", "السبيعي", "الزهراني", "المطيري", "الدوسري", "الحربي", "العنزي",
  "الرشيدي", "المالكي", "الجهني", "السهلي", "المري", "العوفي", "البلوي", "القحطاني", "العمري", "الخضيري",
  "السويلم", "الراجحي", "الطائي", "البقمي", "العبسي", "النجادي", "الخالدي"
];

// Deterministic user generation
const generateUsers = (): { id: string; name: string; role: Role }[] => {
  const users: { id: string; name: string; role: Role }[] = [];
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
        role: role
      });
      id++;
    }
  }
  
  return users;
};

// Deterministic availability generation
const generateAvailabilities = (users: { id: string; name: string; role: Role }[]): AvailabilityData[] => {
  let seed = 1000;
  
  return users.map((user, index) => {
    const shiftOptions: Shift[] = ["morning", "evening", "night"];
    
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

const generateEvents = (): NotificationEvent[] => {
  return [
    { id: "1", type: "warning", title: "نقص في العدد", message: "يوم 15 من الشهر يحتاج 5 أشخاص إضافيين في الفترة الصباحية", time: "منذ 5 دقائق", read: false },
    { id: "2", type: "info", title: "تحديث الجدول", message: "تم تحديث جدول الشهر القادم بنجاح", time: "منذ 15 دقيقة", read: false },
    { id: "3", type: "success", title: "اكتمال الفريق", message: "جميع فرق الإسعاف مكتملة ليوم غد", time: "منذ ساعة", read: true },
    { id: "4", type: "error", title: "تعارض في المواعيد", message: "هناك تعارض في جدول أحمد علي - يرجى المراجعة", time: "منذ 2 ساعة", read: false },
    { id: "5", type: "info", title: "تذكير", message: "موعد تسليم جدول الشهر القادم بعد 3 أيام", time: "منذ 3 ساعات", read: true },
  ];
};

// Generate data once at module level (deterministic)
const GENERATED_USERS = generateUsers();
const GENERATED_AVAILABILITIES = generateAvailabilities(GENERATED_USERS);
const GENERATED_EVENTS = generateEvents();

export function AppContent() {
  const { user, logout } = useAuth();
  
  const [selectedMonth, setSelectedMonth] = useState(currentMonth.toString());
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [availability, setAvailability] = useState<Record<string, Shift[]>>({
    sunday: [], monday: [], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: []
  });
  const [records, setRecords] = useState<AvailabilityData[]>(GENERATED_AVAILABILITIES);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(currentMonth);
  const [calendarYear, setCalendarYear] = useState(currentYear);
  const [activeTab, setActiveTab] = useState("form");
  const [scheduleMonth, setScheduleMonth] = useState(currentMonth);
  const [scheduleYear, setScheduleYear] = useState(currentYear);
  const [schedule, setSchedule] = useState<Record<number, DayScheduleStructure>>({});
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<Role | "all">("all");
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserRole, setNewUserRole] = useState<Role>("medic");
  
  // التقويم - البحث والتصفية
  const [calendarSearchTerm, setCalendarSearchTerm] = useState("");
  const [showDayDetailDialog, setShowDayDetailDialog] = useState(false);
  const [calendarDetailDay, setCalendarDetailDay] = useState<number | null>(null);
  
  // الإشعارات والأحداث
  const [showNotificationsPopup, setShowNotificationsPopup] = useState(false);
  const [events, setEvents] = useState<NotificationEvent[]>(GENERATED_EVENTS);
  
  // الاستبدالات
  const [swapLogs, setSwapLogs] = useState<SwapLog[]>([]);
  const [showSwapDialog, setShowSwapDialog] = useState(false);
  const [swapData, setSwapData] = useState<{
    day: number;
    shift: Shift;
    personId: string;
    personName: string;
    personRole: Role;
    position: string;
    teamId: number | null;
  } | null>(null);
  const [swapSearchTerm, setSwapSearchTerm] = useState("");
  const [swapFilterDay, setSwapFilterDay] = useState<string>("all");
  const [swapFilterShift, setSwapFilterShift] = useState<string>("all");
  const [swapMode, setSwapMode] = useState<"swap" | "replace" | "join">("swap");
  const [showSwapConfirm, setShowSwapConfirm] = useState(false);
  const [selectedSwapTarget, setSelectedSwapTarget] = useState<{
    day: number;
    shift: Shift;
    personId: string;
    personName: string;
    personRole: Role;
    position: string;
    teamId: number | null;
  } | null>(null);
  const [selectedEmptySlot, setSelectedEmptySlot] = useState<{
    day: number;
    shift: Shift;
    position: string;
    teamId: number | null;
    positionType: 'team' | 'operations' | 'sector';
  } | null>(null);
  
  // اقتراحات البحث
  const [showSearchSuggestions, setShowSearchSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(0);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      toast.success("تم حفظ التفرغات بنجاح");
      setNotes("");
      setAvailability({ sunday: [], monday: [], tuesday: [], wednesday: [], thursday: [], friday: [], saturday: [] });
      setIsSubmitting(false);
    }, 1000);
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
    setSelectedMonth(record.month.toString());
    setSelectedYear(record.year.toString());
    setActiveTab("form");
  };

  const handleDelete = (id: string) => {
    setRecords(records.filter(r => r.id !== id));
    toast.success("تم الحذف بنجاح");
  };

  const handleAddUser = () => {
    if (!newUserName.trim()) {
      toast.error("الرجاء إدخال الاسم");
      return;
    }
    
    const newId = (Math.max(...records.map(r => parseInt(r.id))) + 1).toString();
    
    const shiftOptions: Shift[] = ["morning", "evening", "night"];
    const generateRandomShifts = (): Shift[] => {
      const numShifts = Math.floor(Math.random() * 4);
      const shifts: Shift[] = [];
      const shuffled = [...shiftOptions].sort(() => Math.random() - 0.5);
      for (let i = 0; i < numShifts; i++) {
        shifts.push(shuffled[i]);
      }
      return shifts;
    };
    
    const newAvailability: AvailabilityData = {
      id: newId,
      userId: newId,
      userName: newUserName,
      userRole: newUserRole,
      month: currentMonth,
      year: currentYear,
      sunday: generateRandomShifts(),
      monday: generateRandomShifts(),
      tuesday: generateRandomShifts(),
      wednesday: generateRandomShifts(),
      thursday: generateRandomShifts(),
      friday: generateRandomShifts(),
      saturday: generateRandomShifts(),
      notes: null,
      createdAt: new Date().toISOString()
    };
    
    setRecords([...records, newAvailability]);
    setNewUserName("");
    setNewUserRole("medic");
    setShowUserDialog(false);
    toast.success(`تم إضافة ${newUserName} بنجاح`);
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
  const isAdmin = user?.role === "sector_commander" || user?.role === "team_leader";

  const getDaysInMonth = (month: number, year: number) => new Date(year, month, 0).getDate();

  const getDayOfWeek = (day: number, month: number, year: number): string => {
    const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    return days[new Date(year, month - 1, day).getDay()];
  };

  const getAvailableForDay = (day: number, shift: Shift): AvailabilityData[] => {
    const dayOfWeek = getDayOfWeek(day, scheduleMonth, scheduleYear);
    return records.filter(r => (r[dayOfWeek as keyof AvailabilityData] as Shift[]).includes(shift));
  };

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

  const autoFillSchedule = () => {
    const daysInMonth = getDaysInMonth(scheduleMonth, scheduleYear);
    const newSchedule: Record<number, DayScheduleStructure> = {};
    
    for (let day = 1; day <= daysInMonth; day++) {
      newSchedule[day] = {
        morning: createEmptyShiftStructure(),
        evening: createEmptyShiftStructure(),
        night: createEmptyShiftStructure()
      };
      
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
    toast.success("تم إنشاء الجدول بنجاح");
  };

  const clearSchedule = () => {
    setSchedule({});
    toast.success("تم مسح الجدول");
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

  const calendarSearchResults = calendarSearchTerm.trim() ? [] : [];
  const unreadEvents = events.filter(e => !e.read).length;

  const markEventAsRead = (eventId: string) => {
    setEvents(events.map(e => e.id === eventId ? { ...e, read: true } : e));
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case "warning": return <AlertCircle className="h-5 w-5 text-amber-400" />;
      case "info": return <Info className="h-5 w-5 text-blue-400" />;
      case "success": return <CheckCircle className="h-5 w-5 text-green-400" />;
      case "error": return <XCircle className="h-5 w-5 text-red-400" />;
      default: return <Bell className="h-5 w-5 text-gray-400" />;
    }
  };

  const getEventBg = (type: string) => {
    switch (type) {
      case "warning": return "bg-amber-500/10 border-amber-500/30";
      case "info": return "bg-blue-500/10 border-blue-500/30";
      case "success": return "bg-green-500/10 border-green-500/30";
      case "error": return "bg-red-500/10 border-red-500/30";
      default: return "bg-gray-500/10 border-gray-500/30";
    }
  };

  const printSchedule = () => {
    toast.success("تم فتح نافذة الطباعة");
  };

  const getSearchSuggestions = (term: string): AvailabilityData[] => {
    if (!term.trim()) return [];
    return records
      .filter(r => r.userName.toLowerCase().includes(term.toLowerCase()))
      .slice(0, 5);
  };

  const searchSuggestions = getSearchSuggestions(calendarSearchTerm);

  const openSwapDialog = (
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
    setSwapSearchTerm("");
    setSwapFilterDay("all");
    setSwapFilterShift("all");
    setSwapMode("swap");
    setSelectedSwapTarget(null);
    setShowSwapDialog(true);
  };

  const getAllScheduledPeople = useMemo(() => {
    const people: {
      day: number;
      shift: Shift;
      personId: string;
      personName: string;
      personRole: Role;
      position: string;
      teamId: number | null;
    }[] = [];
    
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

  const handleLogout = () => {
    logout();
    toast.success("تم تسجيل الخروج بنجاح");
  };

  const DayCard = ({ day }: { day: typeof WEEKDAYS[0] }) => {
    const dayShifts = availability[day.key] || [];
    const allSelected = dayShifts.length === 3;
    
    return (
      <div className={`rounded-2xl p-4 sm:p-5 lg:p-6 transition-all ${isDarkMode ? "bg-zinc-800/60 border border-zinc-700/50" : "bg-white border border-gray-200"}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h4 className={`font-bold text-lg sm:text-xl lg:text-2xl ${isDarkMode ? "text-white" : "text-gray-900"}`}>
              {day.label}
            </h4>
            {dayShifts.length > 0 && (
              <Badge className="bg-red-600 text-white text-xs px-2">
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
                className={`flex flex-col items-center justify-center gap-2 p-3 sm:p-4 lg:p-5 rounded-xl border-2 transition-all active:scale-95 min-h-[80px] lg:min-h-[100px] ${
                  isActive
                    ? `${shift.activeBg} ${shift.color} shadow-lg`
                    : isDarkMode
                      ? `${shift.bgColor} border-zinc-700 text-zinc-400`
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
      return s.teams.reduce((acc, t) => acc + t.members.length, 0) + s.operations.length + (s.sector ? 1 : 0);
    };
    
    return (
      <div className={`rounded-lg sm:rounded-xl p-1.5 sm:p-2 lg:p-3 ${isDarkMode ? "bg-zinc-800/60 border border-zinc-700/50" : "bg-white border border-gray-200"}`}>
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1">
            <span className={`text-xs sm:text-sm lg:text-base font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
              {day}
            </span>
            <span className={`text-[8px] sm:text-[10px] lg:text-xs ${isDarkMode ? "text-zinc-500" : "text-gray-400"}`}>
              {dayName}
            </span>
          </div>
        </div>
        <div className="space-y-0.5 sm:space-y-1">
          {SHIFTS.map((shift) => {
            const count = getShiftCount(shift.value);
            const available = getAvailableForDay(day, shift.value).length;
            return (
              <button
                key={shift.value}
                onClick={() => {
                  setSelectedDay(day);
                  setSelectedShift(shift.value);
                  setShowAssignDialog(true);
                }}
                className={`w-full rounded-md sm:rounded-lg p-1 sm:p-2 text-right transition-all hover:scale-[1.02] ${
                  isDarkMode
                    ? count > 0 ? shift.activeBg : "bg-zinc-700/30"
                    : count > 0 ? "bg-gray-100" : "bg-gray-50"
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <div className={`flex items-center gap-0.5 ${shift.color}`}>
                    {shift.icon}
                    <span className="text-[9px] sm:text-xs lg:text-sm">{shift.label}</span>
                  </div>
                  <div className="flex items-center gap-0.5">
                    <span className={`text-[8px] sm:text-[10px] ${isDarkMode ? "text-zinc-500" : "text-gray-400"}`}>
                      {available}
                    </span>
                    <Badge variant="outline" className={`text-[8px] sm:text-[10px] px-1 ${
                      count >= MAX_PEOPLE_PER_SHIFT
                        ? "bg-green-500/20 text-green-400"
                        : count > 0
                          ? "bg-amber-500/20 text-amber-400"
                          : ""
                    }`}>
                      {count}/{MAX_PEOPLE_PER_SHIFT}
                    </Badge>
                  </div>
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
    
    const isSearchMatch = calendarSearchTerm.trim() && calendarSearchResults.some(r => r.day === day);
    const hasSearchTerm = calendarSearchTerm.trim().length > 0;
    
    return (
      <button
        onClick={() => {
          setCalendarDetailDay(day);
          setShowDayDetailDialog(true);
        }}
        className={`rounded-lg sm:rounded-xl p-1.5 sm:p-2 lg:p-3 text-right transition-all hover:scale-[1.02] aspect-square flex flex-col ${
          isSearchMatch
            ? "bg-red-500/20 border-2 border-red-500 animate-pulse ring-2 ring-red-500/50"
            : hasSearchTerm && !isSearchMatch
              ? isDarkMode
                ? "bg-zinc-800/30 border border-zinc-700/30 opacity-40"
                : "bg-gray-100 border border-gray-200 opacity-40"
              : totalPeople > 0
                ? isDarkMode
                  ? "bg-green-500/10 border border-green-500/30"
                  : "bg-green-50 border border-green-200"
                : isDarkMode
                  ? "bg-zinc-800/60 border border-zinc-700/50"
                  : "bg-white border border-gray-200"
        }`}
      >
        <div className="flex flex-col items-start gap-0.5 flex-1">
          <span className={`text-base sm:text-lg font-bold leading-none ${
            isSearchMatch 
              ? "text-red-400" 
              : hasSearchTerm && !isSearchMatch
                ? isDarkMode ? "text-zinc-600" : "text-gray-400"
                : isDarkMode ? "text-white" : "text-gray-900"
          }`}>
            {day}
          </span>
          <span className={`text-[9px] sm:text-[10px] lg:text-xs leading-none ${
            isSearchMatch
              ? "text-red-400/80"
              : hasSearchTerm && !isSearchMatch
                ? isDarkMode ? "text-zinc-600" : "text-gray-400"
                : isDarkMode ? "text-zinc-500" : "text-gray-400"
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
                          : "bg-gray-600/30"
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

  const renderNotificationsPopup = () => (
    <Dialog open={showNotificationsPopup} onOpenChange={setShowNotificationsPopup}>
      <DialogContent className={`${isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-gray-200"} max-w-lg lg:max-w-xl xl:max-w-2xl`}>
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 text-lg lg:text-xl ${isDarkMode ? "text-white" : "text-gray-900"}`}>
            <Bell className="h-5 w-5 lg:h-6 lg:w-6 text-red-500" />
            الإشعارات والأحداث
            {unreadEvents > 0 && (
              <Badge className="bg-red-600 text-white ml-2">{unreadEvents} جديد</Badge>
            )}
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] lg:max-h-[70vh]">
          <div className="space-y-3 p-2">
            {events.length === 0 ? (
              <div className={`text-center py-8 ${isDarkMode ? "text-zinc-500" : "text-gray-400"}`}>
                <Bell className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>لا توجد إشعارات</p>
              </div>
            ) : (
              events.map((event) => (
                <div
                  key={event.id}
                  onClick={() => markEventAsRead(event.id)}
                  className={`p-4 lg:p-5 rounded-xl border cursor-pointer transition-all hover:scale-[1.01] ${
                    isDarkMode ? "bg-zinc-800/80 hover:bg-zinc-800" : "bg-gray-50 hover:bg-gray-100"
                  } ${getEventBg(event.type)} ${!event.read ? "ring-2 ring-red-500/30" : ""}`}
                >
                  <div className="flex items-start gap-3 lg:gap-4">
                    <div className={`p-2 lg:p-3 rounded-xl ${getEventBg(event.type)}`}>
                      {getEventIcon(event.type)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className={`font-bold text-sm lg:text-base ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                          {event.title}
                          {!event.read && (
                            <span className="inline-block w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse" />
                          )}
                        </h4>
                        <div className="flex items-center gap-1 text-[10px] lg:text-xs text-zinc-500">
                          <Clock className="h-3 w-3" />
                          {event.time}
                        </div>
                      </div>
                      <p className={`text-xs lg:text-sm ${isDarkMode ? "text-zinc-400" : "text-gray-600"}`}>
                        {event.message}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
        <div className="flex gap-2 pt-3">
          <Button
            variant="outline"
            onClick={() => setEvents(events.map(e => ({ ...e, read: true })))}
            className="flex-1 text-sm lg:text-base"
          >
            تحديد الكل كمقروء
          </Button>
          <Button
            onClick={() => setShowNotificationsPopup(false)}
            className="flex-1 bg-red-600 hover:bg-red-700 text-sm lg:text-base"
          >
            إغلاق
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );

  const renderSwapDialog = () => {
    if (!swapData) return null;
    
    const daysInMonth = getDaysInMonth(calendarMonth, calendarYear);
    
    return (
      <>
        <Dialog open={showSwapDialog} onOpenChange={setShowSwapDialog}>
          <DialogContent className={`${isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-gray-200"} max-w-3xl lg:max-w-4xl max-h-[90vh] overflow-hidden`}>
            <DialogHeader>
              <DialogTitle className={`flex items-center gap-2 text-lg lg:text-xl ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                <ArrowRightLeft className="h-5 w-5 lg:h-6 lg:w-6 text-red-500" />
                تبديل/استبدال/انضمام: {swapData.personName}
              </DialogTitle>
            </DialogHeader>
            
            <div className={`p-3 lg:p-4 rounded-xl mb-4 ${isDarkMode ? "bg-zinc-800 border border-zinc-700" : "bg-gray-50 border border-gray-200"}`}>
              <p className={`text-sm font-bold mb-3 ${isDarkMode ? "text-zinc-300" : "text-gray-600"}`}>
                اختر نوع العملية:
              </p>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setSwapMode("swap")}
                  className={`p-3 rounded-xl text-center transition-all ${
                    swapMode === "swap"
                      ? "bg-red-600 text-white ring-2 ring-red-400"
                      : isDarkMode
                        ? "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
                        : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
                  }`}
                >
                  <ArrowRightLeft className="h-5 w-5 mx-auto mb-1" />
                  <span className="text-sm font-bold">تبديل</span>
                  <p className="text-[10px] opacity-80 mt-1">الشخصان يتبادلان</p>
                </button>
                <button
                  onClick={() => setSwapMode("replace")}
                  className={`p-3 rounded-xl text-center transition-all ${
                    swapMode === "replace"
                      ? "bg-amber-600 text-white ring-2 ring-amber-400"
                      : isDarkMode
                        ? "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
                        : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
                  }`}
                >
                  <User className="h-5 w-5 mx-auto mb-1" />
                  <span className="text-sm font-bold">استبدال</span>
                  <p className="text-[10px] opacity-80 mt-1">يأخذ مكانه</p>
                </button>
                <button
                  onClick={() => setSwapMode("join")}
                  className={`p-3 rounded-xl text-center transition-all ${
                    swapMode === "join"
                      ? "bg-green-600 text-white ring-2 ring-green-400"
                      : isDarkMode
                        ? "bg-zinc-700 text-zinc-300 hover:bg-zinc-600"
                        : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
                  }`}
                >
                  <Plus className="h-5 w-5 mx-auto mb-1" />
                  <span className="text-sm font-bold">انضمام</span>
                  <p className="text-[10px] opacity-80 mt-1">ينضم لمكان شاغر</p>
                </button>
              </div>
            </div>

            <ScrollArea className="max-h-[50vh]">
              {swapMode === "join" ? (
                <div className="p-2">
                  <p className={`text-sm mb-3 ${isDarkMode ? "text-zinc-400" : "text-gray-500"}`}>
                    اختر مكان شاغر للانضمام إليه:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {getAllScheduledPeople.slice(0, 20).map((person, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setSelectedSwapTarget(person);
                          setShowSwapConfirm(true);
                        }}
                        className={`p-3 rounded-xl text-right transition-all ${
                          isDarkMode
                            ? "bg-zinc-800 hover:bg-zinc-700 border border-zinc-700"
                            : "bg-white hover:bg-gray-50 border border-gray-200"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className={`font-medium text-sm ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                              {person.personName}
                            </p>
                            <p className={`text-xs ${isDarkMode ? "text-zinc-400" : "text-gray-500"}`}>
                              يوم {person.day} - {WEEKDAYS_AR[getDayOfWeek(person.day, calendarMonth, calendarYear)]}
                            </p>
                            <p className={`text-xs ${isDarkMode ? "text-zinc-500" : "text-gray-400"}`}>
                              {person.position}
                            </p>
                          </div>
                          {renderRole(person.personRole, true)}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-2">
                  <p className={`text-sm mb-3 ${isDarkMode ? "text-zinc-400" : "text-gray-500"}`}>
                    اختر شخص للتبديل معه:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {getAllScheduledPeople.filter(p => p.personId !== swapData.personId).slice(0, 20).map((person, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setSelectedSwapTarget(person);
                          setShowSwapConfirm(true);
                        }}
                        className={`p-3 rounded-xl text-right transition-all ${
                          isDarkMode
                            ? "bg-zinc-800 hover:bg-zinc-700 border border-zinc-700"
                            : "bg-white hover:bg-gray-50 border border-gray-200"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <p className={`font-medium text-sm ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                              {person.personName}
                            </p>
                            <p className={`text-xs ${isDarkMode ? "text-zinc-400" : "text-gray-500"}`}>
                              يوم {person.day} - {WEEKDAYS_AR[getDayOfWeek(person.day, calendarMonth, calendarYear)]}
                            </p>
                            <p className={`text-xs ${isDarkMode ? "text-zinc-500" : "text-gray-400"}`}>
                              {person.position}
                            </p>
                          </div>
                          {renderRole(person.personRole, true)}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </ScrollArea>

            <div className="flex gap-2 pt-3">
              <Button variant="outline" onClick={() => setShowSwapDialog(false)} className="flex-1">
                إلغاء
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showSwapConfirm} onOpenChange={setShowSwapConfirm}>
          <DialogContent className={`${isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-gray-200"} max-w-md`}>
            <DialogHeader>
              <DialogTitle className={`text-lg ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                تأكيد {swapMode === "swap" ? "التبديل" : swapMode === "replace" ? "الاستبدال" : "الانضمام"}
              </DialogTitle>
            </DialogHeader>
            <div className={`p-4 rounded-xl ${isDarkMode ? "bg-zinc-800" : "bg-gray-50"}`}>
              {swapMode === "swap" ? (
                <p className={`text-sm ${isDarkMode ? "text-zinc-300" : "text-gray-600"}`}>
                  هل أنت متأكد من تبديل <strong>{swapData.personName}</strong> مع <strong>{selectedSwapTarget?.personName}</strong>؟
                </p>
              ) : swapMode === "replace" ? (
                <p className={`text-sm ${isDarkMode ? "text-zinc-300" : "text-gray-600"}`}>
                  هل أنت متأكد أن <strong>{swapData.personName}</strong> سيأخذ مكان <strong>{selectedSwapTarget?.personName}</strong>؟
                </p>
              ) : (
                <p className={`text-sm ${isDarkMode ? "text-zinc-300" : "text-gray-600"}`}>
                  هل أنت متأكد من انضمام <strong>{swapData.personName}</strong> للمكان المحدد؟
                </p>
              )}
            </div>
            <div className="flex gap-2 pt-3">
              <Button variant="outline" onClick={() => setShowSwapConfirm(false)} className="flex-1">
                إلغاء
              </Button>
              <Button
                onClick={() => {
                  toast.success(`تم ${swapMode === "swap" ? "التبديل" : swapMode === "replace" ? "الاستبدال" : "الانضمام"} بنجاح`);
                  setShowSwapConfirm(false);
                  setShowSwapDialog(false);
                }}
                className="flex-1 bg-red-600 hover:bg-red-700"
              >
                تأكيد
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

  return (
    <div className={`min-h-screen ${isDarkMode ? "bg-zinc-950 text-white" : "bg-gray-50 text-gray-900"}`}>
      {/* Header */}
      <header className={`sticky top-0 z-50 ${isDarkMode ? "bg-zinc-900/95 border-zinc-800" : "bg-white/95 border-gray-200"} border-b backdrop-blur-sm`}>
        <div className="container mx-auto px-3 sm:px-4 py-2 sm:py-3">
          <div className="flex items-center justify-between gap-2">
            {/* Logo */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-xl bg-gradient-to-br from-red-600 to-red-700 shadow-lg shadow-red-500/20">
                <Ambulance className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg sm:text-xl font-bold">مركز إسعاف 650</h1>
                <p className={`text-[10px] sm:text-xs ${isDarkMode ? "text-zinc-400" : "text-gray-500"}`}>نظام إدارة المناوبات</p>
              </div>
            </div>

            {/* User Info */}
            <div className="flex items-center gap-2 sm:gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowNotificationsPopup(true)}
                className="relative"
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
                onClick={() => setIsDarkMode(!isDarkMode)}
              >
                {isDarkMode ? <SunIcon className="h-4 w-4 sm:h-5 sm:w-5" /> : <MoonIcon className="h-4 w-4 sm:h-5 sm:w-5" />}
              </Button>

              <div className={`flex items-center gap-2 px-2 sm:px-3 py-1.5 rounded-lg ${isDarkMode ? "bg-zinc-800" : "bg-gray-100"}`}>
                <div className="text-right hidden sm:block">
                  <p className="text-xs sm:text-sm font-medium">{user?.name}</p>
                  <p className="text-[10px] sm:text-xs text-zinc-400">{ROLES.find(r => r.value === user?.role)?.label}</p>
                </div>
                {renderRole(user?.role || "medic", true)}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="h-8 w-8 p-0 text-red-500 hover:text-red-400 hover:bg-red-500/10"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
          <TabsList className={`grid w-full grid-cols-4 ${isDarkMode ? "bg-zinc-900" : "bg-gray-100"}`}>
            <TabsTrigger value="form" className="text-xs sm:text-sm">
              <CalendarDays className="h-4 w-4 sm:ml-2" />
              <span className="hidden sm:inline">التفرغات</span>
            </TabsTrigger>
            <TabsTrigger value="schedule" className="text-xs sm:text-sm">
              <RefreshCw className="h-4 w-4 sm:ml-2" />
              <span className="hidden sm:inline">إنشاء الجدول</span>
            </TabsTrigger>
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
              <Card className={`${isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-gray-200"}`}>
                <CardHeader>
                  <CardTitle className="text-lg sm:text-xl">نموذج التفرغات الشهرية</CardTitle>
                  <CardDescription>حدد أوقات تفرغك خلال الأسبوع</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={`text-sm font-medium mb-2 block ${isDarkMode ? "text-zinc-300" : "text-gray-700"}`}>الشهر</label>
                        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                          <SelectTrigger className={isDarkMode ? "bg-zinc-800 border-zinc-700" : "bg-white border-gray-200"}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {MONTHS.map(month => (
                              <SelectItem key={month.value} value={month.value.toString()}>{month.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <label className={`text-sm font-medium mb-2 block ${isDarkMode ? "text-zinc-300" : "text-gray-700"}`}>السنة</label>
                        <Select value={selectedYear} onValueChange={setSelectedYear}>
                          <SelectTrigger className={isDarkMode ? "bg-zinc-800 border-zinc-700" : "bg-white border-gray-200"}>
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
                      <label className={`text-sm font-medium mb-2 block ${isDarkMode ? "text-zinc-300" : "text-gray-700"}`}>ملاحظات</label>
                      <Textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="أي ملاحظات أو تعليقات..."
                        className={isDarkMode ? "bg-zinc-800 border-zinc-700" : "bg-white border-gray-200"}
                      />
                    </div>

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
          <TabsContent value="schedule">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              <div className="flex flex-wrap gap-2">
                <Select value={scheduleMonth.toString()} onValueChange={(v) => setScheduleMonth(parseInt(v))}>
                  <SelectTrigger className={`w-32 ${isDarkMode ? "bg-zinc-800 border-zinc-700" : "bg-white border-gray-200"}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map(m => <SelectItem key={m.value} value={m.value.toString()}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={scheduleYear.toString()} onValueChange={(v) => setScheduleYear(parseInt(v))}>
                  <SelectTrigger className={`w-28 ${isDarkMode ? "bg-zinc-800 border-zinc-700" : "bg-white border-gray-200"}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button onClick={autoFillSchedule} className="bg-red-600 hover:bg-red-700">
                  <RefreshCw className="h-4 w-4 ml-2" />
                  إنشاء تلقائي
                </Button>
                <Button variant="outline" onClick={clearSchedule}>
                  <Trash2 className="h-4 w-4 ml-2" />
                  مسح
                </Button>
                <Button variant="outline" onClick={printSchedule}>
                  <Printer className="h-4 w-4 ml-2" />
                  طباعة
                </Button>
              </div>

              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-7 lg:grid-cols-10 gap-2">
                {Array.from({ length: daysInScheduleMonth }).map((_, i) => (
                  <ScheduleDayCard key={i} day={i + 1} />
                ))}
              </div>
            </motion.div>
          </TabsContent>

          {/* Calendar Tab */}
          <TabsContent value="calendar">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-4"
            >
              <div className="flex flex-wrap gap-2">
                <Select value={calendarMonth.toString()} onValueChange={(v) => setCalendarMonth(parseInt(v))}>
                  <SelectTrigger className={`w-32 ${isDarkMode ? "bg-zinc-800 border-zinc-700" : "bg-white border-gray-200"}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map(m => <SelectItem key={m.value} value={m.value.toString()}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={calendarYear.toString()} onValueChange={(v) => setCalendarYear(parseInt(v))}>
                  <SelectTrigger className={`w-28 ${isDarkMode ? "bg-zinc-800 border-zinc-700" : "bg-white border-gray-200"}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map(y => <SelectItem key={y} value={y.toString()}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
                <div className="relative flex-1 max-w-xs">
                  <Search className={`absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 ${isDarkMode ? "text-zinc-500" : "text-gray-400"}`} />
                  <Input
                    value={calendarSearchTerm}
                    onChange={(e) => setCalendarSearchTerm(e.target.value)}
                    placeholder="البحث عن شخص..."
                    className={`${isDarkMode ? "bg-zinc-800 border-zinc-700 pr-10" : "bg-white border-gray-200 pr-10"}`}
                  />
                </div>
              </div>

              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-7 gap-2">
                {Array.from({ length: daysInCalendarMonth }).map((_, i) => (
                  <CalendarDayCard key={i} day={i + 1} />
                ))}
              </div>
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
                  <Card key={stat.value} className={`${isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-gray-200"}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className={`text-xs ${isDarkMode ? "text-zinc-400" : "text-gray-500"}`}>{stat.label}</p>
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

              <Card className={`${isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-gray-200"}`}>
                <CardHeader>
                  <CardTitle className="text-lg">إحصائيات الجدول</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className={isDarkMode ? "text-zinc-400" : "text-gray-500"}>إجمالي المسجلين</span>
                      <Badge className="bg-red-600">{records.length}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={isDarkMode ? "text-zinc-400" : "text-gray-500"}>الأيام المجدولة</span>
                      <Badge className="bg-green-600">{Object.keys(schedule).length}</Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={isDarkMode ? "text-zinc-400" : "text-gray-500"}>التبديلات</span>
                      <Badge className="bg-amber-600">{swapLogs.length}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Records */}
              <Card className={`${isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-gray-200"}`}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">سجلات التفرغات</CardTitle>
                    <div className="flex gap-2">
                      <div className="relative">
                        <Search className={`absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 ${isDarkMode ? "text-zinc-500" : "text-gray-400"}`} />
                        <Input
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          placeholder="بحث..."
                          className={`w-40 ${isDarkMode ? "bg-zinc-800 border-zinc-700 pr-10" : "bg-white border-gray-200 pr-10"}`}
                        />
                      </div>
                      <Select value={roleFilter} onValueChange={(v) => setRoleFilter(v as Role | "all")}>
                        <SelectTrigger className={`w-28 ${isDarkMode ? "bg-zinc-800 border-zinc-700" : "bg-white border-gray-200"}`}>
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
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(record.id)}
                              className="h-8 w-8 p-0 text-red-500 hover:text-red-400"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </motion.div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className={`py-4 text-center ${isDarkMode ? "bg-zinc-900 border-t border-zinc-800" : "bg-white border-t border-gray-200"}`}>
        <p className={`text-sm ${isDarkMode ? "text-zinc-500" : "text-gray-400"}`}>
          © 2024 مركز إسعاف 650 - جميع الحقوق محفوظة
        </p>
      </footer>

      {/* Dialogs */}
      {renderNotificationsPopup()}
      {renderSwapDialog()}

      {/* Assign Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className={`${isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-gray-200"} max-w-4xl max-h-[90vh]`}>
          <DialogHeader>
            <DialogTitle>
              تعيين الموظفين - يوم {selectedDay}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh]">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 p-2">
              {getAvailableForDay(selectedDay || 1, selectedShift || "morning").slice(0, 20).map(person => (
                <button
                  key={person.userId}
                  className={`p-3 rounded-lg text-right transition-all ${
                    isDarkMode ? "bg-zinc-800 hover:bg-zinc-700" : "bg-gray-50 hover:bg-gray-100"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">{person.userName}</p>
                      {renderRole(person.userRole, true)}
                    </div>
                    <Plus className="h-4 w-4 text-zinc-500" />
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Day Detail Dialog */}
      <Dialog open={showDayDetailDialog} onOpenChange={setShowDayDetailDialog}>
        <DialogContent className={`${isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-gray-200"} max-w-2xl`}>
          <DialogHeader>
            <DialogTitle>
              تفاصيل يوم {calendarDetailDay} - {MONTHS.find(m => m.value === calendarMonth)?.label}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            {schedule[calendarDetailDay || 0] ? (
              <div className="space-y-4 p-2">
                {SHIFTS.map(shift => {
                  const shiftStructure = schedule[calendarDetailDay || 0]?.[shift.value];
                  if (!shiftStructure) return null;
                  
                  const hasPeople = shiftStructure.teams.some(t => t.members.length > 0) ||
                                   shiftStructure.operations.length > 0 ||
                                   shiftStructure.sector;
                  
                  if (!hasPeople) return null;
                  
                  return (
                    <div key={shift.value} className={`p-4 rounded-lg ${isDarkMode ? "bg-zinc-800" : "bg-gray-50"}`}>
                      <h4 className={`font-bold mb-2 flex items-center gap-2 ${shift.color}`}>
                        {shift.icon}
                        {shift.label}
                      </h4>
                      
                      {shiftStructure.teams.some(t => t.members.length > 0) && (
                        <div className="mb-3">
                          <p className={`text-xs mb-2 ${isDarkMode ? "text-zinc-400" : "text-gray-500"}`}>فرق الإسعاف</p>
                          <div className="grid grid-cols-2 gap-2">
                            {shiftStructure.teams.map(team => (
                              team.members.length > 0 && (
                                <div key={team.id} className={`p-2 rounded ${isDarkMode ? "bg-zinc-700" : "bg-white border"}`}>
                                  <p className={`text-xs font-medium mb-1 ${isDarkMode ? "text-cyan-400" : "text-cyan-600"}`}>
                                    {team.name}
                                  </p>
                                  {team.members.map(m => (
                                    <div key={m.userId} className="flex items-center justify-between gap-1 mb-1">
                                      <span className="text-xs">{m.userName}</span>
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
                          <p className={`text-xs mb-2 ${isDarkMode ? "text-zinc-400" : "text-gray-500"}`}>العمليات</p>
                          <div className="flex flex-wrap gap-2">
                            {shiftStructure.operations.map(m => (
                              <span key={m.userId} className={`text-xs px-2 py-1 rounded ${isDarkMode ? "bg-zinc-700" : "bg-white border"}`}>
                                {m.userName}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {shiftStructure.sector && (
                        <div>
                          <p className={`text-xs mb-2 ${isDarkMode ? "text-zinc-400" : "text-gray-500"}`}>القطاع</p>
                          <span className={`text-xs px-2 py-1 rounded ${isDarkMode ? "bg-zinc-700" : "bg-white border"}`}>
                            {shiftStructure.sector.userName}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <CalendarDays className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p className={isDarkMode ? "text-zinc-500" : "text-gray-400"}>لا يوجد جدول لهذا اليوم</p>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { 
  CalendarDays, Clock, User, LayoutDashboard, Send, Trash2, RefreshCw, Ambulance, 
  Shield, AlertCircle, Sun, Sunset, Moon, Award, LogOut, LogIn, Download, 
  Printer, Moon as MoonIcon, Sun as SunIcon, BarChart3, Users, FileText,
  Edit, Eye, History, ChevronLeft, ChevronRight, Home, Settings, Plus
} from "lucide-react";
import { toast } from "sonner";

// ==================== أنواع البيانات ====================
type Shift = "morning" | "evening" | "night";
type Role = "admin" | "commander" | "scout" | "medic";

interface UserData {
  id: string;
  name: string;
  email: string;
  role: Role;
}

interface AvailabilityData {
  id: string;
  userId: string;
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
  user: { name: string; role: string };
  createdAt: string;
  updatedAt: string;
}

interface StatsData {
  totalUsers: number;
  totalAvailabilities: number;
  shiftCounts: { morning: number; evening: number; night: number };
  weekdayShifts: Record<string, { morning: number; evening: number; night: number }>;
  roleStats: { role: string; count: number }[];
  mostAvailableDays: { day: string; total: number }[];
  averageShiftsPerPerson: number;
}

interface AuditLogData {
  id: string;
  action: string;
  tableName: string;
  recordId: string;
  oldData: Record<string, unknown> | null;
  newData: Record<string, unknown> | null;
  user: { name: string; email: string; role: string };
  createdAt: string;
}

// ==================== الثوابت ====================
const SHIFTS: { value: Shift; label: string; icon: React.ReactNode; color: string; bgColor: string; activeBg: string }[] = [
  { value: "morning", label: "صباحي", icon: <Sun className="h-4 w-4" />, color: "text-amber-400", bgColor: "bg-amber-500/10 border-amber-500/30", activeBg: "bg-amber-500/30 border-amber-500" },
  { value: "evening", label: "مسائي", icon: <Sunset className="h-4 w-4" />, color: "text-orange-400", bgColor: "bg-orange-500/10 border-orange-500/30", activeBg: "bg-orange-500/30 border-orange-500" },
  { value: "night", label: "ليلي", icon: <Moon className="h-4 w-4" />, color: "text-purple-400", bgColor: "bg-purple-500/10 border-purple-500/30", activeBg: "bg-purple-500/30 border-purple-500" },
];

const ROLES: { value: Role; label: string; icon: React.ReactNode; color: string; bgColor: string }[] = [
  { value: "admin", label: "مدير النظام", icon: <Shield className="h-4 w-4" />, color: "text-red-400", bgColor: "bg-red-500/20 border-red-500/50" },
  { value: "commander", label: "قائد", icon: <Award className="h-4 w-4" />, color: "text-yellow-400", bgColor: "bg-yellow-500/20 border-yellow-500/50" },
  { value: "scout", label: "كشاف", icon: <User className="h-4 w-4" />, color: "text-emerald-400", bgColor: "bg-emerald-500/20 border-emerald-500/50" },
  { value: "medic", label: "مسعف", icon: <Ambulance className="h-4 w-4" />, color: "text-cyan-400", bgColor: "bg-cyan-500/20 border-cyan-500/50" },
];

const WEEKDAYS = [
  { key: "sunday", label: "الأحد", short: "أحد" },
  { key: "monday", label: "الإثنين", short: "إثن" },
  { key: "tuesday", label: "الثلاثاء", short: "ثلا" },
  { key: "wednesday", label: "الأربعاء", short: "أرب" },
  { key: "thursday", label: "الخميس", short: "خمي" },
  { key: "friday", label: "الجمعة", short: "جمع" },
  { key: "saturday", label: "السبت", short: "سبت" },
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

const currentDate = new Date();
const currentMonth = currentDate.getMonth() + 1;
const currentYear = currentDate.getFullYear();
const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

// ==================== المكون الرئيسي ====================
export default function HomePage() {
  // حالة تسجيل الدخول
  const [user, setUser] = useState<UserData | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  
  // حالة الفورم
  const [selectedMonth, setSelectedMonth] = useState(currentMonth.toString());
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // حالة التفرغات لكل يوم
  const [availability, setAvailability] = useState<Record<string, Shift[]>>({
    sunday: [],
    monday: [],
    tuesday: [],
    wednesday: [],
    thursday: [],
    friday: [],
    saturday: [],
  });

  // حالة لوحة التحكم
  const [records, setRecords] = useState<AvailabilityData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filterMonth, setFilterMonth] = useState<string>(currentMonth.toString());
  const [filterYear, setFilterYear] = useState<string>(currentYear.toString());

  // حالة الإحصائيات
  const [stats, setStats] = useState<StatsData | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogData[]>([]);

  // حالة الوضع الداكن
  const [isDarkMode, setIsDarkMode] = useState(true);

  // حالة تسجيل الدخول
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const [showLoginDialog, setShowLoginDialog] = useState(false);

  // حالة إضافة مستخدم
  const [showUserDialog, setShowUserDialog] = useState(false);
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState<Role>("medic");
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [users, setUsers] = useState<UserData[]>([]);

  // حالة التقويم
  const [calendarMonth, setCalendarMonth] = useState(currentMonth);
  const [calendarYear, setCalendarYear] = useState(currentYear);

  // التحقق من الجلسة
  useEffect(() => {
    checkAuth();
  }, []);

  // تحميل البيانات عند تغيير الفلاتر
  useEffect(() => {
    if (user) {
      loadRecords();
      loadStats();
    }
  }, [user, filterMonth, filterYear]);

  // تحميل الوضع الداكن/الفاتح
  useEffect(() => {
    const savedMode = localStorage.getItem("darkMode");
    if (savedMode !== null) {
      setIsDarkMode(savedMode === "true");
    }
  }, []);

  // تطبيق الوضع الداكن/الفاتح
  useEffect(() => {
    localStorage.setItem("darkMode", isDarkMode.toString());
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDarkMode]);

  // ==================== الدوال ====================
  
  // التحقق من تسجيل الدخول
  const checkAuth = async () => {
    try {
      const response = await fetch("/api/auth");
      const data = await response.json();
      if (data.success && data.user) {
        setUser(data.user);
      }
    } catch {
      // تجاهل الخطأ
    } finally {
      setIsAuthLoading(false);
    }
  };

  // تسجيل الدخول
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      toast.error("يرجى إدخال البريد وكلمة المرور");
      return;
    }

    setIsLoginLoading(true);
    try {
      const response = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });

      const data = await response.json();
      if (data.success) {
        setUser(data.user);
        setShowLoginDialog(false);
        setLoginEmail("");
        setLoginPassword("");
        toast.success(`مرحباً ${data.user.name}!`);
      } else {
        toast.error(data.error || "فشل تسجيل الدخول");
      }
    } catch {
      toast.error("حدث خطأ في الاتصال");
    } finally {
      setIsLoginLoading(false);
    }
  };

  // تسجيل الخروج
  const handleLogout = async () => {
    try {
      await fetch("/api/auth", { method: "DELETE" });
      setUser(null);
      toast.success("تم تسجيل الخروج");
    } catch {
      // تجاهل الخطأ
    }
  };

  // تحميل التفرغات
  const loadRecords = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("month", filterMonth);
      params.append("year", filterYear);

      const response = await fetch(`/api/availability?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setRecords(data.data);
      } else {
        toast.error("حدث خطأ في تحميل البيانات");
      }
    } catch {
      toast.error("حدث خطأ في الاتصال");
    } finally {
      setIsLoading(false);
    }
  }, [filterMonth, filterYear]);

  // تحميل الإحصائيات
  const loadStats = async () => {
    try {
      const params = new URLSearchParams();
      params.append("month", filterMonth);
      params.append("year", filterYear);

      const response = await fetch(`/api/stats?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setStats(data.stats);
      }
    } catch {
      // تجاهل الخطأ
    }
  };

  // تحميل سجل التعديلات
  const loadAuditLogs = async () => {
    try {
      const response = await fetch("/api/audit?limit=20");
      const data = await response.json();
      if (data.success) {
        setAuditLogs(data.logs);
      }
    } catch {
      // تجاهل الخطأ
    }
  };

  // تحميل المستخدمين
  const loadUsers = async () => {
    try {
      const response = await fetch("/api/users");
      const data = await response.json();
      if (data.success) {
        setUsers(data.users);
      }
    } catch {
      // تجاهل الخطأ
    }
  };

  // تبديل فترة معينة
  const toggleShift = (day: string, shift: Shift) => {
    setAvailability((prev) => {
      const dayShifts = prev[day] || [];
      const newShifts = dayShifts.includes(shift)
        ? dayShifts.filter((s) => s !== shift)
        : [...dayShifts, shift];
      return { ...prev, [day]: newShifts };
    });
  };

  // إرسال الفورم
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user) {
      toast.error("يرجى تسجيل الدخول أولاً");
      return;
    }

    setIsSubmitting(true);
    try {
      const method = editingId ? "PUT" : "POST";
      const body = editingId
        ? { id: editingId, ...availability, notes }
        : { month: parseInt(selectedMonth), year: parseInt(selectedYear), ...availability, notes };

      const response = await fetch("/api/availability", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(editingId ? "تم تحديث التفرغات" : "تم حفظ التفرغات");
        setNotes("");
        setAvailability({
          sunday: [],
          monday: [],
          tuesday: [],
          wednesday: [],
          thursday: [],
          friday: [],
          saturday: [],
        });
        setEditingId(null);
        loadRecords();
        loadStats();
      } else {
        toast.error(data.error || "حدث خطأ");
      }
    } catch {
      toast.error("حدث خطأ في الاتصال");
    } finally {
      setIsSubmitting(false);
    }
  };

  // تعديل تفرغ
  const handleEdit = (record: AvailabilityData) => {
    setEditingId(record.id);
    setAvailability({
      sunday: record.sunday,
      monday: record.monday,
      tuesday: record.tuesday,
      wednesday: record.wednesday,
      thursday: record.thursday,
      friday: record.friday,
      saturday: record.saturday,
    });
    setNotes(record.notes || "");
    setSelectedMonth(record.month.toString());
    setSelectedYear(record.year.toString());
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // إلغاء التعديل
  const cancelEdit = () => {
    setEditingId(null);
    setAvailability({
      sunday: [],
      monday: [],
      tuesday: [],
      wednesday: [],
      thursday: [],
      friday: [],
      saturday: [],
    });
    setNotes("");
  };

  // حذف تفرغ
  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا التفرغ؟")) return;

    try {
      const response = await fetch(`/api/availability?id=${id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (data.success) {
        toast.success("تم الحذف");
        loadRecords();
        loadStats();
      } else {
        toast.error(data.error || "حدث خطأ");
      }
    } catch {
      toast.error("حدث خطأ");
    }
  };

  // إضافة مستخدم جديد
  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName || !newUserEmail || !newUserPassword) {
      toast.error("يرجى ملء جميع الحقول");
      return;
    }

    setIsAddingUser(true);
    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newUserName,
          email: newUserEmail,
          password: newUserPassword,
          role: newUserRole,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("تم إضافة المستخدم");
        setShowUserDialog(false);
        setNewUserName("");
        setNewUserEmail("");
        setNewUserPassword("");
        setNewUserRole("medic");
        loadUsers();
      } else {
        toast.error(data.error || "حدث خطأ");
      }
    } catch {
      toast.error("حدث خطأ");
    } finally {
      setIsAddingUser(false);
    }
  };

  // تصدير PDF/Excel
  const handleExport = async (format: "pdf" | "excel") => {
    try {
      const params = new URLSearchParams();
      params.append("month", filterMonth);
      params.append("year", filterYear);
      params.append("format", format);

      const response = await fetch(`/api/export?${params.toString()}`);
      const blob = await response.blob();
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `availabilities-${filterMonth}-${filterYear}.${format === "pdf" ? "pdf" : "xlsx"}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();

      toast.success("تم التصدير بنجاح");
    } catch {
      toast.error("حدث خطأ في التصدير");
    }
  };

  // طباعة
  const handlePrint = () => {
    window.print();
  };

  // عرض الفترات كـ badges
  const renderShiftBadges = (shifts: Shift[]) => {
    if (!shifts || shifts.length === 0) {
      return <span className="text-zinc-500 text-sm italic">غير متفرغ</span>;
    }

    return (
      <div className="flex flex-wrap gap-1 justify-center">
        {shifts.map((shift) => {
          const shiftInfo = SHIFTS.find((s) => s.value === shift);
          return (
            <span
              key={shift}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${shiftInfo?.bgColor} ${shiftInfo?.color}`}
            >
              {shiftInfo?.label}
            </span>
          );
        })}
      </div>
    );
  };

  // عرض الرتبة
  const renderRole = (roleValue: string) => {
    const roleInfo = ROLES.find((r) => r.value === roleValue);
    return (
      <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium border ${roleInfo?.bgColor} ${roleInfo?.color}`}>
        {roleInfo?.label}
      </span>
    );
  };

  // حساب عدد الفترات المحددة
  const totalShifts = Object.values(availability).flat().length;

  // التحقق من صلاحيات الأدمن
  const isAdmin = user?.role === "admin" || user?.role === "commander";

  // مكون بطاقة اليوم للموبايل
  const DayCard = ({ day }: { day: typeof WEEKDAYS[0] }) => {
    const dayShifts = availability[day.key] || [];

    return (
      <div className="bg-zinc-800/40 border border-zinc-700/50 rounded-xl p-4 transition-all hover:bg-zinc-800/60">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-white text-lg">{day.label}</h4>
          {dayShifts.length > 0 && (
            <Badge variant="outline" className="bg-red-600/20 border-red-500/50 text-red-400 text-xs">
              {dayShifts.length} فترات
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2">
          {SHIFTS.map((shift) => {
            const isActive = dayShifts.includes(shift.value);
            return (
              <button
                key={shift.value}
                type="button"
                onClick={() => toggleShift(day.key, shift.value)}
                className={`
                  flex flex-col items-center justify-center gap-2 p-3 rounded-xl border-2 
                  transition-all duration-200 active:scale-95 touch-manipulate
                  ${isActive
                    ? `${shift.activeBg} ${shift.color} shadow-lg`
                    : `${shift.bgColor} border-zinc-700 text-zinc-400 hover:border-zinc-600`
                  }
                `}
              >
                {shift.icon}
                <span className="text-sm font-medium">{shift.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  // مكون التقويم الشهري
  const CalendarView = () => {
    const firstDay = new Date(calendarYear, calendarMonth - 1, 1);
    const lastDay = new Date(calendarYear, calendarMonth, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();

    const days: { date: number; dayOfWeek: number }[] = [];
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push({ date: -1, dayOfWeek: i });
    }
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(calendarYear, calendarMonth - 1, i);
      days.push({ date: i, dayOfWeek: d.getDay() });
    }

    return (
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (calendarMonth === 1) {
                setCalendarMonth(12);
                setCalendarYear(calendarYear - 1);
              } else {
                setCalendarMonth(calendarMonth - 1);
              }
            }}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
          <h3 className="text-lg font-bold">
            {MONTHS[calendarMonth - 1].label} {calendarYear}
          </h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              if (calendarMonth === 12) {
                setCalendarMonth(1);
                setCalendarYear(calendarYear + 1);
              } else {
                setCalendarMonth(calendarMonth + 1);
              }
            }}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
        </div>

        {/* رأس التقويم */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {["أحد", "إثن", "ثلا", "أرب", "خمي", "جمع", "سبت"].map((day) => (
            <div key={day} className="text-center text-xs font-medium text-zinc-400 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* أيام التقويم */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, index) => {
            if (day.date === -1) {
              return <div key={index} className="h-10" />;
            }

            const dayOfWeekName = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][day.dayOfWeek];
            
            // حساب عدد المتفرغين في هذا اليوم
            let availableCount = 0;
            records.forEach((r) => {
              const shifts = r[dayOfWeekName as keyof AvailabilityData] as Shift[];
              if (shifts && shifts.length > 0) availableCount++;
            });

            return (
              <div
                key={index}
                className={`
                  h-10 flex flex-col items-center justify-center rounded-lg text-sm
                  ${availableCount > 0 ? "bg-green-500/20 text-green-400" : "bg-zinc-800/50 text-zinc-400"}
                `}
                title={`${availableCount} متفرغ`}
              >
                <span>{day.date}</span>
                {availableCount > 0 && (
                  <span className="text-[10px]">{availableCount}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // مكون الإحصائيات
  const StatsView = () => {
    if (!stats) return null;

    return (
      <div className="space-y-4">
        {/* بطاقات الإحصائيات */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-cyan-600/20 to-cyan-600/10 border border-cyan-500/30 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-cyan-500/20 rounded-lg">
                <Users className="h-5 w-5 text-cyan-400" />
              </div>
              <div>
                <p className="text-xs text-zinc-400">المستخدمين</p>
                <p className="text-2xl font-bold text-white">{stats.totalUsers}</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-amber-600/20 to-amber-600/10 border border-amber-500/30 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/20 rounded-lg">
                <Sun className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-zinc-400">صباحي</p>
                <p className="text-2xl font-bold text-white">{stats.shiftCounts.morning}</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-orange-600/20 to-orange-600/10 border border-orange-500/30 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/20 rounded-lg">
                <Sunset className="h-5 w-5 text-orange-400" />
              </div>
              <div>
                <p className="text-xs text-zinc-400">مسائي</p>
                <p className="text-2xl font-bold text-white">{stats.shiftCounts.evening}</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-600/20 to-purple-600/10 border border-purple-500/30 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Moon className="h-5 w-5 text-purple-400" />
              </div>
              <div>
                <p className="text-xs text-zinc-400">ليلي</p>
                <p className="text-2xl font-bold text-white">{stats.shiftCounts.night}</p>
              </div>
            </div>
          </div>
        </div>

        {/* رسم بياني للأيام */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-xl p-4">
          <h4 className="font-medium mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-red-500" />
            تفرغات أيام الأسبوع
          </h4>
          <div className="space-y-3">
            {stats.mostAvailableDays.map((day, index) => {
              const maxTotal = stats.mostAvailableDays[0]?.total || 1;
              const percentage = (day.total / maxTotal) * 100;
              const dayName = WEEKDAYS_AR[day.day] || day.day;

              return (
                <div key={day.day} className="flex items-center gap-3">
                  <span className="w-20 text-sm text-zinc-400">{dayName}</span>
                  <div className="flex-1 h-6 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        index === 0
                          ? "bg-gradient-to-l from-green-500 to-green-600"
                          : index === 1
                            ? "bg-gradient-to-l from-amber-500 to-amber-600"
                            : "bg-gradient-to-l from-red-500 to-red-600"
                      }`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="w-10 text-sm text-zinc-300 text-left">{day.total}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // ==================== العرض ====================
  if (isAuthLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="h-8 w-8 animate-spin text-red-500" />
          <p className="text-zinc-400">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen flex flex-col ${isDarkMode ? "bg-black text-white" : "bg-gray-100 text-gray-900"}`} dir="rtl">
      {/* Background effects */}
      {isDarkMode && (
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-red-600/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-red-600/5 rounded-full blur-3xl animate-pulse" />
        </div>
      )}

      {/* Header */}
      <header className={`relative border-b ${isDarkMode ? "border-zinc-800 bg-zinc-950/80" : "border-gray-200 bg-white"} backdrop-blur-xl sticky top-0 z-50`}>
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3 sm:py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                {isDarkMode && <div className="absolute inset-0 bg-red-600 blur-xl opacity-50 animate-pulse" />}
                <div className="relative p-2 sm:p-3 bg-gradient-to-br from-red-600 to-red-700 rounded-xl shadow-lg shadow-red-600/25">
                  <Ambulance className="h-5 w-5 sm:h-7 sm:w-7 text-white" />
                </div>
              </div>
              <div>
                <h1 className={`text-lg sm:text-2xl font-bold ${isDarkMode ? "bg-gradient-to-l from-red-400 to-red-600 bg-clip-text text-transparent" : "text-red-600"}`}>
                  مركز إسعاف 650
                </h1>
                <p className={`text-[10px] sm:text-sm ${isDarkMode ? "text-zinc-400" : "text-gray-500"}`}>
                  نظام إدارة التفرغات الشهرية
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* زر تبديل الوضع */}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsDarkMode(!isDarkMode)}
                className={isDarkMode ? "text-zinc-400 hover:text-white" : "text-gray-500 hover:text-gray-900"}
              >
                {isDarkMode ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
              </Button>

              {/* معلومات المستخدم */}
              {user ? (
                <div className="flex items-center gap-2">
                  <div className="hidden sm:flex flex-col items-end">
                    <span className="text-sm font-medium">{user.name}</span>
                    {renderRole(user.role)}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleLogout}
                    className="text-red-400 hover:text-red-300 hover:bg-red-600/10"
                  >
                    <LogOut className="h-5 w-5" />
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={() => setShowLoginDialog(true)}
                  className="bg-red-600 hover:bg-red-700"
                >
                  <LogIn className="h-4 w-4 ml-2" />
                  تسجيل الدخول
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative flex-1 max-w-7xl mx-auto w-full px-3 sm:px-6 py-4 sm:py-6">
        {!user ? (
          /* صفحة الترحيب للمستخدم غير المسجل */
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <div className="p-6 bg-gradient-to-br from-red-600 to-red-700 rounded-2xl shadow-2xl shadow-red-600/25 mb-6">
              <Ambulance className="h-16 w-16 text-white" />
            </div>
            <h2 className={`text-2xl sm:text-3xl font-bold mb-4 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
              مرحباً بك في نظام تفرغات مركز إسعاف 650
            </h2>
            <p className={`text-lg mb-6 ${isDarkMode ? "text-zinc-400" : "text-gray-600"}`}>
              يرجى تسجيل الدخول للوصول إلى نظام إدارة التفرغات
            </p>
            <Button
              onClick={() => setShowLoginDialog(true)}
              className="bg-red-600 hover:bg-red-700 text-white px-8 py-6 text-lg"
            >
              <LogIn className="h-5 w-5 ml-2" />
              تسجيل الدخول
            </Button>
            <div className={`mt-8 p-4 rounded-lg ${isDarkMode ? "bg-zinc-900/60 border border-zinc-800" : "bg-white border border-gray-200"}`}>
              <p className="text-sm text-zinc-400">
                <strong>بيانات الدخول الافتراضية:</strong><br />
                البريد: admin@ambulance650.com<br />
                كلمة المرور: admin123
              </p>
            </div>
          </div>
        ) : (
          /* المحتوى الرئيسي للمستخدم المسجل */
          <Tabs defaultValue="form" className="w-full">
            <div className="flex justify-center mb-4 sm:mb-6">
              <TabsList className={`${isDarkMode ? "bg-zinc-900/80 border-zinc-800" : "bg-white border-gray-200"} border p-1 rounded-xl backdrop-blur-sm`}>
                <TabsTrigger value="form" className="gap-1.5 data-[state=active]:bg-red-600 data-[state=active]:text-white">
                  <User className="h-4 w-4" />
                  <span className="hidden sm:inline">إدخال التفرغات</span>
                </TabsTrigger>
                <TabsTrigger value="dashboard" className="gap-1.5 data-[state=active]:bg-red-600 data-[state=active]:text-white">
                  <LayoutDashboard className="h-4 w-4" />
                  <span className="hidden sm:inline">لوحة التحكم</span>
                </TabsTrigger>
                <TabsTrigger value="calendar" className="gap-1.5 data-[state=active]:bg-red-600 data-[state=active]:text-white">
                  <CalendarDays className="h-4 w-4" />
                  <span className="hidden sm:inline">التقويم</span>
                </TabsTrigger>
                <TabsTrigger value="stats" className="gap-1.5 data-[state=active]:bg-red-600 data-[state=active]:text-white">
                  <BarChart3 className="h-4 w-4" />
                  <span className="hidden sm:inline">إحصائيات</span>
                </TabsTrigger>
                {isAdmin && (
                  <TabsTrigger value="users" className="gap-1.5 data-[state=active]:bg-red-600 data-[state=active]:text-white">
                    <Users className="h-4 w-4" />
                    <span className="hidden sm:inline">المستخدمين</span>
                  </TabsTrigger>
                )}
              </TabsList>
            </div>

            {/* تبويب إدخال التفرغات */}
            <TabsContent value="form" className="animate-in fade-in-50 duration-300">
              <Card className={`${isDarkMode ? "bg-zinc-900/60 border-zinc-800" : "bg-white border-gray-200"} backdrop-blur-sm shadow-2xl shadow-red-600/5`}>
                <CardHeader className="border-b border-zinc-800 p-4 sm:p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-red-600/20 rounded-lg">
                        <CalendarDays className="h-5 w-5 text-red-500" />
                      </div>
                      <div>
                        <CardTitle>
                          {editingId ? "تعديل التفرغات" : "تسجيل التفرغات الشهرية"}
                        </CardTitle>
                        <CardDescription>
                          {user.name} - حدد الفترات التي تتفرغ فيها
                        </CardDescription>
                      </div>
                    </div>
                    {editingId && (
                      <Button variant="outline" onClick={cancelEdit}>
                        إلغاء التعديل
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-4 sm:pt-6 p-4 sm:p-6">
                  <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
                    {/* اختيار الشهر والسنة */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-2">
                          <CalendarDays className="h-4 w-4 text-red-500" />
                          الشهر
                        </label>
                        <Select value={selectedMonth} onValueChange={setSelectedMonth} disabled={!!editingId}>
                          <SelectTrigger className={`${isDarkMode ? "bg-zinc-800/50 border-zinc-700" : "bg-gray-50 border-gray-200"} h-11`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className={`${isDarkMode ? "bg-zinc-900 border-zinc-700" : "bg-white border-gray-200"}`}>
                            {MONTHS.map((month) => (
                              <SelectItem key={month.value} value={month.value.toString()}>
                                {month.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium flex items-center gap-2">
                          <CalendarDays className="h-4 w-4 text-red-500" />
                          السنة
                        </label>
                        <Select value={selectedYear} onValueChange={setSelectedYear} disabled={!!editingId}>
                          <SelectTrigger className={`${isDarkMode ? "bg-zinc-800/50 border-zinc-700" : "bg-gray-50 border-gray-200"} h-11`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className={`${isDarkMode ? "bg-zinc-900 border-zinc-700" : "bg-white border-gray-200"}`}>
                            {years.map((year) => (
                              <SelectItem key={year} value={year.toString()}>
                                {year}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* جدول الفترات - موبايل */}
                    <div className="space-y-3 sm:hidden">
                      {WEEKDAYS.map((day) => (
                        <DayCard key={day.key} day={day} />
                      ))}
                    </div>

                    {/* جدول الفترات - ديسكتوب */}
                    <div className="hidden sm:block border border-zinc-800 rounded-xl overflow-hidden bg-zinc-900/50">
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="bg-zinc-800/80">
                              <th className="px-4 py-4 text-right font-medium text-zinc-300 border-b border-zinc-700">
                                اليوم
                              </th>
                              {SHIFTS.map((shift) => (
                                <th key={shift.value} className="px-4 py-4 text-center font-medium border-b border-zinc-700">
                                  <div className={`flex items-center justify-center gap-2 ${shift.color}`}>
                                    {shift.icon}
                                    <span className="text-zinc-300">{shift.label}</span>
                                  </div>
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {WEEKDAYS.map((day, index) => (
                              <tr
                                key={day.key}
                                className={`border-b border-zinc-800/50 transition-colors hover:bg-zinc-800/30 ${
                                  index % 2 === 0 ? "bg-zinc-900/30" : "bg-zinc-900/60"
                                }`}
                              >
                                <td className="px-4 py-4">
                                  <span className="font-medium text-white">{day.label}</span>
                                </td>
                                {SHIFTS.map((shift) => {
                                  const isChecked = availability[day.key]?.includes(shift.value);
                                  return (
                                    <td key={shift.value} className="px-4 py-4 text-center">
                                      <div className="flex justify-center">
                                        <button
                                          type="button"
                                          onClick={() => toggleShift(day.key, shift.value)}
                                          className={`
                                            relative w-10 h-10 rounded-lg border-2 transition-all duration-200
                                            flex items-center justify-center
                                            ${isChecked
                                              ? `${shift.activeBg} ${shift.color} shadow-lg`
                                              : "border-zinc-700 bg-zinc-800/50 hover:border-zinc-600 text-zinc-500"
                                            }
                                          `}
                                        >
                                          {shift.icon}
                                        </button>
                                      </div>
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* ملاحظات */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-red-500" />
                        ملاحظات إضافية
                      </label>
                      <Textarea
                        placeholder="أي ملاحظات إضافية..."
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={3}
                        className={`${isDarkMode ? "bg-zinc-800/50 border-zinc-700" : "bg-gray-50 border-gray-200"} resize-none`}
                      />
                    </div>

                    {/* زر الإرسال */}
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-gradient-to-l from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-lg shadow-red-600/25 transition-all duration-300 py-5 sm:py-6 text-base sm:text-lg font-medium"
                    >
                      {isSubmitting ? (
                        <>
                          <RefreshCw className="h-5 w-5 animate-spin" />
                          جاري الحفظ...
                        </>
                      ) : (
                        <>
                          <Send className="h-5 w-5" />
                          {editingId ? "تحديث التفرغات" : "إرسال التفرغات"}
                        </>
                      )}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            {/* تبويب لوحة التحكم */}
            <TabsContent value="dashboard" className="animate-in fade-in-50 duration-300">
              <Card className={`${isDarkMode ? "bg-zinc-900/60 border-zinc-800" : "bg-white border-gray-200"}`}>
                <CardHeader className="border-b border-zinc-800 p-4 sm:p-6">
                  <div className="flex flex-col gap-3 sm:gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-red-600/20 rounded-lg">
                        <LayoutDashboard className="h-5 w-5 text-red-500" />
                      </div>
                      <div>
                        <CardTitle>تفرغات المسعفين</CardTitle>
                        <CardDescription>{records.length} تفرغ مسجل</CardDescription>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Select value={filterMonth} onValueChange={setFilterMonth}>
                        <SelectTrigger className={`w-28 ${isDarkMode ? "bg-zinc-800/50 border-zinc-700" : "bg-gray-50 border-gray-200"}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className={isDarkMode ? "bg-zinc-900 border-zinc-700" : "bg-white border-gray-200"}>
                          {MONTHS.map((month) => (
                            <SelectItem key={month.value} value={month.value.toString()}>
                              {month.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select value={filterYear} onValueChange={setFilterYear}>
                        <SelectTrigger className={`w-24 ${isDarkMode ? "bg-zinc-800/50 border-zinc-700" : "bg-gray-50 border-gray-200"}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className={isDarkMode ? "bg-zinc-900 border-zinc-700" : "bg-white border-gray-200"}>
                          {years.map((year) => (
                            <SelectItem key={year} value={year.toString()}>
                              {year}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button variant="outline" size="icon" onClick={loadRecords} disabled={isLoading}>
                        <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleExport("excel")} className="gap-1">
                        <Download className="h-4 w-4" />
                        Excel
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleExport("pdf")} className="gap-1">
                        <FileText className="h-4 w-4" />
                        PDF
                      </Button>
                      <Button variant="outline" size="icon" onClick={handlePrint}>
                        <Printer className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 sm:pt-6 p-4 sm:p-6">
                  {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-16">
                      <RefreshCw className="h-8 w-8 animate-spin text-red-500" />
                      <p className="mt-4 text-zinc-400">جاري التحميل...</p>
                    </div>
                  ) : records.length === 0 ? (
                    <div className="text-center py-16">
                      <CalendarDays className="h-12 w-12 mx-auto mb-4 text-zinc-600" />
                      <p className="text-zinc-400">لا توجد تفرغات مسجلة</p>
                    </div>
                  ) : (
                    <ScrollArea className="max-h-[500px] rounded-lg">
                      <div className="border border-zinc-800 rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-zinc-800/80">
                              <TableHead className="text-xs">#</TableHead>
                              <TableHead className="text-xs">الاسم</TableHead>
                              <TableHead className="text-xs">الرتبة</TableHead>
                              {WEEKDAYS.map((day) => (
                                <TableHead key={day.key} className="text-center text-xs">
                                  <span className="hidden sm:inline">{day.label}</span>
                                  <span className="sm:hidden">{day.short}</span>
                                </TableHead>
                              ))}
                              <TableHead className="text-center text-xs">إجراءات</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {records.map((record, index) => (
                              <TableRow key={record.id}>
                                <TableCell className="text-zinc-500">{index + 1}</TableCell>
                                <TableCell className="font-medium">{record.user.name}</TableCell>
                                <TableCell>{renderRole(record.user.role)}</TableCell>
                                {WEEKDAYS.map((day) => (
                                  <TableCell key={day.key} className="py-2">
                                    {renderShiftBadges(record[day.key as keyof AvailabilityData] as Shift[])}
                                  </TableCell>
                                ))}
                                <TableCell>
                                  <div className="flex items-center justify-center gap-1">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="text-amber-500 hover:text-amber-400 hover:bg-amber-600/10 h-8 w-8"
                                      onClick={() => handleEdit(record)}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    {isAdmin && (
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="text-red-500 hover:text-red-400 hover:bg-red-600/10 h-8 w-8"
                                        onClick={() => handleDelete(record.id)}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* تبويب التقويم */}
            <TabsContent value="calendar" className="animate-in fade-in-50 duration-300">
              <CalendarView />
            </TabsContent>

            {/* تبويب الإحصائيات */}
            <TabsContent value="stats" className="animate-in fade-in-50 duration-300">
              <StatsView />
            </TabsContent>

            {/* تبويب المستخدمين - للأدمن فقط */}
            {isAdmin && (
              <TabsContent value="users" className="animate-in fade-in-50 duration-300">
                <Card className={`${isDarkMode ? "bg-zinc-900/60 border-zinc-800" : "bg-white border-gray-200"}`}>
                  <CardHeader className="border-b border-zinc-800 p-4 sm:p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-600/20 rounded-lg">
                          <Users className="h-5 w-5 text-red-500" />
                        </div>
                        <div>
                          <CardTitle>إدارة المستخدمين</CardTitle>
                          <CardDescription>إضافة وتعديل المستخدمين</CardDescription>
                        </div>
                      </div>
                      <Button onClick={() => { loadUsers(); setShowUserDialog(true); }} className="bg-red-600 hover:bg-red-700">
                        <Plus className="h-4 w-4 ml-2" />
                        إضافة مستخدم
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4 sm:pt-6 p-4 sm:p-6">
                    <Button variant="outline" onClick={loadUsers} className="mb-4">
                      <RefreshCw className="h-4 w-4 ml-2" />
                      تحديث
                    </Button>
                    <div className="space-y-2">
                      {users.map((u) => (
                        <div
                          key={u.id}
                          className={`flex items-center justify-between p-3 rounded-lg ${isDarkMode ? "bg-zinc-800/50" : "bg-gray-50"}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-red-700 rounded-full flex items-center justify-center text-white font-bold">
                              {u.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-medium">{u.name}</p>
                              <p className="text-xs text-zinc-400">{u.email}</p>
                            </div>
                          </div>
                          {renderRole(u.role)}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        )}
      </main>

      {/* Footer */}
      <footer className={`relative border-t ${isDarkMode ? "border-zinc-800 bg-zinc-950/80" : "border-gray-200 bg-white"} backdrop-blur-xl mt-auto`}>
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-red-500" />
              <span className={`text-xs sm:text-sm ${isDarkMode ? "text-zinc-400" : "text-gray-500"}`}>
                مركز إسعاف 650 - نظام إدارة التفرغات
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <span>© {currentYear}</span>
              <span>•</span>
              <span>جميع الحقوق محفوظة</span>
            </div>
          </div>
        </div>
      </footer>

      {/* نافذة تسجيل الدخول */}
      <Dialog open={showLoginDialog} onOpenChange={setShowLoginDialog}>
        <DialogContent className={`${isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-gray-200"}`}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LogIn className="h-5 w-5 text-red-500" />
              تسجيل الدخول
            </DialogTitle>
            <DialogDescription>
              أدخل بياناتك للوصول إلى النظام
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">البريد الإلكتروني</label>
              <Input
                type="email"
                placeholder="أدخل البريد الإلكتروني"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className={`${isDarkMode ? "bg-zinc-800/50 border-zinc-700" : "bg-gray-50 border-gray-200"} h-11`}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">كلمة المرور</label>
              <Input
                type="password"
                placeholder="أدخل كلمة المرور"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className={`${isDarkMode ? "bg-zinc-800/50 border-zinc-700" : "bg-gray-50 border-gray-200"} h-11`}
              />
            </div>
            <Button
              type="submit"
              disabled={isLoginLoading}
              className="w-full bg-red-600 hover:bg-red-700"
            >
              {isLoginLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin ml-2" />
                  جاري الدخول...
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4 ml-2" />
                  دخول
                </>
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* نافذة إضافة مستخدم */}
      <Dialog open={showUserDialog} onOpenChange={setShowUserDialog}>
        <DialogContent className={`${isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-gray-200"}`}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-red-500" />
              إضافة مستخدم جديد
            </DialogTitle>
            <DialogDescription>
              أدخل بيانات المستخدم الجديد
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddUser} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">الاسم</label>
              <Input
                placeholder="اسم المستخدم"
                value={newUserName}
                onChange={(e) => setNewUserName(e.target.value)}
                className={`${isDarkMode ? "bg-zinc-800/50 border-zinc-700" : "bg-gray-50 border-gray-200"} h-11`}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">البريد الإلكتروني</label>
              <Input
                type="email"
                placeholder="البريد الإلكتروني"
                value={newUserEmail}
                onChange={(e) => setNewUserEmail(e.target.value)}
                className={`${isDarkMode ? "bg-zinc-800/50 border-zinc-700" : "bg-gray-50 border-gray-200"} h-11`}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">كلمة المرور</label>
              <Input
                type="password"
                placeholder="كلمة المرور"
                value={newUserPassword}
                onChange={(e) => setNewUserPassword(e.target.value)}
                className={`${isDarkMode ? "bg-zinc-800/50 border-zinc-700" : "bg-gray-50 border-gray-200"} h-11`}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">الرتبة</label>
              <Select value={newUserRole} onValueChange={(v) => setNewUserRole(v as Role)}>
                <SelectTrigger className={`${isDarkMode ? "bg-zinc-800/50 border-zinc-700" : "bg-gray-50 border-gray-200"} h-11`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className={isDarkMode ? "bg-zinc-900 border-zinc-700" : "bg-white border-gray-200"}>
                  {ROLES.map((role) => (
                    <SelectItem key={role.value} value={role.value}>
                      <div className="flex items-center gap-2">
                        {role.icon}
                        {role.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              type="submit"
              disabled={isAddingUser}
              className="w-full bg-red-600 hover:bg-red-700"
            >
              {isAddingUser ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin ml-2" />
                  جاري الإضافة...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 ml-2" />
                  إضافة
                </>
              )}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

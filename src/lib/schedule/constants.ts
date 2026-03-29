// Schedule System Constants

import { Sun, Sunset, Moon, Award, Star, Ambulance, Crown, ClipboardList } from "lucide-react";
import type { Shift, Role, ShiftInfo, RoleInfo } from "./types";

export const SHIFTS: ShiftInfo[] = [
  { value: "morning" as Shift, label: "صباحي", icon: Sun, iconClass: "h-4 w-4", color: "text-amber-400", bgColor: "bg-amber-500/10 border-amber-500/30", activeBg: "bg-amber-500/30 border-amber-500" },
  { value: "evening" as Shift, label: "مسائي", icon: Sunset, iconClass: "h-4 w-4", color: "text-orange-400", bgColor: "bg-orange-500/10 border-orange-500/30", activeBg: "bg-orange-500/30 border-orange-500" },
  { value: "night" as Shift, label: "ليلي", icon: Moon, iconClass: "h-4 w-4", color: "text-purple-400", bgColor: "bg-purple-500/10 border-purple-500/30", activeBg: "bg-purple-500/30 border-purple-500" },
];

export const ROLES: RoleInfo[] = [
  { value: "leader" as Role, label: "قائد", icon: Award, iconClass: "h-3 w-3", color: "text-yellow-400", bgColor: "bg-yellow-500/20 border-yellow-500/50", level: 3 },
  { value: "scout" as Role, label: "كشاف", icon: Star, iconClass: "h-3 w-3", color: "text-emerald-400", bgColor: "bg-emerald-500/20 border-emerald-500/50", level: 2 },
  { value: "medic" as Role, label: "مسعف", icon: Ambulance, iconClass: "h-3 w-3", color: "text-cyan-400", bgColor: "bg-cyan-500/20 border-cyan-500/50", level: 1 },
  { value: "sector_lead" as Role, label: "قائد قطاع", icon: Crown, iconClass: "h-3 w-3", color: "text-rose-300", bgColor: "bg-rose-500/20 border-rose-500/40", level: 4 },
  { value: "operations" as Role, label: "عمليات", icon: ClipboardList, iconClass: "h-3 w-3", color: "text-violet-300", bgColor: "bg-violet-500/20 border-violet-500/40", level: 2 },
];

export const WEEKDAYS = [
  { key: "sunday", label: "الأحد" },
  { key: "monday", label: "الإثنين" },
  { key: "tuesday", label: "الثلاثاء" },
  { key: "wednesday", label: "الأربعاء" },
  { key: "thursday", label: "الخميس" },
  { key: "friday", label: "الجمعة" },
  { key: "saturday", label: "السبت" },
];

export const MONTHS = [
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

export const WEEKDAYS_AR: Record<string, string> = {
  sunday: "الأحد",
  monday: "الإثنين",
  tuesday: "الثلاثاء",
  wednesday: "الأربعاء",
  thursday: "الخميس",
  friday: "الجمعة",
  saturday: "السبت"
};

export const MAX_TEAM_MEMBERS = 4;
export const MAX_OPERATIONS = 4;
export const NUM_TEAMS = 4;
export const MAX_PEOPLE_PER_SHIFT = 21;

export const FIRST_NAMES = [
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

export const LAST_NAMES = [
  "الغامدي", "الشمري", "العتيبي", "القرني", "السبيعي", "الزهراني", "المطيري", "الدوسري", "الحربي", "العنزي",
  "الرشيدي", "المالكي", "الجهني", "السهلي", "المري", "العوفي", "البلوي", "القحطاني", "العمري", "الخضيري",
  "السويلم", "الراجحي", "الطائي", "البقمي", "العبسي", "النجادي", "الخالدي"
];

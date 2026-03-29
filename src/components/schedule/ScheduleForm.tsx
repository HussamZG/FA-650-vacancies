"use client";

import { memo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Send, Plus, Check } from "lucide-react";
import { useTheme } from "@/hooks/useSchedule";
import { WEEKDAYS, MONTHS, SHIFTS } from "@/lib/schedule/constants";
import { Shift } from "@/lib/schedule/types";

interface DayCardProps {
  day: typeof WEEKDAYS[0];
  dayShifts: Shift[];
  onToggleShift: (day: string, shift: Shift) => void;
  onSelectAll: (day: string, allSelected: boolean) => void;
  isDarkMode: boolean;
}

const DayCard = memo(function DayCard({ day, dayShifts, onToggleShift, onSelectAll, isDarkMode }: DayCardProps) {
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
          onClick={() => onSelectAll(day.key, allSelected)}
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
              onClick={() => onToggleShift(day.key, shift.value)}
              className={`flex flex-col items-center justify-center gap-2 p-3 sm:p-4 lg:p-5 rounded-xl border-2 transition-all active:scale-95 min-h-[80px] lg:min-h-[100px] ${
                isActive
                  ? `${shift.activeBg} ${shift.color} shadow-lg`
                  : isDarkMode
                    ? `${shift.bgColor} border-zinc-700 text-zinc-400`
                    : "border-gray-200 bg-gray-50 text-gray-500"
              }`}
            >
              <shift.icon className={`h-5 w-5 lg:h-6 lg:w-6 ${shift.color}`} />
              <span className="text-sm lg:text-base font-medium">{shift.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
});

interface ScheduleFormProps {
  availability: Record<string, Shift[]>;
  setAvailability: React.Dispatch<React.SetStateAction<Record<string, Shift[]>>>;
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  selectedYear: string;
  setSelectedYear: (year: string) => void;
  notes: string;
  setNotes: (notes: string) => void;
  isSubmitting: boolean;
  onSubmit: (e: React.FormEvent) => void;
  currentMonth: number;
  currentYear: number;
  years: number[];
  editingId: string | null;
}

function ScheduleFormComponent({
  availability,
  setAvailability,
  selectedMonth,
  setSelectedMonth,
  selectedYear,
  setSelectedYear,
  notes,
  setNotes,
  isSubmitting,
  onSubmit,
  currentMonth,
  currentYear,
  years,
  editingId,
}: ScheduleFormProps) {
  const { isDarkMode } = useTheme();
  
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
  
  const selectAllShifts = (day: string, allSelected: boolean) => {
    setAvailability(prev => ({
      ...prev,
      [day]: allSelected ? [] : ["morning", "evening", "night"]
    }));
  };
  
  const totalShifts = Object.values(availability).flat().length;
  
  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {/* Month/Year Selection */}
      <div className="flex flex-wrap gap-4">
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="اختر الشهر" />
          </SelectTrigger>
          <SelectContent>
            {MONTHS.map((month) => (
              <SelectItem key={month.value} value={month.value.toString()}>
                {month.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="اختر السنة" />
          </SelectTrigger>
          <SelectContent>
            {years.map((year) => (
              <SelectItem key={year} value={year.toString()}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      {/* Days Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {WEEKDAYS.map((day) => (
          <DayCard
            key={day.key}
            day={day}
            dayShifts={availability[day.key] || []}
            onToggleShift={toggleShift}
            onSelectAll={selectAllShifts}
            isDarkMode={isDarkMode}
          />
        ))}
      </div>
      
      {/* Notes */}
      <div className="space-y-2">
        <label className={`text-sm font-medium ${isDarkMode ? "text-zinc-300" : "text-gray-700"}`}>
          ملاحظات إضافية
        </label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="أي ملاحظات أو تعليقات..."
          className={`min-h-[100px] ${isDarkMode ? "bg-zinc-800 border-zinc-700" : "bg-white border-gray-200"}`}
        />
      </div>
      
      {/* Submit */}
      <div className="flex items-center justify-between">
        <div className={`text-sm ${isDarkMode ? "text-zinc-400" : "text-gray-500"}`}>
          إجمالي المناوبات: <span className="font-bold text-red-500">{totalShifts}</span>
        </div>
        <Button
          type="submit"
          disabled={isSubmitting || totalShifts === 0}
          className="bg-red-600 hover:bg-red-700 min-w-[150px]"
        >
          {isSubmitting ? (
            <div className="flex items-center gap-2">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              جاري الحفظ...
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Send className="h-4 w-4" />
              {editingId ? "تحديث التفرغات" : "إرسال التفرغات"}
            </div>
          )}
        </Button>
      </div>
    </form>
  );
}

export const ScheduleForm = memo(ScheduleFormComponent);

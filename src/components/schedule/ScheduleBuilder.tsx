"use client";

import { memo, useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { 
  RefreshCw, Trash2, Save, FileSpreadsheet, Plus, Search,
  Sun, Sunset, Moon, Crown, Award, Star, Ambulance
} from "lucide-react";
import { useSchedule, useTheme, useSwap } from "@/hooks/useSchedule";
import { MONTHS, SHIFTS, ROLES, MAX_PEOPLE_PER_SHIFT, WEEKDAYS_AR } from "@/lib/schedule/constants";
import { getDaysInMonth, getDayOfWeek, getDayNameAr } from "@/lib/schedule/utils";
import { Shift, Role, AvailabilityData } from "@/lib/schedule/types";
import { toast } from "sonner";

// Role badge component
const RoleBadge = memo(function RoleBadge({ role, compact = false }: { role: Role; compact?: boolean }) {
  const roleInfo = ROLES.find(r => r.value === role);
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 rounded-lg text-[10px] sm:text-xs font-medium border ${roleInfo?.bgColor} ${roleInfo?.color}`}>
      {roleInfo?.icon}
      {!compact && <span>{roleInfo?.label}</span>}
    </span>
  );
});

// Day card for schedule builder
interface ScheduleDayCardProps {
  day: number;
  scheduleMonth: number;
  scheduleYear: number;
  schedule: Record<number, any>;
  getAvailableForDay: (day: number, shift: Shift) => AvailabilityData[];
  getScheduleDayCount: (day: number) => number;
  onDayClick: (day: number, shift: Shift) => void;
  isDarkMode: boolean;
}

const ScheduleDayCard = memo(function ScheduleDayCard({
  day,
  scheduleMonth,
  scheduleYear,
  schedule,
  getAvailableForDay,
  getScheduleDayCount,
  onDayClick,
  isDarkMode,
}: ScheduleDayCardProps) {
  const dayOfWeek = getDayOfWeek(day, scheduleMonth, scheduleYear);
  const dayName = WEEKDAYS_AR[dayOfWeek] || "";
  
  const getShiftCount = (shift: Shift) => {
    const count = getScheduleDayCount(day);
    return count;
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
          const available = getAvailableForDay(day, shift.value).length;
          const daySchedule = schedule[day];
          let count = 0;
          if (daySchedule) {
            const shiftStructure = daySchedule[shift.value];
            count = shiftStructure.teams.reduce((acc: number, t: any) => acc + t.members.length, 0) + 
                    shiftStructure.operations.length + 
                    (shiftStructure.sector ? 1 : 0);
          }
          
          return (
            <button
              key={shift.value}
              onClick={() => onDayClick(day, shift.value)}
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
});

// Assignment dialog
interface AssignmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedDay: number | null;
  selectedShift: Shift | null;
  scheduleMonth: number;
  scheduleYear: number;
  schedule: Record<number, any>;
  records: AvailabilityData[];
  isDarkMode: boolean;
  onAssignToTeam: (day: number, shift: Shift, teamId: number, userData: AvailabilityData) => void;
  onAssignToOperations: (day: number, shift: Shift, userData: AvailabilityData) => void;
  onAssignToSector: (day: number, shift: Shift, userData: AvailabilityData) => void;
}

const AssignmentDialog = memo(function AssignmentDialog({
  open,
  onOpenChange,
  selectedDay,
  selectedShift,
  scheduleMonth,
  scheduleYear,
  schedule,
  records,
  isDarkMode,
  onAssignToTeam,
  onAssignToOperations,
  onAssignToSector,
}: AssignmentDialogProps) {
  const dayName = selectedDay ? getDayNameAr(selectedDay, scheduleMonth, scheduleYear) : "";
  const shiftInfo = SHIFTS.find(s => s.value === selectedShift);
  
  // Get available people for this shift
  const getAvailablePeople = () => {
    if (!selectedDay || !selectedShift) return [];
    const dayOfWeek = getDayOfWeek(selectedDay, scheduleMonth, scheduleYear);
    return records.filter(r => (r[dayOfWeek as keyof AvailabilityData] as Shift[]).includes(selectedShift));
  };
  
  const availablePeople = getAvailablePeople();
  const daySchedule = selectedDay ? schedule[selectedDay] : null;
  const shiftStructure = selectedShift && daySchedule ? daySchedule[selectedShift] : null;
  
  // Check if person is already assigned
  const isPersonAssigned = (userId: string) => {
    if (!shiftStructure) return false;
    for (const team of shiftStructure.teams) {
      if (team.members.some((m: any) => m.userId === userId)) return true;
    }
    if (shiftStructure.operations.some((m: any) => m.userId === userId)) return true;
    if (shiftStructure.sector?.userId === userId) return true;
    return false;
  };
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${isDarkMode ? "bg-zinc-900 border-zinc-800" : "bg-white border-gray-200"} max-w-4xl max-h-[90vh]`}>
        <DialogHeader>
          <DialogTitle className={`flex items-center gap-2 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
            {shiftInfo?.icon}
            تعيين المناوبين - يوم {selectedDay} {dayName} - {shiftInfo?.label}
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-6 p-4">
            {/* Teams */}
            {shiftStructure && (
              <>
                <div>
                  <h3 className={`text-sm font-bold mb-3 ${isDarkMode ? "text-cyan-400" : "text-cyan-600"}`}>
                    فرق الإسعاف
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    {shiftStructure.teams.map((team: any) => (
                      <div key={team.id} className={`p-4 rounded-xl ${isDarkMode ? "bg-zinc-800" : "bg-gray-50"}`}>
                        <div className="flex items-center justify-between mb-2">
                          <span className={`font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>
                            {team.name}
                          </span>
                          <Badge variant="outline">
                            {team.members.length}/4
                          </Badge>
                        </div>
                        <div className="space-y-2">
                          {team.members.map((m: any) => (
                            <div key={m.userId} className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <RoleBadge role={m.userRole} compact />
                                <span className={`text-sm ${isDarkMode ? "text-zinc-300" : "text-gray-700"}`}>
                                  {m.userName}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Available People */}
                <div>
                  <h3 className={`text-sm font-bold mb-3 ${isDarkMode ? "text-amber-400" : "text-amber-600"}`}>
                    المتفرغين ({availablePeople.length})
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {availablePeople.map((person) => {
                      const isAssigned = isPersonAssigned(person.userId);
                      return (
                        <button
                          key={person.userId}
                          onClick={() => {
                            if (!isAssigned) {
                              // Auto-assign to first available slot
                              const firstTeamWithSpace = shiftStructure.teams.find((t: any) => t.members.length < 4);
                              if (firstTeamWithSpace) {
                                onAssignToTeam(selectedDay!, selectedShift!, firstTeamWithSpace.id, person);
                              } else if (shiftStructure.operations.length < 4) {
                                onAssignToOperations(selectedDay!, selectedShift!, person);
                              }
                            }
                          }}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                            isAssigned
                              ? "bg-green-500/20 text-green-400"
                              : isDarkMode
                                ? "bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                                : "bg-white hover:bg-gray-100 text-gray-700 border border-gray-200"
                          }`}
                        >
                          <RoleBadge role={person.userRole} compact />
                          <span className="text-sm">{person.userName}</span>
                          {isAssigned && <span className="text-xs">✓</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
});

// Main ScheduleBuilder component
interface ScheduleBuilderProps {
  records: AvailabilityData[];
}

function ScheduleBuilderComponent({ records }: ScheduleBuilderProps) {
  const { isDarkMode } = useTheme();
  const {
    schedule,
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
  } = useSchedule();
  
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  
  const handleDayClick = useCallback((day: number, shift: Shift) => {
    setSelectedDay(day);
    setSelectedShift(shift);
    setShowAssignDialog(true);
  }, []);
  
  const daysInMonth = getDaysInMonth(scheduleMonth, scheduleYear);
  
  const handleAutoFill = () => {
    autoFillSchedule();
    toast.success("تم إنشاء الجدول بنجاح");
  };
  
  const handleClear = () => {
    clearSchedule();
    toast.success("تم مسح الجدول");
  };
  
  const handleSave = () => {
    toast.success("تم حفظ الجدول بنجاح");
  };
  
  const handleExport = () => {
    toast.success("تم تصدير الجدول");
  };
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Select value={scheduleMonth.toString()} onValueChange={(v) => setScheduleMonth(parseInt(v))}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((m) => (
                <SelectItem key={m.value} value={m.value.toString()}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select value={scheduleYear.toString()} onValueChange={(v) => setScheduleYear(parseInt(v))}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map((y) => (
                <SelectItem key={y} value={y.toString()}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Button onClick={handleAutoFill} className="bg-red-600 hover:bg-red-700 gap-2">
            <RefreshCw className="h-4 w-4" />
            إنشاء تلقائي
          </Button>
          <Button variant="outline" onClick={handleClear} className="gap-2">
            <Trash2 className="h-4 w-4" />
            مسح
          </Button>
          <Button variant="outline" onClick={handleSave} className="gap-2">
            <Save className="h-4 w-4" />
            حفظ
          </Button>
          <Button variant="outline" onClick={handleExport} className="gap-2">
            <FileSpreadsheet className="h-4 w-4" />
            تصدير
          </Button>
        </div>
      </div>
      
      {/* Days Grid */}
      <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 gap-2">
        {Array.from({ length: daysInMonth }).map((_, i) => (
          <ScheduleDayCard
            key={i + 1}
            day={i + 1}
            scheduleMonth={scheduleMonth}
            scheduleYear={scheduleYear}
            schedule={schedule}
            getAvailableForDay={getAvailableForDay}
            getScheduleDayCount={getScheduleDayCount}
            onDayClick={handleDayClick}
            isDarkMode={isDarkMode}
          />
        ))}
      </div>
      
      {/* Assignment Dialog */}
      <AssignmentDialog
        open={showAssignDialog}
        onOpenChange={setShowAssignDialog}
        selectedDay={selectedDay}
        selectedShift={selectedShift}
        scheduleMonth={scheduleMonth}
        scheduleYear={scheduleYear}
        schedule={schedule}
        records={records}
        isDarkMode={isDarkMode}
        onAssignToTeam={assignToTeam}
        onAssignToOperations={assignToOperations}
        onAssignToSector={assignToSector}
      />
    </div>
  );
}

export const ScheduleBuilder = memo(ScheduleBuilderComponent);

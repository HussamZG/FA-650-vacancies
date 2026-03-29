"use client";

import { memo, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart3, Users, Calendar, Clock, TrendingUp, Award } from "lucide-react";
import { useScheduleContext } from "@/contexts/ScheduleContext";
import { ROLES, SHIFTS, MAX_PEOPLE_PER_SHIFT } from "@/lib/schedule/constants";
import { getDaysInMonth } from "@/lib/schedule/utils";
import { DayScheduleStructure, Shift } from "@/lib/schedule/types";
import { useTheme } from "@/hooks/useSchedule";

interface StatisticsReportProps {
  records: { length: number };
}

function StatisticsReportComponent({ records }: StatisticsReportProps) {
  const { isDarkMode } = useTheme();
  const { schedule, calendarMonth, calendarYear } = useScheduleContext();
  
  const stats = useMemo(() => {
    let totalPeople = 0;
    let totalShifts = 0;
    let totalDays = 0;
    const roleDistribution: Record<string, number> = {
      leader: 0,
      scout: 0,
      medic: 0,
      sector_lead: 0,
      operations: 0,
    };
    const shiftDistribution: Record<string, number> = {
      morning: 0,
      evening: 0,
      night: 0
    };
    let fullShifts = 0;
    
    Object.values(schedule).forEach(daySchedule => {
      let dayHasPeople = false;
      
      (['morning', 'evening', 'night'] as Shift[]).forEach(shift => {
        const shiftStructure = daySchedule[shift];
        let shiftCount = 0;
        
        shiftStructure.teams.forEach(team => {
          team.members.forEach(member => {
            totalPeople++;
            shiftCount++;
            roleDistribution[member.userRole]++;
          });
        });
        
        shiftStructure.operations.forEach(member => {
          totalPeople++;
          shiftCount++;
          roleDistribution[member.userRole]++;
        });
        
        if (shiftStructure.sector) {
          totalPeople++;
          shiftCount++;
          roleDistribution[shiftStructure.sector.userRole]++;
        }
        
        if (shiftCount > 0) {
          totalShifts++;
          shiftDistribution[shift]++;
          if (shiftCount >= MAX_PEOPLE_PER_SHIFT) {
            fullShifts++;
          }
          dayHasPeople = true;
        }
      });
      
      if (dayHasPeople) totalDays++;
    });
    
    const daysInMonth = getDaysInMonth(calendarMonth, calendarYear);
    const coverage = totalDays > 0 ? ((totalDays / daysInMonth) * 100).toFixed(1) : 0;
    
    return {
      totalPeople,
      totalShifts,
      totalDays,
      roleDistribution,
      shiftDistribution,
      fullShifts,
      coverage,
      averagePeoplePerShift: totalShifts > 0 ? (totalPeople / totalShifts).toFixed(1) : '0'
    };
  }, [schedule, calendarMonth, calendarYear]);
  
  const daysInMonth = getDaysInMonth(calendarMonth, calendarYear);
  
  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className={`${isDarkMode ? "bg-zinc-800 border-zinc-700" : "bg-white"}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-500/20">
                <Users className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className={`text-sm ${isDarkMode ? "text-zinc-400" : "text-gray-500"}`}>إجمالي المناوبين</p>
                <p className={`text-2xl font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>{stats.totalPeople}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className={`${isDarkMode ? "bg-zinc-800 border-zinc-700" : "bg-white"}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-500/20">
                <Clock className="h-5 w-5 text-cyan-500" />
              </div>
              <div>
                <p className={`text-sm ${isDarkMode ? "text-zinc-400" : "text-gray-500"}`}>المناوبات</p>
                <p className={`text-2xl font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>{stats.totalShifts}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className={`${isDarkMode ? "bg-zinc-800 border-zinc-700" : "bg-white"}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/20">
                <Calendar className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className={`text-sm ${isDarkMode ? "text-zinc-400" : "text-gray-500"}`}>أيام مغطاة</p>
                <p className={`text-2xl font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>{stats.totalDays}/{daysInMonth}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className={`${isDarkMode ? "bg-zinc-800 border-zinc-700" : "bg-white"}`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/20">
                <TrendingUp className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className={`text-sm ${isDarkMode ? "text-zinc-400" : "text-gray-500"}`}>نسبة التغطية</p>
                <p className={`text-2xl font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>{stats.coverage}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Role Distribution */}
        <Card className={`${isDarkMode ? "bg-zinc-800 border-zinc-700" : "bg-white"}`}>
          <CardHeader>
            <CardTitle className={`flex items-center gap-2 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
              <Award className="h-5 w-5" />
              توزيع الرتب
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {ROLES.map(role => {
                const count = stats.roleDistribution[role.value] || 0;
                const total = stats.totalPeople || 1;
                const percentage = ((count / total) * 100).toFixed(1);
                
                return (
                  <div key={role.value} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <role.icon className={`${role.iconClass} ${role.color}`} />
                        <span className={isDarkMode ? "text-zinc-300" : "text-gray-700"}>{role.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>{count}</span>
                        <Badge variant="outline" className="text-xs">{percentage}%</Badge>
                      </div>
                    </div>
                    <div className={`h-2 rounded-full ${isDarkMode ? "bg-zinc-700" : "bg-gray-200"}`}>
                      <div 
                        className={`h-2 rounded-full ${role.bgColor}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
        
        {/* Shift Distribution */}
        <Card className={`${isDarkMode ? "bg-zinc-800 border-zinc-700" : "bg-white"}`}>
          <CardHeader>
            <CardTitle className={`flex items-center gap-2 ${isDarkMode ? "text-white" : "text-gray-900"}`}>
              <BarChart3 className="h-5 w-5" />
              توزيع الفترات
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {SHIFTS.map(shift => {
                const count = stats.shiftDistribution[shift.value] || 0;
                const total = stats.totalShifts || 1;
                const percentage = ((count / total) * 100).toFixed(1);
                
                return (
                  <div key={shift.value} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <shift.icon className={`${shift.iconClass} ${shift.color}`} />
                        <span className={isDarkMode ? "text-zinc-300" : "text-gray-700"}>{shift.label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>{count}</span>
                        <Badge variant="outline" className="text-xs">{percentage}%</Badge>
                      </div>
                    </div>
                    <div className={`h-2 rounded-full ${isDarkMode ? "bg-zinc-700" : "bg-gray-200"}`}>
                      <div 
                        className={`h-2 rounded-full ${shift.bgColor}`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Summary */}
      <Card className={`${isDarkMode ? "bg-zinc-800 border-zinc-700" : "bg-white"}`}>
        <CardHeader>
          <CardTitle className={isDarkMode ? "text-white" : "text-gray-900"}>ملخص الإحصائيات</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className={`p-4 rounded-lg ${isDarkMode ? "bg-zinc-700" : "bg-gray-50"}`}>
              <p className={`text-sm ${isDarkMode ? "text-zinc-400" : "text-gray-500"}`}>متوسط المناوبين</p>
              <p className={`text-xl font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>{stats.averagePeoplePerShift}</p>
              <p className={`text-xs ${isDarkMode ? "text-zinc-500" : "text-gray-400"}`}>لكل مناوبة</p>
            </div>
            
            <div className={`p-4 rounded-lg ${isDarkMode ? "bg-zinc-700" : "bg-gray-50"}`}>
              <p className={`text-sm ${isDarkMode ? "text-zinc-400" : "text-gray-500"}`}>مناوبات مكتملة</p>
              <p className={`text-xl font-bold text-green-500`}>{stats.fullShifts}</p>
              <p className={`text-xs ${isDarkMode ? "text-zinc-500" : "text-gray-400"}`}>21 شخص</p>
            </div>
            
            <div className={`p-4 rounded-lg ${isDarkMode ? "bg-zinc-700" : "bg-gray-50"}`}>
              <p className={`text-sm ${isDarkMode ? "text-zinc-400" : "text-gray-500"}`}>المتفرغين</p>
              <p className={`text-xl font-bold ${isDarkMode ? "text-white" : "text-gray-900"}`}>{records.length}</p>
              <p className={`text-xs ${isDarkMode ? "text-zinc-500" : "text-gray-400"}`}>شخص</p>
            </div>
            
            <div className={`p-4 rounded-lg ${isDarkMode ? "bg-zinc-700" : "bg-gray-50"}`}>
              <p className={`text-sm ${isDarkMode ? "text-zinc-400" : "text-gray-500"}`}>نقص في</p>
              <p className={`text-xl font-bold text-amber-500`}>{stats.totalShifts - stats.fullShifts}</p>
              <p className={`text-xs ${isDarkMode ? "text-zinc-500" : "text-gray-400"}`}>مناوبة</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export const StatisticsReport = memo(StatisticsReportComponent);

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentAppUser } from "@/lib/server-auth";

export async function GET(request: Request) {
  try {
    const user = await getCurrentAppUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: "يرجى تسجيل الدخول" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month");
    const year = searchParams.get("year");

    const where: { month?: number; year?: number } = {};
    if (month) where.month = parseInt(month);
    if (year) where.year = parseInt(year);

    const totalUsers = await db.user.count({
      where: { isActive: true },
    });

    const totalAvailabilities = await db.availability.count({
      where: Object.keys(where).length > 0 ? where : undefined,
    });

    const availabilities = await db.availability.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      select: {
        sunday: true,
        monday: true,
        tuesday: true,
        wednesday: true,
        thursday: true,
        friday: true,
        saturday: true,
      },
    });

    const shiftCounts = {
      morning: 0,
      evening: 0,
      night: 0,
    };

    const weekdayShifts: Record<string, { morning: number; evening: number; night: number }> = {
      sunday: { morning: 0, evening: 0, night: 0 },
      monday: { morning: 0, evening: 0, night: 0 },
      tuesday: { morning: 0, evening: 0, night: 0 },
      wednesday: { morning: 0, evening: 0, night: 0 },
      thursday: { morning: 0, evening: 0, night: 0 },
      friday: { morning: 0, evening: 0, night: 0 },
      saturday: { morning: 0, evening: 0, night: 0 },
    };

    const weekdays = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

    availabilities.forEach((a) => {
      weekdays.forEach((day) => {
        const shifts = JSON.parse(a[day as keyof typeof a] as string) as string[];
        shifts.forEach((shift) => {
          shiftCounts[shift as keyof typeof shiftCounts]++;
          weekdayShifts[day][shift as keyof typeof shiftCounts]++;
        });
      });
    });

    const roleStats = await db.user.groupBy({
      by: ["role"],
      _count: {
        id: true,
      },
    });

    const mostAvailableDays = weekdays
      .map((day) => ({
        day,
        total: weekdayShifts[day].morning + weekdayShifts[day].evening + weekdayShifts[day].night,
      }))
      .sort((a, b) => b.total - a.total);

    return NextResponse.json({
      success: true,
      stats: {
        totalUsers,
        totalAvailabilities,
        shiftCounts,
        weekdayShifts,
        roleStats: roleStats.map((r) => ({ role: r.role, count: r._count.id })),
        mostAvailableDays,
        averageShiftsPerPerson:
          totalAvailabilities > 0
            ? ((shiftCounts.morning + shiftCounts.evening + shiftCounts.night) / totalAvailabilities).toFixed(1)
            : 0,
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "حدث خطأ في استرجاع الإحصائيات" },
      { status: 500 }
    );
  }
}

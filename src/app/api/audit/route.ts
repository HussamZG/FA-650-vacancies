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
    const limit = parseInt(searchParams.get("limit") || "50");
    const tableName = searchParams.get("table");

    const where: { tableName?: string } = {};
    if (tableName) where.tableName = tableName;

    const logs = await db.auditLog.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      include: {
        user: {
          select: { name: true, email: true, role: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    const formattedLogs = logs.map((log) => ({
      id: log.id,
      action: log.action,
      tableName: log.tableName,
      recordId: log.recordId,
      oldData: log.oldData ? JSON.parse(log.oldData) : null,
      newData: log.newData ? JSON.parse(log.newData) : null,
      user: log.user,
      createdAt: log.createdAt,
    }));

    return NextResponse.json({ success: true, logs: formattedLogs });
  } catch {
    return NextResponse.json(
      { success: false, error: "حدث خطأ في استرجاع السجل" },
      { status: 500 }
    );
  }
}

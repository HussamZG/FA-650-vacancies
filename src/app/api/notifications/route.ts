import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireCurrentAppUser } from "@/lib/server-auth";
import {
  parseScheduleDocument,
  serializeScheduleDocument,
} from "@/lib/schedule/collaboration";

export async function PATCH(request: Request) {
  try {
    const user = await requireCurrentAppUser();
    const body = await request.json();
    const month = parseInt(String(body.month || ""), 10);
    const year = parseInt(String(body.year || ""), 10);
    const notificationId = typeof body.notificationId === "string" ? body.notificationId : null;
    const action = body.action === "read-all" ? "read-all" : "read";

    if (!Number.isInteger(month) || !Number.isInteger(year)) {
      return NextResponse.json({ success: false, error: "يرجى تحديد الشهر والسنة" }, { status: 400 });
    }

    const scheduleRecord = await db.schedule.findFirst({
      where: { month, year },
    });

    if (!scheduleRecord) {
      return NextResponse.json({ success: false, error: "لا يوجد جدول منشور لهذه الفترة" }, { status: 404 });
    }

    const document = parseScheduleDocument(scheduleRecord.data);
    const now = new Date().toISOString();

    document.collaboration.notifications = document.collaboration.notifications.map((notification) => {
      if (notification.userId !== user.id) return notification;

      if (action === "read-all") {
        return notification.readAt ? notification : { ...notification, readAt: now };
      }

      if (notificationId && notification.id === notificationId && !notification.readAt) {
        return { ...notification, readAt: now };
      }

      return notification;
    });

    document.collaboration.lastUpdatedAt = now;

    await db.schedule.update({
      where: { id: scheduleRecord.id },
      data: {
        data: serializeScheduleDocument(document),
        updatedBy: user.id,
      },
    });

    return NextResponse.json({
      success: true,
      notifications: document.collaboration.notifications
        .filter((notification) => notification.userId === user.id)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    });
  } catch (error) {
    console.error("[api/notifications][PATCH]", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "تعذر تحديث الإشعارات",
      },
      { status: 500 }
    );
  }
}

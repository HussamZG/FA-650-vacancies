import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireCurrentAppUser } from "@/lib/server-auth";
import {
  applyJoinRequest,
  applySwapRequest,
  getJoinTargetsForRole,
  isUserAvailableForShift,
  listScheduledAssignments,
  parseScheduleDocument,
  serializeScheduleDocument,
  type AssignmentLocation,
  type CollaborationRequestPayload,
  type Shift,
  type ShiftCollaborationRequest,
  type ShiftSmartNotification,
} from "@/lib/schedule/collaboration";

type ShiftRequestAction = "approve" | "reject" | "cancel";

const matchesLocation = (left: AssignmentLocation, right: AssignmentLocation) =>
  left.type === right.type &&
  left.teamId === right.teamId &&
  (left.slotKey ?? null) === (right.slotKey ?? null);

const toResponseRequest = (request: ShiftCollaborationRequest) => ({
  ...request,
  canApprove: false,
  canReject: false,
  canCancel: false,
});

async function writeAuditLog(payload: {
  action: "create" | "update";
  tableName: string;
  recordId: string;
  userId: string;
  oldData?: string;
  newData?: string;
}) {
  await db.auditLog.create({
    data: {
      id: crypto.randomUUID(),
      action: payload.action,
      tableName: payload.tableName,
      recordId: payload.recordId,
      oldData: payload.oldData ?? null,
      newData: payload.newData ?? null,
      userId: payload.userId,
    },
  });
}

async function getScheduleRecord(month: number, year: number) {
  return db.schedule.findFirst({
    where: { month, year },
  });
}

async function saveScheduleDocument(params: {
  scheduleId: string;
  month: number;
  year: number;
  data: string;
  actorId: string;
}) {
  return db.schedule.update({
    where: { id: params.scheduleId },
    data: {
      month: params.month,
      year: params.year,
      data: params.data,
      updatedBy: params.actorId,
    },
  });
}

function buildNotification(payload: {
  userId: string;
  actorId: string | null;
  actorName: string | null;
  type: ShiftSmartNotification["type"];
  title: string;
  message: string;
  relatedRequestId?: string | null;
  requiresAction?: boolean;
}): ShiftSmartNotification {
  return {
    id: crypto.randomUUID(),
    userId: payload.userId,
    actorId: payload.actorId,
    actorName: payload.actorName,
    type: payload.type,
    title: payload.title,
    message: payload.message,
    relatedRequestId: payload.relatedRequestId ?? null,
    requiresAction: payload.requiresAction ?? false,
    readAt: null,
    createdAt: new Date().toISOString(),
  };
}

function markRelatedNotificationsAsRead(
  notifications: ShiftSmartNotification[],
  requestId: string,
  userId: string
) {
  return notifications.map((notification) =>
    notification.relatedRequestId === requestId && notification.userId === userId && !notification.readAt
      ? {
          ...notification,
          readAt: new Date().toISOString(),
        }
      : notification
  );
}

function parseMonthYear(searchParams: URLSearchParams) {
  const month = parseInt(searchParams.get("month") || "", 10);
  const year = parseInt(searchParams.get("year") || "", 10);

  if (!Number.isInteger(month) || !Number.isInteger(year)) {
    throw new Error("يرجى تحديد الشهر والسنة");
  }

  return { month, year };
}

const getShiftLabel = (shift: Shift) => {
  switch (shift) {
    case "morning":
      return "صباحي";
    case "evening":
      return "مسائي";
    case "night":
      return "ليلي";
    default:
      return shift;
  }
};

function assertPayloadLocation(value: unknown): AssignmentLocation {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("بيانات الخانة غير صالحة");
  }

  const location = value as {
    type?: string;
    teamId?: number | null;
    slotKey?: string | null;
  };

  if (location.type !== "team" && location.type !== "operations" && location.type !== "sector") {
    throw new Error("نوع الخانة غير صالح");
  }

  return {
    type: location.type,
    teamId: typeof location.teamId === "number" ? location.teamId : null,
    slotKey:
      location.slotKey === "leader" ||
      location.slotKey === "scout" ||
      location.slotKey === "medic-1" ||
      location.slotKey === "medic-2"
        ? location.slotKey
        : null,
  };
}

function assertRequestPayload(value: unknown): CollaborationRequestPayload {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("بيانات الطلب غير مكتملة");
  }

  const payload = value as {
    day?: number;
    shift?: string;
    location?: unknown;
    positionLabel?: string;
    personId?: string | null;
    personName?: string | null;
    personRole?: string | null;
  };

  if (typeof payload.day !== "number" || !Number.isInteger(payload.day)) {
    throw new Error("اليوم المختار غير صالح");
  }

  if (payload.shift !== "morning" && payload.shift !== "evening" && payload.shift !== "night") {
    throw new Error("المناوبة المختارة غير صالحة");
  }

  return {
    day: payload.day,
    shift: payload.shift,
    location: assertPayloadLocation(payload.location),
    positionLabel: typeof payload.positionLabel === "string" ? payload.positionLabel : "مناوبة",
    personId: typeof payload.personId === "string" ? payload.personId : null,
    personName: typeof payload.personName === "string" ? payload.personName : null,
    personRole:
      payload.personRole === "leader" ||
      payload.personRole === "scout" ||
      payload.personRole === "medic" ||
      payload.personRole === "sector_lead" ||
      payload.personRole === "operations"
        ? payload.personRole
        : null,
  };
}

export async function GET(request: Request) {
  try {
    const user = await requireCurrentAppUser();
    const { month, year } = parseMonthYear(new URL(request.url).searchParams);
    const scheduleRecord = await getScheduleRecord(month, year);

    if (!scheduleRecord) {
      return NextResponse.json({
        success: true,
        requests: [],
        notifications: [],
      });
    }

    const document = parseScheduleDocument(scheduleRecord.data);
    const visibleRequests = user.isAdmin
      ? document.collaboration.requests
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .map((entry) => toResponseRequest(entry))
      : [];

    const notifications = document.collaboration.notifications
      .filter((entry) => entry.userId === user.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return NextResponse.json({
      success: true,
      requests: visibleRequests,
      notifications,
    });
  } catch (error) {
    console.error("[api/shift-requests][GET]", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "تعذر تحميل طلبات المناوبات",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireCurrentAppUser();
    const body = await request.json();
    const month = parseInt(String(body.month || ""), 10);
    const year = parseInt(String(body.year || ""), 10);
    const type = body.type as "swap" | "join";
    const note = typeof body.note === "string" && body.note.trim().length > 0 ? body.note.trim() : null;

    if (!Number.isInteger(month) || !Number.isInteger(year)) {
      return NextResponse.json({ success: false, error: "يرجى تحديد الشهر والسنة" }, { status: 400 });
    }

    if (type !== "swap" && type !== "join") {
      return NextResponse.json({ success: false, error: "نوع الطلب غير مدعوم" }, { status: 400 });
    }

    const scheduleRecord = await getScheduleRecord(month, year);
    if (!scheduleRecord) {
      return NextResponse.json({ success: false, error: "لا يوجد جدول منشور لهذه الفترة" }, { status: 404 });
    }

    const document = parseScheduleDocument(scheduleRecord.data);
    const oldScheduleData = scheduleRecord.data;
    const allAssignments = listScheduledAssignments(document.days);

    if (type === "swap") {
      const source = assertRequestPayload(body.source);
      const target = assertRequestPayload(body.target);

      if (source.personId !== user.id) {
        return NextResponse.json({ success: false, error: "يمكنك تبديل مناوبتك أنت فقط" }, { status: 403 });
      }

      if (!target.personId || target.personId === user.id) {
        return NextResponse.json({ success: false, error: "اختر شخصًا آخر للتبديل معه" }, { status: 400 });
      }

      const sourceAssignment = allAssignments.find(
        (entry) =>
          entry.personId === user.id &&
          entry.day === source.day &&
          entry.shift === source.shift &&
          matchesLocation(entry.location, source.location)
      );
      const targetAssignment = allAssignments.find(
        (entry) =>
          entry.personId === target.personId &&
          entry.day === target.day &&
          entry.shift === target.shift &&
          matchesLocation(entry.location, target.location)
      );

      if (!sourceAssignment || !targetAssignment) {
        return NextResponse.json(
          { success: false, error: "تعذر التحقق من المناوبتين. ربما تغيّر الجدول قبل إرسال الطلب." },
          { status: 409 }
        );
      }

      const now = new Date().toISOString();
      const nextDays = applySwapRequest(
        document.days,
        {
          ...sourceAssignment,
          personId: sourceAssignment.personId,
          personName: sourceAssignment.personName,
          personRole: sourceAssignment.personRole,
        },
        {
          ...targetAssignment,
          personId: targetAssignment.personId,
          personName: targetAssignment.personName,
          personRole: targetAssignment.personRole,
        }
      );

      const newRequest: ShiftCollaborationRequest = {
        id: crypto.randomUUID(),
        month,
        year,
        type: "swap",
        status: "approved",
        requesterId: user.id,
        requesterName: user.name,
        requesterRole: user.role,
        source: sourceAssignment,
        target: targetAssignment,
        note,
        resolutionNote: "تم تنفيذ التبديل مباشرة وتحديث الجدول فورًا دون انتظار موافقة.",
        createdAt: now,
        updatedAt: now,
        respondedAt: now,
        respondedById: null,
        respondedByName: "النظام",
      };

      document.days = nextDays;
      document.collaboration.requests.unshift(newRequest);
      document.collaboration.notifications.unshift(
        buildNotification({
          userId: targetAssignment.personId,
          actorId: user.id,
          actorName: user.name,
          type: "info",
          title: "تم تبديل مناوبتك",
          message: `${user.name} بدّل معك المناوبة، وأصبحت مناوبتك الجديدة ${sourceAssignment.positionLabel} يوم ${sourceAssignment.day} (${getShiftLabel(sourceAssignment.shift)}).`,
          relatedRequestId: newRequest.id,
        }),
        buildNotification({
          userId: user.id,
          actorId: user.id,
          actorName: user.name,
          type: "success",
          title: "تم تنفيذ التبديل",
          message: `تم تبديل مناوبتك مع ${targetAssignment.personName} وتحديث الجدول مباشرة.`,
          relatedRequestId: newRequest.id,
        })
      );
      document.collaboration.lastUpdatedAt = now;

      await saveScheduleDocument({
        scheduleId: scheduleRecord.id,
        month,
        year,
        data: serializeScheduleDocument(document),
        actorId: user.id,
      });

      await writeAuditLog({
        action: "create",
        tableName: "ShiftRequest",
        recordId: newRequest.id,
        userId: user.id,
        newData: JSON.stringify(newRequest),
      });

      await writeAuditLog({
        action: "update",
        tableName: "Schedule",
        recordId: scheduleRecord.id,
        userId: user.id,
        oldData: oldScheduleData,
        newData: serializeScheduleDocument(document),
      });

      return NextResponse.json({
        success: true,
        request: toResponseRequest(newRequest),
        notifications: document.collaboration.notifications.filter((entry) => entry.userId === user.id),
        message: "تم تنفيذ التبديل وتحديث الجدول مباشرة",
      });
    }

    const target = assertRequestPayload(body.target);
    const availability = await db.availability.findFirst({
      where: {
        userId: user.id,
        month,
        year,
      },
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

    if (!isUserAvailableForShift(availability, target.day, month, year, target.shift)) {
      return NextResponse.json(
        { success: false, error: "لا يمكنك الانضمام إلى هذه المناوبة لأنك غير مسجل كتفرغ في هذا التوقيت" },
        { status: 400 }
      );
    }

    const allowedJoinTargets = getJoinTargetsForRole(document.days, target.day, target.shift, user.role);
    const isAllowedTarget = allowedJoinTargets.some((entry) => matchesLocation(entry, target.location));

    if (!isAllowedTarget) {
      return NextResponse.json(
        { success: false, error: "لم يعد هذا المكان الشاغر متاحًا للانضمام" },
        { status: 409 }
      );
    }

    const nextDays = applyJoinRequest(document.days, {
      userId: user.id,
      userName: user.name,
      userRole: user.role,
    }, target);

    const now = new Date().toISOString();
    const newRequest: ShiftCollaborationRequest = {
      id: crypto.randomUUID(),
      month,
      year,
      type: "join",
      status: "approved",
      requesterId: user.id,
      requesterName: user.name,
      requesterRole: user.role,
      source: null,
      target: {
        ...target,
        personId: null,
        personName: null,
        personRole: null,
      },
      note,
      resolutionNote: "تم تنفيذ الانضمام مباشرة لأن الخانة كانت شاغرة والشروط متحققة.",
      createdAt: now,
      updatedAt: now,
      respondedAt: now,
      respondedById: null,
      respondedByName: "النظام",
    };

    document.days = nextDays;
    document.collaboration.requests.unshift(newRequest);
    document.collaboration.notifications.unshift(
      buildNotification({
        userId: user.id,
        actorId: user.id,
        actorName: user.name,
        type: "success",
        title: "تم الانضمام للمناوبة",
        message: `تم تثبيت انضمامك إلى ${target.positionLabel} في يوم ${target.day} (${target.shift === "morning" ? "صباحي" : target.shift === "evening" ? "مسائي" : "ليلي"}).`,
        relatedRequestId: newRequest.id,
      })
    );
    document.collaboration.lastUpdatedAt = now;

    await saveScheduleDocument({
      scheduleId: scheduleRecord.id,
      month,
      year,
      data: serializeScheduleDocument(document),
      actorId: user.id,
    });

    await writeAuditLog({
      action: "create",
      tableName: "ShiftRequest",
      recordId: newRequest.id,
      userId: user.id,
      newData: JSON.stringify(newRequest),
    });

    await writeAuditLog({
      action: "update",
      tableName: "Schedule",
      recordId: scheduleRecord.id,
      userId: user.id,
      oldData: oldScheduleData,
      newData: serializeScheduleDocument(document),
    });

    return NextResponse.json({
      success: true,
      request: toResponseRequest(newRequest),
      notifications: document.collaboration.notifications.filter((entry) => entry.userId === user.id),
      message: "تم الانضمام إلى المناوبة وتحديث الجدول مباشرة",
    });
  } catch (error) {
    console.error("[api/shift-requests][POST]", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "تعذر تنفيذ طلب المناوبة",
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const user = await requireCurrentAppUser();
    const body = await request.json();
    const month = parseInt(String(body.month || ""), 10);
    const year = parseInt(String(body.year || ""), 10);
    const requestId = typeof body.requestId === "string" ? body.requestId : "";
    const action = body.action as ShiftRequestAction;
    const resolutionNote =
      typeof body.resolutionNote === "string" && body.resolutionNote.trim().length > 0
        ? body.resolutionNote.trim()
        : null;

    if (!Number.isInteger(month) || !Number.isInteger(year) || !requestId) {
      return NextResponse.json({ success: false, error: "بيانات الطلب غير مكتملة" }, { status: 400 });
    }

    if (action !== "approve" && action !== "reject" && action !== "cancel") {
      return NextResponse.json({ success: false, error: "الإجراء غير مدعوم" }, { status: 400 });
    }

    const scheduleRecord = await getScheduleRecord(month, year);
    if (!scheduleRecord) {
      return NextResponse.json({ success: false, error: "لا يوجد جدول منشور لهذه الفترة" }, { status: 404 });
    }

    const document = parseScheduleDocument(scheduleRecord.data);
    const requestIndex = document.collaboration.requests.findIndex((entry) => entry.id === requestId);

    if (requestIndex === -1) {
      return NextResponse.json({ success: false, error: "تعذر العثور على الطلب" }, { status: 404 });
    }

    const currentRequest = document.collaboration.requests[requestIndex];
    const oldRequest = JSON.stringify(currentRequest);
    const oldScheduleData = scheduleRecord.data;

    if (currentRequest.status !== "pending") {
      return NextResponse.json({ success: false, error: "هذا الطلب لم يعد معلقًا" }, { status: 409 });
    }

    const isTargetUser = currentRequest.target.personId === user.id;
    const isRequester = currentRequest.requesterId === user.id;
    const canModerate = isTargetUser || user.isAdmin;

    if (action === "cancel") {
      if (!isRequester) {
        return NextResponse.json({ success: false, error: "لا يمكنك إلغاء هذا الطلب" }, { status: 403 });
      }

      const updatedRequest: ShiftCollaborationRequest = {
        ...currentRequest,
        status: "cancelled",
        updatedAt: new Date().toISOString(),
        respondedAt: new Date().toISOString(),
        respondedById: user.id,
        respondedByName: user.name,
        resolutionNote,
      };

      document.collaboration.requests[requestIndex] = updatedRequest;
      document.collaboration.notifications = markRelatedNotificationsAsRead(
        document.collaboration.notifications,
        requestId,
        user.id
      );

      if (currentRequest.target.personId) {
        document.collaboration.notifications.unshift(
          buildNotification({
            userId: currentRequest.target.personId,
            actorId: user.id,
            actorName: user.name,
            type: "info",
            title: "تم إلغاء طلب التبديل",
            message: `${user.name} ألغى طلب التبديل المرتبط بمناوبتك.`,
            relatedRequestId: requestId,
          })
        );
      }

      document.collaboration.lastUpdatedAt = new Date().toISOString();

      await saveScheduleDocument({
        scheduleId: scheduleRecord.id,
        month,
        year,
        data: serializeScheduleDocument(document),
        actorId: user.id,
      });

      await writeAuditLog({
        action: "update",
        tableName: "ShiftRequest",
        recordId: requestId,
        userId: user.id,
        oldData: oldRequest,
        newData: JSON.stringify(updatedRequest),
      });

      return NextResponse.json({
        success: true,
        request: toResponseRequest(updatedRequest),
        notifications: document.collaboration.notifications.filter((entry) => entry.userId === user.id),
        message: "تم إلغاء الطلب",
      });
    }

    if (!canModerate) {
      return NextResponse.json({ success: false, error: "لا تملك صلاحية اتخاذ هذا الإجراء" }, { status: 403 });
    }

    if (action === "reject") {
      const updatedRequest: ShiftCollaborationRequest = {
        ...currentRequest,
        status: "rejected",
        updatedAt: new Date().toISOString(),
        respondedAt: new Date().toISOString(),
        respondedById: user.id,
        respondedByName: user.name,
        resolutionNote,
      };

      document.collaboration.requests[requestIndex] = updatedRequest;
      document.collaboration.notifications = markRelatedNotificationsAsRead(
        document.collaboration.notifications,
        requestId,
        user.id
      );
      document.collaboration.notifications.unshift(
        buildNotification({
          userId: currentRequest.requesterId,
          actorId: user.id,
          actorName: user.name,
          type: "error",
          title: "تم رفض طلب التبديل",
          message: `${user.name} رفض طلب التبديل المرتبط بمناوبته.`,
          relatedRequestId: requestId,
        })
      );
      document.collaboration.lastUpdatedAt = new Date().toISOString();

      await saveScheduleDocument({
        scheduleId: scheduleRecord.id,
        month,
        year,
        data: serializeScheduleDocument(document),
        actorId: user.id,
      });

      await writeAuditLog({
        action: "update",
        tableName: "ShiftRequest",
        recordId: requestId,
        userId: user.id,
        oldData: oldRequest,
        newData: JSON.stringify(updatedRequest),
      });

      return NextResponse.json({
        success: true,
        request: toResponseRequest(updatedRequest),
        notifications: document.collaboration.notifications.filter((entry) => entry.userId === user.id),
        message: "تم رفض الطلب",
      });
    }

    if (!currentRequest.source) {
      return NextResponse.json({ success: false, error: "هذا الطلب لا يدعم الموافقة اليدوية" }, { status: 400 });
    }

    const nextDays = applySwapRequest(document.days, currentRequest.source, currentRequest.target);
    const updatedRequest: ShiftCollaborationRequest = {
      ...currentRequest,
      status: "approved",
      updatedAt: new Date().toISOString(),
      respondedAt: new Date().toISOString(),
      respondedById: user.id,
      respondedByName: user.name,
      resolutionNote,
    };

    document.days = nextDays;
    document.collaboration.requests[requestIndex] = updatedRequest;
    document.collaboration.notifications = markRelatedNotificationsAsRead(
      document.collaboration.notifications,
      requestId,
      user.id
    );
    document.collaboration.notifications.unshift(
      buildNotification({
        userId: currentRequest.requesterId,
        actorId: user.id,
        actorName: user.name,
        type: "success",
        title: "تمت الموافقة على التبديل",
        message: `${user.name} وافق على طلب التبديل، وتم تحديث الجدول مباشرة.`,
        relatedRequestId: requestId,
      })
    );

    if (currentRequest.target.personId) {
      document.collaboration.notifications.unshift(
        buildNotification({
          userId: currentRequest.target.personId,
          actorId: user.id,
          actorName: user.name,
          type: "success",
          title: "تم تنفيذ التبديل",
          message: "تم اعتماد طلب التبديل وتحديث مناوبتك في الجدول.",
          relatedRequestId: requestId,
        })
      );
    }

    document.collaboration.lastUpdatedAt = new Date().toISOString();

    await saveScheduleDocument({
      scheduleId: scheduleRecord.id,
      month,
      year,
      data: serializeScheduleDocument(document),
      actorId: user.id,
    });

    await writeAuditLog({
      action: "update",
      tableName: "ShiftRequest",
      recordId: requestId,
      userId: user.id,
      oldData: oldRequest,
      newData: JSON.stringify(updatedRequest),
    });

    await writeAuditLog({
      action: "update",
      tableName: "Schedule",
      recordId: scheduleRecord.id,
      userId: user.id,
      oldData: oldScheduleData,
      newData: serializeScheduleDocument(document),
    });

    return NextResponse.json({
      success: true,
      request: toResponseRequest(updatedRequest),
      notifications: document.collaboration.notifications.filter((entry) => entry.userId === user.id),
      message: "تم تنفيذ التبديل وتحديث الجدول",
    });
  } catch (error) {
    console.error("[api/shift-requests][PUT]", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "تعذر تحديث طلب المناوبة",
      },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';

// GET - تصدير البيانات
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const format = searchParams.get('format') || 'pdf'; // pdf أو excel

    const where: { month?: number; year?: number } = {};
    if (month) where.month = parseInt(month);
    if (year) where.year = parseInt(year);

    const availabilities = await db.availability.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      include: {
        user: {
          select: { name: true, role: true }
        }
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }]
    });

    const MONTHS = [
      'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ];

    const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const WEEKDAYS_AR = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const SHIFTS_AR: Record<string, string> = {
      'morning': 'صباحي',
      'evening': 'مسائي',
      'night': 'ليلي'
    };
    const ROLES_AR: Record<string, string> = {
      'admin': 'مدير',
      'commander': 'قائد',
      'scout': 'كشاف',
      'medic': 'مسعف'
    };

    if (format === 'excel') {
      // إنشاء ملف Excel
      const data: Record<string, unknown>[] = [];

      availabilities.forEach((a) => {
        const row: Record<string, unknown> = {
          'الاسم': a.user.name,
          'الرتبة': ROLES_AR[a.user.role] || a.user.role,
          'الشهر': MONTHS[a.month - 1],
          'السنة': a.year
        };

        WEEKDAYS.forEach((day, index) => {
          const shifts = JSON.parse(a[day as keyof typeof a] as string) as string[];
          row[WEEKDAYS_AR[index]] = shifts.length > 0 
            ? shifts.map(s => SHIFTS_AR[s]).join('، ')
            : 'غير متفرغ';
        });

        row['ملاحظات'] = a.notes || '-';
        data.push(row);
      });

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'التفرغات');

      // تحويل إلى base64
      const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });

      return new NextResponse(Buffer.from(excelBuffer, 'base64'), {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="availabilities-${month}-${year}.xlsx"`
        }
      });
    } else {
      // إنشاء ملف PDF
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      // إضافة الخط العربي (بسيط)
      doc.setFont('helvetica');
      doc.setFontSize(16);

      const monthName = month ? MONTHS[parseInt(month) - 1] : 'جميع الأشهر';
      const yearNum = year || 'جميع السنوات';

      // العنوان
      doc.text(`Availability Report - Ambulance Center 650`, 148, 15, { align: 'center' });
      doc.text(`${monthName} ${yearNum}`, 148, 25, { align: 'center' });

      // جدول البيانات
      let y = 40;
      const lineHeight = 8;
      const pageHeight = 200;

      // رأس الجدول
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      const headers = ['Name', 'Role', ...WEEKDAYS_AR.map(d => d.substring(0, 3))];
      const colWidths = [30, 20, 25, 25, 25, 25, 25, 25, 25];
      let x = 10;

      headers.forEach((header, i) => {
        doc.rect(x, y, colWidths[i], lineHeight);
        doc.text(header, x + colWidths[i] / 2, y + 5, { align: 'center' });
        x += colWidths[i];
      });

      y += lineHeight;
      doc.setFont('helvetica', 'normal');

      // البيانات
      availabilities.forEach((a) => {
        if (y > pageHeight) {
          doc.addPage();
          y = 20;
        }

        x = 10;
        const rowData = [
          a.user.name,
          ROLES_AR[a.user.role] || a.user.role
        ];

        WEEKDAYS.forEach((day) => {
          const shifts = JSON.parse(a[day as keyof typeof a] as string) as string[];
          rowData.push(shifts.length > 0 ? shifts.map(s => SHIFTS_AR[s].substring(0, 3)).join(',') : '-');
        });

        rowData.forEach((cell, i) => {
          doc.rect(x, y, colWidths[i], lineHeight);
          doc.text(cell.toString(), x + colWidths[i] / 2, y + 5, { align: 'center' });
          x += colWidths[i];
        });

        y += lineHeight;
      });

      const pdfBuffer = doc.output('arraybuffer');

      return new NextResponse(Buffer.from(pdfBuffer), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="availabilities-${month}-${year}.pdf"`
        }
      });
    }
  } catch {
    return NextResponse.json(
      { success: false, error: 'حدث خطأ في التصدير' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { data, month, year } = body;
    
    if (!data || !Array.isArray(data)) {
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
    }
    
    // Generate CSV content (works in browser without external dependencies)
    const headers = ['اليوم', 'اسم اليوم', 'الفترة', 'الفريق', 'الاسم', 'الرتبة'];
    const csvRows = [headers.join(',')];
    
    for (const row of data) {
      csvRows.push([
        row.day,
        row.dayName,
        row.shift,
        row.team,
        row.name,
        row.role
      ].map(val => `"${val}"`).join(','));
    }
    
    const csvContent = '\uFEFF' + csvRows.join('\n'); // Add BOM for Arabic support
    
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="schedule_${month}_${year}.csv"`
      }
    });
  } catch (error) {
    console.error('Export error:', error);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}

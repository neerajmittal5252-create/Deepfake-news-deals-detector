import { NextRequest, NextResponse } from 'next/server';
import { executeCheckPipeline } from '@/lib/moduleRouter';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { input, moduleType } = body;

    if (!input || typeof input !== 'string' || input.trim().length === 0) {
      return NextResponse.json(
        { error: 'Input URL or claim text is required.' },
        { status: 400 }
      );
    }

    const result = await executeCheckPipeline(input.trim(), moduleType);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('API Check Pipeline Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error processing trust check.' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const recent = await prisma.check.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ checks: recent });
  } catch (err: any) {
    return NextResponse.json({ checks: [] });
  }
}

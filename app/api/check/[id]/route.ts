import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const check = await prisma.check.findUnique({
      where: { id },
    });

    if (!check) {
      return NextResponse.json({ error: 'Check not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: check.id,
      moduleType: check.moduleType,
      inputUrl: check.inputUrl,
      score: check.score,
      verdict: check.verdict,
      signals: JSON.parse(check.signalsJson || '[]'),
      rawData: JSON.parse(check.rawDataJson || '{}'),
      explanation: check.explanation,
      createdAt: check.createdAt,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

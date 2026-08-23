import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const records = await prisma.check.findMany({
      take: 20,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      history: records.map((r) => ({
        id: r.id,
        moduleType: r.moduleType,
        inputUrl: r.inputUrl,
        score: r.score,
        verdict: r.verdict,
        explanation: r.explanation,
        createdAt: r.createdAt,
      })),
    });
  } catch (error: any) {
    return NextResponse.json({ history: [], error: error.message });
  }
}

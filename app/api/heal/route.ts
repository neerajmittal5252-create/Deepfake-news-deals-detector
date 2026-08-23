import { NextRequest, NextResponse } from 'next/server';
import { healCollector, approveHeal } from '@/lib/brightdataClient';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { collectorId = 'c_trustcheck_listing_v1', prompt, action = 'auto' } = body;

    if (action === 'approve') {
      const result = await approveHeal(collectorId);
      return NextResponse.json({ success: true, result });
    } else {
      // Zero-prompt autonomous heal: prompt is optional
      const result = await healCollector(collectorId, prompt);
      return NextResponse.json({ success: true, result });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

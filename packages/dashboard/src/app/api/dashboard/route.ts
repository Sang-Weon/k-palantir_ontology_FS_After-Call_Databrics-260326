import { NextResponse } from 'next/server';
import { getDemoStats } from '@/lib/demo-engine';

export async function GET() {
  const stats = getDemoStats();
  return NextResponse.json(stats);
}

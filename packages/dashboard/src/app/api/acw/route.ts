import { NextResponse } from 'next/server';
import { getDemoScenarios, getDemoScenario, runDemoPipeline } from '@/lib/demo-engine';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const scenarioId = searchParams.get('id');

  if (scenarioId) {
    const scenario = getDemoScenario(scenarioId);
    if (!scenario) {
      return NextResponse.json({ error: 'Scenario not found' }, { status: 404 });
    }
    return NextResponse.json(scenario);
  }

  return NextResponse.json({ scenarios: getDemoScenarios() });
}

export async function POST(request: Request) {
  const body = await request.json();
  const { scenario_id } = body;

  if (!scenario_id) {
    return NextResponse.json({ error: 'scenario_id is required' }, { status: 400 });
  }

  // 파이프라인 실행 시뮬레이션 (딜레이 추가)
  await new Promise((resolve) => setTimeout(resolve, 1500 + Math.random() * 1000));

  const result = runDemoPipeline(scenario_id);
  if (!result) {
    return NextResponse.json({ error: 'Scenario not found' }, { status: 404 });
  }

  return NextResponse.json(result);
}

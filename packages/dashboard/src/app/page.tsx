'use client';

import { useState, useEffect } from 'react';
import OntologyWizard from '@/components/ontology-wizard';
import { ImprovementPanel, WriteBackWorkflowPanel } from '@/components/improvement-engine';

// ── 타입 ────────────────────────────────────────────────────

interface DemoStats {
  totalCalls: number;
  period: string;
  acw: { ai_auto: { count: number; avg_seconds: number }; manual: { count: number; avg_seconds: number }; saved_hours: number; saved_cost_krw: number };
  agents: { total: number; direct: number; outsourced: number; outsourced_ratio: number };
  sentiment: { positive: number; neutral: number; negative: number; escalated: number };
  compliance: { incomplete_sale: number; verbal_abuse: number; privacy_violation: number; total_flags: number; awaiting_review: number };
  qa: { avg_score: number; top_category: string; lowest_category: string };
}

interface Scenario { id: string; name: string; description: string }

interface ACWResult {
  call_id: string;
  scenario: string;
  processing_time_ms: number;
  summary: { summary_text: string; intent_primary: string; intent_secondary: string[]; key_entities: Record<string, string | number>; action_items: string[]; resolution_status: string; disposition_code: string; confidence: number };
  sentiment: { overall_sentiment: string; customer_sentiment_score: number; agent_sentiment_score: number; sentiment_trajectory: string; verbal_abuse_detected: boolean; emotion_peaks: { segment_index: number; emotion: string; intensity: number; speaker: string }[] };
  compliance: { flags: { type: string; severity: string; description: string; evidence_segments: number[]; regulation_reference: string; confidence: number }[]; emotional_labor_alert: { triggered: boolean; reason: string | null }; overall_risk_level: string };
  qa: { total_score: number; categories: Record<string, number>; coaching_points: { category: string; suggestion: string; priority: string }[]; strengths: string[]; improvements: string[] };
  write_back: { tool: string; governance_level: number; status: string }[];
}

// ── 메인 페이지 ────────────────────────────────────────────────

export default function Home() {
  const [stats, setStats] = useState<DemoStats | null>(null);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);
  const [result, setResult] = useState<ACWResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'demo'>('dashboard');
  const [wizardOpen, setWizardOpen] = useState(false);

  useEffect(() => {
    fetch('/api/dashboard').then((r) => r.json()).then(setStats);
    fetch('/api/acw').then((r) => r.json()).then((d) => setScenarios(d.scenarios));
  }, []);

  const runPipeline = async (scenarioId: string) => {
    setSelectedScenario(scenarioId);
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch('/api/acw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario_id: scenarioId }),
      });
      const data = await res.json();
      setResult(data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-[#00338D] text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center font-bold text-lg">KP</div>
            <div>
              <h1 className="text-xl font-bold">K-Palantir ACW 자동화</h1>
              <p className="text-blue-200 text-sm">금융 콜센터 온톨로지 기반 After Call Work</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setActiveTab('dashboard')} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'dashboard' ? 'bg-white text-[#00338D]' : 'bg-white/10 hover:bg-white/20'}`}>
              대시보드
            </button>
            <button type="button" onClick={() => setActiveTab('demo')} className={`px-4 py-2 rounded-lg text-sm font-medium transition ${activeTab === 'demo' ? 'bg-white text-[#00338D]' : 'bg-white/10 hover:bg-white/20'}`}>
              ACW 데모
            </button>
            <button type="button" onClick={() => setWizardOpen(true)} className="px-4 py-2 rounded-lg text-sm font-medium transition bg-white/10 hover:bg-white/20 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
              온톨로지 위자드
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {activeTab === 'dashboard' && stats && <DashboardView stats={stats} />}
        {activeTab === 'demo' && (
          <DemoView
            scenarios={scenarios}
            selectedScenario={selectedScenario}
            result={result}
            loading={loading}
            onRunPipeline={runPipeline}
          />
        )}
      </main>

      <OntologyWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onGenerate={(ontology) => {
          console.log('Generated ontology:', ontology);
          alert(`온톨로지 생성 완료!\n\n객체: ${ontology.objects.length}개\n관계: ${ontology.links.length}개\n액션: ${ontology.actions.length}개\nDelta Tables: ${ontology.objects.length}개`);
        }}
      />
    </div>
  );
}

// ── 대시보드 뷰 ────────────────────────────────────────────────

function DashboardView({ stats }: { stats: DemoStats }) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">ACW 자동화 현황</h2>
        <span className="text-sm text-gray-500">{stats.period}</span>
      </div>

      {/* KPI 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard title="총 통화 건수" value={stats.totalCalls.toLocaleString()} suffix="건" color="blue" />
        <KPICard title="AI 자동 처리" value={stats.acw.ai_auto.count.toLocaleString()} suffix="건" sub={`평균 ${stats.acw.ai_auto.avg_seconds}초`} color="green" />
        <KPICard title="절감 시간" value={stats.acw.saved_hours.toString()} suffix="시간" sub={`약 ${(stats.acw.saved_cost_krw / 10000).toFixed(0)}만원`} color="emerald" />
        <KPICard title="컴플라이언스 플래그" value={stats.compliance.total_flags.toString()} suffix="건" sub={`심사 대기 ${stats.compliance.awaiting_review}건`} color="red" />
      </div>

      {/* 상세 패널 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 감성 분석 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">감성 분석 분포</h3>
          <div className="space-y-3">
            <SentimentBar label="긍정" count={stats.sentiment.positive} total={stats.totalCalls} color="bg-green-500" />
            <SentimentBar label="중립" count={stats.sentiment.neutral} total={stats.totalCalls} color="bg-gray-400" />
            <SentimentBar label="부정" count={stats.sentiment.negative} total={stats.totalCalls} color="bg-orange-500" />
            <SentimentBar label="에스컬레이션" count={stats.sentiment.escalated} total={stats.totalCalls} color="bg-red-500" />
          </div>
        </div>

        {/* 컴플라이언스 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">컴플라이언스 현황</h3>
          <div className="space-y-3">
            <ComplianceItem label="불완전판매" count={stats.compliance.incomplete_sale} level={1} />
            <ComplianceItem label="욕설/폭언" count={stats.compliance.verbal_abuse} level={2} />
            <ComplianceItem label="개인정보 위반" count={stats.compliance.privacy_violation} level={1} />
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">심사 대기</span>
              <span className="font-semibold text-orange-600">{stats.compliance.awaiting_review}건</span>
            </div>
          </div>
        </div>

        {/* 상담원 현황 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">상담원 현황</h3>
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1 text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-700">{stats.agents.direct}</div>
              <div className="text-xs text-blue-600">직접고용</div>
            </div>
            <div className="flex-1 text-center p-3 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-700">{stats.agents.outsourced}</div>
              <div className="text-xs text-orange-600">간접고용</div>
            </div>
          </div>
          <div className="text-sm text-gray-500 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <span className="font-medium text-yellow-800">노란봉투법 대응</span>
            <br />간접고용 비율 {stats.agents.outsourced_ratio}%
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">QA 평균 점수</span>
              <span className="font-semibold">{stats.qa.avg_score}점</span>
            </div>
          </div>
        </div>
      </div>

      {/* ACW 비교 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-800">ACW 처리 방식별 비교</h3>
        <div className="grid grid-cols-2 gap-8">
          <div className="text-center">
            <div className="text-sm text-gray-500 mb-2">수동 처리 (MANUAL)</div>
            <div className="relative h-4 bg-gray-200 rounded-full overflow-hidden mb-2">
              <div className="absolute h-full bg-red-400 rounded-full" style={{ width: '100%' }} />
            </div>
            <div className="text-xl font-bold text-red-600">{stats.acw.manual.avg_seconds}초</div>
            <div className="text-xs text-gray-400">{stats.acw.manual.count}건</div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-500 mb-2">AI 자동 (AI_AUTO)</div>
            <div className="relative h-4 bg-gray-200 rounded-full overflow-hidden mb-2">
              <div className="absolute h-full bg-green-500 rounded-full" style={{ width: `${(stats.acw.ai_auto.avg_seconds / stats.acw.manual.avg_seconds) * 100}%` }} />
            </div>
            <div className="text-xl font-bold text-green-600">{stats.acw.ai_auto.avg_seconds}초</div>
            <div className="text-xs text-gray-400">{stats.acw.ai_auto.count}건</div>
          </div>
        </div>
        <div className="mt-4 text-center text-sm text-gray-500">
          ACW 시간 <span className="font-bold text-green-600">{Math.round((1 - stats.acw.ai_auto.avg_seconds / stats.acw.manual.avg_seconds) * 100)}% 절감</span> |
          1,000석 기준 연간 약 <span className="font-bold text-green-600">96억원</span> 절감 효과
        </div>
      </div>
    </div>
  );
}

// ── ACW 데모 뷰 ────────────────────────────────────────────────

function DemoView({ scenarios, selectedScenario, result, loading, onRunPipeline }: {
  scenarios: Scenario[];
  selectedScenario: string | null;
  result: ACWResult | null;
  loading: boolean;
  onRunPipeline: (id: string) => void;
}) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">ACW 파이프라인 데모</h2>
      <p className="text-gray-500">시나리오를 선택하면 3-Agent 파이프라인이 실행됩니다.</p>

      {/* 시나리오 선택 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {scenarios.map((s) => (
          <button
            key={s.id}
            onClick={() => onRunPipeline(s.id)}
            disabled={loading}
            className={`text-left p-5 rounded-xl border-2 transition-all ${
              selectedScenario === s.id
                ? 'border-[#00338D] bg-blue-50 shadow-md'
                : 'border-gray-200 bg-white hover:border-blue-300 hover:shadow-sm'
            } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <div className="font-semibold text-gray-800 mb-1">{s.name}</div>
            <div className="text-sm text-gray-500">{s.description}</div>
          </button>
        ))}
      </div>

      {/* 로딩 */}
      {loading && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="inline-block w-12 h-12 border-4 border-blue-200 border-t-[#00338D] rounded-full animate-spin mb-4" />
          <div className="text-lg font-semibold text-gray-700">ACW 파이프라인 실행 중...</div>
          <div className="text-sm text-gray-500 mt-2">ACW Agent → Compliance Agent → QA Agent → Write-back</div>
        </div>
      )}

      {/* 결과 */}
      {result && !loading && (
        <div className="space-y-4">
          {/* 처리 헤더 */}
          <div className="bg-gradient-to-r from-[#00338D] to-[#005EB8] text-white rounded-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-blue-200">통화 ID</div>
                <div className="text-lg font-mono font-bold">{result.call_id}</div>
              </div>
              <div className="text-right">
                <div className="text-sm text-blue-200">처리 시간</div>
                <div className="text-2xl font-bold">{(result.processing_time_ms / 1000).toFixed(1)}초</div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* AI 요약 */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <span className="w-8 h-8 bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center text-sm font-bold">1</span>
                AI 요약
              </h3>
              <p className="text-gray-700 leading-relaxed mb-4">{result.summary.summary_text}</p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-gray-500">주요 의도:</span> <span className="font-medium">{result.summary.intent_primary}</span></div>
                <div><span className="text-gray-500">처리코드:</span> <span className="font-medium">{result.summary.disposition_code}</span></div>
                <div><span className="text-gray-500">해결 상태:</span> <StatusBadge status={result.summary.resolution_status} /></div>
                <div><span className="text-gray-500">신뢰도:</span> <span className="font-medium">{(result.summary.confidence * 100).toFixed(0)}%</span></div>
              </div>
              {result.summary.action_items.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <div className="text-sm text-gray-500 mb-1">후속 조치:</div>
                  <ul className="text-sm space-y-1">
                    {result.summary.action_items.map((item, i) => (
                      <li key={i} className="flex items-start gap-2"><span className="text-blue-500 mt-0.5">&#x2022;</span>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* 감성 분석 */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <span className="w-8 h-8 bg-purple-100 text-purple-700 rounded-lg flex items-center justify-center text-sm font-bold">2</span>
                감성 분석
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">전체 감성</span>
                  <SentimentBadge sentiment={result.sentiment.overall_sentiment} />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-500">고객 감성</span>
                    <span className="font-medium">{result.sentiment.customer_sentiment_score.toFixed(2)}</span>
                  </div>
                  <ScoreBar value={result.sentiment.customer_sentiment_score} min={-1} max={1} />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-500">상담원 감성</span>
                    <span className="font-medium">{result.sentiment.agent_sentiment_score.toFixed(2)}</span>
                  </div>
                  <ScoreBar value={result.sentiment.agent_sentiment_score} min={-1} max={1} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">궤적</span>
                  <span className="text-sm font-medium">{result.sentiment.sentiment_trajectory}</span>
                </div>
                {result.sentiment.verbal_abuse_detected && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 font-medium">
                    &#x26A0;&#xFE0F; 욕설/폭언 감지 — 산안법 41조 보호 조치 발동
                  </div>
                )}
                {result.sentiment.emotion_peaks.length > 0 && (
                  <div className="pt-2 border-t border-gray-100">
                    <div className="text-sm text-gray-500 mb-1">감정 급변 구간:</div>
                    {result.sentiment.emotion_peaks.map((peak, i) => (
                      <div key={i} className="text-xs flex items-center gap-2 py-1">
                        <span className="w-5 h-5 bg-orange-100 text-orange-700 rounded text-center leading-5 font-mono">{peak.segment_index}</span>
                        <span className={`font-medium ${peak.emotion === 'ANGER' ? 'text-red-600' : 'text-orange-600'}`}>{peak.emotion}</span>
                        <span className="text-gray-400">강도 {(peak.intensity * 100).toFixed(0)}%</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* 컴플라이언스 */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <span className="w-8 h-8 bg-red-100 text-red-700 rounded-lg flex items-center justify-center text-sm font-bold">3</span>
                컴플라이언스
                <RiskBadge level={result.compliance.overall_risk_level} />
              </h3>
              {result.compliance.flags.length === 0 ? (
                <div className="text-center py-6 text-gray-400">
                  <div className="text-3xl mb-2">&#x2705;</div>
                  <div className="text-sm">컴플라이언스 위반 없음</div>
                </div>
              ) : (
                <div className="space-y-3">
                  {result.compliance.flags.map((flag, i) => (
                    <div key={i} className="border border-red-200 bg-red-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <SeverityBadge severity={flag.severity} />
                        <span className="font-medium text-sm">{flag.type}</span>
                      </div>
                      <p className="text-sm text-gray-700 mb-2">{flag.description}</p>
                      <div className="text-xs text-gray-500">
                        <div>근거 세그먼트: [{flag.evidence_segments.join(', ')}]</div>
                        <div className="mt-1 text-blue-600">{flag.regulation_reference}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {result.compliance.emotional_labor_alert.triggered && (
                <div className="mt-3 bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm text-orange-800">
                  <div className="font-semibold">&#x1F6A8; 감정노동 보호 발동</div>
                  <div className="mt-1">{result.compliance.emotional_labor_alert.reason}</div>
                </div>
              )}
            </div>

            {/* QA 평가 */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <span className="w-8 h-8 bg-green-100 text-green-700 rounded-lg flex items-center justify-center text-sm font-bold">4</span>
                QA 평가
                <span className={`text-2xl font-bold ml-auto ${result.qa.total_score >= 80 ? 'text-green-600' : result.qa.total_score >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {result.qa.total_score}점
                </span>
              </h3>
              <div className="space-y-2 mb-4">
                {Object.entries(result.qa.categories).map(([key, val]) => (
                  <div key={key} className="flex items-center gap-2 text-sm">
                    <span className="w-20 text-gray-500 text-xs">{categoryLabel(key)}</span>
                    <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${val / categoryMax(key) >= 0.8 ? 'bg-green-500' : val / categoryMax(key) >= 0.6 ? 'bg-yellow-500' : 'bg-red-500'}`}
                        style={{ width: `${(val / categoryMax(key)) * 100}%` }}
                      />
                    </div>
                    <span className="w-10 text-right font-medium text-xs">{val}/{categoryMax(key)}</span>
                  </div>
                ))}
              </div>
              {result.qa.coaching_points.length > 0 && (
                <div className="border-t border-gray-100 pt-3">
                  <div className="text-sm text-gray-500 mb-2">코칭 포인트:</div>
                  {result.qa.coaching_points.map((cp, i) => (
                    <div key={i} className={`text-xs p-2 rounded mb-1 ${cp.priority === 'HIGH' ? 'bg-red-50 text-red-800' : cp.priority === 'MEDIUM' ? 'bg-yellow-50 text-yellow-800' : 'bg-blue-50 text-blue-800'}`}>
                      <span className="font-medium">[{cp.priority}]</span> {cp.suggestion}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Write-back 결과 */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-3">Write-back 실행 결과</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {result.write_back.map((wb, i) => (
                <div key={i} className={`rounded-lg p-3 border text-center ${
                  wb.status === 'SUCCESS' ? 'bg-green-50 border-green-200' :
                  wb.status === 'AWAITING_APPROVAL' ? 'bg-yellow-50 border-yellow-200' :
                  'bg-red-50 border-red-200'
                }`}>
                  <div className="text-xs text-gray-500 mb-1">{wb.tool}</div>
                  <div className={`text-sm font-semibold ${
                    wb.status === 'SUCCESS' ? 'text-green-700' :
                    wb.status === 'AWAITING_APPROVAL' ? 'text-yellow-700' : 'text-red-700'
                  }`}>{wb.status === 'AWAITING_APPROVAL' ? '승인 대기' : wb.status}</div>
                  <div className="text-xs mt-1 text-gray-400">Level {wb.governance_level}</div>
                </div>
              ))}
            </div>
          </div>

          {/* 온톨로지 기반 개선방안 */}
          <ImprovementPanel result={result} />

          {/* Write-back 워크플로우 상세 */}
          <WriteBackWorkflowPanel result={result} />
        </div>
      )}
    </div>
  );
}

// ── 공통 컴포넌트 ──────────────────────────────────────────────

function KPICard({ title, value, suffix, sub, color }: { title: string; value: string; suffix?: string; sub?: string; color: string }) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-200 text-blue-700',
    green: 'bg-green-50 border-green-200 text-green-700',
    emerald: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    red: 'bg-red-50 border-red-200 text-red-700',
  };
  return (
    <div className={`rounded-xl border p-5 ${colorMap[color] || colorMap.blue}`}>
      <div className="text-sm opacity-80 mb-1">{title}</div>
      <div className="text-3xl font-bold">{value}<span className="text-lg ml-1">{suffix}</span></div>
      {sub && <div className="text-xs opacity-70 mt-1">{sub}</div>}
    </div>
  );
}

function SentimentBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = (count / total) * 100;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-600">{label}</span>
        <span className="text-gray-500">{count}건 ({pct.toFixed(1)}%)</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function ComplianceItem({ label, count, level }: { label: string; count: number; level: number }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <span className={`w-5 h-5 rounded text-xs flex items-center justify-center font-bold ${level === 1 ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>L{level}</span>
        <span className="text-sm text-gray-700">{label}</span>
      </div>
      <span className="font-semibold text-sm">{count}건</span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    RESOLVED: 'bg-green-100 text-green-700',
    PENDING: 'bg-yellow-100 text-yellow-700',
    ESCALATED: 'bg-red-100 text-red-700',
    CALLBACK_REQUIRED: 'bg-blue-100 text-blue-700',
  };
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-700'}`}>{status}</span>;
}

function SentimentBadge({ sentiment }: { sentiment: string }) {
  const colors: Record<string, string> = {
    POSITIVE: 'bg-green-100 text-green-700',
    NEUTRAL: 'bg-gray-100 text-gray-700',
    NEGATIVE: 'bg-orange-100 text-orange-700',
    ESCALATED: 'bg-red-100 text-red-700',
  };
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[sentiment] || 'bg-gray-100 text-gray-700'}`}>{sentiment}</span>;
}

function RiskBadge({ level }: { level: string }) {
  const colors: Record<string, string> = {
    NONE: 'bg-green-100 text-green-700',
    LOW: 'bg-blue-100 text-blue-700',
    MEDIUM: 'bg-yellow-100 text-yellow-700',
    HIGH: 'bg-red-100 text-red-700',
    CRITICAL: 'bg-red-200 text-red-800',
  };
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ml-2 ${colors[level] || 'bg-gray-100 text-gray-700'}`}>{level}</span>;
}

function SeverityBadge({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    CRITICAL: 'bg-red-600 text-white',
    HIGH: 'bg-red-500 text-white',
    MEDIUM: 'bg-yellow-500 text-white',
    LOW: 'bg-blue-500 text-white',
  };
  return <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[severity] || 'bg-gray-500 text-white'}`}>{severity}</span>;
}

function ScoreBar({ value, min, max }: { value: number; min: number; max: number }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden relative">
      <div className="absolute h-full w-0.5 bg-gray-300 left-1/2" />
      <div
        className={`absolute h-full rounded-full ${value >= 0 ? 'bg-green-500' : 'bg-red-500'}`}
        style={value >= 0
          ? { left: '50%', width: `${pct - 50}%` }
          : { left: `${pct}%`, width: `${50 - pct}%` }
        }
      />
    </div>
  );
}

function categoryLabel(key: string): string {
  const labels: Record<string, string> = {
    greeting: '인사',
    problem_identification: '문제파악',
    solution_delivery: '해결제시',
    compliance: '규제준수',
    closing: '마무리',
    empathy: '공감',
  };
  return labels[key] || key;
}

function categoryMax(key: string): number {
  return key === 'closing' || key === 'empathy' ? 10 : 20;
}

'use client';

import { useState } from 'react';

// ── 타입 ────────────────────────────────────────────────────────

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

interface ImprovementAction {
  id: string;
  order: number;
  category: 'compliance' | 'prevention' | 'satisfaction' | 'script';
  title: string;
  description: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  ontologyBasis: string;
  linkedObjects: string[];
  writeBackTarget?: string;
  script?: { before: string; after: string; context: string };
  dependencies: string[];
  estimatedImpact: string;
}

interface WriteBackStep {
  id: string;
  order: number;
  tool: string;
  toolLabel: string;
  stage: 'input' | 'validate' | 'governance' | 'execute' | 'audit' | 'notify';
  stageLabel: string;
  description: string;
  governanceLevel: number;
  status: 'pending' | 'running' | 'success' | 'awaiting' | 'failed';
  input?: Record<string, string>;
  output?: Record<string, string>;
  duration_ms?: number;
  linkedAction?: string;
}

// ── 개선방안 생성 엔진 ──────────────────────────────────────────

function generateImprovementPlan(result: ACWResult): ImprovementAction[] {
  const actions: ImprovementAction[] = [];
  let order = 1;

  // 1. 컴플라이언스 위반 방지
  result.compliance.flags.forEach((flag) => {
    if (flag.type === 'INCOMPLETE_SALE') {
      actions.push({
        id: `IMP-${order}`,
        order: order++,
        category: 'compliance',
        title: '불완전판매 방지 프로세스 강화',
        description: '원금 손실 가능성 필수 고지 누락 감지. 투자상품 판매 시 리스크 고지 체크리스트를 강제 실행하도록 온톨로지 Action에 사전 검증(Pre-validation) 단계 추가.',
        priority: 'CRITICAL',
        ontologyBasis: 'ComplianceFlag → TRIGGERS → ComplianceCase',
        linkedObjects: ['ComplianceFlag', 'CallSummary', 'QAScore'],
        writeBackTarget: 'compliance_create_case',
        dependencies: [],
        estimatedImpact: '불완전판매 건수 60~80% 감소 예상',
        script: {
          context: '투자상품 원금 손실 고지 누락 상황',
          before: '"네, 거의 그렇게 보시면 됩니다. 장기 투자하시면 안전합니다."',
          after: '"이 펀드는 투자 원금의 손실이 발생할 수 있으며, 과거 수익률이 미래 수익을 보장하지 않습니다. 투자 성향 진단을 먼저 진행하겠습니다. 괜찮으시겠어요?"',
        },
      });
    }
    if (flag.type === 'MISREPRESENTATION') {
      actions.push({
        id: `IMP-${order}`,
        order: order++,
        category: 'compliance',
        title: '확정적 수익 표현 자동 감지 강화',
        description: '"수익 기대", "안전합니다" 등 확정적 표현 사용 시 실시간 경고를 발생시키는 온톨로지 규칙 추가. Sentiment 객체에 실시간 컴플라이언스 경고 속성 연동.',
        priority: 'HIGH',
        ontologyBasis: 'Sentiment.emotion_peaks → ComplianceFlag (실시간 연동)',
        linkedObjects: ['Sentiment', 'ComplianceFlag', 'Transcript'],
        writeBackTarget: 'notify_supervisor',
        dependencies: [`IMP-${order - 1}`],
        estimatedImpact: '허위/과장 설명 건수 70% 감소 예상',
        script: {
          context: '수익률 안내 시 확정적 표현 사용',
          before: '"이 펀드는 연 7% 정도 수익을 기대하실 수 있습니다."',
          after: '"이 펀드는 최근 6개월 수익률이 12%였으나, 이는 과거 실적이며 향후 수익을 보장하지 않습니다. 시장 상황에 따라 원금 손실이 발생할 수 있습니다."',
        },
      });
    }
    if (flag.type === 'VERBAL_ABUSE') {
      actions.push({
        id: `IMP-${order}`,
        order: order++,
        category: 'compliance',
        title: '감정노동 보호 자동 에스컬레이션',
        description: '산안법 41조에 따른 보호 조치 자동 발동. ACD 큐 일시정지 → 관리자 알림 → HR 이벤트 로깅의 3단계 보호 체계를 온톨로지 Action 체인으로 구성.',
        priority: 'CRITICAL',
        ontologyBasis: 'Sentiment.verbal_abuse_detected → Action(ProtectEmotionalLabor)',
        linkedObjects: ['Sentiment', 'Agent', 'ComplianceFlag'],
        writeBackTarget: 'acd_pause_agent',
        dependencies: [],
        estimatedImpact: '상담원 이직률 15~25% 감소, 감정노동 지수 개선',
      });
    }
  });

  // 2. 유사 실수 방지 (QA 기반)
  const lowCategories = Object.entries(result.qa.categories)
    .filter(([key, val]) => {
      const max = key === 'closing' || key === 'empathy' ? 10 : 20;
      return val / max < 0.6;
    });

  if (lowCategories.length > 0) {
    const categoryNames: Record<string, string> = {
      greeting: '인사', problem_identification: '문제파악', solution_delivery: '해결제시',
      compliance: '규제준수', closing: '마무리', empathy: '공감표현',
    };
    actions.push({
      id: `IMP-${order}`,
      order: order++,
      category: 'prevention',
      title: 'QA 취약 항목 집중 코칭 프로그램',
      description: `QA 평가에서 ${lowCategories.map(([k]) => categoryNames[k] || k).join(', ')} 항목이 기준 미달(60% 미만). 해당 항목별 맞춤 코칭 콘텐츠를 자동 생성하고 상담원 교육 큐에 등록.`,
      priority: 'HIGH',
      ontologyBasis: 'QAScore.categories → Agent.coaching_queue (온톨로지 속성 추가)',
      linkedObjects: ['QAScore', 'Agent'],
      writeBackTarget: 'qa_insert_score',
      dependencies: [],
      estimatedImpact: `취약 항목 점수 평균 30% 향상 예상`,
    });
  }

  // QA 코칭 포인트 → 실수 방지 액션
  result.qa.coaching_points
    .filter(cp => cp.priority === 'HIGH')
    .forEach((cp) => {
      const categoryNames: Record<string, string> = {
        greeting: '인사', problem_identification: '문제파악', solution_delivery: '해결제시',
        compliance: '규제준수', closing: '마무리', empathy: '공감표현',
      };
      actions.push({
        id: `IMP-${order}`,
        order: order++,
        category: 'prevention',
        title: `[${categoryNames[cp.category] || cp.category}] 반복 실수 방지`,
        description: cp.suggestion,
        priority: 'HIGH',
        ontologyBasis: `QAScore.coaching_points[${cp.category}] → Action(AutoQAAndCoach)`,
        linkedObjects: ['QAScore', 'CallSummary'],
        dependencies: [],
        estimatedImpact: '동일 유형 실수 재발률 50% 감소',
      });
    });

  // 3. 고객만족도 제고
  if (result.sentiment.customer_sentiment_score < 0) {
    actions.push({
      id: `IMP-${order}`,
      order: order++,
      category: 'satisfaction',
      title: '고객 감성 회복 후속 조치',
      description: `고객 감성 점수가 ${result.sentiment.customer_sentiment_score.toFixed(2)}로 부정적. 통화 종료 후 사과 문자/이메일 발송 및 관리자 콜백을 온톨로지 Action에 추가.`,
      priority: result.sentiment.customer_sentiment_score < -0.5 ? 'HIGH' : 'MEDIUM',
      ontologyBasis: 'Sentiment.customer_sentiment_score < 0 → Action(CustomerRecovery)',
      linkedObjects: ['Sentiment', 'Customer', 'Call'],
      writeBackTarget: 'notify_supervisor',
      dependencies: [],
      estimatedImpact: '불만 고객 재연락 시 만족도 전환율 40% 향상',
    });
  }

  if (result.qa.improvements.length > 0) {
    actions.push({
      id: `IMP-${order}`,
      order: order++,
      category: 'satisfaction',
      title: '상담 품질 개선을 통한 CSAT 향상',
      description: `QA 평가에서 도출된 개선사항: ${result.qa.improvements.join(', ')}. Agent 온톨로지에 개인별 개선 추적 속성을 추가하여 트렌드 분석.`,
      priority: 'MEDIUM',
      ontologyBasis: 'Agent.improvement_tracking[] ← QAScore.improvements',
      linkedObjects: ['Agent', 'QAScore'],
      dependencies: [],
      estimatedImpact: 'CSAT 평균 5~10점 향상 예상',
    });
  }

  // 4. 대응 멘트 최적화 스크립트
  if (result.sentiment.verbal_abuse_detected) {
    actions.push({
      id: `IMP-${order}`,
      order: order++,
      category: 'script',
      title: '폭언 대응 표준 스크립트',
      description: '고객 폭언 상황에서의 단계별 대응 스크립트. 1차 경고 → 2차 안내 → 3차 종료 프로토콜.',
      priority: 'HIGH',
      ontologyBasis: 'Sentiment.verbal_abuse_detected → Script Template (온톨로지 연동)',
      linkedObjects: ['Sentiment', 'Agent', 'ComplianceFlag'],
      dependencies: [],
      estimatedImpact: '폭언 상황 처리 시간 30% 단축, 상담원 스트레스 감소',
      script: {
        context: '고객 폭언 1차 발생 시',
        before: '"고객님, 원활한 상담을 위해 차분한 대화 부탁드립니다."',
        after: '"고객님, 불편하신 마음을 충분히 이해합니다. 다만, 원활한 상담 진행을 위해 존중하는 대화 부탁드리겠습니다. 계속 어려우시면 잠시 후 전담 상담원이 연락드리도록 하겠습니다."',
      },
    });
  }

  if (result.sentiment.overall_sentiment === 'NEGATIVE' || result.sentiment.overall_sentiment === 'ESCALATED') {
    actions.push({
      id: `IMP-${order}`,
      order: order++,
      category: 'script',
      title: '불만 고객 공감 응대 스크립트',
      description: '고객 불만 감지 시 감정 인지 → 공감 표현 → 해결 안내의 3단계 응대 스크립트.',
      priority: 'MEDIUM',
      ontologyBasis: 'Sentiment.overall_sentiment → Script Template',
      linkedObjects: ['Sentiment', 'CallSummary'],
      dependencies: [],
      estimatedImpact: '불만 에스컬레이션율 35% 감소',
      script: {
        context: '고객 불만 초기 대응',
        before: '"불편을 드려 죄송합니다. 확인해 드리겠습니다."',
        after: '"결제가 되지 않으셔서 정말 당황하셨겠습니다. 저도 그런 상황이면 걱정이 되었을 것 같습니다. 바로 원인을 확인해서 최대한 빠르게 해결해 드리겠습니다."',
      },
    });
  }

  // 적합성 진단 관련 스크립트 (불완전판매 시)
  if (result.compliance.flags.some(f => f.type === 'INCOMPLETE_SALE')) {
    actions.push({
      id: `IMP-${order}`,
      order: order++,
      category: 'script',
      title: '투자 적합성 진단 필수 스크립트',
      description: '투자상품 판매 전 적합성 진단 절차를 반드시 수행하도록 하는 의무 스크립트.',
      priority: 'CRITICAL',
      ontologyBasis: 'CallSummary.intent_primary ∈ {FUND_*, INSURANCE_*} → Pre-validation Script',
      linkedObjects: ['CallSummary', 'ComplianceFlag', 'Customer'],
      writeBackTarget: 'compliance_create_case',
      dependencies: [],
      estimatedImpact: '적합성 진단 수행률 100% 달성',
      script: {
        context: '투자상품 가입 전 필수 수행',
        before: '(적합성 진단 절차 생략)',
        after: '"상품 가입 전에 고객님의 투자 성향을 확인하겠습니다. 투자 경험은 어느 정도이신가요? 원금 손실이 발생해도 감내하실 수 있는 수준은 어느 정도이신가요? 투자 기간은 어느 정도를 생각하고 계신가요?"',
      },
    });
    actions.push({
      id: `IMP-${order}`,
      order: order++,
      category: 'script',
      title: '청약 철회권 안내 스크립트',
      description: '투자상품 가입 완료 후 반드시 청약 철회권(14일 이내)을 안내하는 의무 스크립트.',
      priority: 'HIGH',
      ontologyBasis: 'CallSummary.intent_primary ∈ {FUND_NEW, INSURANCE_NEW} → Post-validation Script',
      linkedObjects: ['CallSummary', 'ComplianceFlag'],
      dependencies: [],
      estimatedImpact: '청약 철회권 안내 누락 건수 0건 달성',
      script: {
        context: '투자상품 가입 완료 후',
        before: '(청약 철회권 안내 누락)',
        after: '"가입이 완료되었습니다. 참고로, 이 상품은 가입일로부터 14일 이내에 청약 철회가 가능합니다. 철회 시 원금 전액이 환불됩니다. 상품 설명서는 등록된 이메일로 발송해 드리겠습니다."',
      },
    });
  }

  return actions;
}

// ── Write-back 워크플로우 생성 ──────────────────────────────────

function generateWriteBackWorkflow(result: ACWResult): WriteBackStep[] {
  const steps: WriteBackStep[] = [];
  let stepOrder = 1;

  const toolLabels: Record<string, string> = {
    crm_update_call: 'CRM 통화기록 업데이트',
    calldb_insert_summary: 'AI 요약 DB 저장',
    compliance_create_case: '컴플라이언스 케이스 생성',
    acd_pause_agent: 'ACD 큐 일시정지',
    notify_supervisor: '관리자 알림',
    qa_insert_score: 'QA 점수 저장',
  };

  result.write_back.forEach((wb) => {
    const toolLabel = toolLabels[wb.tool] || wb.tool;
    const baseId = `WB-${wb.tool}`;

    // Stage 1: Input 수집
    steps.push({
      id: `${baseId}-input`, order: stepOrder++, tool: wb.tool, toolLabel,
      stage: 'input', stageLabel: '입력 데이터 수집',
      description: `${toolLabel}에 필요한 데이터를 파이프라인 결과에서 수집합니다.`,
      governanceLevel: wb.governance_level,
      status: 'success',
      input: getInputData(wb.tool, result),
      duration_ms: 12,
    });

    // Stage 2: Validation
    steps.push({
      id: `${baseId}-validate`, order: stepOrder++, tool: wb.tool, toolLabel,
      stage: 'validate', stageLabel: '데이터 검증 (Zod Schema)',
      description: `Zod 스키마를 통해 입력 데이터의 타입/형식/필수값을 검증합니다.`,
      governanceLevel: wb.governance_level,
      status: 'success',
      duration_ms: 5,
    });

    // Stage 3: Governance Check
    steps.push({
      id: `${baseId}-governance`, order: stepOrder++, tool: wb.tool, toolLabel,
      stage: 'governance', stageLabel: `거버넌스 검증 (Level ${wb.governance_level})`,
      description: getGovernanceDescription(wb.governance_level),
      governanceLevel: wb.governance_level,
      status: wb.status === 'AWAITING_APPROVAL' ? 'awaiting' : 'success',
      duration_ms: wb.governance_level === 1 ? undefined : 3,
    });

    // Stage 4: Execute
    steps.push({
      id: `${baseId}-execute`, order: stepOrder++, tool: wb.tool, toolLabel,
      stage: 'execute', stageLabel: '실행',
      description: wb.status === 'AWAITING_APPROVAL'
        ? `Level 1 — 인간 승인 대기 중. 컴플라이언스 담당자의 검토 후 실행됩니다.`
        : `${toolLabel} 실행 완료.`,
      governanceLevel: wb.governance_level,
      status: wb.status === 'AWAITING_APPROVAL' ? 'awaiting' : wb.status === 'SUCCESS' ? 'success' : 'failed',
      output: wb.status === 'SUCCESS' ? getOutputData(wb.tool) : undefined,
      duration_ms: wb.status === 'SUCCESS' ? 45 + Math.floor(Math.random() * 80) : undefined,
    });

    // Stage 5: Audit Log
    steps.push({
      id: `${baseId}-audit`, order: stepOrder++, tool: wb.tool, toolLabel,
      stage: 'audit', stageLabel: '감사 로그 기록',
      description: `Delta Table(acw_action_log)에 실행 내역을 append-only로 기록합니다. 7년간 보관.`,
      governanceLevel: wb.governance_level,
      status: wb.status === 'AWAITING_APPROVAL' ? 'awaiting' : 'success',
      duration_ms: 8,
    });

    // Stage 6: Notification (conditional)
    if (wb.governance_level <= 2 || wb.status === 'AWAITING_APPROVAL') {
      steps.push({
        id: `${baseId}-notify`, order: stepOrder++, tool: wb.tool, toolLabel,
        stage: 'notify', stageLabel: '알림 발송',
        description: wb.status === 'AWAITING_APPROVAL'
          ? '컴플라이언스 담당자에게 승인 요청 알림을 발송합니다.'
          : '실행 완료 알림을 관련 담당자에게 발송합니다.',
        governanceLevel: wb.governance_level,
        status: 'success',
        duration_ms: 15,
      });
    }
  });

  return steps;
}

function getGovernanceDescription(level: number): string {
  switch (level) {
    case 1: return 'Level 1 (Human-in-the-Loop) — 인간 승인 필수. 컴플라이언스 담당자가 검토 후 승인/거부합니다.';
    case 2: return 'Level 2 (Auto + Audit) — 자동 실행 + 감사 로그 필수 기록. 사후 검토 가능.';
    case 3: return 'Level 3 (Autonomous) — 완전 자율 실행. 감사 로그 선택적 기록.';
    default: return '';
  }
}

function getInputData(tool: string, result: ACWResult): Record<string, string> {
  switch (tool) {
    case 'crm_update_call': return { call_id: result.call_id, disposition_code: result.summary.disposition_code, resolution_status: result.summary.resolution_status };
    case 'calldb_insert_summary': return { call_id: result.call_id, summary_text: result.summary.summary_text.slice(0, 50) + '...', intent: result.summary.intent_primary };
    case 'compliance_create_case': return { call_id: result.call_id, flag_type: result.compliance.flags[0]?.type || 'N/A', severity: result.compliance.flags[0]?.severity || 'N/A' };
    case 'acd_pause_agent': return { reason: '감정노동 보호', duration: '15분' };
    case 'notify_supervisor': return { type: '감정노동 경보', call_id: result.call_id };
    case 'qa_insert_score': return { call_id: result.call_id, total_score: String(result.qa.total_score) };
    default: return {};
  }
}

function getOutputData(tool: string): Record<string, string> {
  switch (tool) {
    case 'crm_update_call': return { result: 'CRM 레코드 업데이트 완료', record_id: 'CRM-' + Math.random().toString(36).slice(2, 8).toUpperCase() };
    case 'calldb_insert_summary': return { result: 'Delta Table 삽입 완료', table: 'ontology_data.call_summaries' };
    case 'acd_pause_agent': return { result: 'ACD 큐 정지 완료', resume_at: '15분 후 자동 복구' };
    case 'notify_supervisor': return { result: '알림 발송 완료', channel: 'Slack + SMS' };
    case 'qa_insert_score': return { result: 'QA 점수 저장 완료', table: 'ontology_data.qa_scores' };
    default: return {};
  }
}

// ── 개선방안 패널 컴포넌트 ──────────────────────────────────────

export function ImprovementPanel({ result }: { result: ACWResult }) {
  const [activeCategory, setActiveCategory] = useState<'all' | 'compliance' | 'prevention' | 'satisfaction' | 'script'>('all');
  const [expandedScript, setExpandedScript] = useState<string | null>(null);
  const actions = generateImprovementPlan(result);
  const filtered = activeCategory === 'all' ? actions : actions.filter(a => a.category === activeCategory);

  const categoryConfig = {
    compliance: { label: '컴플라이언스 위반 방지', color: 'text-red-700 bg-red-50 border-red-200' },
    prevention: { label: '유사 실수 방지', color: 'text-orange-700 bg-orange-50 border-orange-200' },
    satisfaction: { label: '고객만족도 제고', color: 'text-blue-700 bg-blue-50 border-blue-200' },
    script: { label: '대응 스크립트 최적화', color: 'text-purple-700 bg-purple-50 border-purple-200' },
  };

  const priorityConfig: Record<string, { label: string; color: string; order: number }> = {
    CRITICAL: { label: 'CRITICAL', color: 'bg-red-600 text-white', order: 0 },
    HIGH: { label: 'HIGH', color: 'bg-red-500 text-white', order: 1 },
    MEDIUM: { label: 'MEDIUM', color: 'bg-yellow-500 text-white', order: 2 },
    LOW: { label: 'LOW', color: 'bg-blue-500 text-white', order: 3 },
  };

  if (actions.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
          <span className="w-8 h-8 bg-emerald-100 text-emerald-700 rounded-lg flex items-center justify-center text-sm font-bold">5</span>
          온톨로지 기반 개선방안
        </h3>
        <div className="text-center py-6 text-gray-400">
          <div className="text-3xl mb-2">&#x2705;</div>
          <div className="text-sm">특별한 개선 사항이 없습니다. 우수한 상담이었습니다.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <span className="w-8 h-8 bg-emerald-100 text-emerald-700 rounded-lg flex items-center justify-center text-sm font-bold">5</span>
        온톨로지 기반 개선방안
        <span className="text-sm font-normal text-gray-500 ml-2">({actions.length}건 도출)</span>
      </h3>

      {/* 카테고리 필터 */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <button
          type="button"
          onClick={() => setActiveCategory('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${activeCategory === 'all' ? 'bg-[#00338D] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        >
          전체 ({actions.length})
        </button>
        {(Object.entries(categoryConfig) as [keyof typeof categoryConfig, typeof categoryConfig[keyof typeof categoryConfig]][]).map(([key, cfg]) => {
          const count = actions.filter(a => a.category === key).length;
          if (count === 0) return null;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setActiveCategory(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${activeCategory === key ? 'bg-[#00338D] text-white' : `${cfg.color} border`}`}
            >
              {cfg.label} ({count})
            </button>
          );
        })}
      </div>

      {/* 액션 순서 다이어그램 */}
      <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
        <div className="text-xs text-gray-500 mb-2 font-medium">실행 순서 (선후관계)</div>
        <div className="flex items-center gap-1 flex-wrap">
          {actions.sort((a, b) => (priorityConfig[a.priority]?.order || 3) - (priorityConfig[b.priority]?.order || 3)).map((action, idx) => (
            <div key={action.id} className="flex items-center gap-1">
              <div className={`px-2 py-1 rounded text-[10px] font-medium whitespace-nowrap ${
                action.category === 'compliance' ? 'bg-red-100 text-red-700' :
                action.category === 'prevention' ? 'bg-orange-100 text-orange-700' :
                action.category === 'satisfaction' ? 'bg-blue-100 text-blue-700' :
                'bg-purple-100 text-purple-700'
              }`}>
                {action.id}
              </div>
              {idx < actions.length - 1 && (
                <svg className="w-4 h-4 text-gray-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 개선방안 목록 */}
      <div className="space-y-3">
        {filtered.map((action) => (
          <div key={action.id} className={`rounded-xl border p-4 transition-all ${
            action.category === 'compliance' ? 'border-red-200 bg-red-50/50' :
            action.category === 'prevention' ? 'border-orange-200 bg-orange-50/50' :
            action.category === 'satisfaction' ? 'border-blue-200 bg-blue-50/50' :
            'border-purple-200 bg-purple-50/50'
          }`}>
            <div className="flex items-start gap-3">
              <div className="text-xs font-mono font-bold text-gray-400 mt-1 w-10 shrink-0">{action.id}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${priorityConfig[action.priority]?.color || ''}`}>
                    {action.priority}
                  </span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${categoryConfig[action.category]?.color || ''}`}>
                    {categoryConfig[action.category]?.label}
                  </span>
                  <h4 className="font-semibold text-sm text-gray-800">{action.title}</h4>
                </div>
                <p className="text-sm text-gray-600 leading-relaxed mb-2">{action.description}</p>

                {/* 온톨로지 근거 */}
                <div className="text-xs text-gray-500 bg-white/60 rounded-lg p-2 mb-2 font-mono">
                  <span className="text-gray-400">온톨로지: </span>{action.ontologyBasis}
                </div>

                <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                  <span>연관 객체: {action.linkedObjects.join(', ')}</span>
                  {action.writeBackTarget && <span className="text-[#00338D] font-medium">Write-back: {action.writeBackTarget}</span>}
                  {action.dependencies.length > 0 && <span>선행 조건: {action.dependencies.join(', ')}</span>}
                  <span className="text-green-700 font-medium">{action.estimatedImpact}</span>
                </div>

                {/* 스크립트 비교 (Before/After) */}
                {action.script && (
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => setExpandedScript(expandedScript === action.id ? null : action.id)}
                      className="text-xs text-[#00338D] font-medium hover:underline flex items-center gap-1"
                    >
                      <svg className={`w-3 h-3 transition-transform ${expandedScript === action.id ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                      수정 스크립트 비교 (Before → After)
                    </button>
                    {expandedScript === action.id && (
                      <div className="mt-2 space-y-2">
                        <div className="text-xs text-gray-500 mb-1">상황: {action.script.context}</div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                            <div className="text-[10px] font-medium text-red-600 mb-1.5">BEFORE (기존)</div>
                            <p className="text-xs text-red-800 leading-relaxed italic">{action.script.before}</p>
                          </div>
                          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                            <div className="text-[10px] font-medium text-green-600 mb-1.5">AFTER (권장)</div>
                            <p className="text-xs text-green-800 leading-relaxed italic">{action.script.after}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Write-back 워크플로우 시각화 컴포넌트 ────────────────────────

export function WriteBackWorkflowPanel({ result }: { result: ACWResult }) {
  const [expandedTool, setExpandedTool] = useState<string | null>(null);
  const [animating, setAnimating] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const workflow = generateWriteBackWorkflow(result);

  // 도구별로 그룹핑
  const toolGroups: Record<string, WriteBackStep[]> = {};
  workflow.forEach(step => {
    if (!toolGroups[step.tool]) toolGroups[step.tool] = [];
    toolGroups[step.tool].push(step);
  });

  const toolOrder = result.write_back.map(wb => wb.tool);

  const startAnimation = () => {
    setAnimating(true);
    setCurrentStep(0);
    let step = 0;
    const interval = setInterval(() => {
      step++;
      if (step >= workflow.length) {
        clearInterval(interval);
        setAnimating(false);
        setCurrentStep(workflow.length);
      } else {
        setCurrentStep(step);
      }
    }, 400);
  };

  const stageIcons: Record<string, string> = {
    input: '&#x1F4E5;',
    validate: '&#x2705;',
    governance: '&#x1F6E1;',
    execute: '&#x26A1;',
    audit: '&#x1F4DD;',
    notify: '&#x1F514;',
  };

  const stageColors: Record<string, string> = {
    input: 'bg-blue-100 border-blue-300 text-blue-700',
    validate: 'bg-emerald-100 border-emerald-300 text-emerald-700',
    governance: 'bg-amber-100 border-amber-300 text-amber-700',
    execute: 'bg-indigo-100 border-indigo-300 text-indigo-700',
    audit: 'bg-gray-100 border-gray-300 text-gray-700',
    notify: 'bg-purple-100 border-purple-300 text-purple-700',
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <span className="w-8 h-8 bg-indigo-100 text-indigo-700 rounded-lg flex items-center justify-center text-sm font-bold">6</span>
          Write-back 워크플로우
          <span className="text-sm font-normal text-gray-500">({workflow.length}단계)</span>
        </h3>
        <button
          type="button"
          onClick={startAnimation}
          disabled={animating}
          className="px-4 py-2 bg-[#00338D] text-white text-sm font-medium rounded-lg hover:bg-[#005EB8] disabled:opacity-50 transition flex items-center gap-2"
        >
          {animating ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              실행 중...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              워크플로우 재현
            </>
          )}
        </button>
      </div>

      {/* 파이프라인 개요 */}
      <div className="mb-4 p-3 bg-gradient-to-r from-gray-50 to-blue-50 rounded-lg border border-gray-100">
        <div className="text-xs text-gray-500 mb-2 font-medium">전체 파이프라인 흐름</div>
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {['ACW Agent', 'Compliance Agent', 'QA Agent'].map((agent, i) => (
            <div key={agent} className="flex items-center gap-1">
              <div className="px-3 py-1.5 bg-[#00338D] text-white rounded-lg text-xs font-medium whitespace-nowrap">{agent}</div>
              <svg className="w-5 h-5 text-gray-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
            </div>
          ))}
          <div className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium whitespace-nowrap">Write-back Engine</div>
        </div>
      </div>

      {/* 도구별 워크플로우 */}
      <div className="space-y-3">
        {toolOrder.map((toolName, toolIdx) => {
          const steps = toolGroups[toolName] || [];
          if (steps.length === 0) return null;
          const wb = result.write_back[toolIdx];
          const isExpanded = expandedTool === toolName;

          return (
            <div key={toolName} className="border border-gray-200 rounded-xl overflow-hidden">
              {/* 도구 헤더 */}
              <button
                type="button"
                onClick={() => setExpandedTool(isExpanded ? null : toolName)}
                className="w-full flex items-center gap-3 p-4 bg-gray-50 hover:bg-gray-100 transition text-left"
              >
                <div className={`w-3 h-3 rounded-full shrink-0 ${
                  wb.status === 'SUCCESS' ? 'bg-green-500' :
                  wb.status === 'AWAITING_APPROVAL' ? 'bg-yellow-500 animate-pulse' : 'bg-red-500'
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-gray-800">{steps[0]?.toolLabel}</div>
                  <div className="text-xs text-gray-500 font-mono">{toolName}</div>
                </div>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                  wb.governance_level === 1 ? 'bg-red-100 text-red-700' :
                  wb.governance_level === 2 ? 'bg-yellow-100 text-yellow-700' :
                  'bg-green-100 text-green-700'
                }`}>Level {wb.governance_level}</span>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                  wb.status === 'SUCCESS' ? 'bg-green-100 text-green-700' :
                  wb.status === 'AWAITING_APPROVAL' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>{wb.status === 'AWAITING_APPROVAL' ? '승인 대기' : wb.status}</span>
                <svg className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>

              {/* 상세 스텝 */}
              {isExpanded && (
                <div className="p-4 border-t border-gray-200">
                  <div className="relative">
                    {steps.map((step, stepIdx) => {
                      const globalIdx = workflow.findIndex(s => s.id === step.id);
                      const isActive = animating && currentStep === globalIdx;
                      const isDone = currentStep > globalIdx;
                      const isPending = !animating || currentStep < globalIdx;

                      return (
                        <div key={step.id} className="flex gap-3 mb-0 last:mb-0">
                          {/* 타임라인 */}
                          <div className="flex flex-col items-center w-8 shrink-0">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs border-2 transition-all duration-300 ${
                              isActive ? 'border-[#00338D] bg-[#00338D] text-white scale-110 shadow-lg' :
                              isDone ? 'border-green-500 bg-green-500 text-white' :
                              step.status === 'awaiting' ? 'border-yellow-400 bg-yellow-100 text-yellow-700' :
                              'border-gray-300 bg-white text-gray-400'
                            }`}>
                              {isDone ? (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                              ) : isActive ? (
                                <div className="w-3 h-3 border-2 border-white rounded-full animate-spin border-t-transparent" />
                              ) : step.status === 'awaiting' ? (
                                '!'
                              ) : (
                                stepIdx + 1
                              )}
                            </div>
                            {stepIdx < steps.length - 1 && (
                              <div className={`w-0.5 h-8 my-1 transition-colors ${isDone ? 'bg-green-300' : 'bg-gray-200'}`} />
                            )}
                          </div>

                          {/* 스텝 내용 */}
                          <div className={`flex-1 pb-4 ${isActive ? 'opacity-100' : isDone ? 'opacity-80' : isPending && !animating ? 'opacity-100' : 'opacity-40'} transition-opacity`}>
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border ${stageColors[step.stage]}`}>
                                <span dangerouslySetInnerHTML={{ __html: stageIcons[step.stage] || '' }} />
                                {step.stageLabel}
                              </span>
                              {step.duration_ms && <span className="text-[10px] text-gray-400">{step.duration_ms}ms</span>}
                            </div>
                            <p className="text-xs text-gray-600 leading-relaxed">{step.description}</p>

                            {/* Input/Output 데이터 */}
                            {step.input && (
                              <div className="mt-1.5 bg-blue-50 border border-blue-100 rounded p-2">
                                <div className="text-[10px] text-blue-600 font-medium mb-1">Input</div>
                                <div className="text-[10px] text-blue-800 font-mono space-y-0.5">
                                  {Object.entries(step.input).map(([k, v]) => (
                                    <div key={k}><span className="text-blue-500">{k}:</span> {v}</div>
                                  ))}
                                </div>
                              </div>
                            )}
                            {step.output && (
                              <div className="mt-1.5 bg-green-50 border border-green-100 rounded p-2">
                                <div className="text-[10px] text-green-600 font-medium mb-1">Output</div>
                                <div className="text-[10px] text-green-800 font-mono space-y-0.5">
                                  {Object.entries(step.output).map(([k, v]) => (
                                    <div key={k}><span className="text-green-500">{k}:</span> {v}</div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* 전체 워크플로우 요약 */}
      <div className="mt-4 grid grid-cols-3 gap-3 text-center">
        <div className="bg-green-50 rounded-lg p-3 border border-green-200">
          <div className="text-2xl font-bold text-green-700">{result.write_back.filter(w => w.status === 'SUCCESS').length}</div>
          <div className="text-xs text-green-600">성공</div>
        </div>
        <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
          <div className="text-2xl font-bold text-yellow-700">{result.write_back.filter(w => w.status === 'AWAITING_APPROVAL').length}</div>
          <div className="text-xs text-yellow-600">승인 대기</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
          <div className="text-2xl font-bold text-gray-700">{workflow.length}</div>
          <div className="text-xs text-gray-600">총 워크플로우 단계</div>
        </div>
      </div>
    </div>
  );
}

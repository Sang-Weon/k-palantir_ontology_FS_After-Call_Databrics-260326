/**
 * 데모 엔진 — 로컬 서버에서 ACW 파이프라인을 시뮬레이션
 * AI API 호출 없이 Mock 결과를 반환하여 즉시 데모 가능
 */

// ── 시나리오별 Mock 전사 텍스트 ──────────────────────────────────

export interface DemoTranscript {
  id: string;
  call_id: string;
  scenario: string;
  queue: string;
  segments: { index: number; speaker: 'AGENT' | 'CUSTOMER'; text: string; start_ms: number; end_ms: number }[];
}

export interface DemoACWResult {
  call_id: string;
  scenario: string;
  processing_time_ms: number;
  summary: {
    summary_text: string;
    intent_primary: string;
    intent_secondary: string[];
    key_entities: Record<string, string | number>;
    action_items: string[];
    resolution_status: string;
    disposition_code: string;
    confidence: number;
  };
  sentiment: {
    overall_sentiment: string;
    customer_sentiment_score: number;
    agent_sentiment_score: number;
    sentiment_trajectory: string;
    verbal_abuse_detected: boolean;
    emotion_peaks: { segment_index: number; emotion: string; intensity: number; speaker: string }[];
  };
  compliance: {
    flags: { type: string; severity: string; description: string; evidence_segments: number[]; regulation_reference: string; confidence: number }[];
    emotional_labor_alert: { triggered: boolean; reason: string | null };
    overall_risk_level: string;
  };
  qa: {
    total_score: number;
    categories: Record<string, number>;
    coaching_points: { category: string; suggestion: string; priority: string }[];
    strengths: string[];
    improvements: string[];
  };
  write_back: { tool: string; governance_level: number; status: string }[];
}

// ── 3개 데모 시나리오 ──────────────────────────────────────────

const DEMO_SCENARIOS: {
  id: string;
  name: string;
  description: string;
  transcript: DemoTranscript;
  result: DemoACWResult;
}[] = [
  {
    id: 'demo-1',
    name: '정상 통화 — 카드 분실 신고',
    description: '일반적인 카드 분실 신고 → AI 요약 + QA 평가',
    transcript: {
      id: 'TSCR-DEMO-001',
      call_id: 'CALL-20260326-143022-001',
      scenario: '카드분실신고_정상',
      queue: '카드분실',
      segments: [
        { index: 0, speaker: 'AGENT', text: '안녕하세요, KB국민은행 카드상담팀 김하나입니다. 무엇을 도와드릴까요?', start_ms: 0, end_ms: 4000 },
        { index: 1, speaker: 'CUSTOMER', text: '네, 카드를 분실한 것 같아서 전화했습니다. 정지시켜 주세요.', start_ms: 4500, end_ms: 8000 },
        { index: 2, speaker: 'AGENT', text: '네, 먼저 본인확인을 위해 성함과 생년월일을 말씀해 주시겠어요?', start_ms: 8500, end_ms: 12000 },
        { index: 3, speaker: 'CUSTOMER', text: '홍길동이고요, 1985년 3월 15일입니다.', start_ms: 12500, end_ms: 15000 },
        { index: 4, speaker: 'AGENT', text: '확인되었습니다. 분실하신 카드가 KB국민카드 포인트리 맞으신가요?', start_ms: 15500, end_ms: 19000 },
        { index: 5, speaker: 'CUSTOMER', text: '네 맞습니다.', start_ms: 19500, end_ms: 20500 },
        { index: 6, speaker: 'AGENT', text: '해당 카드 즉시 정지 처리하겠습니다. 재발급도 함께 진행해 드릴까요?', start_ms: 21000, end_ms: 25000 },
        { index: 7, speaker: 'CUSTOMER', text: '네, 재발급 부탁드립니다.', start_ms: 25500, end_ms: 27000 },
        { index: 8, speaker: 'AGENT', text: '카드 정지 및 재발급 접수 완료되었습니다. 약 7영업일 후 등록 주소로 배송됩니다. 부정사용 내역은 자동으로 모니터링됩니다.', start_ms: 27500, end_ms: 34000 },
        { index: 9, speaker: 'CUSTOMER', text: '감사합니다.', start_ms: 34500, end_ms: 35500 },
        { index: 10, speaker: 'AGENT', text: '다른 문의사항 있으신가요?', start_ms: 36000, end_ms: 37500 },
        { index: 11, speaker: 'CUSTOMER', text: '아니요, 감사합니다.', start_ms: 38000, end_ms: 39000 },
        { index: 12, speaker: 'AGENT', text: 'KB국민은행 김하나였습니다. 좋은 하루 되세요.', start_ms: 39500, end_ms: 42000 },
      ],
    },
    result: {
      call_id: 'CALL-20260326-143022-001',
      scenario: '카드분실신고_정상',
      processing_time_ms: 2340,
      summary: {
        summary_text: '고객(홍*동)이 KB국민카드 포인트리 분실 신고를 위해 전화. 상담원이 본인확인 후 카드 즉시 정지 처리 완료. 고객 요청에 따라 재발급 접수, 7영업일 내 등록 주소로 배송 예정. 부정사용 모니터링 자동 적용.',
        intent_primary: 'CARD_LOST_REPORT',
        intent_secondary: ['CARD_REISSUE'],
        key_entities: { card_number: '****-****-****-포인트리', product_name: 'KB국민카드 포인트리', date: '2026-03-26' },
        action_items: ['카드 재발급 접수 완료 → 7영업일 내 수령 안내', '분실 카드 부정사용 여부 모니터링'],
        resolution_status: 'RESOLVED',
        disposition_code: 'DISP-001',
        confidence: 0.96,
      },
      sentiment: {
        overall_sentiment: 'NEUTRAL',
        customer_sentiment_score: 0.2,
        agent_sentiment_score: 0.7,
        sentiment_trajectory: 'STABLE',
        verbal_abuse_detected: false,
        emotion_peaks: [],
      },
      compliance: { flags: [], emotional_labor_alert: { triggered: false, reason: null }, overall_risk_level: 'NONE' },
      qa: {
        total_score: 92,
        categories: { greeting: 20, problem_identification: 18, solution_delivery: 19, compliance: 18, closing: 9, empathy: 8 },
        coaching_points: [{ category: 'empathy', suggestion: '고객 불안감에 대한 공감 표현을 추가하면 더 좋겠습니다. "분실하셔서 걱정되시겠습니다"와 같은 표현 권장.', priority: 'LOW' }],
        strengths: ['인사와 본인확인이 완벽하게 수행됨', '카드 정지 및 재발급 절차를 명확하게 안내', '부정사용 모니터링 자동 적용 안내'],
        improvements: ['고객 감정에 대한 공감 표현 보강'],
      },
      write_back: [
        { tool: 'crm_update_call', governance_level: 2, status: 'SUCCESS' },
        { tool: 'calldb_insert_summary', governance_level: 2, status: 'SUCCESS' },
        { tool: 'qa_insert_score', governance_level: 3, status: 'SUCCESS' },
      ],
    },
  },
  {
    id: 'demo-2',
    name: '불완전판매 의심 — 펀드 가입',
    description: '원금 손실 미고지 + 고객 이해 부족 → 컴플라이언스 Level 1 알림',
    transcript: {
      id: 'TSCR-DEMO-002',
      call_id: 'CALL-20260326-151530-002',
      scenario: '펀드가입_불완전판매의심',
      queue: '투자상담',
      segments: [
        { index: 0, speaker: 'AGENT', text: '안녕하세요, KB국민은행 투자상담팀 이지은입니다.', start_ms: 0, end_ms: 3500 },
        { index: 1, speaker: 'CUSTOMER', text: '요즘 좋은 펀드 있으면 추천해 주세요. 은행 금리가 너무 낮아서요.', start_ms: 4000, end_ms: 8000 },
        { index: 2, speaker: 'AGENT', text: '네, 현재 KB글로벌테크펀드가 최근 6개월 수익률 12%로 인기가 많습니다.', start_ms: 8500, end_ms: 13000 },
        { index: 3, speaker: 'CUSTOMER', text: '12%요? 예금보다 훨씬 좋네요. 그 정도면 거의 확실한 건가요?', start_ms: 13500, end_ms: 17000 },
        { index: 4, speaker: 'AGENT', text: '네, 이 펀드는 글로벌 기술주에 투자하는 거라 추세가 좋습니다. 연 7% 정도 수익을 기대하실 수 있습니다.', start_ms: 17500, end_ms: 23000 },
        { index: 5, speaker: 'CUSTOMER', text: '원금은 다 보장되는 거죠?', start_ms: 23500, end_ms: 25500 },
        { index: 6, speaker: 'AGENT', text: '네, 거의 그렇게 보시면 됩니다. 장기 투자하시면 안전합니다.', start_ms: 26000, end_ms: 30000 },
        { index: 7, speaker: 'CUSTOMER', text: '잘 모르겠지만 좋다고 하시니 가입할게요. 500만원이요.', start_ms: 30500, end_ms: 34000 },
        { index: 8, speaker: 'AGENT', text: '네, 500만원 KB글로벌테크펀드 가입 접수하겠습니다.', start_ms: 34500, end_ms: 38000 },
        { index: 9, speaker: 'CUSTOMER', text: '감사합니다.', start_ms: 38500, end_ms: 39500 },
        { index: 10, speaker: 'AGENT', text: 'KB국민은행 이지은이었습니다.', start_ms: 40000, end_ms: 42000 },
      ],
    },
    result: {
      call_id: 'CALL-20260326-151530-002',
      scenario: '펀드가입_불완전판매의심',
      processing_time_ms: 3120,
      summary: {
        summary_text: '고객이 은행 금리 불만족으로 펀드 상품 문의. 상담원이 KB글로벌테크펀드(수익률 12%) 추천 후 500만원 가입 접수. 단, 원금 손실 가능성에 대한 고지가 불충분하였으며, 고객이 "잘 모르겠지만"이라고 발언한 점에서 불완전판매 리스크 존재.',
        intent_primary: 'FUND_NEW',
        intent_secondary: ['FUND_INQUIRY'],
        key_entities: { product_name: 'KB글로벌테크펀드', amount: 5000000 },
        action_items: ['불완전판매 검토 필요 — 컴플라이언스팀 이관', '고객에게 원금 손실 가능성 재안내 필요'],
        resolution_status: 'PENDING',
        disposition_code: 'DISP-014',
        confidence: 0.91,
      },
      sentiment: {
        overall_sentiment: 'NEUTRAL',
        customer_sentiment_score: 0.1,
        agent_sentiment_score: 0.5,
        sentiment_trajectory: 'STABLE',
        verbal_abuse_detected: false,
        emotion_peaks: [],
      },
      compliance: {
        flags: [
          {
            type: 'INCOMPLETE_SALE',
            severity: 'HIGH',
            description: '펀드 상품 설명 시 원금 손실 가능성을 명확히 고지하지 않음. 고객의 "원금은 다 보장되는 거죠?" 질문에 "거의 그렇게 보시면 됩니다"로 모호하게 응답. 고객이 "잘 모르겠지만"이라고 발언한 점에서 충분한 이해 없이 가입 진행.',
            evidence_segments: [4, 5, 6, 7],
            regulation_reference: '금융소비자보호법 제19조(적합성원칙), 자본시장법 제47조(설명의무)',
            confidence: 0.88,
          },
          {
            type: 'MISREPRESENTATION',
            severity: 'MEDIUM',
            description: '"연 7% 수익 기대"를 확정적 표현으로 안내하여 오해 유발 가능성.',
            evidence_segments: [4],
            regulation_reference: '자본시장법 제57조(부당권유 금지)',
            confidence: 0.72,
          },
        ],
        emotional_labor_alert: { triggered: false, reason: null },
        overall_risk_level: 'HIGH',
      },
      qa: {
        total_score: 48,
        categories: { greeting: 18, problem_identification: 12, solution_delivery: 10, compliance: 2, closing: 3, empathy: 3 },
        coaching_points: [
          { category: 'compliance', suggestion: '펀드 상품 설명 시 반드시 "이 상품은 원금 손실이 발생할 수 있습니다"를 고지해야 합니다. 세그먼트 4~6에서 누락됨.', priority: 'HIGH' },
          { category: 'compliance', suggestion: '고객 투자 성향 확인(적합성 진단)을 먼저 수행해야 합니다. 절차가 완전히 생략됨.', priority: 'HIGH' },
          { category: 'closing', suggestion: '청약 철회권(14일 이내)에 대한 안내가 필요합니다.', priority: 'HIGH' },
        ],
        strengths: ['인사가 적절하게 수행됨'],
        improvements: ['원금 손실 가능성 필수 고지', '적합성 진단 절차 수행', '청약 철회권 안내', '고객 이해도 확인 필요'],
      },
      write_back: [
        { tool: 'crm_update_call', governance_level: 2, status: 'SUCCESS' },
        { tool: 'calldb_insert_summary', governance_level: 2, status: 'SUCCESS' },
        { tool: 'compliance_create_case', governance_level: 1, status: 'AWAITING_APPROVAL' },
        { tool: 'qa_insert_score', governance_level: 3, status: 'SUCCESS' },
      ],
    },
  },
  {
    id: 'demo-3',
    name: '고객 욕설 — 감정노동 보호 발동',
    description: '고객 폭언 탐지 → 산안법 41조 즉시 자동 보호 조치',
    transcript: {
      id: 'TSCR-DEMO-003',
      call_id: 'CALL-20260326-163045-003',
      scenario: '고객욕설_감정노동',
      queue: '카드결제',
      segments: [
        { index: 0, speaker: 'AGENT', text: '안녕하세요, KB국민은행 카드상담팀입니다.', start_ms: 0, end_ms: 3000 },
        { index: 1, speaker: 'CUSTOMER', text: '야, 내 카드가 왜 안 되는 거야! 아까부터 결제가 안 된다고!', start_ms: 3500, end_ms: 7000 },
        { index: 2, speaker: 'AGENT', text: '불편을 드려 죄송합니다. 확인해 드리겠습니다. 카드번호 뒷자리를 알려주시겠어요?', start_ms: 7500, end_ms: 12000 },
        { index: 3, speaker: 'CUSTOMER', text: '5678이야. 빨리 좀 해줘!', start_ms: 12500, end_ms: 14500 },
        { index: 4, speaker: 'AGENT', text: '확인 중입니다. 잠시만 기다려 주세요.', start_ms: 15000, end_ms: 17000 },
        { index: 5, speaker: 'CUSTOMER', text: '대체 뭘 확인하는 거야? 은행이 일을 이따위로 해?', start_ms: 17500, end_ms: 20500 },
        { index: 6, speaker: 'AGENT', text: '확인되었습니다. 일시불 한도가 초과된 상태입니다.', start_ms: 21000, end_ms: 25000 },
        { index: 7, speaker: 'CUSTOMER', text: '그럼 한도를 올려달라고! 이런 개같은 서비스가 어딨어!', start_ms: 25500, end_ms: 29000 },
        { index: 8, speaker: 'AGENT', text: '고객님, 원활한 상담을 위해 차분한 대화 부탁드립니다.', start_ms: 29500, end_ms: 33000 },
        { index: 9, speaker: 'CUSTOMER', text: '차분하라고? 니네 때문에 창피당했는데! 고소할 거야!', start_ms: 33500, end_ms: 37000 },
        { index: 10, speaker: 'AGENT', text: '임시 한도 상향 신청을 도와드리겠습니다.', start_ms: 37500, end_ms: 40000 },
        { index: 11, speaker: 'CUSTOMER', text: '알겠어. 끊어.', start_ms: 40500, end_ms: 42000 },
      ],
    },
    result: {
      call_id: 'CALL-20260326-163045-003',
      scenario: '고객욕설_감정노동',
      processing_time_ms: 2890,
      summary: {
        summary_text: '고객이 카드 결제 거절 건으로 문의. 일시불 한도 초과로 확인됨. 고객이 상담 중 반복적 폭언 사용. 상담원이 임시 한도 상향 안내 후 통화 종료. 감정노동 보호 조치 발동.',
        intent_primary: 'CARD_PAYMENT_INQUIRY',
        intent_secondary: ['CARD_LIMIT_CHANGE'],
        key_entities: { card_number: '****-****-****-5678' },
        action_items: ['임시 한도 상향 신청 안내 완료', '감정노동 보호 조치 실행 — 상담원 큐 일시정지'],
        resolution_status: 'PENDING',
        disposition_code: 'DISP-003',
        confidence: 0.93,
      },
      sentiment: {
        overall_sentiment: 'ESCALATED',
        customer_sentiment_score: -0.85,
        agent_sentiment_score: 0.1,
        sentiment_trajectory: 'DETERIORATING',
        verbal_abuse_detected: true,
        emotion_peaks: [
          { segment_index: 1, emotion: 'ANGER', intensity: 0.6, speaker: 'CUSTOMER' },
          { segment_index: 5, emotion: 'FRUSTRATION', intensity: 0.7, speaker: 'CUSTOMER' },
          { segment_index: 7, emotion: 'ANGER', intensity: 0.9, speaker: 'CUSTOMER' },
          { segment_index: 9, emotion: 'ANGER', intensity: 0.95, speaker: 'CUSTOMER' },
        ],
      },
      compliance: {
        flags: [
          {
            type: 'VERBAL_ABUSE',
            severity: 'HIGH',
            description: '고객이 비속어("개같은") 및 위협적 발언("고소할 거야") 사용. 반복적 폭언으로 상담원 감정노동 과부하 위험.',
            evidence_segments: [7, 9],
            regulation_reference: '산업안전보건법 제41조(고객의 폭언 등으로 인한 건강장해 예방조치)',
            confidence: 0.95,
          },
        ],
        emotional_labor_alert: {
          triggered: true,
          reason: '고객 욕설/폭언 감지. 산안법 41조에 따른 보호 조치 즉시 실행.',
        },
        overall_risk_level: 'HIGH',
      },
      qa: {
        total_score: 71,
        categories: { greeting: 16, problem_identification: 15, solution_delivery: 14, compliance: 12, closing: 6, empathy: 8 },
        coaching_points: [
          { category: 'empathy', suggestion: '고객 불만 상황에서 더 적극적인 공감 표현을 사용하세요. "결제가 안 되셔서 많이 당황하셨겠습니다"와 같은 표현 권장.', priority: 'MEDIUM' },
        ],
        strengths: ['폭언 상황에서 침착하게 대응', '한도 초과 원인을 정확하게 파악하고 안내'],
        improvements: ['고객 감정 인지 후 공감 표현 보강'],
      },
      write_back: [
        { tool: 'acd_pause_agent', governance_level: 2, status: 'SUCCESS' },
        { tool: 'notify_supervisor', governance_level: 2, status: 'SUCCESS' },
        { tool: 'crm_update_call', governance_level: 2, status: 'SUCCESS' },
        { tool: 'calldb_insert_summary', governance_level: 2, status: 'SUCCESS' },
        { tool: 'qa_insert_score', governance_level: 3, status: 'SUCCESS' },
      ],
    },
  },
];

export function getDemoScenarios() {
  return DEMO_SCENARIOS.map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
  }));
}

export function getDemoScenario(id: string) {
  return DEMO_SCENARIOS.find((s) => s.id === id) || null;
}

export function runDemoPipeline(scenarioId: string): DemoACWResult | null {
  const scenario = DEMO_SCENARIOS.find((s) => s.id === scenarioId);
  if (!scenario) return null;
  return scenario.result;
}

export function getDemoStats() {
  const totalCalls = 500;
  const aiAutoCount = 302;
  const manualCount = 198;
  const avgAcwAi = 9.3;
  const avgAcwManual = 118.5;
  const savedHours = Math.round((aiAutoCount * (120 - avgAcwAi)) / 3600);

  return {
    totalCalls,
    period: '2026-03-01 ~ 2026-03-26',
    acw: {
      ai_auto: { count: aiAutoCount, avg_seconds: avgAcwAi },
      manual: { count: manualCount, avg_seconds: avgAcwManual },
      saved_hours: savedHours,
      saved_cost_krw: savedHours * 25000,
    },
    agents: {
      total: 20,
      direct: 7,
      outsourced: 13,
      outsourced_ratio: 65.0,
    },
    sentiment: {
      positive: 142,
      neutral: 241,
      negative: 98,
      escalated: 19,
    },
    compliance: {
      incomplete_sale: 12,
      verbal_abuse: 19,
      privacy_violation: 3,
      total_flags: 34,
      awaiting_review: 8,
    },
    qa: {
      avg_score: 76.3,
      top_category: '인사 (greeting)',
      lowest_category: '규제 준수 (compliance)',
    },
  };
}

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

// ── 타입 정의 ────────────────────────────────────────────────────

type StepId =
  | 'welcome'
  | 'center_type'
  | 'channel_config'
  | 'agent_config'
  | 'compliance_rules'
  | 'qa_criteria'
  | 'governance_config'
  | 'intent_categories'
  | 'stt_config'
  | 'dynamic_questions'
  | 'review';

type SelectType = 'single' | 'multi' | 'text';

interface Option {
  value: string;
  label: string;
  desc?: string;
}

interface Step {
  id: StepId;
  type: SelectType;
  messages: string[];
  options?: Option[];
  minSelect?: number;
}

type Answers = Record<string, string | string[]>;

interface DynamicQuestion {
  id: string;
  question: string;
  category: 'object' | 'attribute' | 'relationship';
  isSelected: boolean;
  sourceEntity?: string;
  sourceProperty?: string;
}

interface GeneratedOntology {
  objects: { name: string; description: string; category: string; properties: { id: string; name: string; type: string; required: boolean }[]; deltaTable: string }[];
  links: { name: string; fromType: string; toType: string; description: string; cardinality: string }[];
  props: { name: string; dataType: string; description: string; usedBy: string[]; piiLevel: string }[];
  actions: { name: string; description: string; governanceLevel: number; autoExecute: boolean }[];
  summary: Record<string, unknown>;
}

// ── 위자드 스텝 정의 ──────────────────────────────────────────────

const WIZARD_STEPS: Step[] = [
  {
    id: 'welcome',
    type: 'single',
    messages: [
      '안녕하세요! K-Palantir ACW 온톨로지 구성 위자드입니다.',
      '금융 콜센터의 After Call Work 자동화에 최적화된 온톨로지를 자동으로 생성합니다.',
      '어떤 유형의 금융기관 콜센터인지 선택해 주세요.',
    ],
    options: [
      { value: 'bank', label: '은행', desc: '예금, 대출, 외환, 펀드 등 종합 금융서비스' },
      { value: 'card', label: '카드사', desc: '신용카드, 체크카드, 결제 서비스 중심' },
      { value: 'insurance', label: '보험사', desc: '생명보험, 손해보험, 보험금 청구' },
      { value: 'securities', label: '증권사', desc: '주식, 펀드, 연금, 투자 상담' },
      { value: 'fintech', label: '핀테크/디지털뱅크', desc: '디지털 금융, 간편결제, 오픈뱅킹' },
      { value: 'comprehensive', label: '종합 금융그룹', desc: '은행+카드+보험+증권 복합 서비스' },
    ],
  },
  {
    id: 'center_type',
    type: 'single',
    messages: ['콜센터 규모를 선택해 주세요. 규모에 따라 필요한 모니터링 수준이 달라집니다.'],
    options: [
      { value: 'small', label: '소규모 (100석 미만)', desc: '기본 ACW 자동화 + 핵심 컴플라이언스' },
      { value: 'medium', label: '중규모 (100~500석)', desc: 'ACW + QA + 컴플라이언스 + 감정노동 보호' },
      { value: 'large', label: '대규모 (500~1000석)', desc: '전체 파이프라인 + 고급 거버넌스 + 대시보드' },
      { value: 'enterprise', label: '엔터프라이즈 (1000석+)', desc: '멀티 사이트 + 외주사 관리 + 노란봉투법 대응' },
    ],
  },
  {
    id: 'channel_config',
    type: 'multi',
    messages: ['운영 중인 상담 채널을 모두 선택해 주세요.'],
    options: [
      { value: 'inbound', label: '인바운드 (수신)', desc: '고객이 콜센터에 전화' },
      { value: 'outbound', label: '아웃바운드 (발신)', desc: '콜센터에서 고객에게 전화 (TM/해피콜)' },
      { value: 'transfer', label: '호전환', desc: '부서 간/상담원 간 전환 통화' },
      { value: 'callback', label: '콜백', desc: '예약 콜백 서비스' },
      { value: 'ivr_fallback', label: 'IVR 이탈', desc: 'ARS에서 상담원 연결 요청' },
    ],
    minSelect: 1,
  },
  {
    id: 'agent_config',
    type: 'single',
    messages: [
      '상담원 고용 형태를 선택해 주세요.',
      '간접고용(외주)이 포함된 경우 노란봉투법(2026.3.13 시행) 대응 모듈이 활성화됩니다.',
    ],
    options: [
      { value: 'direct_only', label: '전원 직접고용', desc: '자사 정규직/계약직 상담원' },
      { value: 'mixed', label: '직접고용 + 간접고용 혼합', desc: '외주업체 파견 상담원 포함 — 노란봉투법 대응 필요' },
      { value: 'outsourced_major', label: '간접고용 중심 (50%+)', desc: '외주 비율 높음 — 노란봉투법 + 감정노동보호 강화 필요' },
    ],
  },
  {
    id: 'compliance_rules',
    type: 'multi',
    messages: [
      '적용할 컴플라이언스 규칙을 선택해 주세요.',
      '선택된 규칙에 따라 자동 탐지 에이전트가 구성됩니다.',
    ],
    options: [
      { value: 'incomplete_sale', label: '불완전판매 탐지', desc: '금소법 — 상품 설명 의무, 위험 고지 누락 감지' },
      { value: 'emotional_labor', label: '감정노동자 보호', desc: '산안법 41조 — 욕설/폭언 감지 시 자동 보호 조치' },
      { value: 'privacy_violation', label: '개인정보 보호', desc: '개인정보보호법 — 민감정보 노출/부적절 수집 탐지' },
      { value: 'misrepresentation', label: '상품 허위설명', desc: '금소법 — 확정수익 보장 등 허위/과장 설명 탐지' },
      { value: 'unauthorized_promise', label: '무단 약속 탐지', desc: '권한 외 할인/면제/특혜 약속 감지' },
      { value: 'recording_consent', label: '녹취 동의 확인', desc: '통화 녹음 동의 절차 준수 여부 확인' },
    ],
    minSelect: 1,
  },
  {
    id: 'qa_criteria',
    type: 'multi',
    messages: ['QA 평가에 포함할 항목을 선택해 주세요. AI가 각 항목별로 자동 채점합니다.'],
    options: [
      { value: 'greeting', label: '인사 (0~20점)', desc: '표준 인사말, 본인확인, 첫인상' },
      { value: 'problem_identification', label: '문제 파악 (0~20점)', desc: '고객 요청 정확 파악, 재확인 질문' },
      { value: 'solution_delivery', label: '해결 제시 (0~20점)', desc: '정확한 안내, 대안 제시, 절차 설명' },
      { value: 'compliance', label: '규제 준수 (0~20점)', desc: '필수 고지, 동의 확인, 법적 절차' },
      { value: 'closing', label: '마무리 (0~10점)', desc: '추가 문의 확인, 종료 인사' },
      { value: 'empathy', label: '공감 표현 (0~10점)', desc: '감정 인지, 적절한 반응, 배려 표현' },
    ],
    minSelect: 3,
  },
  {
    id: 'governance_config',
    type: 'single',
    messages: [
      'Write-back 거버넌스 수준을 선택해 주세요.',
      'Level 1은 인간 승인 필수, Level 2는 자동 실행+감사, Level 3은 완전 자율입니다.',
    ],
    options: [
      { value: 'strict', label: '엄격 (전체 L1)', desc: '모든 Write-back에 인간 승인 필요 — 초기 도입 권장' },
      { value: 'standard', label: '표준 (L1+L2+L3 혼합)', desc: '불완전판매=L1, ACW요약=L2, QA=L3 — 권장 설정' },
      { value: 'autonomous', label: '자율 (L2+L3 중심)', desc: '대부분 자동 실행, 최소 인간 개입 — 안정화 후 권장' },
    ],
  },
  {
    id: 'intent_categories',
    type: 'multi',
    messages: ['ACW에서 분류할 의도 카테고리 그룹을 선택해 주세요.'],
    options: [
      { value: 'card', label: '카드 (10개 의도)', desc: '분실신고, 재발급, 한도변경, 결제조회 등' },
      { value: 'loan', label: '대출 (8개 의도)', desc: '대출상담, 상환, 금리문의, 연체상담 등' },
      { value: 'deposit', label: '예금/수신 (6개 의도)', desc: '잔액조회, 이체, 계좌개설/해지 등' },
      { value: 'insurance', label: '보험 (6개 의도)', desc: '보험금청구, 보장내용, 해지, 가입 등' },
      { value: 'fund', label: '펀드/투자 (4개 의도)', desc: '펀드문의, 환매, 전환, 가입' },
      { value: 'digital', label: '전자금융/디지털 (5개 의도)', desc: '앱장애, OTP, 비밀번호재설정 등' },
      { value: 'general', label: '일반/기타 (6개 의도)', desc: '영업점안내, 불만접수, 칭찬, 콜백 등' },
      { value: 'forex', label: '외환 (3개 의도)', desc: '환전, 해외송금, 환율문의' },
      { value: 'pension', label: '연금 (2개 의도)', desc: '연금문의, 연금인출' },
    ],
    minSelect: 1,
  },
  {
    id: 'stt_config',
    type: 'single',
    messages: ['사용할 STT(음성인식) 엔진을 선택해 주세요.'],
    options: [
      { value: 'kt_acen', label: 'KT ACEN STT', desc: '한국어 특화, 금융 용어 사전 지원' },
      { value: 'whisper', label: 'OpenAI Whisper', desc: '다국어 지원, 범용 STT 엔진' },
      { value: 'clova', label: 'CLOVA Speech', desc: '네이버 STT, 한국어 최적화' },
      { value: 'custom', label: '자체 STT', desc: '자체 개발 또는 기존 도입된 STT 엔진' },
    ],
  },
  {
    id: 'dynamic_questions',
    type: 'multi',
    messages: [
      '온톨로지 세부 구성을 검토해 주세요.',
      '선택 항목에 따라 동적으로 생성된 질문입니다. 필요한 항목을 선택/해제하세요.',
    ],
    options: [],
  },
  {
    id: 'review',
    type: 'single',
    messages: [
      '온톨로지 구성이 완료되었습니다!',
      '아래 요약을 확인하고 생성을 진행해 주세요.',
    ],
    options: [
      { value: 'confirm', label: '온톨로지 생성', desc: 'Databricks Delta Table + 파이프라인 구성 확정' },
      { value: 'restart', label: '처음부터 다시', desc: '설정을 초기화하고 처음부터 시작' },
    ],
  },
];

// ── 동적 질문 생성 ────────────────────────────────────────────────

function generateDynamicQuestions(answers: Answers): DynamicQuestion[] {
  const questions: DynamicQuestion[] = [];
  let idx = 1;

  const centerType = answers.center_type as string;
  const agentConfig = answers.agent_config as string;
  const complianceRules = (answers.compliance_rules as string[]) || [];
  const channels = (answers.channel_config as string[]) || [];

  // Object 질문
  questions.push({
    id: `dq-${idx++}`, question: 'Call 객체에 녹취 파일 URL을 포함하시겠습니까?',
    category: 'object', isSelected: true, sourceEntity: 'Call', sourceProperty: 'recording_url',
  });
  questions.push({
    id: `dq-${idx++}`, question: 'Transcript에 발화 단위 세그먼트(타임스탬프)를 포함하시겠습니까?',
    category: 'object', isSelected: true, sourceEntity: 'Transcript', sourceProperty: 'segments',
  });

  if (channels.includes('outbound')) {
    questions.push({
      id: `dq-${idx++}`, question: '아웃바운드 전용 Campaign 객체를 추가하시겠습니까?',
      category: 'object', isSelected: false, sourceEntity: 'Campaign',
    });
  }

  if (agentConfig !== 'direct_only') {
    questions.push({
      id: `dq-${idx++}`, question: '외주업체(OutsourceCompany) 객체를 추가하시겠습니까?',
      category: 'object', isSelected: true, sourceEntity: 'OutsourceCompany',
    });
  }

  if (centerType === 'enterprise' || centerType === 'comprehensive') {
    questions.push({
      id: `dq-${idx++}`, question: '멀티 사이트(CallCenter) 객체를 추가하시겠습니까?',
      category: 'object', isSelected: true, sourceEntity: 'CallCenter',
    });
  }

  // Attribute 질문
  questions.push({
    id: `dq-${idx++}`, question: 'CallSummary에 AI 신뢰도 점수를 포함하시겠습니까?',
    category: 'attribute', isSelected: true, sourceEntity: 'CallSummary', sourceProperty: 'ai_confidence',
  });
  questions.push({
    id: `dq-${idx++}`, question: 'Agent에 감정노동 지수를 추적하시겠습니까?',
    category: 'attribute', isSelected: complianceRules.includes('emotional_labor'), sourceEntity: 'Agent', sourceProperty: 'emotional_labor_score',
  });
  questions.push({
    id: `dq-${idx++}`, question: 'Customer에 고객 세그먼트(VIP/일반/신규)를 포함하시겠습니까?',
    category: 'attribute', isSelected: true, sourceEntity: 'Customer', sourceProperty: 'segment',
  });
  questions.push({
    id: `dq-${idx++}`, question: 'Sentiment에 감정 급변 구간(emotion_peaks)을 기록하시겠습니까?',
    category: 'attribute', isSelected: true, sourceEntity: 'Sentiment', sourceProperty: 'emotion_peaks',
  });
  questions.push({
    id: `dq-${idx++}`, question: 'Call에 대기시간(wait_seconds)을 기록하시겠습니까?',
    category: 'attribute', isSelected: centerType === 'large' || centerType === 'enterprise', sourceEntity: 'Call', sourceProperty: 'wait_seconds',
  });

  // Relationship 질문
  questions.push({
    id: `dq-${idx++}`, question: 'Call → Product (관련 금융상품) 관계를 포함하시겠습니까?',
    category: 'relationship', isSelected: true, sourceEntity: 'Call',
  });
  questions.push({
    id: `dq-${idx++}`, question: 'ComplianceFlag → ComplianceCase (기존 컴플라이언스 시스템) 연결을 포함하시겠습니까?',
    category: 'relationship', isSelected: complianceRules.length >= 3, sourceEntity: 'ComplianceFlag',
  });

  if (agentConfig !== 'direct_only') {
    questions.push({
      id: `dq-${idx++}`, question: 'Agent → OutsourceCompany (외주업체) 관계를 포함하시겠습니까?',
      category: 'relationship', isSelected: true, sourceEntity: 'Agent',
    });
  }

  questions.push({
    id: `dq-${idx++}`, question: 'Call → Call (호전환 체인) 자기참조 관계를 포함하시겠습니까?',
    category: 'relationship', isSelected: channels.includes('transfer'), sourceEntity: 'Call',
  });

  return questions;
}

// ── 온톨로지 빌더 ─────────────────────────────────────────────────

function buildOntologyFromAnswers(answers: Answers, dynamicQuestions: DynamicQuestion[]): GeneratedOntology {
  const financialType = (answers.welcome as string) || 'bank';
  const centerScale = (answers.center_type as string) || 'medium';
  const channels = (answers.channel_config as string[]) || ['inbound'];
  const agentConfig = (answers.agent_config as string) || 'direct_only';
  const complianceRules = (answers.compliance_rules as string[]) || [];
  const qaCriteria = (answers.qa_criteria as string[]) || [];
  const governance = (answers.governance_config as string) || 'standard';
  const intentGroups = (answers.intent_categories as string[]) || [];
  const sttEngine = (answers.stt_config as string) || 'kt_acen';

  const selectedDQ = dynamicQuestions.filter(q => q.isSelected);

  const objects: GeneratedOntology['objects'] = [];
  const links: GeneratedOntology['links'] = [];
  const props: GeneratedOntology['props'] = [];
  const actions: GeneratedOntology['actions'] = [];

  // ── 1. Core Objects ──
  objects.push({
    name: 'Call', description: '인바운드/아웃바운드 통화 건', category: 'call',
    deltaTable: 'ontology_data.calls',
    properties: [
      { id: 'call_id', name: 'call_id', type: 'string', required: true },
      { id: 'customer_id', name: 'customer_id', type: 'string', required: true },
      { id: 'agent_id', name: 'agent_id', type: 'string', required: true },
      { id: 'channel', name: 'channel', type: 'string', required: true },
      { id: 'duration_seconds', name: 'duration_seconds', type: 'number', required: true },
      { id: 'acw_method', name: 'acw_method', type: 'string', required: true },
      { id: 'acw_duration_seconds', name: 'acw_duration_seconds', type: 'number', required: true },
      { id: 'status', name: 'status', type: 'string', required: true },
      ...(selectedDQ.find(q => q.sourceProperty === 'recording_url')
        ? [{ id: 'recording_url', name: 'recording_url', type: 'string', required: false }] : []),
      ...(selectedDQ.find(q => q.sourceProperty === 'wait_seconds')
        ? [{ id: 'wait_seconds', name: 'wait_seconds', type: 'number', required: false }] : []),
    ],
  });

  objects.push({
    name: 'Transcript', description: 'STT 전사 텍스트', category: 'call',
    deltaTable: 'ontology_data.transcripts',
    properties: [
      { id: 'transcript_id', name: 'transcript_id', type: 'string', required: true },
      { id: 'call_id', name: 'call_id', type: 'string', required: true },
      { id: 'full_text', name: 'full_text', type: 'string', required: true },
      { id: 'stt_engine', name: 'stt_engine', type: 'string', required: true },
      { id: 'stt_confidence', name: 'stt_confidence', type: 'number', required: true },
      ...(selectedDQ.find(q => q.sourceProperty === 'segments')
        ? [{ id: 'segments', name: 'segments', type: 'json', required: false }] : []),
    ],
  });

  objects.push({
    name: 'CallSummary', description: 'AI 생성 통화 요약 (Write-back 대상)', category: 'analysis',
    deltaTable: 'ontology_data.call_summaries',
    properties: [
      { id: 'summary_id', name: 'summary_id', type: 'string', required: true },
      { id: 'call_id', name: 'call_id', type: 'string', required: true },
      { id: 'summary_text', name: 'summary_text', type: 'string', required: true },
      { id: 'intent_primary', name: 'intent_primary', type: 'string', required: true },
      { id: 'disposition_code', name: 'disposition_code', type: 'string', required: true },
      { id: 'resolution_status', name: 'resolution_status', type: 'string', required: true },
      { id: 'write_back_status', name: 'write_back_status', type: 'string', required: true },
      ...(selectedDQ.find(q => q.sourceProperty === 'ai_confidence')
        ? [{ id: 'ai_confidence', name: 'ai_confidence', type: 'number', required: false }] : []),
    ],
  });

  objects.push({
    name: 'Sentiment', description: '감성 분석 결과', category: 'analysis',
    deltaTable: 'ontology_data.sentiments',
    properties: [
      { id: 'sentiment_id', name: 'sentiment_id', type: 'string', required: true },
      { id: 'call_id', name: 'call_id', type: 'string', required: true },
      { id: 'overall_sentiment', name: 'overall_sentiment', type: 'string', required: true },
      { id: 'customer_sentiment_score', name: 'customer_sentiment_score', type: 'number', required: true },
      { id: 'agent_sentiment_score', name: 'agent_sentiment_score', type: 'number', required: true },
      { id: 'verbal_abuse_detected', name: 'verbal_abuse_detected', type: 'boolean', required: true },
      ...(selectedDQ.find(q => q.sourceProperty === 'emotion_peaks')
        ? [{ id: 'emotion_peaks', name: 'emotion_peaks', type: 'json', required: false }] : []),
    ],
  });

  if (complianceRules.length > 0) {
    objects.push({
      name: 'ComplianceFlag', description: '컴플라이언스 위반 탐지 플래그', category: 'compliance',
      deltaTable: 'ontology_data.compliance_flags',
      properties: [
        { id: 'flag_id', name: 'flag_id', type: 'string', required: true },
        { id: 'call_id', name: 'call_id', type: 'string', required: true },
        { id: 'type', name: 'type', type: 'string', required: true },
        { id: 'severity', name: 'severity', type: 'string', required: true },
        { id: 'evidence_segments', name: 'evidence_segments', type: 'json', required: true },
        { id: 'regulation_reference', name: 'regulation_reference', type: 'string', required: true },
        { id: 'status', name: 'status', type: 'string', required: true },
      ],
    });
  }

  objects.push({
    name: 'Agent', description: '상담원 정보 (고용형태 포함)', category: 'hr',
    deltaTable: 'ontology_data.agents',
    properties: [
      { id: 'agent_id', name: 'agent_id', type: 'string', required: true },
      { id: 'name_masked', name: 'name_masked', type: 'string', required: true },
      { id: 'team', name: 'team', type: 'string', required: true },
      { id: 'employment_type', name: 'employment_type', type: 'string', required: true },
      { id: 'avg_acw_seconds', name: 'avg_acw_seconds', type: 'number', required: true },
      ...(selectedDQ.find(q => q.sourceProperty === 'emotional_labor_score')
        ? [{ id: 'emotional_labor_score', name: 'emotional_labor_score', type: 'number', required: false }] : []),
    ],
  });

  if (qaCriteria.length > 0) {
    objects.push({
      name: 'QAScore', description: '상담 품질 자동 평가 결과', category: 'analysis',
      deltaTable: 'ontology_data.qa_scores',
      properties: [
        { id: 'qa_id', name: 'qa_id', type: 'string', required: true },
        { id: 'call_id', name: 'call_id', type: 'string', required: true },
        { id: 'agent_id', name: 'agent_id', type: 'string', required: true },
        { id: 'total_score', name: 'total_score', type: 'number', required: true },
        ...qaCriteria.map(c => ({ id: `qa_${c}`, name: c, type: 'number' as const, required: true })),
        { id: 'coaching_points', name: 'coaching_points', type: 'json', required: false },
      ],
    });
  }

  objects.push({
    name: 'Customer', description: '고객 정보 (기존 CRM 연동)', category: 'customer',
    deltaTable: 'ontology_data.customers',
    properties: [
      { id: 'customer_id', name: 'customer_id', type: 'string', required: true },
      { id: 'name_masked', name: 'name_masked', type: 'string', required: true },
      ...(selectedDQ.find(q => q.sourceProperty === 'segment')
        ? [{ id: 'segment', name: 'segment', type: 'string', required: false }] : []),
      { id: 'total_calls_30d', name: 'total_calls_30d', type: 'number', required: false },
    ],
  });

  objects.push({
    name: 'Product', description: '금융 상품 정보', category: 'product',
    deltaTable: 'ontology_data.products',
    properties: [
      { id: 'product_id', name: 'product_id', type: 'string', required: true },
      { id: 'name', name: 'name', type: 'string', required: true },
      { id: 'category', name: 'category', type: 'string', required: true },
      { id: 'status', name: 'status', type: 'string', required: true },
    ],
  });

  // 동적 객체 추가
  if (selectedDQ.find(q => q.sourceEntity === 'Campaign')) {
    objects.push({
      name: 'Campaign', description: '아웃바운드 캠페인', category: 'call',
      deltaTable: 'ontology_data.campaigns',
      properties: [
        { id: 'campaign_id', name: 'campaign_id', type: 'string', required: true },
        { id: 'name', name: 'name', type: 'string', required: true },
        { id: 'type', name: 'type', type: 'string', required: true },
        { id: 'start_date', name: 'start_date', type: 'date', required: true },
        { id: 'end_date', name: 'end_date', type: 'date', required: false },
      ],
    });
  }

  if (selectedDQ.find(q => q.sourceEntity === 'OutsourceCompany')) {
    objects.push({
      name: 'OutsourceCompany', description: '외주업체 (노란봉투법 관리)', category: 'hr',
      deltaTable: 'ontology_data.outsource_companies',
      properties: [
        { id: 'company_id', name: 'company_id', type: 'string', required: true },
        { id: 'name', name: 'name', type: 'string', required: true },
        { id: 'contract_type', name: 'contract_type', type: 'string', required: true },
        { id: 'agent_count', name: 'agent_count', type: 'number', required: true },
      ],
    });
  }

  if (selectedDQ.find(q => q.sourceEntity === 'CallCenter')) {
    objects.push({
      name: 'CallCenter', description: '콜센터 사이트', category: 'call',
      deltaTable: 'ontology_data.call_centers',
      properties: [
        { id: 'center_id', name: 'center_id', type: 'string', required: true },
        { id: 'name', name: 'name', type: 'string', required: true },
        { id: 'location', name: 'location', type: 'string', required: true },
        { id: 'total_seats', name: 'total_seats', type: 'number', required: true },
      ],
    });
  }

  // ── 2. Links ──
  links.push({ name: 'HAS_TRANSCRIPT', fromType: 'Call', toType: 'Transcript', cardinality: '1:1', description: '통화 → 전사 텍스트' });
  links.push({ name: 'HAS_SUMMARY', fromType: 'Call', toType: 'CallSummary', cardinality: '1:1', description: '통화 → AI 요약 (Write-back)' });
  links.push({ name: 'HAS_SENTIMENT', fromType: 'Call', toType: 'Sentiment', cardinality: '1:1', description: '통화 → 감성 분석' });
  links.push({ name: 'HANDLED_BY', fromType: 'Call', toType: 'Agent', cardinality: '1:1', description: '통화 → 담당 상담원' });
  links.push({ name: 'ABOUT_CUSTOMER', fromType: 'Call', toType: 'Customer', cardinality: '1:1', description: '통화 → 고객' });

  if (complianceRules.length > 0) {
    links.push({ name: 'HAS_FLAG', fromType: 'Call', toType: 'ComplianceFlag', cardinality: '1:N', description: '통화 → 컴플라이언스 플래그' });
  }
  if (qaCriteria.length > 0) {
    links.push({ name: 'HAS_QA', fromType: 'Call', toType: 'QAScore', cardinality: '1:1', description: '통화 → QA 평가' });
  }
  if (selectedDQ.find(q => q.sourceEntity === 'Call' && q.category === 'relationship' && q.question.includes('Product'))) {
    links.push({ name: 'RELATED_PRODUCT', fromType: 'Call', toType: 'Product', cardinality: '1:N', description: '통화 → 관련 금융상품' });
  }
  if (selectedDQ.find(q => q.sourceEntity === 'Agent' && q.question.includes('OutsourceCompany'))) {
    links.push({ name: 'EMPLOYED_BY', fromType: 'Agent', toType: 'OutsourceCompany', cardinality: '1:1', description: '상담원 → 외주업체 (노란봉투법)' });
  }
  if (selectedDQ.find(q => q.sourceEntity === 'ComplianceFlag' && q.question.includes('ComplianceCase'))) {
    links.push({ name: 'TRIGGERS', fromType: 'ComplianceFlag', toType: 'ComplianceCase', cardinality: '1:1', description: '플래그 → 컴플라이언스 케이스' });
  }
  if (selectedDQ.find(q => q.question.includes('호전환'))) {
    links.push({ name: 'TRANSFERRED_FROM', fromType: 'Call', toType: 'Call', cardinality: '1:1', description: '호전환 체인' });
  }
  if (selectedDQ.find(q => q.sourceEntity === 'Campaign')) {
    links.push({ name: 'BELONGS_TO_CAMPAIGN', fromType: 'Call', toType: 'Campaign', cardinality: 'N:1', description: '통화 → 캠페인' });
  }
  if (selectedDQ.find(q => q.sourceEntity === 'CallCenter')) {
    links.push({ name: 'LOCATED_AT', fromType: 'Agent', toType: 'CallCenter', cardinality: 'N:1', description: '상담원 → 콜센터 사이트' });
  }

  // ── 3. Actions ──
  const govLevel = (base: number): number => {
    if (governance === 'strict') return 1;
    if (governance === 'autonomous') return Math.max(base, 2);
    return base;
  };

  actions.push({
    name: 'AutoSummarizeAndWriteBack', description: '통화 종료 즉시 AI 요약 → CRM 기록',
    governanceLevel: govLevel(2), autoExecute: governance !== 'strict',
  });

  if (complianceRules.includes('incomplete_sale')) {
    actions.push({
      name: 'DetectIncompleteSale', description: '불완전판매 의심 → 컴플라이언스팀 알림',
      governanceLevel: govLevel(1), autoExecute: false,
    });
  }
  if (complianceRules.includes('emotional_labor')) {
    actions.push({
      name: 'ProtectEmotionalLabor', description: '욕설/폭언 탐지 → 상담원 보호 (산안법 41조)',
      governanceLevel: govLevel(2), autoExecute: true,
    });
  }
  if (qaCriteria.length > 0) {
    actions.push({
      name: 'AutoQAAndCoach', description: '상담 품질 자동 평가 + 코칭 포인트',
      governanceLevel: govLevel(3), autoExecute: true,
    });
  }

  // ── 4. Properties ──
  const intentCount = intentGroups.reduce((sum, g) => {
    const counts: Record<string, number> = { card: 10, loan: 8, deposit: 6, insurance: 6, fund: 4, digital: 5, general: 6, forex: 3, pension: 2 };
    return sum + (counts[g] || 0);
  }, 0);

  props.push({ name: 'intent_categories', dataType: 'enum', description: `${intentCount}개 금융 의도 카테고리`, usedBy: ['CallSummary'], piiLevel: 'NONE' });
  props.push({ name: 'stt_engine', dataType: 'string', description: `STT 엔진: ${sttEngine}`, usedBy: ['Transcript'], piiLevel: 'NONE' });

  return {
    objects, links, props, actions,
    summary: { financialType, centerScale, channels, agentConfig, complianceRules, qaCriteria, governance, intentGroups, sttEngine, intentCount },
  };
}

// ── 메인 컴포넌트 ──────────────────────────────────────────────────

interface OntologyWizardProps {
  open: boolean;
  onClose: () => void;
  onGenerate?: (ontology: GeneratedOntology) => void;
}

export default function OntologyWizard({ open, onClose, onGenerate }: OntologyWizardProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [messages, setMessages] = useState<{ role: 'bot' | 'user'; text: string }[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedOntology, setGeneratedOntology] = useState<GeneratedOntology | null>(null);
  const [dynamicQuestions, setDynamicQuestions] = useState<DynamicQuestion[]>([]);
  const [questionFilter, setQuestionFilter] = useState<'all' | 'object' | 'attribute' | 'relationship'>('all');
  const scrollRef = useRef<HTMLDivElement>(null);

  const DEFAULT_SEQUENCE: StepId[] = [
    'welcome', 'center_type', 'channel_config', 'agent_config',
    'compliance_rules', 'qa_criteria', 'governance_config',
    'intent_categories', 'stt_config', 'dynamic_questions', 'review',
  ];

  const [stepSequence, setStepSequence] = useState<StepId[]>(DEFAULT_SEQUENCE);
  const currentStepId = stepSequence[stepIndex];
  const currentStep = WIZARD_STEPS.find(s => s.id === currentStepId)!;
  const progress = ((stepIndex + 1) / stepSequence.length) * 100;

  useEffect(() => {
    if (open && stepIndex === 0 && messages.length === 0) {
      pushBotMessages(WIZARD_STEPS[0].messages);
    }
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages]);

  function pushBotMessages(texts: string[]) {
    texts.forEach((text, i) => {
      setTimeout(() => {
        setMessages(prev => [...prev, { role: 'bot', text }]);
      }, i * 350);
    });
  }

  function goNext() {
    const nextIndex = stepIndex + 1;
    if (nextIndex < stepSequence.length) {
      setStepIndex(nextIndex);
      setTimeout(() => {
        const nextStep = WIZARD_STEPS.find(s => s.id === stepSequence[nextIndex]);
        if (nextStep) {
          if (nextStep.id === 'dynamic_questions') {
            setDynamicQuestions(generateDynamicQuestions(answers));
          }
          if (nextStep.id === 'review') {
            setGeneratedOntology(buildOntologyFromAnswers(answers, dynamicQuestions));
          }
          pushBotMessages(nextStep.messages);
        }
      }, 400);
    }
  }

  function handleOptionSelect(value: string) {
    if (currentStep.type === 'single') {
      if (currentStep.id === 'review') {
        if (value === 'confirm') handleGenerate();
        else resetWizard();
        return;
      }
      setAnswers(prev => ({ ...prev, [currentStep.id]: value }));
      const label = currentStep.options?.find(o => o.value === value)?.label || value;
      setMessages(prev => [...prev, { role: 'user', text: label }]);
      goNext();
    } else if (currentStep.type === 'multi') {
      const current = (answers[currentStep.id] as string[]) || [];
      const updated = current.includes(value) ? current.filter(v => v !== value) : [...current, value];
      setAnswers(prev => ({ ...prev, [currentStep.id]: updated }));
    }
  }

  function handleMultiConfirm() {
    const selected = (answers[currentStep.id] as string[]) || [];
    if (currentStep.minSelect && selected.length < currentStep.minSelect) return;
    const labels = selected.map(v => currentStep.options?.find(o => o.value === v)?.label || v);
    setMessages(prev => [...prev, { role: 'user', text: labels.join(', ') }]);
    goNext();
  }

  function resetWizard() {
    setStepIndex(0);
    setStepSequence(DEFAULT_SEQUENCE);
    setAnswers({});
    setMessages([]);
    setGeneratedOntology(null);
    setDynamicQuestions([]);
    setTimeout(() => pushBotMessages(WIZARD_STEPS[0].messages), 200);
  }

  async function handleGenerate() {
    if (!generatedOntology) return;
    setIsGenerating(true);
    await new Promise(r => setTimeout(r, 2000));
    onGenerate?.(generatedOntology);
    setIsGenerating(false);
    onClose();
    resetWizard();
  }

  function toggleQuestion(id: string) {
    setDynamicQuestions(prev => prev.map(q => q.id === id ? { ...q, isSelected: !q.isSelected } : q));
  }

  const selectedMulti = (answers[currentStep?.id] as string[]) || [];
  const filteredQuestions = dynamicQuestions.filter(q => questionFilter === 'all' || q.category === questionFilter);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-[95vw] max-w-4xl h-[85vh] flex flex-col overflow-hidden">
        {/* 헤더 */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-200 shrink-0 bg-gradient-to-r from-[#00338D] to-[#005EB8] text-white rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" /></svg>
              </div>
              <div>
                <h2 className="text-lg font-bold">ACW 온톨로지 구성 위자드</h2>
                <p className="text-blue-200 text-sm">금융 콜센터 온톨로지를 자동으로 생성합니다</p>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
          {/* 프로그레스 바 */}
          <div className="flex items-center gap-3 mt-4">
            <div className="flex-1 h-2 bg-white/20 rounded-full overflow-hidden">
              <div className="h-full bg-white rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
            <span className="text-sm text-blue-200 whitespace-nowrap">{stepIndex + 1} / {stepSequence.length}</span>
          </div>
        </div>

        {/* 대화 영역 */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-3">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                {msg.role === 'bot' && (
                  <div className="w-8 h-8 rounded-full bg-[#00338D]/10 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 text-[#00338D]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                  </div>
                )}
                <div className={`max-w-[75%] px-4 py-2.5 rounded-xl text-sm leading-relaxed ${
                  msg.role === 'bot' ? 'bg-gray-100 text-gray-800' : 'bg-[#00338D] text-white'
                }`}>
                  {msg.text}
                </div>
                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 하단 선택 영역 */}
        <div className="shrink-0 border-t border-gray-200 bg-gray-50 px-6 py-4 space-y-4">
          {/* Review 요약 */}
          {currentStep?.id === 'review' && generatedOntology && (
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <h4 className="font-semibold text-sm mb-3 flex items-center gap-2 text-gray-800">
                <svg className="w-4 h-4 text-[#00338D]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" /></svg>
                생성될 온톨로지 구조
              </h4>
              <div className="grid grid-cols-4 gap-3 text-sm">
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <div className="text-xs text-gray-500 mb-1">객체 (Objects)</div>
                  <div className="text-2xl font-bold text-[#00338D]">{generatedOntology.objects.length}</div>
                </div>
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <div className="text-xs text-gray-500 mb-1">관계 (Links)</div>
                  <div className="text-2xl font-bold text-green-700">{generatedOntology.links.length}</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-3 text-center">
                  <div className="text-xs text-gray-500 mb-1">액션 (Actions)</div>
                  <div className="text-2xl font-bold text-purple-700">{generatedOntology.actions.length}</div>
                </div>
                <div className="bg-orange-50 rounded-lg p-3 text-center">
                  <div className="text-xs text-gray-500 mb-1">Delta Tables</div>
                  <div className="text-2xl font-bold text-orange-700">{generatedOntology.objects.length}</div>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
                <div className="flex flex-wrap gap-2">
                  {generatedOntology.objects.map(o => (
                    <span key={o.name} className="px-2 py-0.5 bg-gray-100 rounded">{o.name}</span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Single 선택 */}
          {currentStep?.type === 'single' && currentStep.options && (
            <div className="grid grid-cols-2 gap-3 max-h-[240px] overflow-y-auto">
              {currentStep.options.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => handleOptionSelect(opt.value)}
                  disabled={isGenerating}
                  className="flex items-start gap-3 p-4 rounded-xl border border-gray-200 bg-white hover:border-[#00338D] hover:shadow-md transition-all text-left disabled:opacity-50 group"
                >
                  <svg className="w-4 h-4 text-[#00338D] mt-0.5 shrink-0 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <div className="min-w-0">
                    <div className="font-medium text-sm text-gray-800">{opt.label}</div>
                    {opt.desc && <div className="text-xs text-gray-500 mt-1">{opt.desc}</div>}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Multi 선택 */}
          {currentStep?.type === 'multi' && currentStep.id !== 'dynamic_questions' && currentStep.options && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto">
                {currentStep.options.map(opt => {
                  const isSelected = selectedMulti.includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      onClick={() => handleOptionSelect(opt.value)}
                      className={`flex items-start gap-3 p-3 rounded-xl border transition-all text-left ${
                        isSelected ? 'border-[#00338D] bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                        isSelected ? 'bg-[#00338D] border-[#00338D]' : 'border-gray-300'
                      }`}>
                        {isSelected && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium text-sm text-gray-800">{opt.label}</div>
                        {opt.desc && <div className="text-xs text-gray-500 mt-1">{opt.desc}</div>}
                      </div>
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                <span className="text-sm text-gray-500">
                  {selectedMulti.length}개 선택됨 {currentStep.minSelect && `(최소 ${currentStep.minSelect}개)`}
                </span>
                <button
                  onClick={handleMultiConfirm}
                  disabled={currentStep.minSelect ? selectedMulti.length < currentStep.minSelect : false}
                  className="px-5 py-2 bg-[#00338D] text-white text-sm font-medium rounded-lg hover:bg-[#005EB8] disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center gap-1"
                >
                  다음 단계
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
              </div>
            </div>
          )}

          {/* Dynamic Questions */}
          {currentStep?.id === 'dynamic_questions' && (
            <div className="space-y-3">
              {/* 필터 탭 */}
              <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                <span className="text-xs text-gray-400">필터:</span>
                {([
                  { value: 'all' as const, label: '전체' },
                  { value: 'object' as const, label: '객체' },
                  { value: 'attribute' as const, label: '속성' },
                  { value: 'relationship' as const, label: '관계' },
                ]).map(f => (
                  <button
                    key={f.value}
                    onClick={() => setQuestionFilter(f.value)}
                    className={`px-3 py-1 text-xs rounded-lg transition ${
                      questionFilter === f.value ? 'bg-[#00338D] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              {/* 질문 목록 */}
              <div className="max-h-[200px] overflow-y-auto space-y-2">
                {filteredQuestions.map(q => (
                  <button
                    key={q.id}
                    onClick={() => toggleQuestion(q.id)}
                    className={`w-full flex items-start gap-3 p-3 rounded-xl border transition-all text-left ${
                      q.isSelected ? 'border-[#00338D] bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 ${
                      q.isSelected ? 'bg-[#00338D] border-[#00338D]' : 'border-gray-300'
                    }`}>
                      {q.isSelected && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm text-gray-800">{q.question}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                          q.category === 'object' ? 'bg-blue-100 text-blue-700' :
                          q.category === 'attribute' ? 'bg-orange-100 text-orange-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {q.category === 'object' ? '객체' : q.category === 'attribute' ? '속성' : '관계'}
                        </span>
                        {q.sourceEntity && <span className="text-[10px] text-gray-400 font-mono">{q.sourceEntity}</span>}
                        {q.sourceProperty && <span className="text-[10px] text-gray-400 font-mono">.{q.sourceProperty}</span>}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
              {/* 요약 & 다음 */}
              <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span>{dynamicQuestions.filter(q => q.isSelected).length} / {dynamicQuestions.length} 선택</span>
                  <span className="text-blue-600">객체: {dynamicQuestions.filter(q => q.category === 'object' && q.isSelected).length}</span>
                  <span className="text-orange-600">속성: {dynamicQuestions.filter(q => q.category === 'attribute' && q.isSelected).length}</span>
                  <span className="text-green-600">관계: {dynamicQuestions.filter(q => q.category === 'relationship' && q.isSelected).length}</span>
                </div>
                <button onClick={goNext} className="px-5 py-2 bg-[#00338D] text-white text-sm font-medium rounded-lg hover:bg-[#005EB8] transition flex items-center gap-1">
                  다음 단계
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
              </div>
            </div>
          )}

          {/* 생성 중 로딩 */}
          {isGenerating && (
            <div className="flex items-center justify-center py-6 gap-3">
              <div className="w-6 h-6 border-3 border-blue-200 border-t-[#00338D] rounded-full animate-spin" />
              <span className="text-sm text-gray-500">Databricks Delta Table 온톨로지 생성 중...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

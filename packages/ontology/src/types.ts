/**
 * K-Palantir ACW 온톨로지 스키마 (OLAS)
 * 금융 콜센터 After Call Work 자동화를 위한 온톨로지 타입 정의
 *
 * Object Types: 9개 | Link Types: 10개 | Property Types: 45개+
 * Write-back Governance: Level 1~3
 */

// ═══════════════════════════════════════════════════════════════
// 1. Object Types — 온톨로지 객체 타입
// ═══════════════════════════════════════════════════════════════

/** 통화 건 */
export interface Call {
  id: string;                     // CALL-20260326-143022-001
  customer_id: string;
  agent_id: string;               // 상담원 ID
  channel: CallChannel;
  queue: string;                  // 대기 큐 (예: 카드분실, 대출상담)
  start_time: string;             // ISO 8601
  end_time: string;
  duration_seconds: number;
  acw_start_time: string;         // ACW 시작 시점
  acw_end_time: string;           // ACW 종료 시점 (AI 처리 시 즉시)
  acw_duration_seconds: number;   // ACW 소요시간
  acw_method: AcwMethod;
  recording_url: string;
  transcript_id: string;
  status: CallStatus;
  created_at: string;
}

export type CallChannel = 'INBOUND' | 'OUTBOUND' | 'TRANSFER';
export type AcwMethod = 'MANUAL' | 'AI_ASSISTED' | 'AI_AUTO';
export type CallStatus = 'IN_PROGRESS' | 'COMPLETED' | 'ACW' | 'CLOSED';

/** 전사 텍스트 (STT 결과) */
export interface Transcript {
  id: string;
  call_id: string;
  full_text: string;              // 전체 전사 텍스트
  segments: TranscriptSegment[];  // 발화 단위 세그먼트
  stt_engine: string;             // KT_ACEN_STT | WHISPER
  stt_confidence: number;         // 0.0 ~ 1.0
  language: string;               // ko-KR
  created_at: string;
}

export interface TranscriptSegment {
  index: number;
  speaker: SpeakerType;
  text: string;
  start_ms: number;
  end_ms: number;
  confidence: number;
}

export type SpeakerType = 'AGENT' | 'CUSTOMER';

/** AI 생성 요약 — Write-back 대상 */
export interface CallSummary {
  id: string;
  call_id: string;
  summary_text: string;            // 3~5문장 요약
  intent_primary: string;          // 주요 의도 (금융 50개 카테고리)
  intent_secondary: string[];      // 부수 의도
  key_entities: KeyEntities;       // 추출된 핵심 정보
  action_items: string[];          // 후속 조치 사항
  resolution_status: ResolutionStatus;
  disposition_code: string;        // CRM 처리코드 (자동 매핑)
  ai_confidence: number;           // 0.0 ~ 1.0
  generated_at: string;
  write_back_status: WriteBackStatus;
  write_back_timestamp?: string;
}

export interface KeyEntities {
  account_number?: string;         // 마스킹됨: ****-****-1234
  product_name?: string;
  amount?: number;
  date?: string;
  branch?: string;
  card_number?: string;            // 마스킹됨
  loan_type?: string;
  insurance_type?: string;
}

export type ResolutionStatus = 'RESOLVED' | 'PENDING' | 'ESCALATED' | 'CALLBACK_REQUIRED';
export type WriteBackStatus = 'PENDING' | 'WRITTEN' | 'FAILED' | 'SKIPPED';

/** 감성 분석 */
export interface Sentiment {
  id: string;
  call_id: string;
  overall_sentiment: SentimentType;
  customer_sentiment_score: number;  // -1.0 ~ +1.0
  agent_sentiment_score: number;
  sentiment_trajectory: SentimentTrajectory;
  emotion_peaks: EmotionPeak[];      // 감정 급변 구간
  verbal_abuse_detected: boolean;    // 감정노동자보호법 관련
  abuse_segments: number[];          // 욕설/폭언 세그먼트 인덱스
  created_at: string;
}

export type SentimentType = 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' | 'ESCALATED';
export type SentimentTrajectory = 'IMPROVING' | 'STABLE' | 'DETERIORATING' | 'VOLATILE';

export interface EmotionPeak {
  segment_index: number;
  timestamp_ms: number;
  emotion: EmotionType;
  intensity: number;               // 0.0 ~ 1.0
  speaker: SpeakerType;
}

export type EmotionType = 'ANGER' | 'FRUSTRATION' | 'SADNESS' | 'SATISFACTION' | 'ANXIETY' | 'RELIEF';

/** 컴플라이언스 플래그 */
export interface ComplianceFlag {
  id: string;
  call_id: string;
  type: ComplianceFlagType;
  severity: Severity;
  evidence_segments: number[];       // 근거 세그먼트 인덱스
  evidence_text: string[];           // 근거 텍스트 발췌
  description: string;
  regulation_reference: string;      // 관련 법규 (예: 산안법 41조)
  status: ComplianceFlagStatus;
  reviewer_id?: string;
  review_note?: string;
  ai_confidence: number;
  created_at: string;
  reviewed_at?: string;
}

export type ComplianceFlagType =
  | 'INCOMPLETE_SALE'       // 불완전판매
  | 'VERBAL_ABUSE'          // 고객 욕설/폭언
  | 'PRIVACY_VIOLATION'     // 개인정보 위반
  | 'MISREPRESENTATION'     // 상품 허위설명
  | 'EMOTIONAL_LABOR'       // 감정노동 과부하
  | 'UNAUTHORIZED_PROMISE'  // 무단 약속
  | 'REGULATORY_BREACH';    // 규제 위반

export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type ComplianceFlagStatus = 'DETECTED' | 'UNDER_REVIEW' | 'CONFIRMED' | 'DISMISSED';

/** 상담원 — 기존 HR 시스템 연동 */
export interface Agent {
  id: string;
  name_masked: string;              // 홍*동
  team: string;
  skill_group: string[];            // 카드, 대출, 보험 등
  employment_type: EmploymentType;   // 노란봉투법 관련 핵심
  outsource_company?: string;
  tenure_months: number;
  avg_acw_seconds: number;           // 평균 ACW 시간
  avg_handle_time: number;           // 평균 처리 시간
  csat_score: number;                // 고객만족도
  emotional_labor_score?: number;    // 감정노동 지수 (최근 30일)
  created_at: string;
}

export type EmploymentType = 'DIRECT' | 'OUTSOURCED';

/** 상담 품질 평가 */
export interface QAScore {
  id: string;
  call_id: string;
  agent_id: string;
  total_score: number;               // 0~100
  categories: QACategories;
  coaching_points: CoachingPoint[];  // AI 생성 코칭 포인트
  strengths: string[];               // 잘한 점
  improvements: string[];            // 개선 필요 사항
  generated_at: string;
}

export interface QACategories {
  greeting: number;                  // 인사 (0~20)
  problem_identification: number;    // 문제 파악 (0~20)
  solution_delivery: number;         // 해결 제시 (0~20)
  compliance: number;                // 규제 준수 (0~20)
  closing: number;                   // 마무리 (0~10)
  empathy: number;                   // 공감 표현 (0~10)
}

export interface CoachingPoint {
  category: keyof QACategories;
  segment_index: number;
  suggestion: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

/** 고객 — 기존 금융 온톨로지 연결 */
export interface Customer {
  id: string;
  name_masked: string;               // 김*수
  segment: CustomerSegment;
  products: string[];                // 보유 상품 목록
  risk_grade?: string;
  total_calls_30d: number;           // 최근 30일 통화 수
  last_call_date?: string;
  created_at: string;
}

export type CustomerSegment = 'VIP' | 'PREMIUM' | 'GENERAL' | 'NEW' | 'DORMANT';

/** 금융 상품 */
export interface Product {
  id: string;
  name: string;
  category: ProductCategory;
  sub_category: string;
  status: 'ACTIVE' | 'DISCONTINUED' | 'RESTRICTED';
}

export type ProductCategory = 'CARD' | 'LOAN' | 'DEPOSIT' | 'INSURANCE' | 'FUND' | 'PENSION' | 'FOREX';

// ═══════════════════════════════════════════════════════════════
// 2. Link Types — 온톨로지 관계 타입
// ═══════════════════════════════════════════════════════════════

export interface LinkType {
  id: string;
  name: string;
  fromType: string;
  toType: string;
  cardinality: 'ONE_TO_ONE' | 'ONE_TO_MANY' | 'MANY_TO_MANY';
  description: string;
}

export const LINK_TYPES: LinkType[] = [
  { id: 'LT-001', name: 'HAS_TRANSCRIPT',    fromType: 'Call', toType: 'Transcript',     cardinality: 'ONE_TO_ONE',  description: '통화 → 전사 텍스트' },
  { id: 'LT-002', name: 'HAS_SUMMARY',       fromType: 'Call', toType: 'CallSummary',    cardinality: 'ONE_TO_ONE',  description: '통화 → AI 요약 (Write-back)' },
  { id: 'LT-003', name: 'HAS_SENTIMENT',     fromType: 'Call', toType: 'Sentiment',      cardinality: 'ONE_TO_ONE',  description: '통화 → 감성 분석' },
  { id: 'LT-004', name: 'HAS_FLAG',          fromType: 'Call', toType: 'ComplianceFlag', cardinality: 'ONE_TO_MANY', description: '통화 → 컴플라이언스 플래그' },
  { id: 'LT-005', name: 'HAS_QA',            fromType: 'Call', toType: 'QAScore',        cardinality: 'ONE_TO_ONE',  description: '통화 → QA 평가' },
  { id: 'LT-006', name: 'HANDLED_BY',        fromType: 'Call', toType: 'Agent',          cardinality: 'ONE_TO_ONE',  description: '통화 → 담당 상담원' },
  { id: 'LT-007', name: 'ABOUT_CUSTOMER',    fromType: 'Call', toType: 'Customer',       cardinality: 'ONE_TO_ONE',  description: '통화 → 고객 (기존 금융 온톨로지)' },
  { id: 'LT-008', name: 'RELATED_PRODUCT',   fromType: 'Call', toType: 'Product',        cardinality: 'ONE_TO_MANY', description: '통화 → 관련 금융상품' },
  { id: 'LT-009', name: 'EMPLOYED_BY',       fromType: 'Agent', toType: 'OutsourceCompany', cardinality: 'ONE_TO_ONE', description: '상담원 → 외주업체 (노란봉투법)' },
  { id: 'LT-010', name: 'TRIGGERS',          fromType: 'ComplianceFlag', toType: 'ComplianceCase', cardinality: 'ONE_TO_ONE', description: '플래그 → 컴플라이언스 케이스 (기존 온톨로지)' },
];

// ═══════════════════════════════════════════════════════════════
// 3. Property Types — 온톨로지 속성 타입 정의
// ═══════════════════════════════════════════════════════════════

export interface PropertyType {
  id: string;
  name: string;
  dataType: 'string' | 'number' | 'boolean' | 'date' | 'json' | 'array';
  description: string;
  validation?: string;
  usedBy: string[];
  piiLevel: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';  // PII 등급
}

export const PROPERTY_TYPES: PropertyType[] = [
  // Call 속성
  { id: 'PT-001', name: 'duration_seconds',    dataType: 'number',  description: '통화 시간(초)',           usedBy: ['Call'], piiLevel: 'NONE' },
  { id: 'PT-002', name: 'acw_duration_seconds', dataType: 'number', description: 'ACW 소요시간(초)',        usedBy: ['Call'], piiLevel: 'NONE' },
  { id: 'PT-003', name: 'acw_method',          dataType: 'string',  description: 'ACW 처리 방식',           usedBy: ['Call'], piiLevel: 'NONE' },
  { id: 'PT-004', name: 'channel',             dataType: 'string',  description: '통화 채널',               usedBy: ['Call'], piiLevel: 'NONE' },
  { id: 'PT-005', name: 'queue',               dataType: 'string',  description: '상담 큐',                 usedBy: ['Call'], piiLevel: 'NONE' },

  // Transcript 속성
  { id: 'PT-010', name: 'full_text',           dataType: 'string',  description: '전체 전사 텍스트',        usedBy: ['Transcript'], piiLevel: 'HIGH' },
  { id: 'PT-011', name: 'stt_confidence',      dataType: 'number',  description: 'STT 신뢰도',             usedBy: ['Transcript'], piiLevel: 'NONE' },
  { id: 'PT-012', name: 'segments',            dataType: 'json',    description: '발화 세그먼트 배열',      usedBy: ['Transcript'], piiLevel: 'HIGH' },

  // CallSummary 속성
  { id: 'PT-020', name: 'summary_text',        dataType: 'string',  description: 'AI 생성 요약',            usedBy: ['CallSummary'], piiLevel: 'MEDIUM' },
  { id: 'PT-021', name: 'intent_primary',      dataType: 'string',  description: '주요 상담 의도',          usedBy: ['CallSummary'], piiLevel: 'NONE' },
  { id: 'PT-022', name: 'disposition_code',    dataType: 'string',  description: 'CRM 처리코드',            usedBy: ['CallSummary'], piiLevel: 'NONE' },
  { id: 'PT-023', name: 'key_entities',        dataType: 'json',    description: '추출된 핵심 정보',        usedBy: ['CallSummary'], piiLevel: 'HIGH' },
  { id: 'PT-024', name: 'write_back_status',   dataType: 'string',  description: 'Write-back 상태',        usedBy: ['CallSummary'], piiLevel: 'NONE' },

  // Sentiment 속성
  { id: 'PT-030', name: 'overall_sentiment',   dataType: 'string',  description: '전체 감성',               usedBy: ['Sentiment'], piiLevel: 'NONE' },
  { id: 'PT-031', name: 'customer_sentiment_score', dataType: 'number', description: '고객 감성 점수 (-1~+1)', usedBy: ['Sentiment'], piiLevel: 'NONE' },
  { id: 'PT-032', name: 'verbal_abuse_detected', dataType: 'boolean', description: '욕설/폭언 탐지 여부',   usedBy: ['Sentiment'], piiLevel: 'NONE' },
  { id: 'PT-033', name: 'emotion_peaks',       dataType: 'json',    description: '감정 급변 구간',          usedBy: ['Sentiment'], piiLevel: 'LOW' },

  // ComplianceFlag 속성
  { id: 'PT-040', name: 'flag_type',           dataType: 'string',  description: '컴플라이언스 위반 유형',   usedBy: ['ComplianceFlag'], piiLevel: 'NONE' },
  { id: 'PT-041', name: 'severity',            dataType: 'string',  description: '심각도',                  usedBy: ['ComplianceFlag'], piiLevel: 'NONE' },
  { id: 'PT-042', name: 'evidence_segments',   dataType: 'json',    description: '근거 세그먼트',           usedBy: ['ComplianceFlag'], piiLevel: 'LOW' },
  { id: 'PT-043', name: 'regulation_reference', dataType: 'string', description: '관련 법규 참조',          usedBy: ['ComplianceFlag'], piiLevel: 'NONE' },

  // Agent 속성
  { id: 'PT-050', name: 'employment_type',     dataType: 'string',  description: '고용 형태 (직접/간접)',   usedBy: ['Agent'], piiLevel: 'MEDIUM' },
  { id: 'PT-051', name: 'avg_acw_seconds',     dataType: 'number',  description: '평균 ACW 시간',           usedBy: ['Agent'], piiLevel: 'NONE' },
  { id: 'PT-052', name: 'csat_score',          dataType: 'number',  description: '고객만족도',              usedBy: ['Agent'], piiLevel: 'NONE' },
  { id: 'PT-053', name: 'emotional_labor_score', dataType: 'number', description: '감정노동 지수',          usedBy: ['Agent'], piiLevel: 'MEDIUM' },

  // QAScore 속성
  { id: 'PT-060', name: 'total_score',         dataType: 'number',  description: 'QA 총점 (0~100)',        usedBy: ['QAScore'], piiLevel: 'NONE' },
  { id: 'PT-061', name: 'coaching_points',     dataType: 'json',    description: 'AI 코칭 포인트',          usedBy: ['QAScore'], piiLevel: 'NONE' },

  // Customer 속성
  { id: 'PT-070', name: 'customer_segment',    dataType: 'string',  description: '고객 세그먼트',           usedBy: ['Customer'], piiLevel: 'MEDIUM' },
  { id: 'PT-071', name: 'total_calls_30d',     dataType: 'number',  description: '최근 30일 통화 수',       usedBy: ['Customer'], piiLevel: 'LOW' },
];

// ═══════════════════════════════════════════════════════════════
// 4. Action Types — Write-back 거버넌스
// ═══════════════════════════════════════════════════════════════

export interface ActionType {
  id: string;
  name: string;
  description: string;
  governance_level: GovernanceLevel;
  write_back_targets: WriteBackTarget[];
  requires_approval: boolean;
  auto_execute: boolean;
  audit_required: boolean;
}

export type GovernanceLevel = 1 | 2 | 3;

export interface WriteBackTarget {
  system: string;
  action: string;
  mcp_tool: string;
}

export const ACTION_TYPES: ActionType[] = [
  {
    id: 'ACT-ACW-001',
    name: 'AutoSummarizeAndWriteBack',
    description: '통화 종료 즉시 AI가 요약 생성 → CRM에 자동 기록',
    governance_level: 2,
    requires_approval: false,
    auto_execute: true,
    audit_required: true,
    write_back_targets: [
      { system: 'CRM', action: 'UPDATE_CALL_RECORD', mcp_tool: 'crm_update_call' },
      { system: 'CALL_HISTORY_DB', action: 'INSERT_SUMMARY', mcp_tool: 'calldb_insert_summary' },
    ],
  },
  {
    id: 'ACT-ACW-002',
    name: 'DetectIncompleteSale',
    description: '불완전판매 의심 통화 탐지 → 컴플라이언스팀 알림',
    governance_level: 1,
    requires_approval: true,
    auto_execute: false,
    audit_required: true,
    write_back_targets: [
      { system: 'COMPLIANCE_SYSTEM', action: 'CREATE_REVIEW_CASE', mcp_tool: 'compliance_create_case' },
      { system: 'NOTIFICATION', action: 'ALERT_COMPLIANCE_TEAM', mcp_tool: 'notify_compliance' },
    ],
  },
  {
    id: 'ACT-ACW-003',
    name: 'ProtectEmotionalLabor',
    description: '욕설/폭언 탐지 시 상담원 보호 조치 자동 실행 (산안법 41조)',
    governance_level: 2,
    requires_approval: false,
    auto_execute: true,
    audit_required: true,
    write_back_targets: [
      { system: 'ACD', action: 'PAUSE_AGENT_QUEUE', mcp_tool: 'acd_pause_agent' },
      { system: 'HR_SYSTEM', action: 'LOG_EMOTIONAL_LABOR_EVENT', mcp_tool: 'hr_log_event' },
      { system: 'NOTIFICATION', action: 'ALERT_SUPERVISOR', mcp_tool: 'notify_supervisor' },
    ],
  },
  {
    id: 'ACT-ACW-004',
    name: 'AutoQAAndCoach',
    description: '상담 품질 자동 평가 + 코칭 포인트 생성',
    governance_level: 3,
    requires_approval: false,
    auto_execute: true,
    audit_required: false,
    write_back_targets: [
      { system: 'QA_SYSTEM', action: 'INSERT_QA_SCORE', mcp_tool: 'qa_insert_score' },
      { system: 'COACHING_SYSTEM', action: 'CREATE_COACHING_ITEM', mcp_tool: 'coaching_create' },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════
// 5. 금융 의도 분류 카테고리 (50개 표준)
// ═══════════════════════════════════════════════════════════════

export const INTENT_CATEGORIES = {
  // 카드 (10)
  CARD_LOST_REPORT: '카드분실신고',
  CARD_REISSUE: '카드재발급',
  CARD_LIMIT_CHANGE: '카드한도변경',
  CARD_PAYMENT_INQUIRY: '카드결제조회',
  CARD_INSTALLMENT: '할부전환',
  CARD_ANNUAL_FEE: '연회비문의',
  CARD_BENEFITS: '카드혜택문의',
  CARD_OVERSEAS_USE: '해외사용문의',
  CARD_DISPUTE: '카드이의제기',
  CARD_NEW_APPLICATION: '카드신규신청',

  // 대출 (8)
  LOAN_INQUIRY: '대출상담',
  LOAN_REPAYMENT: '대출상환',
  LOAN_INTEREST_RATE: '대출금리문의',
  LOAN_EXTENSION: '대출기간연장',
  LOAN_OVERDUE: '연체상담',
  LOAN_NEW_APPLICATION: '신규대출신청',
  LOAN_REFINANCE: '대환대출',
  LOAN_COLLATERAL: '담보대출문의',

  // 예금/수신 (6)
  DEPOSIT_BALANCE: '잔액조회',
  DEPOSIT_TRANSFER: '이체문의',
  DEPOSIT_NEW_ACCOUNT: '계좌개설',
  DEPOSIT_CLOSE_ACCOUNT: '계좌해지',
  DEPOSIT_INTEREST: '예금금리문의',
  DEPOSIT_CERTIFICATE: '증명서발급',

  // 보험 (6)
  INSURANCE_CLAIM: '보험금청구',
  INSURANCE_COVERAGE: '보장내용문의',
  INSURANCE_PREMIUM: '보험료문의',
  INSURANCE_CANCEL: '보험해지',
  INSURANCE_CHANGE: '보험변경',
  INSURANCE_NEW: '보험가입',

  // 펀드/투자 (4)
  FUND_INQUIRY: '펀드문의',
  FUND_REDEMPTION: '펀드환매',
  FUND_SWITCH: '펀드전환',
  FUND_NEW: '펀드가입',

  // 전자금융/디지털 (5)
  DIGITAL_APP_ISSUE: '앱장애',
  DIGITAL_OTP: 'OTP문의',
  DIGITAL_CERTIFICATE: '공인인증서',
  DIGITAL_PASSWORD_RESET: '비밀번호재설정',
  DIGITAL_SECURITY: '보안문의',

  // 일반/기타 (6)
  GENERAL_BRANCH_INFO: '영업점안내',
  GENERAL_DOCUMENT: '서류문의',
  GENERAL_COMPLAINT: '불만접수',
  GENERAL_COMPLIMENT: '칭찬접수',
  GENERAL_OTHER: '기타문의',
  GENERAL_CALLBACK: '콜백요청',

  // 외환 (3)
  FOREX_EXCHANGE: '환전문의',
  FOREX_REMITTANCE: '해외송금',
  FOREX_RATE: '환율문의',

  // 연금 (2)
  PENSION_INQUIRY: '연금문의',
  PENSION_WITHDRAWAL: '연금인출',
} as const;

export type IntentCategory = keyof typeof INTENT_CATEGORIES;

// ═══════════════════════════════════════════════════════════════
// 6. CRM 처리코드 매핑
// ═══════════════════════════════════════════════════════════════

export const DISPOSITION_CODES: Record<string, string> = {
  'DISP-001': '문의해결_즉시',
  'DISP-002': '문의해결_안내후',
  'DISP-003': '접수완료_처리중',
  'DISP-004': '콜백예약',
  'DISP-005': '타부서이관',
  'DISP-006': '영업점안내',
  'DISP-007': '불만접수',
  'DISP-008': '상품가입완료',
  'DISP-009': '해지접수',
  'DISP-010': '서류안내',
  'DISP-011': '본인확인실패',
  'DISP-012': '고객자진종료',
  'DISP-013': '시스템장애_재연락',
  'DISP-014': '컴플라이언스이관',
  'DISP-015': '에스컬레이션',
};

// ═══════════════════════════════════════════════════════════════
// 7. 감사 로그 타입
// ═══════════════════════════════════════════════════════════════

export interface AuditLog {
  audit_id: string;
  action_id: string;                // ActionType.id
  call_id: string;
  agent_id?: string;
  governance_level: GovernanceLevel;
  status: 'INITIATED' | 'COMPLETED' | 'FAILED' | 'APPROVED' | 'REJECTED';
  mcp_tool: string;
  write_back_target: string;
  parameters: Record<string, unknown>;
  result: Record<string, unknown>;
  error_message?: string;
  created_at: string;               // append-only, 7년 보관
}

// ═══════════════════════════════════════════════════════════════
// 8. 온톨로지 메타데이터 — Object Type 정의서
// ═══════════════════════════════════════════════════════════════

export interface ObjectTypeDefinition {
  id: string;
  name: string;
  description: string;
  category: 'call' | 'analysis' | 'compliance' | 'hr' | 'customer' | 'product';
  properties: PropertyType[];
  source: 'PBX' | 'STT' | 'AI_AGENT' | 'HR_SYSTEM' | 'CRM';
  delta_table: string;
  governance_level?: GovernanceLevel;
}

export const OBJECT_TYPE_DEFINITIONS: ObjectTypeDefinition[] = [
  {
    id: 'OT-001', name: 'Call', description: '인바운드/아웃바운드 통화 건',
    category: 'call', properties: PROPERTY_TYPES.filter(p => p.usedBy.includes('Call')),
    source: 'PBX', delta_table: 'ontology_data.calls',
  },
  {
    id: 'OT-002', name: 'Transcript', description: 'STT 전사 텍스트',
    category: 'call', properties: PROPERTY_TYPES.filter(p => p.usedBy.includes('Transcript')),
    source: 'STT', delta_table: 'ontology_data.transcripts',
  },
  {
    id: 'OT-003', name: 'CallSummary', description: 'AI 생성 통화 요약 (Write-back 대상)',
    category: 'analysis', properties: PROPERTY_TYPES.filter(p => p.usedBy.includes('CallSummary')),
    source: 'AI_AGENT', delta_table: 'ontology_data.call_summaries', governance_level: 2,
  },
  {
    id: 'OT-004', name: 'Sentiment', description: '감성 분석 결과',
    category: 'analysis', properties: PROPERTY_TYPES.filter(p => p.usedBy.includes('Sentiment')),
    source: 'AI_AGENT', delta_table: 'ontology_data.sentiments',
  },
  {
    id: 'OT-005', name: 'ComplianceFlag', description: '컴플라이언스 위반 탐지 플래그',
    category: 'compliance', properties: PROPERTY_TYPES.filter(p => p.usedBy.includes('ComplianceFlag')),
    source: 'AI_AGENT', delta_table: 'ontology_data.compliance_flags', governance_level: 1,
  },
  {
    id: 'OT-006', name: 'Agent', description: '상담원 정보 (고용형태 포함)',
    category: 'hr', properties: PROPERTY_TYPES.filter(p => p.usedBy.includes('Agent')),
    source: 'HR_SYSTEM', delta_table: 'ontology_data.agents',
  },
  {
    id: 'OT-007', name: 'QAScore', description: '상담 품질 자동 평가 결과',
    category: 'analysis', properties: PROPERTY_TYPES.filter(p => p.usedBy.includes('QAScore')),
    source: 'AI_AGENT', delta_table: 'ontology_data.qa_scores', governance_level: 3,
  },
  {
    id: 'OT-008', name: 'Customer', description: '고객 정보 (기존 CRM 연동)',
    category: 'customer', properties: PROPERTY_TYPES.filter(p => p.usedBy.includes('Customer')),
    source: 'CRM', delta_table: 'ontology_data.customers',
  },
  {
    id: 'OT-009', name: 'Product', description: '금융 상품 정보',
    category: 'product', properties: [],
    source: 'CRM', delta_table: 'ontology_data.products',
  },
];

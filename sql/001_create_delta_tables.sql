-- ═══════════════════════════════════════════════════════════════
-- K-Palantir ACW 자동화 — Databricks Delta Table DDL
-- 온톨로지 레이어 (OLAS) 기반 스키마
-- 생성일: 2026-03-26
-- ═══════════════════════════════════════════════════════════════

-- 스키마 생성
CREATE SCHEMA IF NOT EXISTS ontology_data COMMENT 'ACW 온톨로지 데이터 레이어';
CREATE SCHEMA IF NOT EXISTS ontology_audit COMMENT 'ACW 감사 로그 (7년 보관, append-only)';

-- ─── 1. 통화 건 (Call) ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ontology_data.calls (
  call_id           STRING        NOT NULL COMMENT '통화 고유 ID (CALL-YYYYMMDD-HHMMSS-NNN)',
  customer_id       STRING        NOT NULL COMMENT '고객 ID',
  agent_id          STRING        NOT NULL COMMENT '상담원 ID',
  channel           STRING        NOT NULL COMMENT '통화 채널: INBOUND|OUTBOUND|TRANSFER',
  queue             STRING        COMMENT '상담 큐 (카드분실, 대출상담 등)',
  start_time        TIMESTAMP     NOT NULL COMMENT '통화 시작 시각',
  end_time          TIMESTAMP     COMMENT '통화 종료 시각',
  duration_seconds  INT           COMMENT '통화 시간(초)',
  acw_start_time    TIMESTAMP     COMMENT 'ACW 시작 시점',
  acw_end_time      TIMESTAMP     COMMENT 'ACW 종료 시점',
  acw_duration_seconds INT        COMMENT 'ACW 소요시간(초)',
  acw_method        STRING        DEFAULT 'MANUAL' COMMENT 'ACW 방식: MANUAL|AI_ASSISTED|AI_AUTO',
  recording_url     STRING        COMMENT '녹음 파일 URL',
  transcript_id     STRING        COMMENT '전사 텍스트 ID',
  status            STRING        DEFAULT 'IN_PROGRESS' COMMENT '상태: IN_PROGRESS|COMPLETED|ACW|CLOSED',
  call_date         DATE          GENERATED ALWAYS AS (CAST(start_time AS DATE)) COMMENT '통화 날짜 (파티션 키)',
  created_at        TIMESTAMP     DEFAULT current_timestamp()
)
USING DELTA
PARTITIONED BY (call_date)
TBLPROPERTIES (
  'delta.enableChangeDataFeed' = 'true',
  'delta.autoOptimize.optimizeWrite' = 'true',
  'delta.autoOptimize.autoCompact' = 'true'
)
COMMENT '콜센터 통화 건 — 온톨로지 Object Type: Call';

-- ─── 2. 전사 텍스트 (Transcript) ─────────────────────────────────
CREATE TABLE IF NOT EXISTS ontology_data.transcripts (
  transcript_id     STRING        NOT NULL COMMENT '전사 텍스트 고유 ID',
  call_id           STRING        NOT NULL COMMENT '통화 ID (FK → calls)',
  full_text         STRING        COMMENT '전체 전사 텍스트 (PII 포함 주의)',
  segments          STRING        COMMENT 'JSON 배열: [{speaker, text, start_ms, end_ms, confidence}]',
  segment_count     INT           COMMENT '세그먼트 수',
  stt_engine        STRING        DEFAULT 'KT_ACEN_STT' COMMENT 'STT 엔진명',
  stt_confidence    DOUBLE        COMMENT 'STT 전체 신뢰도 (0.0~1.0)',
  language          STRING        DEFAULT 'ko-KR' COMMENT '언어',
  word_count        INT           COMMENT '총 단어 수',
  created_at        TIMESTAMP     DEFAULT current_timestamp(),
  transcript_date   DATE          GENERATED ALWAYS AS (CAST(created_at AS DATE)) COMMENT '생성 날짜 (파티션 키)'
)
USING DELTA
PARTITIONED BY (transcript_date)
TBLPROPERTIES (
  'delta.enableChangeDataFeed' = 'true',
  'delta.autoOptimize.optimizeWrite' = 'true'
)
COMMENT '통화 전사 텍스트 (STT 결과) — 온톨로지 Object Type: Transcript';

-- ─── 3. AI 생성 요약 (CallSummary) — Write-back 추적 ──────────────
CREATE TABLE IF NOT EXISTS ontology_data.call_summaries (
  summary_id        STRING        NOT NULL COMMENT '요약 고유 ID',
  call_id           STRING        NOT NULL COMMENT '통화 ID (FK → calls)',
  summary_text      STRING        NOT NULL COMMENT 'AI 생성 3~5문장 요약',
  intent_primary    STRING        NOT NULL COMMENT '주요 의도 (50개 카테고리)',
  intent_secondary  STRING        COMMENT 'JSON 배열: 부수 의도',
  key_entities      STRING        COMMENT 'JSON: 추출된 핵심 정보 (계좌, 상품, 금액 등)',
  action_items      STRING        COMMENT 'JSON 배열: 후속 조치 사항',
  resolution_status STRING        COMMENT 'RESOLVED|PENDING|ESCALATED|CALLBACK_REQUIRED',
  disposition_code  STRING        COMMENT 'CRM 처리코드 (자동 매핑)',
  ai_confidence     DOUBLE        COMMENT 'AI 신뢰도 (0.0~1.0)',
  ai_model          STRING        DEFAULT 'claude-sonnet' COMMENT '사용 AI 모델',
  write_back_status STRING        DEFAULT 'PENDING' COMMENT 'Write-back 상태: PENDING|WRITTEN|FAILED|SKIPPED',
  write_back_timestamp TIMESTAMP  COMMENT 'Write-back 완료 시각',
  write_back_target STRING        COMMENT 'Write-back 대상 시스템',
  created_at        TIMESTAMP     DEFAULT current_timestamp()
)
USING DELTA
TBLPROPERTIES (
  'delta.enableChangeDataFeed' = 'true',
  'delta.autoOptimize.optimizeWrite' = 'true'
)
COMMENT 'AI 생성 통화 요약 (Write-back Level 2) — 온톨로지 Object Type: CallSummary';

-- ─── 4. 감성 분석 (Sentiment) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS ontology_data.sentiments (
  sentiment_id       STRING       NOT NULL COMMENT '감성 분석 고유 ID',
  call_id            STRING       NOT NULL COMMENT '통화 ID (FK → calls)',
  overall_sentiment  STRING       NOT NULL COMMENT 'POSITIVE|NEUTRAL|NEGATIVE|ESCALATED',
  customer_score     DOUBLE       COMMENT '고객 감성 점수 (-1.0 ~ +1.0)',
  agent_score        DOUBLE       COMMENT '상담원 감성 점수 (-1.0 ~ +1.0)',
  sentiment_trajectory STRING     COMMENT 'IMPROVING|STABLE|DETERIORATING|VOLATILE',
  emotion_peaks      STRING       COMMENT 'JSON 배열: 감정 급변 구간',
  verbal_abuse_detected BOOLEAN   DEFAULT false COMMENT '욕설/폭언 탐지 여부 (산안법 41조)',
  abuse_segments     STRING       COMMENT 'JSON 배열: 욕설/폭언 세그먼트 인덱스',
  abuse_severity     STRING       COMMENT '욕설 심각도: MILD|MODERATE|SEVERE',
  ai_confidence      DOUBLE       COMMENT 'AI 분석 신뢰도',
  created_at         TIMESTAMP    DEFAULT current_timestamp()
)
USING DELTA
TBLPROPERTIES (
  'delta.enableChangeDataFeed' = 'true'
)
COMMENT '감성 분석 결과 — 온톨로지 Object Type: Sentiment';

-- ─── 5. 컴플라이언스 플래그 (ComplianceFlag) ────────────────────────
CREATE TABLE IF NOT EXISTS ontology_data.compliance_flags (
  flag_id           STRING        NOT NULL COMMENT '플래그 고유 ID',
  call_id           STRING        NOT NULL COMMENT '통화 ID (FK → calls)',
  flag_type         STRING        NOT NULL COMMENT '위반 유형: INCOMPLETE_SALE|VERBAL_ABUSE|PRIVACY_VIOLATION|...',
  severity          STRING        NOT NULL COMMENT '심각도: CRITICAL|HIGH|MEDIUM|LOW',
  evidence_segments STRING        COMMENT 'JSON 배열: 근거 세그먼트 인덱스',
  evidence_text     STRING        COMMENT 'JSON 배열: 근거 텍스트 발췌',
  description       STRING        COMMENT '상세 설명',
  regulation_ref    STRING        COMMENT '관련 법규 참조 (산안법41조, 금소법 등)',
  status            STRING        DEFAULT 'DETECTED' COMMENT 'DETECTED|UNDER_REVIEW|CONFIRMED|DISMISSED',
  reviewer_id       STRING        COMMENT '리뷰어 ID',
  review_note       STRING        COMMENT '리뷰 메모',
  ai_confidence     DOUBLE        COMMENT 'AI 탐지 신뢰도',
  created_at        TIMESTAMP     DEFAULT current_timestamp(),
  reviewed_at       TIMESTAMP     COMMENT '리뷰 완료 시각'
)
USING DELTA
TBLPROPERTIES (
  'delta.enableChangeDataFeed' = 'true'
)
COMMENT '컴플라이언스 위반 탐지 플래그 (Level 1: 승인 필수) — 온톨로지 Object Type: ComplianceFlag';

-- ─── 6. 상담원 (Agent) ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ontology_data.agents (
  agent_id          STRING        NOT NULL COMMENT '상담원 ID',
  name_masked       STRING        COMMENT '마스킹된 이름 (홍*동)',
  team              STRING        COMMENT '소속 팀',
  skill_group       STRING        COMMENT 'JSON 배열: 스킬 그룹 (카드, 대출 등)',
  employment_type   STRING        NOT NULL COMMENT '고용 형태: DIRECT|OUTSOURCED (노란봉투법 관련)',
  outsource_company STRING        COMMENT '외주업체명 (간접고용 시)',
  tenure_months     INT           COMMENT '근속 개월 수',
  avg_acw_seconds   DOUBLE        COMMENT '평균 ACW 시간(초)',
  avg_handle_time   DOUBLE        COMMENT '평균 처리 시간(초)',
  csat_score        DOUBLE        COMMENT '고객만족도 (0~5)',
  emotional_labor_score DOUBLE    COMMENT '감정노동 지수 (최근 30일)',
  status            STRING        DEFAULT 'ACTIVE' COMMENT 'ACTIVE|INACTIVE|ON_LEAVE',
  created_at        TIMESTAMP     DEFAULT current_timestamp(),
  updated_at        TIMESTAMP     DEFAULT current_timestamp()
)
USING DELTA
TBLPROPERTIES (
  'delta.enableChangeDataFeed' = 'true'
)
COMMENT '상담원 정보 (고용형태 구분: 노란봉투법 대응) — 온톨로지 Object Type: Agent';

-- ─── 7. QA 평가 (QAScore) ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS ontology_data.qa_scores (
  qa_id             STRING        NOT NULL COMMENT 'QA 평가 고유 ID',
  call_id           STRING        NOT NULL COMMENT '통화 ID (FK → calls)',
  agent_id          STRING        NOT NULL COMMENT '상담원 ID (FK → agents)',
  total_score       DOUBLE        NOT NULL COMMENT 'QA 총점 (0~100)',
  score_greeting    DOUBLE        COMMENT '인사 점수 (0~20)',
  score_problem_id  DOUBLE        COMMENT '문제 파악 점수 (0~20)',
  score_solution    DOUBLE        COMMENT '해결 제시 점수 (0~20)',
  score_compliance  DOUBLE        COMMENT '규제 준수 점수 (0~20)',
  score_closing     DOUBLE        COMMENT '마무리 점수 (0~10)',
  score_empathy     DOUBLE        COMMENT '공감 표현 점수 (0~10)',
  coaching_points   STRING        COMMENT 'JSON 배열: AI 코칭 포인트',
  strengths         STRING        COMMENT 'JSON 배열: 잘한 점',
  improvements      STRING        COMMENT 'JSON 배열: 개선 필요 사항',
  ai_model          STRING        DEFAULT 'claude-sonnet' COMMENT '평가 AI 모델',
  created_at        TIMESTAMP     DEFAULT current_timestamp()
)
USING DELTA
TBLPROPERTIES (
  'delta.enableChangeDataFeed' = 'true'
)
COMMENT '상담 품질 자동 평가 (Level 3: 자율) — 온톨로지 Object Type: QAScore';

-- ─── 8. 고객 (Customer) — 기존 CRM 연동 ─────────────────────────
CREATE TABLE IF NOT EXISTS ontology_data.customers (
  customer_id       STRING        NOT NULL COMMENT '고객 ID',
  name_masked       STRING        COMMENT '마스킹된 이름',
  segment           STRING        COMMENT '고객 세그먼트: VIP|PREMIUM|GENERAL|NEW|DORMANT',
  products          STRING        COMMENT 'JSON 배열: 보유 상품 목록',
  risk_grade        STRING        COMMENT '리스크 등급',
  total_calls_30d   INT           DEFAULT 0 COMMENT '최근 30일 통화 수',
  last_call_date    DATE          COMMENT '최근 통화 날짜',
  created_at        TIMESTAMP     DEFAULT current_timestamp(),
  updated_at        TIMESTAMP     DEFAULT current_timestamp()
)
USING DELTA
COMMENT '고객 정보 (기존 CRM 연동) — 온톨로지 Object Type: Customer';

-- ─── 9. 금융 상품 (Product) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS ontology_data.products (
  product_id        STRING        NOT NULL COMMENT '상품 ID',
  name              STRING        NOT NULL COMMENT '상품명',
  category          STRING        NOT NULL COMMENT '상품 카테고리: CARD|LOAN|DEPOSIT|INSURANCE|FUND|PENSION|FOREX',
  sub_category      STRING        COMMENT '상세 카테고리',
  status            STRING        DEFAULT 'ACTIVE' COMMENT 'ACTIVE|DISCONTINUED|RESTRICTED',
  created_at        TIMESTAMP     DEFAULT current_timestamp()
)
USING DELTA
COMMENT '금융 상품 정보 — 온톨로지 Object Type: Product';

-- ═══════════════════════════════════════════════════════════════
-- 감사 스키마 (Audit) — 7년 보관, append-only
-- ═══════════════════════════════════════════════════════════════

-- ─── 10. ACW 액션 감사 로그 ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS ontology_audit.acw_action_log (
  audit_id          STRING        NOT NULL COMMENT '감사 로그 고유 ID',
  action_id         STRING        NOT NULL COMMENT '액션 타입 ID (ACT-ACW-001~004)',
  call_id           STRING        NOT NULL COMMENT '통화 ID',
  agent_id          STRING        COMMENT '상담원 ID',
  governance_level  INT           NOT NULL COMMENT '거버넌스 레벨 (1=승인필수, 2=자동+감사, 3=자율)',
  status            STRING        NOT NULL COMMENT 'INITIATED|COMPLETED|FAILED|APPROVED|REJECTED',
  mcp_tool          STRING        NOT NULL COMMENT '실행된 MCP 도구명',
  write_back_target STRING        NOT NULL COMMENT 'Write-back 대상 시스템',
  parameters        STRING        COMMENT 'JSON: 실행 파라미터',
  result            STRING        COMMENT 'JSON: 실행 결과',
  error_message     STRING        COMMENT '오류 메시지 (실패 시)',
  initiated_by      STRING        DEFAULT 'AI_AGENT' COMMENT '실행 주체: AI_AGENT|HUMAN|SYSTEM',
  approved_by       STRING        COMMENT '승인자 (Level 1 시)',
  created_at        TIMESTAMP     DEFAULT current_timestamp() COMMENT '로그 생성 시각'
)
USING DELTA
TBLPROPERTIES (
  'delta.appendOnly' = 'true',
  'delta.logRetentionDuration' = 'interval 2555 days',
  'delta.deletedFileRetentionDuration' = 'interval 2555 days'
)
COMMENT 'ACW Write-back 감사 로그 — 7년 보관, append-only (금융감독원 규정)';

-- ─── 11. Write-back 대기열 ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS ontology_audit.write_back_queue (
  queue_id          STRING        NOT NULL COMMENT '대기열 ID',
  action_id         STRING        NOT NULL COMMENT '액션 타입 ID',
  call_id           STRING        NOT NULL COMMENT '통화 ID',
  governance_level  INT           NOT NULL COMMENT '거버넌스 레벨',
  payload           STRING        NOT NULL COMMENT 'JSON: Write-back 페이로드',
  status            STRING        DEFAULT 'QUEUED' COMMENT 'QUEUED|PROCESSING|COMPLETED|FAILED|AWAITING_APPROVAL',
  retry_count       INT           DEFAULT 0 COMMENT '재시도 횟수',
  max_retries       INT           DEFAULT 3 COMMENT '최대 재시도',
  next_retry_at     TIMESTAMP     COMMENT '다음 재시도 시각',
  created_at        TIMESTAMP     DEFAULT current_timestamp(),
  updated_at        TIMESTAMP     DEFAULT current_timestamp()
)
USING DELTA
TBLPROPERTIES (
  'delta.enableChangeDataFeed' = 'true'
)
COMMENT 'Write-back 대기열 — 거버넌스 레벨별 처리 큐';

-- ═══════════════════════════════════════════════════════════════
-- 뷰 — 대시보드/분석용
-- ═══════════════════════════════════════════════════════════════

-- ACW 절감 현황 대시보드 뷰
CREATE OR REPLACE VIEW ontology_data.v_acw_savings AS
SELECT
  DATE(c.start_time) AS call_date,
  c.acw_method,
  COUNT(*) AS call_count,
  AVG(c.acw_duration_seconds) AS avg_acw_seconds,
  SUM(CASE WHEN c.acw_method = 'AI_AUTO' THEN 120 - c.acw_duration_seconds ELSE 0 END) AS total_saved_seconds,
  ROUND(SUM(CASE WHEN c.acw_method = 'AI_AUTO' THEN 120 - c.acw_duration_seconds ELSE 0 END) / 3600.0, 2) AS saved_hours
FROM ontology_data.calls c
WHERE c.status = 'CLOSED'
GROUP BY DATE(c.start_time), c.acw_method;

-- 감성 분석 히트맵 뷰
CREATE OR REPLACE VIEW ontology_data.v_sentiment_heatmap AS
SELECT
  DATE(c.start_time) AS call_date,
  HOUR(c.start_time) AS call_hour,
  s.overall_sentiment,
  COUNT(*) AS count,
  AVG(s.customer_score) AS avg_customer_score,
  SUM(CASE WHEN s.verbal_abuse_detected THEN 1 ELSE 0 END) AS abuse_count
FROM ontology_data.calls c
JOIN ontology_data.sentiments s ON c.call_id = s.call_id
GROUP BY DATE(c.start_time), HOUR(c.start_time), s.overall_sentiment;

-- 컴플라이언스 현황 뷰
CREATE OR REPLACE VIEW ontology_data.v_compliance_dashboard AS
SELECT
  DATE(cf.created_at) AS flag_date,
  cf.flag_type,
  cf.severity,
  cf.status,
  COUNT(*) AS flag_count,
  AVG(cf.ai_confidence) AS avg_confidence
FROM ontology_data.compliance_flags cf
GROUP BY DATE(cf.created_at), cf.flag_type, cf.severity, cf.status;

-- 상담원 성과 뷰 (노란봉투법 대응: 고용형태별 분석)
CREATE OR REPLACE VIEW ontology_data.v_agent_performance AS
SELECT
  a.agent_id,
  a.name_masked,
  a.team,
  a.employment_type,
  a.outsource_company,
  COUNT(c.call_id) AS total_calls,
  AVG(c.duration_seconds) AS avg_duration,
  AVG(c.acw_duration_seconds) AS avg_acw,
  AVG(q.total_score) AS avg_qa_score,
  AVG(s.customer_score) AS avg_customer_sentiment,
  a.emotional_labor_score,
  SUM(CASE WHEN cf.flag_type = 'VERBAL_ABUSE' THEN 1 ELSE 0 END) AS abuse_incidents
FROM ontology_data.agents a
LEFT JOIN ontology_data.calls c ON a.agent_id = c.agent_id
LEFT JOIN ontology_data.qa_scores q ON c.call_id = q.call_id
LEFT JOIN ontology_data.sentiments s ON c.call_id = s.call_id
LEFT JOIN ontology_data.compliance_flags cf ON c.call_id = cf.call_id
GROUP BY a.agent_id, a.name_masked, a.team, a.employment_type,
         a.outsource_company, a.emotional_labor_score;

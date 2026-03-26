# K-Palantir ACW 자동화 시스템 설계서 v2.0

> **프로젝트명**: K-Palantir — 금융 콜센터 온톨로지 기반 After Call Work 자동화
> **버전**: 2.0 (2026-03-26)
> **플랫폼**: Databricks Delta Lake
> **AI 모델**: Claude Sonnet (Tool Use)
> **프론트엔드**: Next.js 15 + Tailwind CSS v4

---

## 목차

1. [시스템 개요](#1-시스템-개요)
2. [아키텍처](#2-아키텍처)
3. [온톨로지 스키마 (OLAS)](#3-온톨로지-스키마-olas)
4. [3-Agent 파이프라인](#4-3-agent-파이프라인)
5. [MCP Server & Write-back 거버넌스](#5-mcp-server--write-back-거버넌스)
6. [온톨로지 기반 개선방안 엔진](#6-온톨로지-기반-개선방안-엔진)
7. [Write-back 워크플로우 상세](#7-write-back-워크플로우-상세)
8. [온톨로지 위자드](#8-온톨로지-위자드)
9. [대시보드 & 데모](#9-대시보드--데모)
10. [데이터 모델 (Delta Tables)](#10-데이터-모델-delta-tables)
11. [법규 대응](#11-법규-대응)
12. [프로젝트 구조](#12-프로젝트-구조)
13. [배포 및 운영](#13-배포-및-운영)

---

## 1. 시스템 개요

### 1.1 목적

금융기관 콜센터에서 상담 종료 후 발생하는 **After Call Work (ACW)**를 온톨로지 기반 AI 에이전트로 자동화하여:

- **ACW 시간 92% 절감** (118.5초 → 9.3초)
- **1,000석 기준 연간 약 96억원 비용 절감**
- **불완전판매 자동 탐지** (금소법, 자본시장법)
- **감정노동자 보호** (산안법 41조 자동 발동)
- **상담 품질 100% 자동 평가 + AI 코칭**

### 1.2 핵심 차별점

| 항목 | 기존 ACW | K-Palantir ACW |
|------|----------|----------------|
| 처리 시간 | 2~5분 (수동) | 9.3초 (AI 자동) |
| 컴플라이언스 | 샘플 검사 (3~5%) | 전수 검사 (100%) |
| QA 평가 | 월 1회 수동 | 실시간 자동 + 코칭 |
| 감정노동 보호 | 사후 보고 | 실시간 자동 감지/보호 |
| Write-back | 수동 입력 | 3-Level 거버넌스 자동화 |
| **개선방안 도출** | 분기별 수동 분석 | **실시간 온톨로지 기반 자동 도출** |
| **워크플로우 가시성** | 블랙박스 | **단계별 상세 시각화** |

### 1.3 v2.0 신규 기능

| 기능 | 설명 |
|------|------|
| 온톨로지 기반 개선방안 엔진 | 결과 분석 → 4대 카테고리 개선방안 자동 도출 |
| 수정 스크립트 자동 생성 | Before/After 비교 기반 최적 대응 멘트 제시 |
| 액션 선후관계 지정 | 우선도 + 의존성 기반 실행 순서 자동 결정 |
| Write-back 워크플로우 시각화 | 6단계 상세 프로세스 + 애니메이션 재현 |
| 온톨로지 세팅 위자드 | 채팅 스타일 11단계 브랜칭 위자드 |

---

## 2. 아키텍처

### 2.1 전체 구조

```
┌─────────────────────────────────────────────────────────────────────┐
│                        금융기관 콜센터                                │
│  ┌──────────┐   ┌──────────┐   ┌───────────────────────────────┐   │
│  │ PBX/ACD  │──▶│ KT STT   │──▶│     Databricks Delta Lake     │   │
│  │ 통화비서  │   │ ACEN     │   │  ┌─────────────────────────┐  │   │
│  └──────────┘   └──────────┘   │  │  OLAS 온톨로지 스키마     │  │   │
│                                │  │  9 Objects · 10 Links     │  │   │
│                                │  │  45+ Properties           │  │   │
│                                │  └──────────┬──────────────┘  │   │
│                                │             │                  │   │
│                                │  ┌──────────▼──────────────┐  │   │
│                                │  │  3-Agent Pipeline        │  │   │
│                                │  │  ┌─────┐ ┌─────┐ ┌───┐ │  │   │
│                                │  │  │ ACW │ │Comp.│ │QA │ │  │   │
│                                │  │  │Agent│ │Agent│ │Agt│ │  │   │
│                                │  │  └──┬──┘ └──┬──┘ └─┬─┘ │  │   │
│                                │  └─────┼───────┼──────┼───┘  │   │
│                                │        │       │      │       │   │
│                                │  ┌─────▼───────▼──────▼───┐  │   │
│                                │  │  개선방안 엔진 (v2.0)    │  │   │
│                                │  │  컴플라이언스│유사실수방지 │  │   │
│                                │  │  고객만족도  │스크립트최적 │  │   │
│                                │  └──────────┬──────────────┘  │   │
│                                │             │                  │   │
│                                │  ┌──────────▼──────────────┐  │   │
│                                │  │  Write-back Engine       │  │   │
│                                │  │  ┌─────────────────────┐│  │   │
│                                │  │  │ 6-Stage Workflow     ││  │   │
│                                │  │  │ Input→Validate→Gov  ││  │   │
│                                │  │  │ →Execute→Audit→Noti ││  │   │
│                                │  │  └─────────────────────┘│  │   │
│                                │  │  MCP Server (6 Tools)   │  │   │
│                                │  │  L1:승인 L2:자동 L3:자율 │  │   │
│                                │  └──────────┬──────────────┘  │   │
│                                └─────────────┼──────────────────┘   │
│                                              │                      │
│  ┌───────────────────────────────────────────▼──────────────────┐   │
│  │                    외부 시스템 연동                            │   │
│  │  CRM  │  CALL_DB  │  COMPLIANCE  │  ACD  │  HR  │  QA      │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 기술 스택

| 계층 | 기술 | 비고 |
|------|------|------|
| 프론트엔드 | Next.js 15 + Tailwind CSS v4 | App Router, RSC |
| AI 모델 | Claude Sonnet (Tool Use) | Zod 스키마 검증 |
| 데이터 플랫폼 | Databricks Delta Lake | CDC, 7년 보관 |
| MCP Server | TypeScript MCP SDK | 6개 도구 |
| 빌드 시스템 | Turborepo (npm workspaces) | 모노레포 |
| STT | KT ACEN STT / Whisper | 금융 용어 사전 |

---

## 3. 온톨로지 스키마 (OLAS)

### 3.1 Object Types (9개)

```
┌──────────────────────────────────────────────────────────────┐
│                    OLAS Object Types                          │
├──────────────┬─────────────────┬──────────┬──────────────────┤
│ Category     │ Object          │ Source   │ Delta Table      │
├──────────────┼─────────────────┼──────────┼──────────────────┤
│ call         │ Call            │ PBX      │ ontology_data.   │
│              │                 │          │ calls            │
│ call         │ Transcript      │ STT      │ ontology_data.   │
│              │                 │          │ transcripts      │
├──────────────┼─────────────────┼──────────┼──────────────────┤
│ analysis     │ CallSummary     │ AI_AGENT │ ontology_data.   │
│              │                 │          │ call_summaries   │
│ analysis     │ Sentiment       │ AI_AGENT │ ontology_data.   │
│              │                 │          │ sentiments       │
│ analysis     │ QAScore         │ AI_AGENT │ ontology_data.   │
│              │                 │          │ qa_scores        │
├──────────────┼─────────────────┼──────────┼──────────────────┤
│ compliance   │ ComplianceFlag  │ AI_AGENT │ ontology_data.   │
│              │                 │          │ compliance_flags │
├──────────────┼─────────────────┼──────────┼──────────────────┤
│ hr           │ Agent           │ HR_SYS   │ ontology_data.   │
│              │                 │          │ agents           │
├──────────────┼─────────────────┼──────────┼──────────────────┤
│ customer     │ Customer        │ CRM      │ ontology_data.   │
│              │                 │          │ customers        │
├──────────────┼─────────────────┼──────────┼──────────────────┤
│ product      │ Product         │ CRM      │ ontology_data.   │
│              │                 │          │ products         │
└──────────────┴─────────────────┴──────────┴──────────────────┘
```

### 3.2 Link Types (10개)

| ID | Name | From → To | Cardinality | 설명 |
|----|------|-----------|-------------|------|
| LT-001 | HAS_TRANSCRIPT | Call → Transcript | 1:1 | 통화 → 전사 텍스트 |
| LT-002 | HAS_SUMMARY | Call → CallSummary | 1:1 | 통화 → AI 요약 |
| LT-003 | HAS_SENTIMENT | Call → Sentiment | 1:1 | 통화 → 감성 분석 |
| LT-004 | HAS_FLAG | Call → ComplianceFlag | 1:N | 통화 → 컴플라이언스 플래그 |
| LT-005 | HAS_QA | Call → QAScore | 1:1 | 통화 → QA 평가 |
| LT-006 | HANDLED_BY | Call → Agent | 1:1 | 통화 → 담당 상담원 |
| LT-007 | ABOUT_CUSTOMER | Call → Customer | 1:1 | 통화 → 고객 |
| LT-008 | RELATED_PRODUCT | Call → Product | 1:N | 통화 → 관련 상품 |
| LT-009 | EMPLOYED_BY | Agent → OutsourceCompany | 1:1 | 상담원 → 외주업체 |
| LT-010 | TRIGGERS | ComplianceFlag → ComplianceCase | 1:1 | 플래그 → 케이스 |

### 3.3 Property Types (45개+)

PII 등급별 관리:

| PII Level | 속성 예시 | 처리 방식 |
|-----------|----------|-----------|
| HIGH | full_text, key_entities, segments | 암호화 저장, 접근 제한 |
| MEDIUM | summary_text, employment_type, emotional_labor_score | 역할 기반 접근 |
| LOW | emotion_peaks, total_calls_30d | 일반 접근 |
| NONE | duration_seconds, acw_method, total_score | 공개 |

### 3.4 금융 의도 분류 (50개 표준)

| 카테고리 | 의도 수 | 예시 |
|----------|---------|------|
| 카드 | 10 | 분실신고, 재발급, 한도변경, 결제조회 등 |
| 대출 | 8 | 대출상담, 상환, 금리문의, 연체상담 등 |
| 예금/수신 | 6 | 잔액조회, 이체, 계좌개설/해지 등 |
| 보험 | 6 | 보험금청구, 보장내용, 해지, 가입 등 |
| 펀드/투자 | 4 | 펀드문의, 환매, 전환, 가입 |
| 전자금융 | 5 | 앱장애, OTP, 비밀번호재설정 등 |
| 일반/기타 | 6 | 영업점안내, 불만접수, 칭찬, 콜백 등 |
| 외환 | 3 | 환전, 해외송금, 환율문의 |
| 연금 | 2 | 연금문의, 연금인출 |

---

## 4. 3-Agent 파이프라인

### 4.1 파이프라인 흐름

```
통화 종료
    │
    ▼
┌─────────────────────────────────────────┐
│  Stage 1+3 (병렬 실행)                   │
│  ┌─────────────────┐  ┌───────────────┐ │
│  │   ACW Agent      │  │   QA Agent    │ │
│  │  ┌────────────┐  │  │ 6개 카테고리   │ │
│  │  │ 요약 생성   │  │  │ 자동 채점     │ │
│  │  │ 의도 분류   │  │  │ ┌──────────┐ │ │
│  │  │ 엔티티 추출 │  │  │ │인사  0~20│ │ │
│  │  │ 처리코드    │  │  │ │문제  0~20│ │ │
│  │  │ 감성 분석   │  │  │ │해결  0~20│ │ │
│  │  └────────────┘  │  │ │규제  0~20│ │ │
│  │  Zod: ACWSummary │  │ │마무리 0~10│ │ │
│  │  + Sentiment     │  │ │공감  0~10│ │ │
│  │  Output Schema   │  │ └──────────┘ │ │
│  └────────┬────────┘  │ 코칭 포인트    │ │
│           │            └───────┬───────┘ │
└───────────┼────────────────────┼─────────┘
            │                    │
            ▼                    │
┌───────────────────────┐        │
│  Stage 2 (순차 실행)   │        │
│  Compliance Agent      │        │
│  ┌───────────────────┐ │        │
│  │ 불완전판매 탐지    │ │        │
│  │ 감정노동 보호     │ │        │
│  │ 개인정보 위반     │ │        │
│  │ 허위설명 감지     │ │        │
│  │ 무단약속 탐지     │ │        │
│  └───────────────────┘ │        │
│  ※ Sentiment 참조      │        │
└───────────┬───────────┘        │
            │                    │
            ▼                    ▼
┌─────────────────────────────────────────┐
│  Stage 4: Write-back                     │
│  ┌─────────────────────────────────────┐ │
│  │ 개선방안 엔진 (v2.0 신규)            │ │
│  │ 컴플라이언스 방지 │ 유사 실수 방지    │ │
│  │ 고객만족도 제고   │ 스크립트 최적화   │ │
│  └──────────────┬──────────────────────┘ │
│                 ▼                         │
│  ┌─────────────────────────────────────┐ │
│  │ 6-Stage Write-back Workflow          │ │
│  │ Input → Validate → Governance       │ │
│  │ → Execute → Audit → Notify          │ │
│  └─────────────────────────────────────┘ │
│  MCP Tools: 6개                          │
│  거버넌스: L1 승인 / L2 자동 / L3 자율   │
└─────────────────────────────────────────┘
```

### 4.2 각 에이전트 상세

#### ACW Agent (`acw-agent.ts`, 279 lines)

| 메서드 | 기능 | 출력 스키마 |
|--------|------|-------------|
| `summarize()` | 3~5문장 요약 + 의도 분류 + 엔티티 추출 | `ACWSummaryOutputSchema` |
| `analyzeSentiment()` | 고객/상담원 감성 분석 + 폭언 탐지 | `SentimentOutputSchema` |
| `processCall()` | 요약 + 감성 병렬 실행 | `{summary, sentiment}` |

#### Compliance Agent (`compliance-agent.ts`, 243 lines)

| 메서드 | 기능 | 출력 스키마 |
|--------|------|-------------|
| `analyze()` | AI 기반 컴플라이언스 분석 | `ComplianceOutputSchema` |
| `checkEmotionalLaborUrgent()` | 규칙 기반 즉시 감지 (AI 불필요) | `EmotionalLaborAlertSchema` |
| `isIncompleteSaleRisk()` | 키워드 기반 불완전판매 사전 스크리닝 | `boolean` |

**즉시 감지 키워드**: "씨발", "개새끼", "죽여", "고소", "개같은" 등 → AI 호출 없이 즉시 보호 조치 발동

#### QA Agent (`qa-agent.ts`, 210 lines)

| 메서드 | 기능 | 출력 스키마 |
|--------|------|-------------|
| `evaluate()` | 6개 카테고리 자동 채점 + 코칭 | `QAOutputSchema` |
| `evaluateBatch()` | 배치 평가 + 트렌드 분석 | `QAOutputSchema[]` |

---

## 5. MCP Server & Write-back 거버넌스

### 5.1 MCP 도구 목록 (6개)

| Tool | 대상 시스템 | 거버넌스 | 설명 |
|------|------------|----------|------|
| `crm_update_call` | CRM | L2 | 통화 기록 업데이트 |
| `calldb_insert_summary` | CALL_HISTORY_DB | L2 | AI 요약 저장 |
| `compliance_create_case` | COMPLIANCE_SYS | L1 | 컴플라이언스 케이스 생성 |
| `acd_pause_agent` | ACD | L2 | 상담원 큐 일시정지 |
| `qa_insert_score` | QA_SYSTEM | L3 | QA 점수 저장 |
| `notify_supervisor` | NOTIFICATION | L2 | 관리자 알림 |

### 5.2 3-Level 거버넌스 모델

```
Level 1 — Human-in-the-Loop
├── 실행 전 인간 승인 필수
├── 적용: 불완전판매 케이스 생성, 고위험 Write-back
├── 승인 대기 상태로 큐잉
└── 감사 로그 필수 기록

Level 2 — Auto + Audit
├── AI 신뢰도 ≥ 0.7 시 자동 실행
├── 적용: CRM 업데이트, 감정노동 보호, 관리자 알림
├── 모든 실행 감사 로그 기록
└── 사후 검토 가능

Level 3 — Autonomous
├── 완전 자율 실행
├── 적용: QA 점수 저장, 코칭 콘텐츠 생성
├── 감사 로그 선택적
└── 최소 인간 개입
```

### 5.3 거버넌스 판단 로직

```typescript
function evaluateGovernance(level: GovernanceLevel, context: GovernanceContext): GovernanceDecision {
  if (level === 1) {
    return { approved: false, reason: 'Level 1 — 인간 승인 필요', requiresReview: true };
  }
  if (level === 2) {
    if (context.ai_confidence >= 0.7) {
      return { approved: true, reason: 'Level 2 — 자동 승인 (신뢰도 충족)', auditRequired: true };
    }
    return { approved: false, reason: 'Level 2 — 신뢰도 미달, 수동 검토 필요', requiresReview: true };
  }
  // Level 3
  return { approved: true, reason: 'Level 3 — 자율 실행', auditRequired: false };
}
```

---

## 6. 온톨로지 기반 개선방안 엔진 (v2.0 신규)

### 6.1 개요

파이프라인 결과를 분석하여 **4대 카테고리 개선방안**을 온톨로지 관계 기반으로 자동 도출합니다.

```
┌────────────────────────────────────────────────────────────┐
│              개선방안 엔진 (Improvement Engine)              │
│                                                             │
│  ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌─────────┐ │
│  │Compliance│   │Prevention│   │Satisfact.│   │ Script  │ │
│  │위반 방지  │   │실수 방지  │   │만족도제고 │   │최적화   │ │
│  │          │   │          │   │          │   │         │ │
│  │불완전판매 │   │QA취약항목│   │감성회복   │   │폭언대응 │ │
│  │허위설명   │   │코칭포인트│   │품질개선   │   │공감응대 │ │
│  │감정노동   │   │반복실수  │   │CSAT향상  │   │적합성   │ │
│  └─────┬────┘   └─────┬────┘   └─────┬────┘   └────┬────┘ │
│        │              │              │              │       │
│        └──────────────┼──────────────┼──────────────┘       │
│                       ▼                                      │
│              ┌─────────────────┐                             │
│              │ 선후관계 엔진    │                             │
│              │ 우선도 + 의존성  │                             │
│              │ 기반 실행 순서   │                             │
│              └────────┬────────┘                             │
│                       ▼                                      │
│              ┌─────────────────┐                             │
│              │ Write-back 연동  │                             │
│              │ MCP Tool 매핑    │                             │
│              └─────────────────┘                             │
└────────────────────────────────────────────────────────────┘
```

### 6.2 4대 카테고리 상세

#### 6.2.1 컴플라이언스 위반 방지

| 트리거 | 온톨로지 근거 | 개선 조치 | Write-back |
|--------|-------------|-----------|------------|
| INCOMPLETE_SALE 플래그 | ComplianceFlag → TRIGGERS → ComplianceCase | 리스크 고지 체크리스트 강제 + 사전 검증 단계 추가 | compliance_create_case |
| MISREPRESENTATION 플래그 | Sentiment.emotion_peaks → ComplianceFlag | 확정적 수익 표현 실시간 경고 발생 | notify_supervisor |
| VERBAL_ABUSE 플래그 | Sentiment.verbal_abuse → Action(Protect) | ACD 정지 → 관리자 알림 → HR 이벤트 3단계 체인 | acd_pause_agent |

#### 6.2.2 유사 실수 방지

| 트리거 | 온톨로지 근거 | 개선 조치 |
|--------|-------------|-----------|
| QA 카테고리 60% 미만 | QAScore.categories → Agent.coaching_queue | 취약 항목별 맞춤 코칭 콘텐츠 자동 생성 |
| HIGH 우선도 코칭 포인트 | QAScore.coaching_points → Action(AutoQAAndCoach) | 동일 유형 실수 재발 방지 교육 큐 등록 |

#### 6.2.3 고객만족도 제고

| 트리거 | 온톨로지 근거 | 개선 조치 |
|--------|-------------|-----------|
| customer_sentiment < 0 | Sentiment → Customer → Call | 사과 문자/이메일 + 관리자 콜백 |
| QA improvements 존재 | QAScore.improvements → Agent | 개인별 개선 추적 + 트렌드 분석 |

#### 6.2.4 대응 스크립트 최적화

| 상황 | Before (기존) | After (권장) |
|------|--------------|-------------|
| **원금 손실 고지** | "거의 그렇게 보시면 됩니다" | "이 펀드는 투자 원금의 손실이 발생할 수 있으며, 과거 수익률이 미래 수익을 보장하지 않습니다" |
| **확정적 수익 표현** | "연 7% 수익을 기대하실 수 있습니다" | "최근 6개월 수익률이 12%였으나, 이는 과거 실적이며 향후 수익을 보장하지 않습니다" |
| **폭언 대응 1차** | "차분한 대화 부탁드립니다" | "불편하신 마음을 충분히 이해합니다. 원활한 상담 진행을 위해 존중하는 대화 부탁드리겠습니다" |
| **불만 고객 초기** | "불편을 드려 죄송합니다" | "결제가 되지 않으셔서 정말 당황하셨겠습니다. 바로 원인을 확인해서 최대한 빠르게 해결해 드리겠습니다" |
| **적합성 진단** | (절차 생략) | "투자 경험은 어느 정도이신가요? 원금 손실 감내 수준은? 투자 기간은?" |
| **청약 철회권** | (안내 누락) | "가입일로부터 14일 이내에 청약 철회가 가능합니다. 철회 시 원금 전액 환불됩니다" |

### 6.3 액션 선후관계 (Dependency Chain)

```
CRITICAL 우선도                    HIGH 우선도                MEDIUM 우선도
┌──────────────┐                ┌──────────────┐           ┌──────────────┐
│ IMP-1        │  ──depends──▶  │ IMP-2        │           │ IMP-5        │
│ 불완전판매    │                │ 확정수익감지  │           │ 감성회복     │
│ 방지         │                │ 강화         │           │ 후속조치     │
└──────┬───────┘                └──────────────┘           └──────────────┘
       │
       ▼
┌──────────────┐                ┌──────────────┐           ┌──────────────┐
│ IMP-3        │                │ IMP-4        │           │ IMP-6        │
│ 감정노동보호 │                │ QA취약항목   │           │ CSAT 향상    │
│ 에스컬레이션 │                │ 집중코칭     │           │              │
└──────────────┘                └──────────────┘           └──────────────┘
```

### 6.4 예상 효과 (정량적)

| 개선 항목 | 예상 효과 |
|-----------|----------|
| 불완전판매 방지 프로세스 | 불완전판매 건수 60~80% 감소 |
| 확정적 수익 표현 감지 | 허위/과장 설명 70% 감소 |
| 감정노동 보호 자동화 | 상담원 이직률 15~25% 감소 |
| QA 취약 항목 코칭 | 취약 항목 점수 평균 30% 향상 |
| 반복 실수 방지 | 동일 유형 실수 재발률 50% 감소 |
| 불만 고객 후속 조치 | 불만 고객 만족도 전환율 40% 향상 |
| 폭언 대응 스크립트 | 폭언 처리 시간 30% 단축 |
| 불만 에스컬레이션 방지 | 에스컬레이션율 35% 감소 |
| 적합성 진단 수행률 | 100% 달성 |
| 청약 철회권 안내 | 누락 건수 0건 달성 |

---

## 7. Write-back 워크플로우 상세 (v2.0 신규)

### 7.1 6-Stage 워크플로우

각 MCP 도구 실행 시 아래 6단계를 순차적으로 수행합니다:

```
Stage 1          Stage 2          Stage 3           Stage 4          Stage 5          Stage 6
┌─────────┐     ┌─────────┐     ┌──────────┐     ┌──────────┐     ┌─────────┐     ┌─────────┐
│  Input   │────▶│Validate │────▶│Governance│────▶│ Execute  │────▶│  Audit  │────▶│ Notify  │
│  수집    │     │  검증   │     │  거버넌스 │     │  실행    │     │  감사   │     │  알림   │
│         │     │         │     │          │     │          │     │         │     │         │
│파이프라인│     │Zod스키마│     │L1:승인대기│     │MCP Tool │     │Delta TBL│     │Slack/SMS│
│결과 추출 │     │타입/형식│     │L2:자동+감사│    │실행     │     │append-  │     │관련     │
│         │     │필수값   │     │L3:자율   │     │         │     │only     │     │담당자   │
│ ~12ms   │     │ ~5ms   │     │ ~3ms     │     │ ~50ms   │     │ ~8ms   │     │ ~15ms  │
└─────────┘     └─────────┘     └──────────┘     └──────────┘     └─────────┘     └─────────┘
```

### 7.2 도구별 워크플로우 상세

#### crm_update_call (Level 2)

| Stage | 내용 | Duration |
|-------|------|----------|
| Input | call_id, disposition_code, resolution_status 수집 | 12ms |
| Validate | Zod: call_id(string), disposition_code(enum) 검증 | 5ms |
| Governance | L2 — AI 신뢰도 ≥ 0.7 확인 → 자동 승인 | 3ms |
| Execute | CRM API 호출 → 통화 레코드 업데이트 | ~65ms |
| Audit | ontology_audit.acw_action_log에 기록 | 8ms |
| Notify | 완료 알림 (L2이므로 발송) | 15ms |

#### compliance_create_case (Level 1)

| Stage | 내용 | Duration |
|-------|------|----------|
| Input | call_id, flag_type, severity, evidence 수집 | 12ms |
| Validate | Zod: 필수 필드, severity(enum) 검증 | 5ms |
| Governance | **L1 — 인간 승인 필수 → 승인 대기 큐 진입** | - |
| Execute | **승인 대기 중** (컴플라이언스 담당자 검토 필요) | - |
| Audit | 승인 요청 이벤트 기록 | 8ms |
| Notify | **컴플라이언스 담당자에게 승인 요청 알림** | 15ms |

#### acd_pause_agent (Level 2 — 감정노동 보호)

| Stage | 내용 | Duration |
|-------|------|----------|
| Input | agent_id, reason("감정노동 보호"), duration("15분") | 12ms |
| Validate | Zod: agent_id(string), duration(number) 검증 | 5ms |
| Governance | L2 — 감정노동 보호는 신뢰도 무관 자동 실행 | 3ms |
| Execute | ACD 큐 일시정지 → 15분 후 자동 복구 예약 | ~45ms |
| Audit | 감정노동 이벤트 기록 (HR 시스템 연동) | 8ms |
| Notify | 관리자 + HR 담당자 알림 (Slack + SMS) | 15ms |

### 7.3 워크플로우 시각화 UI

대시보드에서 제공하는 시각화 기능:

- **도구별 접기/펼치기**: 각 MCP 도구의 6단계를 상세 확인
- **타임라인 뷰**: 단계별 상태 (성공/대기/실패) 시각적 표시
- **Input/Output 데이터**: 각 단계에서 입출력된 데이터 확인
- **워크플로우 재현 애니메이션**: "워크플로우 재현" 버튼으로 전체 흐름을 400ms 간격으로 시각화
- **거버넌스 레벨 배지**: L1(빨강) / L2(노랑) / L3(초록) 시각 구분

### 7.4 감사 로그 구조

```sql
CREATE TABLE ontology_audit.acw_action_log (
  audit_id        STRING,
  action_id       STRING,       -- ActionType.id
  call_id         STRING,
  agent_id        STRING,
  governance_level INT,
  status          STRING,       -- INITIATED / COMPLETED / FAILED / APPROVED / REJECTED
  mcp_tool        STRING,
  write_back_target STRING,
  parameters      STRING,       -- JSON
  result          STRING,       -- JSON
  error_message   STRING,
  created_at      TIMESTAMP
)
USING DELTA
TBLPROPERTIES (
  'delta.appendOnly' = 'true',
  'delta.logRetentionDuration' = 'interval 2555 days'  -- 7년
);
```

---

## 8. 온톨로지 위자드 (v2.0 신규)

### 8.1 개요

채팅 스타일 브랜칭 위자드로, 금융기관의 콜센터 특성에 맞는 온톨로지를 자동 생성합니다.

### 8.2 11단계 스텝 구성

```
Step 1: welcome           금융기관 유형 선택 (은행/카드/보험/증권/핀테크/종합)
    │
Step 2: center_type       콜센터 규모 (소/중/대/엔터프라이즈)
    │
Step 3: channel_config    상담 채널 (인바운드/아웃바운드/호전환/콜백/IVR이탈) [Multi]
    │
Step 4: agent_config      상담원 고용형태 (직접/혼합/간접중심) → 노란봉투법 모듈 활성화
    │
Step 5: compliance_rules  컴플라이언스 규칙 (불완전판매/감정노동/개인정보/허위설명 등) [Multi]
    │
Step 6: qa_criteria       QA 평가 항목 (인사/문제파악/해결/규제/마무리/공감) [Multi]
    │
Step 7: governance_config Write-back 거버넌스 (엄격/표준/자율)
    │
Step 8: intent_categories 의도 분류 그룹 (카드/대출/예금/보험/펀드 등) [Multi]
    │
Step 9: stt_config        STT 엔진 (KT ACEN/Whisper/CLOVA/자체)
    │
Step 10: dynamic_questions 동적 질문 (이전 답변 기반 조건부 생성)
    │                      ┌── 객체 질문: 녹취 URL, 세그먼트, Campaign, OutsourceCompany, CallCenter
    │                      ├── 속성 질문: AI 신뢰도, 감정노동 지수, 고객 세그먼트, 대기시간
    │                      └── 관계 질문: 금융상품 연결, 컴플라이언스 케이스, 외주업체, 호전환 체인
    │
Step 11: review            온톨로지 구조 요약 + 확인/재시작
```

### 8.3 동적 질문 생성 규칙

| 조건 | 생성되는 질문 | 기본 선택 |
|------|-------------|----------|
| 채널에 아웃바운드 포함 | Campaign 객체 추가 여부 | OFF |
| 고용형태 ≠ 전원직접고용 | OutsourceCompany 객체 추가 | ON |
| 규모 = 엔터프라이즈/종합 | CallCenter(멀티사이트) 추가 | ON |
| 감정노동 규칙 선택 | Agent.emotional_labor_score 추적 | ON |
| 규모 = 대규모/엔터프라이즈 | Call.wait_seconds 기록 | ON |
| 채널에 호전환 포함 | Call → Call 자기참조 관계 | ON |
| 컴플라이언스 3개+ 선택 | ComplianceCase 연결 | ON |

### 8.4 buildOntologyFromAnswers() 출력

```typescript
interface GeneratedOntology {
  objects: {           // Object Types (9~12개)
    name: string;
    description: string;
    category: string;
    properties: { id: string; name: string; type: string; required: boolean }[];
    deltaTable: string;
  }[];
  links: {             // Link Types (7~12개)
    name: string;
    fromType: string;
    toType: string;
    cardinality: string;
    description: string;
  }[];
  actions: {           // Write-back Actions (2~4개)
    name: string;
    description: string;
    governanceLevel: number;
    autoExecute: boolean;
  }[];
  props: {             // 추가 속성
    name: string;
    dataType: string;
    description: string;
    usedBy: string[];
    piiLevel: string;
  }[];
  summary: Record<string, unknown>;  // 위자드 답변 요약
}
```

---

## 9. 대시보드 & 데모

### 9.1 대시보드 뷰 (Dashboard View)

| 섹션 | 내용 |
|------|------|
| KPI 카드 (4개) | 총 통화 건수, AI 자동 처리, 절감 시간/비용, 컴플라이언스 플래그 |
| 감성 분석 분포 | 긍정/중립/부정/에스컬레이션 비율 바 차트 |
| 컴플라이언스 현황 | 불완전판매/욕설폭언/개인정보 위반 건수 + 심사 대기 |
| 상담원 현황 | 직접/간접 고용 비율 + 노란봉투법 대응 + QA 평균 |
| ACW 비교 | 수동(118.5초) vs AI(9.3초) 시각적 비교 |

### 9.2 ACW 데모 뷰 (Demo View)

3개 시나리오 시뮬레이션:

| # | 시나리오 | 핵심 포인트 |
|---|---------|------------|
| 1 | 카드 분실 신고 (정상) | QA 92점, Write-back 3건 성공 |
| 2 | 펀드 가입 (불완전판매) | QA 48점, L1 승인 대기, 개선방안 8건 |
| 3 | 고객 욕설 (감정노동) | 산안법 41조 자동 발동, 보호 조치 3건 |

### 9.3 결과 화면 구성 (6개 패널)

```
┌─────────────────────────────────────────────────┐
│ [1] AI 요약  │  [2] 감성 분석                     │
│ 3~5문장 요약  │  고객/상담원 감성, 궤적, 폭언 감지   │
│ 의도/처리코드  │  감정 급변 구간                     │
├──────────────┼────────────────────────────────────┤
│ [3] 컴플라이  │  [4] QA 평가                       │
│ 언스 플래그   │  6개 카테고리 자동 채점              │
│ 위반 유형/근거 │  코칭 포인트                        │
├──────────────┴────────────────────────────────────┤
│ [5] 온톨로지 기반 개선방안 (v2.0)                    │
│ ┌────────────────────────────────────────────────┐ │
│ │ 카테고리 필터: 전체│컴플라이언스│실수방지│만족도│스크립트│ │
│ │ 실행 순서 다이어그램 (IMP-1 → IMP-2 → ...)      │ │
│ │ 각 개선방안:                                     │ │
│ │   • 우선도 배지 (CRITICAL/HIGH/MEDIUM/LOW)       │ │
│ │   • 온톨로지 근거 (Object → Link → Action)      │ │
│ │   • Write-back 연동 도구                         │ │
│ │   • Before/After 스크립트 비교 (접기/펼치기)      │ │
│ │   • 예상 효과 (정량적)                           │ │
│ └────────────────────────────────────────────────┘ │
├───────────────────────────────────────────────────┤
│ [6] Write-back 워크플로우 (v2.0)                    │
│ ┌────────────────────────────────────────────────┐ │
│ │ 파이프라인 개요: ACW Agent → Comp → QA → WB    │ │
│ │ 도구별 상세 (접기/펼치기):                       │ │
│ │   ● crm_update_call [L2] [SUCCESS]              │ │
│ │     1. Input 수집 (12ms)                        │ │
│ │     2. Zod 검증 (5ms)                           │ │
│ │     3. 거버넌스 L2 자동승인 (3ms)                │ │
│ │     4. 실행 완료 (65ms)                         │ │
│ │     5. 감사 로그 기록 (8ms)                      │ │
│ │     6. 알림 발송 (15ms)                         │ │
│ │ [워크플로우 재현] 버튼 → 애니메이션               │ │
│ │ 요약: 성공 N건 / 승인대기 N건 / 총 N단계         │ │
│ └────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────┘
```

---

## 10. 데이터 모델 (Delta Tables)

### 10.1 테이블 목록

| Schema | Table | Partition | 특징 |
|--------|-------|-----------|------|
| ontology_data | calls | call_date | CDC 활성화 |
| ontology_data | transcripts | transcript_date | PII HIGH |
| ontology_data | call_summaries | summary_date | Write-back 대상 |
| ontology_data | sentiments | - | 감정노동 연동 |
| ontology_data | compliance_flags | flag_date | L1 거버넌스 |
| ontology_data | agents | - | 노란봉투법 대응 |
| ontology_data | qa_scores | score_date | L3 거버넌스 |
| ontology_data | customers | - | CRM 연동 |
| ontology_data | products | - | 상품 마스터 |
| ontology_data | write_back_queue | - | Write-back 큐 |
| ontology_audit | acw_action_log | log_date | append-only, 7년 |

### 10.2 View 목록

| View | 용도 |
|------|------|
| v_acw_savings | ACW 절감 현황 대시보드 |
| v_sentiment_heatmap | 시간대별 감성 히트맵 |
| v_compliance_dashboard | 컴플라이언스 현황판 |
| v_agent_performance | 상담원 성과 분석 |

---

## 11. 법규 대응

### 11.1 노란봉투법 (2026.3.13 시행)

| 항목 | 대응 방식 |
|------|----------|
| 간접고용 비율 추적 | Agent.employment_type 기반 실시간 모니터링 |
| 외주업체 관리 | OutsourceCompany 객체 + EMPLOYED_BY 관계 |
| 고용형태별 대시보드 | 직접/간접 비율 시각화 |

**배경**: 금융 콜센터 상담원의 68.3%가 간접고용(외주) 형태. 노란봉투법에 따라 원청의 사용자 책임 강화.

### 11.2 감정노동자보호법 (산안법 41조)

| 항목 | 대응 방식 |
|------|----------|
| 폭언/욕설 즉시 감지 | 규칙 기반(키워드) + AI 기반 이중 감지 |
| 자동 보호 조치 | ACD 큐 정지 → 관리자 알림 → HR 이벤트 로깅 |
| 감정노동 지수 추적 | Agent.emotional_labor_score (최근 30일) |
| 보호 이력 감사 | 감사 로그 7년 보관 (append-only) |

### 11.3 금융소비자보호법 (금소법)

| 항목 | 대응 방식 |
|------|----------|
| 적합성 원칙 (제19조) | 투자상품 판매 전 적합성 진단 체크 |
| 설명의무 (제47조) | 원금 손실 고지 누락 자동 탐지 |
| 부당권유 금지 (제57조) | 확정 수익 표현 실시간 경고 |
| 청약 철회권 | 가입 후 14일 철회 안내 체크 |

---

## 12. 프로젝트 구조

```
KT_FS Ontology_After Call_Databrics/
├── CLAUDE.md                            # 프로젝트 설정
├── package.json                         # Turborepo 모노레포
├── turbo.json                          # 빌드 설정
├── tsconfig.base.json                  # TypeScript 기본 설정
├── .env.example                        # 환경변수 템플릿
├── .gitignore
│
├── docs/
│   └── K-Palantir_ACW_설계서_v2.0.md   # ← 본 문서
│
├── sql/
│   └── 001_create_delta_tables.sql     # Delta Table DDL (317 lines)
│
├── prompts/
│   ├── acw-agent.md                    # ACW Agent 시스템 프롬프트
│   ├── compliance-agent.md             # Compliance Agent 프롬프트
│   └── qa-agent.md                     # QA Agent 프롬프트
│
└── packages/
    ├── ontology/                       # 온톨로지 스키마 패키지
    │   └── src/
    │       ├── types.ts                # OLAS 타입 정의 (564 lines)
    │       ├── ontology-service.ts     # Databricks CRUD (358 lines)
    │       └── index.ts
    │
    ├── agent-framework/                # AI 에이전트 프레임워크
    │   └── src/
    │       ├── agents/
    │       │   ├── acw-agent.ts        # ACW Agent (279 lines)
    │       │   ├── compliance-agent.ts # Compliance Agent (243 lines)
    │       │   └── qa-agent.ts         # QA Agent (210 lines)
    │       ├── pipeline.ts             # 파이프라인 오케스트레이터 (305 lines)
    │       └── index.ts
    │
    ├── mcp-server/                     # MCP Server
    │   └── src/
    │       ├── tools/
    │       │   └── crm-tools.ts        # 6개 MCP 도구 + 거버넌스 (328 lines)
    │       ├── server.ts               # MCP Server 클래스 (128 lines)
    │       └── index.ts
    │
    ├── seed-data/                      # 시드 데이터 생성기
    │   └── src/
    │       └── index.ts                # 11개 시나리오, 500건 생성 (516 lines)
    │
    └── dashboard/                      # Next.js 대시보드
        └── src/
            ├── app/
            │   ├── layout.tsx          # 레이아웃
            │   ├── page.tsx            # 메인 페이지 (553+ lines)
            │   └── api/
            │       ├── dashboard/route.ts  # 대시보드 KPI API
            │       └── acw/route.ts        # ACW 데모 API
            ├── components/
            │   ├── ontology-wizard.tsx      # 온톨로지 위자드 (v2.0)
            │   └── improvement-engine.tsx   # 개선방안 + 워크플로우 (v2.0)
            └── lib/
                └── demo-engine.ts      # 3개 시나리오 데모 엔진 (358 lines)
```

### 12.1 코드 규모

| 패키지 | 파일 수 | 총 라인 수 | 핵심 기능 |
|--------|--------|-----------|----------|
| ontology | 3 | ~930 | OLAS 타입 + Databricks CRUD |
| agent-framework | 5 | ~1,040 | 3 Agent + Pipeline |
| mcp-server | 3 | ~460 | 6 MCP Tools + 거버넌스 |
| seed-data | 1 | ~520 | 11 시나리오 + 데이터 생성 |
| dashboard | 7 | ~1,800+ | UI + 데모 + 위자드 + 개선방안 |
| sql | 1 | ~320 | Delta Tables DDL |
| prompts | 3 | ~300 | Agent 프롬프트 |
| **합계** | **23** | **~5,370+** | |

---

## 13. 배포 및 운영

### 13.1 로컬 개발

```bash
# 의존성 설치
npm install

# 대시보드 실행 (로컬)
npm run dev          # → http://localhost:3001

# 전체 빌드
npm run build

# 시드 데이터 생성
npm run seed
```

### 13.2 환경변수

```env
# Databricks
DATABRICKS_HOST=https://xxxx.cloud.databricks.com
DATABRICKS_TOKEN=dapi_xxxx
DATABRICKS_WAREHOUSE_ID=xxxx

# Anthropic (Claude)
ANTHROPIC_API_KEY=sk-ant-xxxx

# Firebase (인증)
FIREBASE_PROJECT_ID=xxxx
FIREBASE_CLIENT_EMAIL=xxxx
FIREBASE_PRIVATE_KEY=xxxx
```

### 13.3 GitHub

- **Repository**: `https://github.com/Sang-Weon/k-palantir_ontology_FS_After-Call_Databrics-260326.git`

---

## 변경 이력

| 버전 | 날짜 | 변경 내용 |
|------|------|----------|
| 1.0 | 2026-03-26 | 초기 설계 — OLAS, 3-Agent, MCP, 대시보드 |
| 2.0 | 2026-03-26 | 온톨로지 기반 개선방안 엔진, Write-back 워크플로우 시각화, 수정 스크립트 자동 생성, 액션 선후관계, 온톨로지 위자드 추가 |

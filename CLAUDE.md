# K-Palantir ACW Automation — Databricks

## Identity
금융 콜센터 ACW(After Call Work) 자동화 시스템.
노란봉투법·감정노동자보호법 대응. 온톨로지 기반 데이터 모델링.

## Tech Stack
- **Frontend**: Next.js 15 + shadcn/ui + Tailwind CSS
- **Data Platform**: Databricks Delta Lake (OLAS 온톨로지 레이어)
- **Agent**: Claude Sonnet Tool Use (ACW/Compliance/QA 3-Agent)
- **MCP**: TypeScript MCP SDK (Write-back 6개 Tool)
- **Auth**: Firebase Auth
- **Monorepo**: Turborepo + npm workspaces

## Architecture
```
[실시간 파이프라인]
통화 비서 → KT STT(에이센) → Delta Lake(raw_transcripts)
                ↓
[Agent Layer] Databricks Agent Bricks + Claude Sonnet
  ├─ ACW Agent: 통화요약 + 자동분류 + 감성분석 + 핵심정보추출
  ├─ Compliance Agent: 불완전판매 탐지 + 감정노동 이벤트 감지
  └─ QA Agent: 상담품질 자동 평가 + 코칭 포인트 도출
                ↓
[Ontology Layer — Delta Tables]
  :Call → :Transcript → :CallSummary → :Sentiment
  :ComplianceFlag → :QAScore → :Agent → :Customer
                ↓
[Write-back — MCP Server]
  CRM 요약등록 → 상담이력DB → 불완전판매시스템 → 코칭시스템
  Level 2(자동) → Level 2     → Level 1(승인)    → Level 3
```

## Key Domain Rules
- ACW Agent 출력은 반드시 구조화 JSON
- 불완전판매 탐지 = Level 1 (사람 승인 필수)
- 감정노동 보호 = Level 2 (즉시 자동 → 법적 의무, 산안법 41조)
- QA 평가 = Level 3 (자율)
- PII(계좌번호 등)는 마스킹 후 표시
- 감사 로그 7년 보관 (append-only)
- 금융 의도 분류 50개 카테고리 표준
- 노란봉투법(2026.3.13 시행): 간접고용 68.3% 상담원 보호 강화

## Ontology Schema (OLAS)
- Object Types: Call, Transcript, CallSummary, Sentiment, ComplianceFlag, Agent, QAScore, Customer, Product
- Link Types: HAS_TRANSCRIPT, HAS_SUMMARY, HAS_SENTIMENT, HAS_FLAG, HAS_QA, HANDLED_BY, ABOUT_CUSTOMER, RELATED_PRODUCT, EMPLOYED_BY, TRIGGERS
- Governance Levels: L1(승인필수), L2(자동+감사), L3(자율)

## Coding Rules
- TypeScript strict mode
- 모든 Agent 출력은 Zod 스키마로 검증
- Delta Table 쿼리는 파라미터 바인딩 필수 (SQL 인젝션 방지)
- API Key는 환경변수로만 관리 (.env.local)
- 감사 로그는 append-only (UPDATE/DELETE 금지)

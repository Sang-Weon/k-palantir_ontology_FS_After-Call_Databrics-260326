/**
 * MCP Server — CRM Write-back Tools
 *
 * 6개 MCP Tool + 거버넌스 레벨 관리
 * Level 1: 사람 승인 필수 (불완전판매)
 * Level 2: 자동 실행 + 감사 로그 (요약, 감정노동 보호)
 * Level 3: 자율 (QA 평가)
 */

import { z } from 'zod';

// ── 거버넌스 엔진 ──────────────────────────────────────────────

export type GovernanceLevel = 1 | 2 | 3;

interface GovernanceDecision {
  approved: boolean;
  level: GovernanceLevel;
  reason: string;
  requires_human_review: boolean;
  audit_required: boolean;
}

export function evaluateGovernance(
  actionId: string,
  level: GovernanceLevel,
  aiConfidence: number
): GovernanceDecision {
  switch (level) {
    case 1:
      // Level 1: 반드시 사람 승인 → 자동 실행 불가, 대기열에 등록
      return {
        approved: false,
        level: 1,
        reason: `Level 1 액션(${actionId})은 사람 승인이 필요합니다. Write-back 대기열에 등록됩니다.`,
        requires_human_review: true,
        audit_required: true,
      };

    case 2:
      // Level 2: AI 신뢰도 0.7 이상이면 자동 실행
      if (aiConfidence >= 0.7) {
        return {
          approved: true,
          level: 2,
          reason: `Level 2 자동 실행 (신뢰도 ${aiConfidence})`,
          requires_human_review: false,
          audit_required: true,
        };
      }
      // 신뢰도 낮으면 Level 1로 격상
      return {
        approved: false,
        level: 2,
        reason: `AI 신뢰도 ${aiConfidence} < 0.7 → 사람 리뷰 필요`,
        requires_human_review: true,
        audit_required: true,
      };

    case 3:
      // Level 3: 항상 자동 실행
      return {
        approved: true,
        level: 3,
        reason: 'Level 3 자율 실행',
        requires_human_review: false,
        audit_required: false,
      };
  }
}

// ── MCP Tool 정의 ──────────────────────────────────────────────

export interface MCPToolDefinition {
  name: string;
  description: string;
  governance_level: GovernanceLevel;
  parameters: z.ZodType;
  execute: (params: unknown) => Promise<MCPToolResult>;
}

export interface MCPToolResult {
  status: 'SUCCESS' | 'FAILED' | 'AWAITING_APPROVAL';
  data: Record<string, unknown>;
  audit_entry: AuditEntry;
}

interface AuditEntry {
  action_id: string;
  mcp_tool: string;
  governance_level: GovernanceLevel;
  status: string;
  parameters: Record<string, unknown>;
  result: Record<string, unknown>;
  timestamp: string;
}

// ── Tool 1: CRM 통화 요약 기록 (Level 2) ─────────────────────────

const CrmUpdateCallParams = z.object({
  call_id: z.string(),
  summary_text: z.string(),
  disposition_code: z.string(),
  intent: z.string(),
  key_entities: z.record(z.unknown()),
  action_items: z.array(z.string()),
  ai_confidence: z.number(),
});

export const crmUpdateCall: MCPToolDefinition = {
  name: 'crm_update_call',
  description: 'CRM 시스템에 통화 요약, 분류, 처리코드를 자동 기록합니다.',
  governance_level: 2,
  parameters: CrmUpdateCallParams,
  execute: async (params) => {
    const p = CrmUpdateCallParams.parse(params);
    const governance = evaluateGovernance('ACT-ACW-001', 2, p.ai_confidence);

    if (!governance.approved) {
      return {
        status: 'AWAITING_APPROVAL',
        data: { message: governance.reason, queue_id: `WBQ-${Date.now()}` },
        audit_entry: createAuditEntry('ACT-ACW-001', 'crm_update_call', 2, 'AWAITING_APPROVAL', p),
      };
    }

    // CRM API 호출 (Mock)
    const crmRecordId = `CRM-${p.call_id}-${Date.now()}`;

    return {
      status: 'SUCCESS',
      data: {
        crm_record_id: crmRecordId,
        acw_saved_seconds: 60,
        message: `CRM 기록 완료: ${p.disposition_code}`,
      },
      audit_entry: createAuditEntry('ACT-ACW-001', 'crm_update_call', 2, 'COMPLETED', p, { crm_record_id: crmRecordId }),
    };
  },
};

// ── Tool 2: 통화 이력 DB 요약 등록 (Level 2) ──────────────────────

const CallDbInsertSummaryParams = z.object({
  call_id: z.string(),
  summary_text: z.string(),
  intent_primary: z.string(),
  intent_secondary: z.array(z.string()),
  key_entities: z.record(z.unknown()),
  resolution_status: z.string(),
});

export const calldbInsertSummary: MCPToolDefinition = {
  name: 'calldb_insert_summary',
  description: '상담이력 DB에 AI 생성 요약을 등록합니다.',
  governance_level: 2,
  parameters: CallDbInsertSummaryParams,
  execute: async (params) => {
    const p = CallDbInsertSummaryParams.parse(params);

    // Delta Table INSERT (Mock)
    return {
      status: 'SUCCESS',
      data: {
        summary_id: `SUM-${p.call_id}-${Date.now()}`,
        message: '상담이력 DB 요약 등록 완료',
      },
      audit_entry: createAuditEntry('ACT-ACW-001', 'calldb_insert_summary', 2, 'COMPLETED', p),
    };
  },
};

// ── Tool 3: 컴플라이언스 케이스 생성 (Level 1 ⚠️) ─────────────────

const ComplianceCreateCaseParams = z.object({
  call_id: z.string(),
  flag_type: z.string(),
  severity: z.string(),
  description: z.string(),
  evidence_segments: z.array(z.number()),
  evidence_text: z.array(z.string()),
  regulation_reference: z.string(),
  ai_confidence: z.number(),
});

export const complianceCreateCase: MCPToolDefinition = {
  name: 'compliance_create_case',
  description: '컴플라이언스 시스템에 리뷰 케이스를 생성합니다. ⚠️ Level 1: 사람 승인 필수',
  governance_level: 1,
  parameters: ComplianceCreateCaseParams,
  execute: async (params) => {
    const p = ComplianceCreateCaseParams.parse(params);
    const governance = evaluateGovernance('ACT-ACW-002', 1, p.ai_confidence);

    // Level 1은 항상 대기열로
    return {
      status: 'AWAITING_APPROVAL',
      data: {
        case_id: `CC-${p.call_id}-${Date.now()}`,
        message: governance.reason,
        review_dashboard_url: `/compliance/review/${p.call_id}`,
      },
      audit_entry: createAuditEntry('ACT-ACW-002', 'compliance_create_case', 1, 'AWAITING_APPROVAL', p),
    };
  },
};

// ── Tool 4: ACD 상담원 큐 일시정지 (Level 2 — 감정노동 보호) ──────

const AcdPauseAgentParams = z.object({
  agent_id: z.string(),
  call_id: z.string(),
  reason: z.string(),
  duration_minutes: z.number().default(10),
});

export const acdPauseAgent: MCPToolDefinition = {
  name: 'acd_pause_agent',
  description: '상담원 ACD 큐를 일시 정지합니다. 감정노동 보호 (산안법 41조). Level 2: 즉시 자동.',
  governance_level: 2,
  parameters: AcdPauseAgentParams,
  execute: async (params) => {
    const p = AcdPauseAgentParams.parse(params);

    // 감정노동 보호는 즉시 실행 (법적 의무)
    return {
      status: 'SUCCESS',
      data: {
        agent_id: p.agent_id,
        paused_until: new Date(Date.now() + p.duration_minutes * 60000).toISOString(),
        message: `상담원 ${p.agent_id} 큐 ${p.duration_minutes}분 일시정지 (산안법 41조)`,
      },
      audit_entry: createAuditEntry('ACT-ACW-003', 'acd_pause_agent', 2, 'COMPLETED', p),
    };
  },
};

// ── Tool 5: QA 점수 등록 (Level 3) ──────────────────────────────

const QaInsertScoreParams = z.object({
  call_id: z.string(),
  agent_id: z.string(),
  total_score: z.number(),
  categories: z.record(z.number()),
  coaching_points: z.array(z.unknown()),
});

export const qaInsertScore: MCPToolDefinition = {
  name: 'qa_insert_score',
  description: 'QA 시스템에 상담 품질 점수를 등록합니다. Level 3: 자율.',
  governance_level: 3,
  parameters: QaInsertScoreParams,
  execute: async (params) => {
    const p = QaInsertScoreParams.parse(params);

    return {
      status: 'SUCCESS',
      data: {
        qa_id: `QA-${p.call_id}-${Date.now()}`,
        total_score: p.total_score,
        message: `QA 점수 등록 완료: ${p.total_score}점`,
      },
      audit_entry: createAuditEntry('ACT-ACW-004', 'qa_insert_score', 3, 'COMPLETED', p),
    };
  },
};

// ── Tool 6: 관리자 알림 (Level 2) ──────────────────────────────

const NotifySupervisorParams = z.object({
  agent_id: z.string(),
  call_id: z.string(),
  alert_type: z.enum(['VERBAL_ABUSE', 'EMOTIONAL_LABOR', 'COMPLIANCE_ISSUE', 'ESCALATION']),
  message: z.string(),
  severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
});

export const notifySupervisor: MCPToolDefinition = {
  name: 'notify_supervisor',
  description: '관리자/슈퍼바이저에게 즉시 알림을 전송합니다.',
  governance_level: 2,
  parameters: NotifySupervisorParams,
  execute: async (params) => {
    const p = NotifySupervisorParams.parse(params);

    return {
      status: 'SUCCESS',
      data: {
        notification_id: `NOTIF-${Date.now()}`,
        recipients: ['supervisor_team'],
        message: `[${p.severity}] ${p.alert_type}: ${p.message}`,
      },
      audit_entry: createAuditEntry('ACT-ACW-003', 'notify_supervisor', 2, 'COMPLETED', p),
    };
  },
};

// ── 전체 Tool 레지스트리 ──────────────────────────────────────

export const MCP_TOOLS: MCPToolDefinition[] = [
  crmUpdateCall,
  calldbInsertSummary,
  complianceCreateCase,
  acdPauseAgent,
  qaInsertScore,
  notifySupervisor,
];

// ── 감사 로그 헬퍼 ──────────────────────────────────────────────

function createAuditEntry(
  actionId: string,
  mcpTool: string,
  level: GovernanceLevel,
  status: string,
  params: unknown,
  result?: Record<string, unknown>
): AuditEntry {
  return {
    action_id: actionId,
    mcp_tool: mcpTool,
    governance_level: level,
    status,
    parameters: params as Record<string, unknown>,
    result: result || {},
    timestamp: new Date().toISOString(),
  };
}

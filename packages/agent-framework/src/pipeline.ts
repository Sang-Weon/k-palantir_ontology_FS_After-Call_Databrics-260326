/**
 * ACW 파이프라인 오케스트레이터
 *
 * 통화 종료 → 전체 ACW 자동화 파이프라인 실행
 * [STT 수신] → [ACW Agent] → [Compliance Agent] → [QA Agent] → [MCP Write-back]
 */

import { ACWAgent, type ACWSummaryOutput, type SentimentOutput } from './agents/acw-agent';
import { ComplianceAgent, type ComplianceOutput } from './agents/compliance-agent';
import { QAAgent, type QAOutput } from './agents/qa-agent';
import { ACWMCPServer } from '../mcp-server/src/server';
import type { Transcript, GovernanceLevel } from '../ontology/src/types';

// ── 파이프라인 결과 타입 ───────────────────────────────────────

export interface PipelineResult {
  call_id: string;
  status: 'SUCCESS' | 'PARTIAL' | 'FAILED';
  processing_time_ms: number;

  // Stage 1: ACW Agent 결과
  summary: ACWSummaryOutput;
  sentiment: SentimentOutput;

  // Stage 2: Compliance Agent 결과
  compliance: ComplianceOutput;

  // Stage 3: QA Agent 결과
  qa: QAOutput;

  // Stage 4: Write-back 결과
  write_back: WriteBackResult[];

  // 에러
  errors: PipelineError[];
}

interface WriteBackResult {
  tool: string;
  governance_level: GovernanceLevel;
  status: 'SUCCESS' | 'FAILED' | 'AWAITING_APPROVAL';
  data: Record<string, unknown>;
}

interface PipelineError {
  stage: string;
  error: string;
  recoverable: boolean;
}

// ── 파이프라인 설정 ──────────────────────────────────────────

interface PipelineConfig {
  enableCompliance: boolean;
  enableQA: boolean;
  enableWriteBack: boolean;
  apiKey?: string;
  model?: string;
}

const DEFAULT_CONFIG: PipelineConfig = {
  enableCompliance: true,
  enableQA: true,
  enableWriteBack: true,
};

// ── 파이프라인 오케스트레이터 ──────────────────────────────────

export class ACWPipeline {
  private acwAgent: ACWAgent;
  private complianceAgent: ComplianceAgent;
  private qaAgent: QAAgent;
  private mcpServer: ACWMCPServer;
  private config: PipelineConfig;

  constructor(config?: Partial<PipelineConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    const agentOpts = {
      apiKey: this.config.apiKey,
      model: this.config.model,
    };

    this.acwAgent = new ACWAgent(agentOpts);
    this.complianceAgent = new ComplianceAgent(agentOpts);
    this.qaAgent = new QAAgent(agentOpts);
    this.mcpServer = new ACWMCPServer();
  }

  /**
   * 전체 ACW 파이프라인 실행
   *
   * Stage 1: ACW Agent (요약 + 감성분석) — 병렬
   * Stage 2: Compliance Agent (불완전판매 + 감정노동) — Stage 1 결과 참조
   * Stage 3: QA Agent (품질 평가) — Stage 1과 병렬 가능
   * Stage 4: MCP Write-back — 거버넌스 레벨별 실행
   */
  async execute(transcript: Transcript): Promise<PipelineResult> {
    const startTime = Date.now();
    const callId = transcript.call_id;
    const errors: PipelineError[] = [];

    let summary: ACWSummaryOutput | null = null;
    let sentiment: SentimentOutput | null = null;
    let compliance: ComplianceOutput | null = null;
    let qa: QAOutput | null = null;
    const writeBackResults: WriteBackResult[] = [];

    // ── Stage 1 + 3: ACW Agent + QA Agent 병렬 실행 ────────────

    const stage1Promise = this.acwAgent.processCall(transcript).catch((err) => {
      errors.push({ stage: 'ACW_AGENT', error: String(err), recoverable: false });
      return null;
    });

    const stage3Promise = this.config.enableQA
      ? this.qaAgent.evaluate(transcript).catch((err) => {
          errors.push({ stage: 'QA_AGENT', error: String(err), recoverable: true });
          return null;
        })
      : Promise.resolve(null);

    const [stage1Result, stage3Result] = await Promise.all([stage1Promise, stage3Promise]);

    if (stage1Result) {
      summary = stage1Result.summary;
      sentiment = stage1Result.sentiment;
    }
    qa = stage3Result;

    // ── Stage 2: Compliance Agent (Stage 1 감성 결과 참조) ───────

    if (this.config.enableCompliance) {
      try {
        // 감정노동 긴급 체크 (규칙 기반, 빠름)
        const urgentCheck = await this.complianceAgent.checkEmotionalLaborUrgent(
          transcript.segments.slice(-10), // 최근 10개 세그먼트
          0 // TODO: 상담원 감정노동 지수 연동
        );

        if (urgentCheck.requiresImmediateAction) {
          // 감정노동 보호 즉시 실행 (Level 2 — 법적 의무)
          const pauseResult = await this.mcpServer.executeTool('acd_pause_agent', {
            agent_id: 'AGENT_FROM_CALL', // TODO: Call에서 추출
            call_id: callId,
            reason: urgentCheck.reason,
            duration_minutes: 10,
          });
          writeBackResults.push({
            tool: 'acd_pause_agent',
            governance_level: 2,
            status: pauseResult.status,
            data: pauseResult.data,
          });

          // 관리자 알림
          const notifyResult = await this.mcpServer.executeTool('notify_supervisor', {
            agent_id: 'AGENT_FROM_CALL',
            call_id: callId,
            alert_type: 'VERBAL_ABUSE',
            message: urgentCheck.reason,
            severity: 'CRITICAL',
          });
          writeBackResults.push({
            tool: 'notify_supervisor',
            governance_level: 2,
            status: notifyResult.status,
            data: notifyResult.data,
          });
        }

        // AI 기반 심층 분석
        compliance = await this.complianceAgent.analyze(transcript, sentiment || undefined);
      } catch (err) {
        errors.push({ stage: 'COMPLIANCE_AGENT', error: String(err), recoverable: true });
      }
    }

    // ── Stage 4: Write-back ───────────────────────────────────

    if (this.config.enableWriteBack && summary) {
      // 4-1: CRM 요약 등록 (Level 2)
      try {
        const crmResult = await this.mcpServer.executeTool('crm_update_call', {
          call_id: callId,
          summary_text: summary.summary_text,
          disposition_code: summary.disposition_code,
          intent: summary.intent_primary,
          key_entities: summary.key_entities,
          action_items: summary.action_items,
          ai_confidence: summary.confidence,
        });
        writeBackResults.push({
          tool: 'crm_update_call',
          governance_level: 2,
          status: crmResult.status,
          data: crmResult.data,
        });
      } catch (err) {
        errors.push({ stage: 'WRITE_BACK_CRM', error: String(err), recoverable: true });
      }

      // 4-2: 상담이력 DB 등록 (Level 2)
      try {
        const dbResult = await this.mcpServer.executeTool('calldb_insert_summary', {
          call_id: callId,
          summary_text: summary.summary_text,
          intent_primary: summary.intent_primary,
          intent_secondary: summary.intent_secondary,
          key_entities: summary.key_entities,
          resolution_status: summary.resolution_status,
        });
        writeBackResults.push({
          tool: 'calldb_insert_summary',
          governance_level: 2,
          status: dbResult.status,
          data: dbResult.data,
        });
      } catch (err) {
        errors.push({ stage: 'WRITE_BACK_DB', error: String(err), recoverable: true });
      }

      // 4-3: 컴플라이언스 케이스 (Level 1 — 승인 대기)
      if (compliance?.flags && compliance.flags.length > 0) {
        for (const flag of compliance.flags) {
          if (flag.type === 'INCOMPLETE_SALE' || flag.type === 'MISREPRESENTATION') {
            try {
              const compResult = await this.mcpServer.executeTool('compliance_create_case', {
                call_id: callId,
                flag_type: flag.type,
                severity: flag.severity,
                description: flag.description,
                evidence_segments: flag.evidence_segments,
                evidence_text: flag.evidence_text,
                regulation_reference: flag.regulation_reference,
                ai_confidence: flag.confidence,
              });
              writeBackResults.push({
                tool: 'compliance_create_case',
                governance_level: 1,
                status: compResult.status,
                data: compResult.data,
              });
            } catch (err) {
              errors.push({ stage: 'WRITE_BACK_COMPLIANCE', error: String(err), recoverable: true });
            }
          }
        }
      }

      // 4-4: QA 점수 등록 (Level 3)
      if (qa) {
        try {
          const qaResult = await this.mcpServer.executeTool('qa_insert_score', {
            call_id: callId,
            agent_id: 'AGENT_FROM_CALL',
            total_score: qa.total_score,
            categories: qa.categories,
            coaching_points: qa.coaching_points,
          });
          writeBackResults.push({
            tool: 'qa_insert_score',
            governance_level: 3,
            status: qaResult.status,
            data: qaResult.data,
          });
        } catch (err) {
          errors.push({ stage: 'WRITE_BACK_QA', error: String(err), recoverable: true });
        }
      }
    }

    // ── 결과 조립 ────────────────────────────────────────────

    const status = errors.length === 0
      ? 'SUCCESS'
      : errors.some((e) => !e.recoverable)
        ? 'FAILED'
        : 'PARTIAL';

    return {
      call_id: callId,
      status,
      processing_time_ms: Date.now() - startTime,
      summary: summary!,
      sentiment: sentiment!,
      compliance: compliance || { flags: [], emotional_labor_alert: { triggered: false, reason: null, recommended_action: null, agent_stress_level: null }, overall_risk_level: 'NONE' },
      qa: qa || { total_score: 0, categories: { greeting: 0, problem_identification: 0, solution_delivery: 0, compliance: 0, closing: 0, empathy: 0 }, coaching_points: [], strengths: [], improvements: [] },
      write_back: writeBackResults,
      errors,
    };
  }

  /** 감사 로그 조회 */
  getAuditLog() {
    return this.mcpServer.getAuditLog();
  }

  /** 감사 통계 */
  getAuditStats() {
    return this.mcpServer.getAuditStats();
  }
}

export default ACWPipeline;

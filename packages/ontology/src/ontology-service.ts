/**
 * 온톨로지 서비스 레이어 — Databricks Delta Lake 연동
 *
 * EG 대체자산관리 온톨로지 서비스 패턴을 ACW 도메인에 적용
 * CRUD + 실시간 파이프라인 연동 + 감사 로그
 */

import {
  OBJECT_TYPE_DEFINITIONS,
  LINK_TYPES,
  PROPERTY_TYPES,
  ACTION_TYPES,
  type ObjectTypeDefinition,
  type LinkType,
  type PropertyType,
  type ActionType,
  type Call,
  type Transcript,
  type CallSummary,
  type Sentiment,
  type ComplianceFlag,
  type Agent,
  type QAScore,
  type AuditLog,
  type GovernanceLevel,
  type WriteBackStatus,
} from './types';

// ── Databricks 클라이언트 인터페이스 ───────────────────────────────

interface DatabricksClient {
  query<T>(sql: string, params?: unknown[]): Promise<T[]>;
  execute(sql: string, params?: unknown[]): Promise<{ rowsAffected: number }>;
}

// ── 온톨로지 서비스 ──────────────────────────────────────────────

export class OntologyService {
  private db: DatabricksClient;

  constructor(databricksClient: DatabricksClient) {
    this.db = databricksClient;
  }

  // ═══ 온톨로지 메타데이터 조회 ═══════════════════════════════════

  /** Object Type 정의 조회 */
  getObjectTypes(): ObjectTypeDefinition[] {
    return OBJECT_TYPE_DEFINITIONS;
  }

  /** Link Type 정의 조회 */
  getLinkTypes(): LinkType[] {
    return LINK_TYPES;
  }

  /** Property Type 정의 조회 */
  getPropertyTypes(): PropertyType[] {
    return PROPERTY_TYPES;
  }

  /** Action Type 정의 조회 (Write-back 거버넌스 포함) */
  getActionTypes(): ActionType[] {
    return ACTION_TYPES;
  }

  /** 특정 거버넌스 레벨의 액션만 조회 */
  getActionsByLevel(level: GovernanceLevel): ActionType[] {
    return ACTION_TYPES.filter((a) => a.governance_level === level);
  }

  // ═══ Call CRUD ═══════════════════════════════════════════════

  async getCall(callId: string): Promise<Call | null> {
    const rows = await this.db.query<Call>(
      `SELECT * FROM ontology_data.calls WHERE call_id = ?`,
      [callId]
    );
    return rows[0] || null;
  }

  async insertCall(call: Omit<Call, 'created_at'>): Promise<void> {
    await this.db.execute(
      `INSERT INTO ontology_data.calls
       (call_id, customer_id, agent_id, channel, queue, start_time, end_time,
        duration_seconds, acw_start_time, acw_end_time, acw_duration_seconds,
        acw_method, recording_url, transcript_id, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        call.id, call.customer_id, call.agent_id, call.channel, call.queue,
        call.start_time, call.end_time, call.duration_seconds,
        call.acw_start_time, call.acw_end_time, call.acw_duration_seconds,
        call.acw_method, call.recording_url, call.transcript_id, call.status,
      ]
    );
  }

  async updateCallACW(callId: string, acwData: {
    acw_end_time: string;
    acw_duration_seconds: number;
    acw_method: string;
    status: string;
  }): Promise<void> {
    await this.db.execute(
      `UPDATE ontology_data.calls
       SET acw_end_time = ?, acw_duration_seconds = ?, acw_method = ?, status = ?
       WHERE call_id = ?`,
      [acwData.acw_end_time, acwData.acw_duration_seconds, acwData.acw_method, acwData.status, callId]
    );
  }

  // ═══ Transcript CRUD ═══════════════════════════════════════════

  async getTranscript(callId: string): Promise<Transcript | null> {
    const rows = await this.db.query<Transcript>(
      `SELECT * FROM ontology_data.transcripts WHERE call_id = ?`,
      [callId]
    );
    return rows[0] || null;
  }

  async insertTranscript(transcript: Transcript): Promise<void> {
    await this.db.execute(
      `INSERT INTO ontology_data.transcripts
       (transcript_id, call_id, full_text, segments, segment_count,
        stt_engine, stt_confidence, language, word_count)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        transcript.id, transcript.call_id, transcript.full_text,
        JSON.stringify(transcript.segments), transcript.segments.length,
        transcript.stt_engine, transcript.stt_confidence, transcript.language,
        transcript.full_text.split(/\s+/).length,
      ]
    );
  }

  // ═══ CallSummary CRUD (Write-back 추적) ═══════════════════════

  async insertCallSummary(summary: CallSummary): Promise<void> {
    await this.db.execute(
      `INSERT INTO ontology_data.call_summaries
       (summary_id, call_id, summary_text, intent_primary, intent_secondary,
        key_entities, action_items, resolution_status, disposition_code,
        ai_confidence, write_back_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        summary.id, summary.call_id, summary.summary_text,
        summary.intent_primary, JSON.stringify(summary.intent_secondary),
        JSON.stringify(summary.key_entities), JSON.stringify(summary.action_items),
        summary.resolution_status, summary.disposition_code,
        summary.ai_confidence, summary.write_back_status,
      ]
    );
  }

  async updateWriteBackStatus(summaryId: string, status: WriteBackStatus): Promise<void> {
    await this.db.execute(
      `UPDATE ontology_data.call_summaries
       SET write_back_status = ?, write_back_timestamp = current_timestamp()
       WHERE summary_id = ?`,
      [status, summaryId]
    );
  }

  // ═══ Sentiment CRUD ══════════════════════════════════════════

  async insertSentiment(sentiment: Sentiment): Promise<void> {
    await this.db.execute(
      `INSERT INTO ontology_data.sentiments
       (sentiment_id, call_id, overall_sentiment, customer_score, agent_score,
        sentiment_trajectory, emotion_peaks, verbal_abuse_detected, abuse_segments)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        sentiment.id, sentiment.call_id, sentiment.overall_sentiment,
        sentiment.customer_sentiment_score, sentiment.agent_sentiment_score,
        sentiment.sentiment_trajectory,
        JSON.stringify(sentiment.emotion_peaks),
        sentiment.verbal_abuse_detected,
        JSON.stringify(sentiment.abuse_segments),
      ]
    );
  }

  // ═══ ComplianceFlag CRUD ══════════════════════════════════════

  async insertComplianceFlag(flag: ComplianceFlag): Promise<void> {
    await this.db.execute(
      `INSERT INTO ontology_data.compliance_flags
       (flag_id, call_id, flag_type, severity, evidence_segments, evidence_text,
        description, regulation_ref, status, ai_confidence)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        flag.id, flag.call_id, flag.type, flag.severity,
        JSON.stringify(flag.evidence_segments), JSON.stringify(flag.evidence_text),
        flag.description, flag.regulation_reference, flag.status, flag.ai_confidence,
      ]
    );
  }

  async updateComplianceFlagStatus(
    flagId: string,
    status: string,
    reviewerId: string,
    reviewNote: string
  ): Promise<void> {
    await this.db.execute(
      `UPDATE ontology_data.compliance_flags
       SET status = ?, reviewer_id = ?, review_note = ?, reviewed_at = current_timestamp()
       WHERE flag_id = ?`,
      [status, reviewerId, reviewNote, flagId]
    );
  }

  // ═══ QAScore CRUD ═══════════════════════════════════════════

  async insertQAScore(qaScore: QAScore): Promise<void> {
    await this.db.execute(
      `INSERT INTO ontology_data.qa_scores
       (qa_id, call_id, agent_id, total_score,
        score_greeting, score_problem_id, score_solution,
        score_compliance, score_closing, score_empathy,
        coaching_points, strengths, improvements)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        qaScore.id, qaScore.call_id, qaScore.agent_id, qaScore.total_score,
        qaScore.categories.greeting, qaScore.categories.problem_identification,
        qaScore.categories.solution_delivery, qaScore.categories.compliance,
        qaScore.categories.closing, qaScore.categories.empathy,
        JSON.stringify(qaScore.coaching_points),
        JSON.stringify(qaScore.strengths), JSON.stringify(qaScore.improvements),
      ]
    );
  }

  // ═══ 감사 로그 (append-only) ═══════════════════════════════════

  async insertAuditLog(log: AuditLog): Promise<void> {
    await this.db.execute(
      `INSERT INTO ontology_audit.acw_action_log
       (audit_id, action_id, call_id, agent_id, governance_level,
        status, mcp_tool, write_back_target, parameters, result,
        error_message, initiated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        log.audit_id, log.action_id, log.call_id, log.agent_id,
        log.governance_level, log.status, log.mcp_tool, log.write_back_target,
        JSON.stringify(log.parameters), JSON.stringify(log.result),
        log.error_message, 'AI_AGENT',
      ]
    );
  }

  // ═══ 대시보드 쿼리 ══════════════════════════════════════════

  /** ACW 절감 현황 */
  async getACWSavings(dateFrom: string, dateTo: string) {
    return this.db.query(
      `SELECT * FROM ontology_data.v_acw_savings
       WHERE call_date BETWEEN ? AND ?
       ORDER BY call_date`,
      [dateFrom, dateTo]
    );
  }

  /** 감성 히트맵 */
  async getSentimentHeatmap(dateFrom: string, dateTo: string) {
    return this.db.query(
      `SELECT * FROM ontology_data.v_sentiment_heatmap
       WHERE call_date BETWEEN ? AND ?`,
      [dateFrom, dateTo]
    );
  }

  /** 컴플라이언스 현황 */
  async getComplianceDashboard(dateFrom: string, dateTo: string) {
    return this.db.query(
      `SELECT * FROM ontology_data.v_compliance_dashboard
       WHERE flag_date BETWEEN ? AND ?`,
      [dateFrom, dateTo]
    );
  }

  /** 상담원 성과 (고용형태별) */
  async getAgentPerformance(employmentType?: string) {
    if (employmentType) {
      return this.db.query(
        `SELECT * FROM ontology_data.v_agent_performance WHERE employment_type = ?`,
        [employmentType]
      );
    }
    return this.db.query(`SELECT * FROM ontology_data.v_agent_performance`);
  }

  // ═══ 온톨로지 그래프 생성 (시각화용) ═══════════════════════════

  /** 특정 통화의 온톨로지 그래프 데이터 반환 */
  async getCallOntologyGraph(callId: string): Promise<OntologyGraph> {
    const [call, transcript, summary, sentiment, flags, qaScore] = await Promise.all([
      this.getCall(callId),
      this.getTranscript(callId),
      this.db.query(`SELECT * FROM ontology_data.call_summaries WHERE call_id = ?`, [callId]),
      this.db.query(`SELECT * FROM ontology_data.sentiments WHERE call_id = ?`, [callId]),
      this.db.query(`SELECT * FROM ontology_data.compliance_flags WHERE call_id = ?`, [callId]),
      this.db.query(`SELECT * FROM ontology_data.qa_scores WHERE call_id = ?`, [callId]),
    ]);

    const nodes: OntologyNode[] = [];
    const edges: OntologyEdge[] = [];

    if (call) {
      nodes.push({ id: callId, type: 'Call', label: `통화 ${callId}`, data: call });
    }
    if (transcript) {
      nodes.push({ id: `T-${callId}`, type: 'Transcript', label: '전사 텍스트', data: transcript });
      edges.push({ from: callId, to: `T-${callId}`, type: 'HAS_TRANSCRIPT' });
    }
    if ((summary as unknown[]).length > 0) {
      nodes.push({ id: `S-${callId}`, type: 'CallSummary', label: 'AI 요약', data: (summary as unknown[])[0] });
      edges.push({ from: callId, to: `S-${callId}`, type: 'HAS_SUMMARY' });
    }
    if ((sentiment as unknown[]).length > 0) {
      nodes.push({ id: `SE-${callId}`, type: 'Sentiment', label: '감성 분석', data: (sentiment as unknown[])[0] });
      edges.push({ from: callId, to: `SE-${callId}`, type: 'HAS_SENTIMENT' });
    }
    for (const flag of flags as ComplianceFlag[]) {
      nodes.push({ id: flag.id, type: 'ComplianceFlag', label: `플래그: ${flag.type}`, data: flag });
      edges.push({ from: callId, to: flag.id, type: 'HAS_FLAG' });
    }
    if ((qaScore as unknown[]).length > 0) {
      nodes.push({ id: `QA-${callId}`, type: 'QAScore', label: 'QA 평가', data: (qaScore as unknown[])[0] });
      edges.push({ from: callId, to: `QA-${callId}`, type: 'HAS_QA' });
    }

    return { nodes, edges };
  }
}

// ── 그래프 타입 ──────────────────────────────────────────────

interface OntologyNode {
  id: string;
  type: string;
  label: string;
  data: unknown;
}

interface OntologyEdge {
  from: string;
  to: string;
  type: string;
}

interface OntologyGraph {
  nodes: OntologyNode[];
  edges: OntologyEdge[];
}

export default OntologyService;

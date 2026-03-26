/**
 * MCP Server — K-Palantir ACW Write-back
 *
 * 6개 Tool을 MCP 프로토콜로 제공
 * 거버넌스 레벨별 자동 승인/대기 관리
 */

import { MCP_TOOLS, type MCPToolDefinition, type MCPToolResult } from './tools/crm-tools';

// ── MCP Server 클래스 ──────────────────────────────────────────

export class ACWMCPServer {
  private tools: Map<string, MCPToolDefinition>;
  private auditLog: AuditLogEntry[] = [];

  constructor() {
    this.tools = new Map();
    for (const tool of MCP_TOOLS) {
      this.tools.set(tool.name, tool);
    }
  }

  /** 등록된 모든 Tool 목록 반환 */
  listTools(): { name: string; description: string; governance_level: number }[] {
    return [...this.tools.values()].map((t) => ({
      name: t.name,
      description: t.description,
      governance_level: t.governance_level,
    }));
  }

  /** Tool 실행 */
  async executeTool(toolName: string, params: unknown): Promise<MCPToolResult> {
    const tool = this.tools.get(toolName);
    if (!tool) {
      throw new Error(`Unknown MCP tool: ${toolName}`);
    }

    try {
      const result = await tool.execute(params);

      // 감사 로그 저장
      this.auditLog.push({
        ...result.audit_entry,
        tool_name: toolName,
      });

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const auditEntry = {
        action_id: 'UNKNOWN',
        mcp_tool: toolName,
        governance_level: tool.governance_level,
        status: 'FAILED',
        parameters: params as Record<string, unknown>,
        result: { error: errorMessage },
        timestamp: new Date().toISOString(),
        tool_name: toolName,
      };
      this.auditLog.push(auditEntry);

      return {
        status: 'FAILED',
        data: { error: errorMessage },
        audit_entry: auditEntry,
      };
    }
  }

  /** 감사 로그 조회 */
  getAuditLog(filters?: { call_id?: string; tool_name?: string; level?: number }): AuditLogEntry[] {
    let logs = [...this.auditLog];

    if (filters?.call_id) {
      logs = logs.filter((l) => JSON.stringify(l.parameters).includes(filters.call_id!));
    }
    if (filters?.tool_name) {
      logs = logs.filter((l) => l.tool_name === filters.tool_name);
    }
    if (filters?.level) {
      logs = logs.filter((l) => l.governance_level === filters.level);
    }

    return logs;
  }

  /** 감사 로그 통계 */
  getAuditStats(): AuditStats {
    const total = this.auditLog.length;
    const byStatus = this.countBy(this.auditLog, 'status');
    const byLevel = this.countBy(this.auditLog, 'governance_level');
    const byTool = this.countBy(this.auditLog, 'tool_name');

    return { total, byStatus, byLevel, byTool };
  }

  private countBy<T>(arr: T[], key: keyof T): Record<string, number> {
    const result: Record<string, number> = {};
    for (const item of arr) {
      const val = String(item[key]);
      result[val] = (result[val] || 0) + 1;
    }
    return result;
  }
}

// ── 타입 ────────────────────────────────────────────────────

interface AuditLogEntry {
  action_id: string;
  mcp_tool: string;
  tool_name: string;
  governance_level: number;
  status: string;
  parameters: Record<string, unknown>;
  result: Record<string, unknown>;
  timestamp: string;
}

interface AuditStats {
  total: number;
  byStatus: Record<string, number>;
  byLevel: Record<string, number>;
  byTool: Record<string, number>;
}

export default ACWMCPServer;

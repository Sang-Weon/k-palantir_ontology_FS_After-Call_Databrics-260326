/**
 * @k-palantir/mcp-server — Write-back MCP Tools + Governance
 */

export { ACWMCPServer } from './server';
export {
  MCP_TOOLS,
  evaluateGovernance,
  crmUpdateCall,
  calldbInsertSummary,
  complianceCreateCase,
  acdPauseAgent,
  qaInsertScore,
  notifySupervisor,
} from './tools/crm-tools';

export type { MCPToolDefinition, MCPToolResult, GovernanceLevel } from './tools/crm-tools';

/**
 * Compliance Agent — 불완전판매 탐지 + 감정노동 보호
 *
 * Level 1: 불완전판매 → 사람 승인 필수
 * Level 2: 감정노동 보호 → 즉시 자동 실행 (법적 의무)
 */

import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import type {
  Transcript,
  ComplianceFlag,
  ComplianceFlagType,
  Severity,
  SentimentOutput,
} from './acw-agent';
import type { Sentiment } from '../../ontology/src/types';

// ── Zod 스키마 ──────────────────────────────────────────────

const ComplianceFlagOutputSchema = z.object({
  type: z.enum([
    'INCOMPLETE_SALE',
    'VERBAL_ABUSE',
    'PRIVACY_VIOLATION',
    'MISREPRESENTATION',
    'EMOTIONAL_LABOR',
    'UNAUTHORIZED_PROMISE',
    'REGULATORY_BREACH',
  ]),
  severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
  evidence_segments: z.array(z.number()),
  evidence_text: z.array(z.string()),
  description: z.string(),
  regulation_reference: z.string(),
  confidence: z.number().min(0).max(1),
});

const EmotionalLaborAlertSchema = z.object({
  triggered: z.boolean(),
  reason: z.string().nullable(),
  recommended_action: z.string().nullable(),
  agent_stress_level: z.enum(['LOW', 'MODERATE', 'HIGH', 'CRITICAL']).nullable(),
});

const ComplianceOutputSchema = z.object({
  flags: z.array(ComplianceFlagOutputSchema),
  emotional_labor_alert: EmotionalLaborAlertSchema,
  overall_risk_level: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'NONE']),
});

export type ComplianceFlagOutput = z.infer<typeof ComplianceFlagOutputSchema>;
export type ComplianceOutput = z.infer<typeof ComplianceOutputSchema>;

// ── Compliance Agent 메인 클래스 ────────────────────────────────

export class ComplianceAgent {
  private client: Anthropic;
  private systemPrompt: string;
  private model: string;

  constructor(options?: { apiKey?: string; model?: string }) {
    this.client = new Anthropic({
      apiKey: options?.apiKey || process.env.ANTHROPIC_API_KEY,
    });
    this.model = options?.model || 'claude-sonnet-4-20250514';
    this.systemPrompt = this.loadPrompt();
  }

  private loadPrompt(): string {
    try {
      return readFileSync(resolve(__dirname, '../../../../prompts/compliance-agent.md'), 'utf-8');
    } catch {
      return DEFAULT_COMPLIANCE_PROMPT;
    }
  }

  /**
   * 컴플라이언스 분석 실행
   * 전사 텍스트 + 감성 분석 결과를 함께 전달
   */
  async analyze(
    transcript: import('../../ontology/src/types').Transcript,
    sentimentResult?: SentimentOutput
  ): Promise<ComplianceOutput> {
    const formattedTranscript = this.formatTranscript(transcript);

    let sentimentContext = '';
    if (sentimentResult) {
      sentimentContext = `

## 감성 분석 결과 (참고)
- 전체 감성: ${sentimentResult.overall_sentiment}
- 고객 감성 점수: ${sentimentResult.customer_sentiment_score}
- 상담원 감성 점수: ${sentimentResult.agent_sentiment_score}
- 감성 궤적: ${sentimentResult.sentiment_trajectory}
- 욕설/폭언 탐지: ${sentimentResult.verbal_abuse_detected}
- 감정 급변 구간: ${sentimentResult.emotion_peaks.length}건`;
    }

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      system: this.systemPrompt,
      messages: [
        {
          role: 'user',
          content: `다음 통화 전사 텍스트를 컴플라이언스 관점에서 분석하세요.
${sentimentContext}

## 전사 텍스트
${formattedTranscript}

불완전판매, 욕설/폭언, 개인정보 위반, 허위설명, 감정노동, 무단 약속 등을 탐지하고 JSON 형식으로 출력하세요.`,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Expected text response from Claude');
    }

    const parsed = this.extractJSON(content.text);
    return ComplianceOutputSchema.parse(parsed);
  }

  /**
   * 감정노동 보호 긴급 체크
   * 실시간 스트리밍 중에도 호출 가능
   * Level 2: 즉시 자동 실행 (산안법 41조)
   */
  async checkEmotionalLaborUrgent(
    recentSegments: import('../../ontology/src/types').TranscriptSegment[],
    agentEmotionalLaborScore: number
  ): Promise<{
    requiresImmediateAction: boolean;
    action: 'PAUSE_QUEUE' | 'ALERT_SUPERVISOR' | 'NONE';
    reason: string;
  }> {
    // 규칙 기반 즉시 판단 (AI 호출 없이)
    const abuseKeywords = [
      '씨발', '개새끼', '미친', '죽여', '병신', '꺼져',
      '고소', '가만 안 둔다', '때려', '불태워',
    ];

    for (const segment of recentSegments) {
      if (segment.speaker !== 'CUSTOMER') continue;

      const textLower = segment.text.toLowerCase();
      const hasAbuse = abuseKeywords.some((kw) => textLower.includes(kw));

      if (hasAbuse) {
        return {
          requiresImmediateAction: true,
          action: 'PAUSE_QUEUE',
          reason: `고객 욕설/폭언 감지 (세그먼트 ${segment.index}). 산안법 41조에 따른 보호 조치 즉시 실행.`,
        };
      }
    }

    // 누적 감정노동 지수 체크
    if (agentEmotionalLaborScore >= 0.8) {
      return {
        requiresImmediateAction: true,
        action: 'ALERT_SUPERVISOR',
        reason: `상담원 감정노동 지수 ${agentEmotionalLaborScore} — 임계치(0.8) 초과. 관리자 개입 필요.`,
      };
    }

    return {
      requiresImmediateAction: false,
      action: 'NONE',
      reason: '감정노동 위험 수준 정상',
    };
  }

  /**
   * 불완전판매 리스크 빠른 스크리닝
   * 키워드 기반으로 AI 분석 필요 여부를 사전 판단
   */
  isIncompleteSaleRisk(transcript: import('../../ontology/src/types').Transcript): boolean {
    const riskKeywords = [
      '원금 보장', '수익 보장', '반드시 수익', '손실 없',
      '잘 모르겠', '이해가 안', '뭔지 모르', '설명 안',
      '가입해야', '지금 안 하면', '한정', '특별 혜택',
      '청약 철회', '적합성', '투자 성향',
    ];

    const fullText = transcript.segments.map((s) => s.text).join(' ');
    return riskKeywords.some((kw) => fullText.includes(kw));
  }

  // ── 유틸리티 ──────────────────────────────────────────────

  private formatTranscript(transcript: import('../../ontology/src/types').Transcript): string {
    return transcript.segments
      .map((seg) => {
        const speaker = seg.speaker === 'AGENT' ? '상담원' : '고객';
        const time = this.formatTime(seg.start_ms);
        return `[${seg.index}] ${time} ${speaker}: ${seg.text}`;
      })
      .join('\n');
  }

  private formatTime(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  private extractJSON(text: string): unknown {
    const jsonBlockMatch = text.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonBlockMatch) {
      return JSON.parse(jsonBlockMatch[1]);
    }
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error('No JSON found in response');
  }
}

const DEFAULT_COMPLIANCE_PROMPT = `# Compliance Agent

통화 전사 텍스트를 분석하여 컴플라이언스 위반을 탐지합니다.

## 탐지 유형
1. INCOMPLETE_SALE: 불완전판매 (Level 1 — 승인 필수)
2. VERBAL_ABUSE: 고객 욕설/폭언 (Level 2 — 즉시 자동)
3. PRIVACY_VIOLATION: 개인정보 위반
4. MISREPRESENTATION: 상품 허위설명
5. EMOTIONAL_LABOR: 감정노동 과부하 (Level 2)
6. UNAUTHORIZED_PROMISE: 무단 약속
7. REGULATORY_BREACH: 규제 위반

JSON 형식으로 출력하세요.`;

export default ComplianceAgent;

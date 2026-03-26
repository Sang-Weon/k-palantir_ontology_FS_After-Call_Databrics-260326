/**
 * ACW Agent — 통화 요약 + 의도 분류 + 핵심 정보 추출 + 감성 분석
 *
 * 통화 종료 즉시 Transcript를 분석하여 ACW를 자동 처리
 * Write-back Level 2 (자동 실행 + 감사 로그)
 */

import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import type {
  Transcript,
  CallSummary,
  Sentiment,
  IntentCategory,
  KeyEntities,
  ResolutionStatus,
  SentimentType,
  SentimentTrajectory,
  EmotionPeak,
} from '../../ontology/src/types';

// ── Zod 스키마: Agent 출력 검증 ──────────────────────────────────

const KeyEntitiesSchema = z.object({
  account_number: z.string().optional(),
  product_name: z.string().optional(),
  amount: z.number().optional(),
  date: z.string().optional(),
  branch: z.string().optional(),
  card_number: z.string().optional(),
  loan_type: z.string().optional(),
  insurance_type: z.string().optional(),
});

const ACWSummaryOutputSchema = z.object({
  summary_text: z.string().min(10).max(500),
  intent_primary: z.string(),
  intent_secondary: z.array(z.string()),
  key_entities: KeyEntitiesSchema,
  action_items: z.array(z.string()),
  resolution_status: z.enum(['RESOLVED', 'PENDING', 'ESCALATED', 'CALLBACK_REQUIRED']),
  disposition_code: z.string(),
  confidence: z.number().min(0).max(1),
});

const EmotionPeakSchema = z.object({
  segment_index: z.number(),
  timestamp_ms: z.number(),
  emotion: z.enum(['ANGER', 'FRUSTRATION', 'SADNESS', 'SATISFACTION', 'ANXIETY', 'RELIEF']),
  intensity: z.number().min(0).max(1),
  speaker: z.enum(['AGENT', 'CUSTOMER']),
});

const SentimentOutputSchema = z.object({
  overall_sentiment: z.enum(['POSITIVE', 'NEUTRAL', 'NEGATIVE', 'ESCALATED']),
  customer_sentiment_score: z.number().min(-1).max(1),
  agent_sentiment_score: z.number().min(-1).max(1),
  sentiment_trajectory: z.enum(['IMPROVING', 'STABLE', 'DETERIORATING', 'VOLATILE']),
  emotion_peaks: z.array(EmotionPeakSchema),
  verbal_abuse_detected: z.boolean(),
  abuse_segments: z.array(z.number()),
});

export type ACWSummaryOutput = z.infer<typeof ACWSummaryOutputSchema>;
export type SentimentOutput = z.infer<typeof SentimentOutputSchema>;

// ── ACW Agent 메인 클래스 ──────────────────────────────────────

export class ACWAgent {
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
      return readFileSync(resolve(__dirname, '../../../../prompts/acw-agent.md'), 'utf-8');
    } catch {
      return DEFAULT_ACW_PROMPT;
    }
  }

  /**
   * 통화 요약 + 의도 분류 + 핵심 정보 추출
   */
  async summarize(transcript: Transcript): Promise<ACWSummaryOutput> {
    const formattedTranscript = this.formatTranscript(transcript);

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 2048,
      system: this.systemPrompt,
      messages: [
        {
          role: 'user',
          content: `다음 통화 전사 텍스트를 분석하여 ACW 자동 처리를 수행하세요.

## 통화 정보
- 통화 ID: ${transcript.call_id}
- STT 엔진: ${transcript.stt_engine}
- STT 신뢰도: ${transcript.stt_confidence}
- 세그먼트 수: ${transcript.segments.length}

## 전사 텍스트
${formattedTranscript}

위 내용을 분석하여 JSON 형식으로 출력하세요.`,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Expected text response from Claude');
    }

    const parsed = this.extractJSON(content.text);
    return ACWSummaryOutputSchema.parse(parsed);
  }

  /**
   * 감성 분석
   */
  async analyzeSentiment(transcript: Transcript): Promise<SentimentOutput> {
    const formattedTranscript = this.formatTranscript(transcript);

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 2048,
      system: SENTIMENT_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: `다음 통화 전사 텍스트의 감성을 분석하세요.

## 전사 텍스트
${formattedTranscript}

JSON 형식으로 감성 분석 결과를 출력하세요.`,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Expected text response from Claude');
    }

    const parsed = this.extractJSON(content.text);
    return SentimentOutputSchema.parse(parsed);
  }

  /**
   * 전체 ACW 파이프라인 실행
   * 요약 + 감성분석을 병렬로 실행하여 속도 최적화
   */
  async processCall(transcript: Transcript): Promise<{
    summary: ACWSummaryOutput;
    sentiment: SentimentOutput;
    processing_time_ms: number;
  }> {
    const startTime = Date.now();

    const [summary, sentiment] = await Promise.all([
      this.summarize(transcript),
      this.analyzeSentiment(transcript),
    ]);

    return {
      summary,
      sentiment,
      processing_time_ms: Date.now() - startTime,
    };
  }

  // ── 유틸리티 ───────────────────────────────────────────────

  private formatTranscript(transcript: Transcript): string {
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
    // JSON 블록 추출 (```json ... ``` 또는 { ... })
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

// ── 감성 분석 시스템 프롬프트 ───────────────────────────────────

const SENTIMENT_SYSTEM_PROMPT = `# 감성 분석 Agent

## 역할
통화 전사 텍스트를 분석하여 고객과 상담원의 감성을 평가합니다.

## 분석 항목
1. **전체 감성**: POSITIVE / NEUTRAL / NEGATIVE / ESCALATED
2. **고객 감성 점수**: -1.0(매우 부정) ~ +1.0(매우 긍정)
3. **상담원 감성 점수**: -1.0 ~ +1.0
4. **감성 궤적**: IMPROVING(개선) / STABLE(안정) / DETERIORATING(악화) / VOLATILE(불안정)
5. **감정 급변 구간**: 감정이 크게 변하는 세그먼트 식별
6. **욕설/폭언 탐지**: 산업안전보건법 제41조 (감정노동자 보호)

## 욕설/폭언 탐지 기준
- 직접적 욕설, 비속어
- 인격 모독적 발언
- 위협적 발언 ("고소", "가만 안 둔다" 등)
- 성희롱적 발언

## 출력 형식
반드시 JSON으로:
{
  "overall_sentiment": "NEGATIVE",
  "customer_sentiment_score": -0.6,
  "agent_sentiment_score": 0.3,
  "sentiment_trajectory": "DETERIORATING",
  "emotion_peaks": [
    {
      "segment_index": 12,
      "timestamp_ms": 45000,
      "emotion": "ANGER",
      "intensity": 0.8,
      "speaker": "CUSTOMER"
    }
  ],
  "verbal_abuse_detected": false,
  "abuse_segments": []
}`;

// ── 기본 프롬프트 (파일 로드 실패 시) ─────────────────────────────

const DEFAULT_ACW_PROMPT = `# ACW 자동화 Agent

통화 전사 텍스트를 분석하여:
1. 3~5문장 구조화 요약 생성
2. 주요 의도 분류 (50개 금융 카테고리)
3. 핵심 정보 추출 (계좌번호/상품명/금액 등 — PII 마스킹)
4. 후속 조치 사항 도출
5. CRM 처리코드 자동 매핑
6. 해결 상태 판단

반드시 JSON 형식으로 출력하세요.

PII 마스킹 규칙:
- 계좌번호: ****-****-1234
- 카드번호: ****-****-****-5678
- 주민등록번호: 절대 출력 금지
- 전화번호: 010-****-5678`;

export default ACWAgent;

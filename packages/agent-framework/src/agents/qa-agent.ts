/**
 * QA Agent — 상담 품질 자동 평가 + 코칭 포인트 생성
 *
 * Write-back Level 3 (자율 — 승인 불필요)
 * 6개 카테고리 100점 만점 평가
 */

import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import type { Transcript, QACategories, CoachingPoint } from '../../ontology/src/types';

// ── Zod 스키마 ──────────────────────────────────────────────

const CoachingPointSchema = z.object({
  category: z.enum([
    'greeting',
    'problem_identification',
    'solution_delivery',
    'compliance',
    'closing',
    'empathy',
  ]),
  segment_index: z.number(),
  suggestion: z.string(),
  priority: z.enum(['HIGH', 'MEDIUM', 'LOW']),
});

const QACategoriesSchema = z.object({
  greeting: z.number().min(0).max(20),
  problem_identification: z.number().min(0).max(20),
  solution_delivery: z.number().min(0).max(20),
  compliance: z.number().min(0).max(20),
  closing: z.number().min(0).max(10),
  empathy: z.number().min(0).max(10),
});

const QAOutputSchema = z.object({
  total_score: z.number().min(0).max(100),
  categories: QACategoriesSchema,
  coaching_points: z.array(CoachingPointSchema),
  strengths: z.array(z.string()),
  improvements: z.array(z.string()),
});

export type QAOutput = z.infer<typeof QAOutputSchema>;

// ── QA Agent 메인 클래스 ────────────────────────────────────────

export class QAAgent {
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
      return readFileSync(resolve(__dirname, '../../../../prompts/qa-agent.md'), 'utf-8');
    } catch {
      return DEFAULT_QA_PROMPT;
    }
  }

  /**
   * 상담 품질 평가 실행
   */
  async evaluate(transcript: Transcript): Promise<QAOutput> {
    const formattedTranscript = this.formatTranscript(transcript);

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      system: this.systemPrompt,
      messages: [
        {
          role: 'user',
          content: `다음 통화 전사 텍스트의 상담 품질을 평가하고 코칭 포인트를 도출하세요.

## 통화 정보
- 통화 ID: ${transcript.call_id}
- 세그먼트 수: ${transcript.segments.length}
- 전체 단어 수 (추정): ${transcript.full_text.split(/\s+/).length}

## 전사 텍스트
${formattedTranscript}

6개 카테고리(인사, 문제파악, 해결제시, 규제준수, 마무리, 공감) 기준으로 평가하고 JSON으로 출력하세요.`,
        },
      ],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Expected text response from Claude');
    }

    const parsed = this.extractJSON(content.text);
    const result = QAOutputSchema.parse(parsed);

    // 총점 검증: 카테고리 합계와 일치하는지
    const categorySum = Object.values(result.categories).reduce((a, b) => a + b, 0);
    if (Math.abs(result.total_score - categorySum) > 1) {
      result.total_score = categorySum;
    }

    return result;
  }

  /**
   * 상담원 트렌드 분석용 배치 평가
   * 최근 N건의 통화를 평가하여 트렌드 도출
   */
  async evaluateBatch(transcripts: Transcript[]): Promise<{
    evaluations: QAOutput[];
    trend: {
      avg_score: number;
      category_averages: Record<keyof QACategories, number>;
      common_improvements: string[];
      score_trend: 'IMPROVING' | 'STABLE' | 'DECLINING';
    };
  }> {
    const evaluations = await Promise.all(
      transcripts.map((t) => this.evaluate(t))
    );

    const avgScore = evaluations.reduce((sum, e) => sum + e.total_score, 0) / evaluations.length;

    const categoryKeys: (keyof QACategories)[] = [
      'greeting', 'problem_identification', 'solution_delivery',
      'compliance', 'closing', 'empathy',
    ];

    const category_averages = {} as Record<keyof QACategories, number>;
    for (const key of categoryKeys) {
      category_averages[key] =
        evaluations.reduce((sum, e) => sum + e.categories[key], 0) / evaluations.length;
    }

    // 개선 사항 빈도 분석
    const improvementCount = new Map<string, number>();
    for (const e of evaluations) {
      for (const imp of e.improvements) {
        improvementCount.set(imp, (improvementCount.get(imp) || 0) + 1);
      }
    }
    const common_improvements = [...improvementCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([text]) => text);

    // 점수 트렌드 (전반부 vs 후반부)
    const mid = Math.floor(evaluations.length / 2);
    const firstHalfAvg = evaluations.slice(0, mid).reduce((s, e) => s + e.total_score, 0) / mid;
    const secondHalfAvg = evaluations.slice(mid).reduce((s, e) => s + e.total_score, 0) / (evaluations.length - mid);
    const diff = secondHalfAvg - firstHalfAvg;
    const score_trend = diff > 3 ? 'IMPROVING' : diff < -3 ? 'DECLINING' : 'STABLE';

    return {
      evaluations,
      trend: { avg_score: avgScore, category_averages, common_improvements, score_trend },
    };
  }

  // ── 유틸리티 ──────────────────────────────────────────────

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

const DEFAULT_QA_PROMPT = `# QA Agent — 상담 품질 자동 평가

6개 카테고리(인사20, 문제파악20, 해결제시20, 규제준수20, 마무리10, 공감10) 총 100점 만점으로 평가.
코칭 포인트를 구체적 세그먼트 근거와 함께 제시.
JSON 형식으로 출력.`;

export default QAAgent;

import { z } from "zod";
import { AgentFindingSchema, AgentIdSchema, type AgentFinding, type AgentId } from "@mimera/agent-runtime";

export const ReviewerReportSchema = z
  .object({
    reviewerId: AgentIdSchema,
    score: z.number().min(0).max(100),
    hasVeto: z.boolean(),
    vetoReason: z.string().min(1).optional(),
    findings: z.array(AgentFindingSchema),
  })
  .strict();
export type ReviewerReport = z.infer<typeof ReviewerReportSchema>;

export const ReviewAggregationResultSchema = z
  .object({
    schemaVersion: z.literal("1"),
    componentId: z.string().min(1),
    overallScore: z.number().min(0).max(100),
    decision: z.enum(["APPROVED", "NEEDS_REVISION", "BLOCKED_BY_VETO"]),
    vetoes: z.array(
      z.object({
        reviewerId: AgentIdSchema,
        reason: z.string().min(1),
      }),
    ),
    reports: z.array(ReviewerReportSchema),
    summary: z.string().min(1),
    evaluatedAt: z.string().datetime({ offset: true }),
  })
  .strict();
export type ReviewAggregationResult = z.infer<typeof ReviewAggregationResultSchema>;

export interface AggregateReviewsInput {
  componentId: string;
  reports: ReviewerReport[];
  minimumScoreThreshold?: number; // Defaults to 80
}

export class ReviewAggregator {
  aggregate(input: AggregateReviewsInput): ReviewAggregationResult {
    if (input.reports.length === 0) {
      throw new Error("At least one reviewer report is required for review aggregation");
    }

    const threshold = input.minimumScoreThreshold ?? 80;
    const vetoes = input.reports
      .filter((report) => report.hasVeto)
      .map((report) => ({
        reviewerId: report.reviewerId,
        reason: report.vetoReason ?? `${report.reviewerId} issued a review veto`,
      }));

    const totalScore = input.reports.reduce((acc, report) => acc + report.score, 0);
    const overallScore = Math.round((totalScore / input.reports.length) * 100) / 100;

    let decision: ReviewAggregationResult["decision"] = "APPROVED";
    let summary = `All ${input.reports.length} reviewer reports passed threshold (${overallScore}/100).`;

    if (vetoes.length > 0) {
      decision = "BLOCKED_BY_VETO";
      summary = `Review blocked by ${vetoes.length} veto(es): ${vetoes.map((item) => `${item.reviewerId} (${item.reason})`).join("; ")}`;
    } else if (overallScore < threshold) {
      decision = "NEEDS_REVISION";
      summary = `Overall score ${overallScore}/100 is below the required threshold of ${threshold}/100.`;
    }

    return {
      schemaVersion: "1",
      componentId: input.componentId,
      overallScore,
      decision,
      vetoes,
      reports: input.reports,
      summary,
      evaluatedAt: new Date().toISOString(),
    };
  }
}

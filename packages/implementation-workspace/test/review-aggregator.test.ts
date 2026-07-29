import { expect, test } from "bun:test";
import { ReviewAggregator } from "../src/index.ts";

test("ReviewAggregator aggregates scores, enforces threshold, and respects reviewer vetoes", () => {
  const aggregator = new ReviewAggregator();

  // Test passing review without vetoes
  const passing = aggregator.aggregate({
    componentId: "navbar",
    minimumScoreThreshold: 80,
    reports: [
      { reviewerId: "visual-reviewer", score: 90, hasVeto: false, findings: [] },
      { reviewerId: "accessibility-reviewer", score: 85, hasVeto: false, findings: [] },
    ],
  });

  expect(passing.decision).toBe("APPROVED");
  expect(passing.overallScore).toBe(87.5);
  expect(passing.vetoes).toHaveLength(0);

  // Test failing score below threshold
  const lowScore = aggregator.aggregate({
    componentId: "navbar",
    minimumScoreThreshold: 80,
    reports: [
      { reviewerId: "visual-reviewer", score: 70, hasVeto: false, findings: [] },
      { reviewerId: "accessibility-reviewer", score: 60, hasVeto: false, findings: [] },
    ],
  });

  expect(lowScore.decision).toBe("NEEDS_REVISION");
  expect(lowScore.overallScore).toBe(65);

  // Test veto overriding high average score
  const vetoed = aggregator.aggregate({
    componentId: "navbar",
    minimumScoreThreshold: 80,
    reports: [
      { reviewerId: "visual-reviewer", score: 95, hasVeto: false, findings: [] },
      {
        reviewerId: "adversarial-reviewer",
        score: 90,
        hasVeto: true,
        vetoReason: "Unsanitized user input in component props",
        findings: [
          { id: "find-1", severity: "high", title: "XSS Vulnerability", detail: "Unescaped HTML", evidenceRefs: [] },
        ],
      },
    ],
  });

  expect(vetoed.decision).toBe("BLOCKED_BY_VETO");
  expect(vetoed.vetoes).toHaveLength(1);
  expect(vetoed.vetoes[0]?.reason).toBe("Unsanitized user input in component props");
});

import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import {
  RegressionLockSchema,
  type EvidenceEnvelope,
  type RegressionLock,
  type RegressionLockFile,
} from "@mimera/contracts";
import type { MimeraProject } from "@mimera/core";
import { z } from "zod";

export const RegressionLockEvidencePayloadSchema = z.object({
  schemaVersion: z.literal("1"),
  kind: z.literal("regression-lock"),
  lock: RegressionLockSchema,
  createdAt: z.string().datetime({ offset: true }),
});
export type RegressionLockEvidencePayload = z.infer<typeof RegressionLockEvidencePayloadSchema>;

export interface LockComponentInput {
  componentId: string;
  files: string[]; // relative paths from targetRoot
  lockedBy?: string;
  now?: string;
}

export interface LockViolation {
  componentId: string;
  relativePath: string;
  expectedHash: string;
  actualHash: string | null;
  reason: "modified" | "deleted";
}

export interface VerifyLocksResult {
  ok: boolean;
  totalLocksChecked: number;
  violations: LockViolation[];
  verifiedAt: string;
}

export class RegressionLockService {
  async lockComponent(
    project: MimeraProject,
    input: LockComponentInput,
  ): Promise<RegressionLock> {
    const session = project.currentSession();
    const targetRoot = project.config.targetRoot;
    const lockFiles: RegressionLockFile[] = [];

    for (const relPath of input.files) {
      const fullPath = join(targetRoot, relPath);
      const fileBytes = await readFile(fullPath);
      const fileStat = await stat(fullPath);
      const sha256 = createHash("sha256").update(fileBytes).digest("hex");

      lockFiles.push({
        relativePath: relPath,
        sha256,
        sizeBytes: fileStat.size,
      });
    }

    if (lockFiles.length === 0) {
      throw new Error(`Cannot create regression lock for ${input.componentId} without any files`);
    }

    const lock: RegressionLock = RegressionLockSchema.parse({
      schemaVersion: "1",
      componentId: input.componentId,
      sessionId: session.id,
      files: lockFiles,
      lockedAt: input.now ?? new Date().toISOString(),
      lockedBy: input.lockedBy ?? "mimera-lock-service",
      locked: true,
    });

    const payload: RegressionLockEvidencePayload = {
      schemaVersion: "1",
      kind: "regression-lock",
      lock,
      createdAt: lock.lockedAt,
    };

    project.recordEvidence({
      id: `lock-${input.componentId}-${Date.now()}`,
      payload,
      trust: "trusted-system",
      capturedAt: lock.lockedAt,
      contentHash: createHash("sha256").update(JSON.stringify(payload)).digest("hex"),
    });

    return lock;
  }

  async verifyLocks(project: MimeraProject): Promise<VerifyLocksResult> {
    const targetRoot = project.config.targetRoot;
    const violations: LockViolation[] = [];
    let totalLocksChecked = 0;

    for (const item of project.listEvidence<unknown>()) {
      const parsed = RegressionLockEvidencePayloadSchema.safeParse(item.payload);
      if (!parsed.success) continue;

      totalLocksChecked++;
      const lock = parsed.data.lock;

      for (const lockedFile of lock.files) {
        const fullPath = join(targetRoot, lockedFile.relativePath);
        try {
          const fileBytes = await readFile(fullPath);
          const currentHash = createHash("sha256").update(fileBytes).digest("hex");
          if (currentHash !== lockedFile.sha256) {
            violations.push({
              componentId: lock.componentId,
              relativePath: lockedFile.relativePath,
              expectedHash: lockedFile.sha256,
              actualHash: currentHash,
              reason: "modified",
            });
          }
        } catch {
          violations.push({
            componentId: lock.componentId,
            relativePath: lockedFile.relativePath,
            expectedHash: lockedFile.sha256,
            actualHash: null,
            reason: "deleted",
          });
        }
      }
    }

    return {
      ok: violations.length === 0,
      totalLocksChecked,
      violations,
      verifiedAt: new Date().toISOString(),
    };
  }
}

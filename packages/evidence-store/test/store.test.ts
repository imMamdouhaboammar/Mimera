import { afterEach, describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { EvidenceEnvelope, ReferenceSession } from "@mimera/contracts";
import {
  DuplicateSessionError,
  MimeraStore,
  SessionVersionConflictError,
} from "../src/index.ts";

const directories: string[] = [];

afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

async function createStore(): Promise<{ store: MimeraStore; path: string }> {
  const directory = await mkdtemp(join(tmpdir(), "mimera-store-"));
  directories.push(directory);
  const path = join(directory, "mimera.sqlite");
  return { store: new MimeraStore(path), path };
}

function session(overrides: Partial<ReferenceSession> = {}): ReferenceSession {
  return {
    id: "session-1",
    version: 1,
    targetRoot: "/tmp/target",
    referenceUrls: ["https://example.com"],
    host: "codex",
    mode: "structure",
    status: "CREATED",
    createdAt: "2026-07-27T10:00:00.000Z",
    updatedAt: "2026-07-27T10:00:00.000Z",
    ...overrides,
  };
}

describe("MimeraStore sessions", () => {
  test("persists sessions across store instances", async () => {
    const { store, path } = await createStore();
    store.createSession(session());
    store.close();

    const reopened = new MimeraStore(path);
    expect(reopened.getSession("session-1")).toEqual(session());
    reopened.close();
  });

  test("rejects duplicate session ids", async () => {
    const { store } = await createStore();
    store.createSession(session());
    expect(() => store.createSession(session())).toThrow(DuplicateSessionError);
    store.close();
  });

  test("uses optimistic concurrency for session updates", async () => {
    const { store } = await createStore();
    store.createSession(session());
    const updated = session({ version: 2, status: "PREFLIGHT", updatedAt: "2026-07-27T10:01:00.000Z" });

    store.updateSession(updated, 1);
    expect(store.getSession("session-1")?.status).toBe("PREFLIGHT");
    expect(() => store.updateSession(session({ version: 3, status: "PROJECT_PROFILED" }), 1)).toThrow(
      SessionVersionConflictError,
    );
    store.close();
  });
});

describe("MimeraStore evidence", () => {
  test("stores and lists typed evidence in capture order", async () => {
    const { store } = await createStore();
    store.createSession(session());
    const first: EvidenceEnvelope<{ text: string }> = {
      id: "evidence-1",
      payload: { text: "navigation" },
      trust: "untrusted-reference",
      sourceUrl: "https://example.com",
      capturedAt: "2026-07-27T10:00:01.000Z",
      contentHash: "a".repeat(64),
    };
    const second: EvidenceEnvelope<{ width: number }> = {
      id: "evidence-2",
      payload: { width: 1440 },
      trust: "trusted-system",
      capturedAt: "2026-07-27T10:00:02.000Z",
      contentHash: "b".repeat(64),
    };

    store.putEvidence("session-1", second);
    store.putEvidence("session-1", first);

    expect(store.listEvidence("session-1").map((item) => item.id)).toEqual(["evidence-1", "evidence-2"]);
    expect(store.getEvidence("evidence-1")?.trust).toBe("untrusted-reference");
    store.close();
  });
});

test("writes evidence batches atomically after validating the complete batch", async () => {
  const { store } = await createStore();
  store.createSession(session());
  const valid: EvidenceEnvelope<{ text: string }> = {
    id: "evidence-valid",
    payload: { text: "valid" },
    trust: "untrusted-reference",
    sourceUrl: "https://example.com",
    capturedAt: "2026-07-27T10:00:01.000Z",
    contentHash: "d".repeat(64),
  };
  const invalid = {
    ...valid,
    id: "evidence-invalid",
    contentHash: "not-a-hash",
  };

  expect(() => store.putEvidenceBatch("session-1", [valid, invalid])).toThrow();
  expect(store.listEvidence("session-1")).toEqual([]);

  expect(store.putEvidenceBatch("session-1", [valid])).toEqual([valid]);
  expect(store.listEvidence("session-1")).toEqual([valid]);
  store.close();
});

test("commits a session transition and evidence pack in one transaction", async () => {
  const { store } = await createStore();
  store.createSession(session({ status: "REFERENCE_AUTHORIZED" }));
  const updated = session({
    version: 2,
    status: "REFERENCE_CAPTURED",
    updatedAt: "2026-07-27T10:02:00.000Z",
  });
  const evidence: EvidenceEnvelope<{ kind: string }> = {
    id: "capture-evidence",
    payload: { kind: "dom" },
    trust: "untrusted-reference",
    sourceUrl: "https://example.com",
    capturedAt: "2026-07-27T10:01:00.000Z",
    contentHash: "1".repeat(64),
  };

  store.commitSessionWithEvidence(updated, 1, [evidence]);

  expect(store.getSession("session-1")?.status).toBe("REFERENCE_CAPTURED");
  expect(store.listEvidence("session-1")).toEqual([evidence]);
  store.close();
});

test("rolls back both session and evidence when a capture pack is invalid", async () => {
  const { store } = await createStore();
  store.createSession(session({ status: "REFERENCE_AUTHORIZED" }));
  const updated = session({ version: 2, status: "REFERENCE_CAPTURED" });
  const invalid = {
    id: "capture-invalid",
    payload: { kind: "dom" },
    trust: "untrusted-reference" as const,
    sourceUrl: "https://example.com",
    capturedAt: "2026-07-27T10:01:00.000Z",
    contentHash: "invalid",
  };

  expect(() => store.commitSessionWithEvidence(updated, 1, [invalid])).toThrow();
  expect(store.getSession("session-1")?.status).toBe("REFERENCE_AUTHORIZED");
  expect(store.listEvidence("session-1")).toEqual([]);
  store.close();
});

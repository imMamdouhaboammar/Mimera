import { Database } from "bun:sqlite";
import {
  AssetProvenanceRecordSchema,
  EvidenceEnvelopeSchema,
  ReferenceSessionSchema,
  type AssetProvenanceRecord,
  type EvidenceEnvelope,
  type ReferenceSession,
} from "@mimera/contracts";
import type { HookAuditEvent, HookAuditSink } from "@mimera/hooks";

interface SessionRow {
  payload_json: string;
}

interface EvidenceRow {
  id: string;
  trust: string;
  source_url: string | null;
  captured_at: string;
  content_hash: string;
  payload_json: string;
}

interface AssetProvenanceRow {
  payload_json: string;
}

interface HookAuditRow {
  id: string;
  timestamp: string;
  correlation_id: string;
  session_id: string;
  component_id: string | null;
  agent_id: string | null;
  host: HookAuditEvent["host"];
  phase: HookAuditEvent["phase"];
  operation: string;
  hook_id: string;
  policy_version: string;
  input_digest: string;
  decision: HookAuditEvent["decision"];
  reason_code: string;
  mutated_fields_json: string;
  latency_ms: number;
  timed_out: number;
}

export class DuplicateSessionError extends Error {
  constructor(sessionId: string) {
    super(`Session already exists: ${sessionId}`);
    this.name = "DuplicateSessionError";
  }
}

export class SessionNotFoundError extends Error {
  constructor(sessionId: string) {
    super(`Session not found: ${sessionId}`);
    this.name = "SessionNotFoundError";
  }
}

export class SessionVersionConflictError extends Error {
  constructor(sessionId: string, expectedVersion: number) {
    super(`Session ${sessionId} does not have expected version ${expectedVersion}`);
    this.name = "SessionVersionConflictError";
  }
}

export class EvidenceNotFoundError extends Error {
  constructor(evidenceId: string) {
    super(`Evidence not found: ${evidenceId}`);
    this.name = "EvidenceNotFoundError";
  }
}

export class MimeraStore {
  readonly #database: Database;

  constructor(path: string) {
    this.#database = new Database(path, { create: true, strict: true });
    this.#database.exec("PRAGMA foreign_keys = ON;");
    this.#database.exec("PRAGMA journal_mode = WAL;");
    this.#migrate();
  }

  #migrate(): void {
    this.#database.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        applied_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        version INTEGER NOT NULL,
        status TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        payload_json TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS evidence (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
        trust TEXT NOT NULL,
        source_url TEXT,
        captured_at TEXT NOT NULL,
        content_hash TEXT NOT NULL,
        payload_json TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS evidence_session_capture_idx
        ON evidence(session_id, captured_at, id);

      CREATE TABLE IF NOT EXISTS asset_provenance (
        asset_id TEXT PRIMARY KEY,
        usage_decision TEXT NOT NULL,
        source_url TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        payload_json TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS asset_provenance_decision_idx
        ON asset_provenance(usage_decision, asset_id);

      CREATE TABLE IF NOT EXISTS hook_audit (
        sequence INTEGER PRIMARY KEY AUTOINCREMENT,
        id TEXT NOT NULL UNIQUE,
        timestamp TEXT NOT NULL,
        correlation_id TEXT NOT NULL,
        session_id TEXT NOT NULL,
        component_id TEXT,
        agent_id TEXT,
        host TEXT NOT NULL,
        phase TEXT NOT NULL,
        operation TEXT NOT NULL,
        hook_id TEXT NOT NULL,
        policy_version TEXT NOT NULL,
        input_digest TEXT NOT NULL,
        decision TEXT NOT NULL,
        reason_code TEXT NOT NULL,
        mutated_fields_json TEXT NOT NULL,
        latency_ms REAL NOT NULL,
        timed_out INTEGER NOT NULL CHECK(timed_out IN (0, 1))
      );

      CREATE INDEX IF NOT EXISTS hook_audit_session_sequence_idx
        ON hook_audit(session_id, sequence);
    `);
    this.#database
      .query("INSERT OR IGNORE INTO schema_migrations(version, applied_at) VALUES (?, ?)")
      .run(1, new Date().toISOString());
  }

  createSession(input: ReferenceSession): ReferenceSession {
    const session = ReferenceSessionSchema.parse(input);
    const existing = this.#database.query<{ id: string }, [string]>("SELECT id FROM sessions WHERE id = ?").get(session.id);
    if (existing) throw new DuplicateSessionError(session.id);
    this.#database
      .query(
        "INSERT INTO sessions(id, version, status, updated_at, payload_json) VALUES (?, ?, ?, ?, ?)",
      )
      .run(session.id, session.version, session.status, session.updatedAt, JSON.stringify(session));
    return structuredClone(session);
  }

  getSession(sessionId: string): ReferenceSession | null {
    const row = this.#database
      .query<SessionRow, [string]>("SELECT payload_json FROM sessions WHERE id = ?")
      .get(sessionId);
    if (!row) return null;
    return ReferenceSessionSchema.parse(JSON.parse(row.payload_json));
  }

  listSessions(): ReferenceSession[] {
    const rows = this.#database
      .query<SessionRow, []>("SELECT payload_json FROM sessions ORDER BY updated_at DESC, id ASC")
      .all();
    return rows.map((row) => ReferenceSessionSchema.parse(JSON.parse(row.payload_json)));
  }

  updateSession(input: ReferenceSession, expectedVersion: number): ReferenceSession {
    const session = ReferenceSessionSchema.parse(input);
    const result = this.#database
      .query(
        `UPDATE sessions
         SET version = ?, status = ?, updated_at = ?, payload_json = ?
         WHERE id = ? AND version = ?`,
      )
      .run(
        session.version,
        session.status,
        session.updatedAt,
        JSON.stringify(session),
        session.id,
        expectedVersion,
      );
    if (result.changes === 0) {
      if (!this.getSession(session.id)) throw new SessionNotFoundError(session.id);
      throw new SessionVersionConflictError(session.id, expectedVersion);
    }
    return structuredClone(session);
  }

  putEvidence<T>(sessionId: string, input: EvidenceEnvelope<T>): EvidenceEnvelope<T> {
    return this.putEvidenceBatch(sessionId, [input])[0] as EvidenceEnvelope<T>;
  }

  putEvidenceBatch<T>(sessionId: string, inputs: readonly EvidenceEnvelope<T>[]): EvidenceEnvelope<T>[] {
    if (!this.getSession(sessionId)) throw new SessionNotFoundError(sessionId);
    const evidence = inputs.map(
      (input) => EvidenceEnvelopeSchema.parse(input) as EvidenceEnvelope<T>,
    );
    const insert = this.#database.query(
      `INSERT INTO evidence(id, session_id, trust, source_url, captured_at, content_hash, payload_json)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         session_id = excluded.session_id,
         trust = excluded.trust,
         source_url = excluded.source_url,
         captured_at = excluded.captured_at,
         content_hash = excluded.content_hash,
         payload_json = excluded.payload_json`,
    );
    const writeBatch = this.#database.transaction(() => {
      for (const item of evidence) {
        insert.run(
          item.id,
          sessionId,
          item.trust,
          item.sourceUrl ?? null,
          item.capturedAt,
          item.contentHash,
          JSON.stringify(item.payload),
        );
      }
    });
    writeBatch();
    return structuredClone(evidence);
  }

  commitSessionWithEvidence<T>(
    input: ReferenceSession,
    expectedVersion: number,
    evidenceInputs: readonly EvidenceEnvelope<T>[],
  ): ReferenceSession {
    const session = ReferenceSessionSchema.parse(input);
    const evidence = evidenceInputs.map(
      (item) => EvidenceEnvelopeSchema.parse(item) as EvidenceEnvelope<T>,
    );
    const update = this.#database.query(
      `UPDATE sessions
       SET version = ?, status = ?, updated_at = ?, payload_json = ?
       WHERE id = ? AND version = ?`,
    );
    const insert = this.#database.query(
      `INSERT INTO evidence(id, session_id, trust, source_url, captured_at, content_hash, payload_json)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         session_id = excluded.session_id,
         trust = excluded.trust,
         source_url = excluded.source_url,
         captured_at = excluded.captured_at,
         content_hash = excluded.content_hash,
         payload_json = excluded.payload_json`,
    );
    const commit = this.#database.transaction(() => {
      const result = update.run(
        session.version,
        session.status,
        session.updatedAt,
        JSON.stringify(session),
        session.id,
        expectedVersion,
      );
      if (result.changes === 0) {
        if (!this.getSession(session.id)) throw new SessionNotFoundError(session.id);
        throw new SessionVersionConflictError(session.id, expectedVersion);
      }
      for (const item of evidence) {
        insert.run(
          item.id,
          session.id,
          item.trust,
          item.sourceUrl ?? null,
          item.capturedAt,
          item.contentHash,
          JSON.stringify(item.payload),
        );
      }
    });
    commit();
    return structuredClone(session);
  }

  getEvidence<T = unknown>(evidenceId: string): EvidenceEnvelope<T> | null {
    const row = this.#database
      .query<EvidenceRow, [string]>(
        "SELECT id, trust, source_url, captured_at, content_hash, payload_json FROM evidence WHERE id = ?",
      )
      .get(evidenceId);
    return row ? this.#parseEvidence<T>(row) : null;
  }

  requireEvidence<T = unknown>(evidenceId: string): EvidenceEnvelope<T> {
    const evidence = this.getEvidence<T>(evidenceId);
    if (!evidence) throw new EvidenceNotFoundError(evidenceId);
    return evidence;
  }

  listEvidence<T = unknown>(sessionId: string): EvidenceEnvelope<T>[] {
    const rows = this.#database
      .query<EvidenceRow, [string]>(
        `SELECT id, trust, source_url, captured_at, content_hash, payload_json
         FROM evidence
         WHERE session_id = ?
         ORDER BY captured_at ASC, id ASC`,
      )
      .all(sessionId);
    return rows.map((row) => this.#parseEvidence<T>(row));
  }

  putAssetProvenance(input: AssetProvenanceRecord): AssetProvenanceRecord {
    const record = AssetProvenanceRecordSchema.parse(input);
    this.#database
      .query(
        `INSERT INTO asset_provenance(asset_id, usage_decision, source_url, updated_at, payload_json)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(asset_id) DO UPDATE SET
           usage_decision = excluded.usage_decision,
           source_url = excluded.source_url,
           updated_at = excluded.updated_at,
           payload_json = excluded.payload_json`,
      )
      .run(
        record.assetId,
        record.usageDecision,
        record.sourceUrl,
        new Date().toISOString(),
        JSON.stringify(record),
      );
    return structuredClone(record);
  }

  getAssetProvenance(assetId: string): AssetProvenanceRecord | null {
    const row = this.#database
      .query<AssetProvenanceRow, [string]>(
        "SELECT payload_json FROM asset_provenance WHERE asset_id = ?",
      )
      .get(assetId);
    return row ? AssetProvenanceRecordSchema.parse(JSON.parse(row.payload_json)) : null;
  }

  listAssetProvenance(): AssetProvenanceRecord[] {
    const rows = this.#database
      .query<AssetProvenanceRow, []>(
        "SELECT payload_json FROM asset_provenance ORDER BY asset_id ASC",
      )
      .all();
    return rows.map((row) => AssetProvenanceRecordSchema.parse(JSON.parse(row.payload_json)));
  }

  appendHookAudit(event: HookAuditEvent): void {
    this.#database
      .query(
        `INSERT INTO hook_audit(
          id, timestamp, correlation_id, session_id, component_id, agent_id,
          host, phase, operation, hook_id, policy_version, input_digest,
          decision, reason_code, mutated_fields_json, latency_ms, timed_out
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        event.id,
        event.timestamp,
        event.correlationId,
        event.sessionId,
        event.componentId ?? null,
        event.agentId ?? null,
        event.host,
        event.phase,
        event.operation,
        event.hookId,
        event.policyVersion,
        event.inputDigest,
        event.decision,
        event.reasonCode,
        JSON.stringify(event.mutatedFields),
        event.latencyMs,
        event.timedOut ? 1 : 0,
      );
  }

  listHookAudit(sessionId: string): HookAuditEvent[] {
    const rows = this.#database
      .query<HookAuditRow, [string]>(
        `SELECT id, timestamp, correlation_id, session_id, component_id, agent_id,
                host, phase, operation, hook_id, policy_version, input_digest,
                decision, reason_code, mutated_fields_json, latency_ms, timed_out
         FROM hook_audit
         WHERE session_id = ?
         ORDER BY sequence ASC`,
      )
      .all(sessionId);
    return rows.map((row) => ({
      id: row.id,
      timestamp: row.timestamp,
      correlationId: row.correlation_id,
      sessionId: row.session_id,
      ...(row.component_id ? { componentId: row.component_id } : {}),
      ...(row.agent_id ? { agentId: row.agent_id } : {}),
      host: row.host,
      phase: row.phase,
      operation: row.operation,
      hookId: row.hook_id,
      policyVersion: row.policy_version,
      inputDigest: row.input_digest,
      decision: row.decision,
      reasonCode: row.reason_code,
      mutatedFields: JSON.parse(row.mutated_fields_json) as string[],
      latencyMs: row.latency_ms,
      timedOut: row.timed_out === 1,
    }));
  }

  #parseEvidence<T>(row: EvidenceRow): EvidenceEnvelope<T> {
    return EvidenceEnvelopeSchema.parse({
      id: row.id,
      payload: JSON.parse(row.payload_json),
      trust: row.trust,
      ...(row.source_url ? { sourceUrl: row.source_url } : {}),
      capturedAt: row.captured_at,
      contentHash: row.content_hash,
    }) as EvidenceEnvelope<T>;
  }

  close(): void {
    this.#database.close();
  }
}

export class SqliteHookAuditSink implements HookAuditSink {
  readonly #store: MimeraStore;

  constructor(store: MimeraStore) {
    this.#store = store;
  }

  write(event: HookAuditEvent): void {
    this.#store.appendHookAudit(event);
  }
}

import { Database } from "bun:sqlite";
import {
  EvidenceEnvelopeSchema,
  ReferenceSessionSchema,
  type EvidenceEnvelope,
  type ReferenceSession,
} from "@mimera/contracts";

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
    if (!this.getSession(sessionId)) throw new SessionNotFoundError(sessionId);
    const evidence = EvidenceEnvelopeSchema.parse(input) as EvidenceEnvelope<T>;
    this.#database
      .query(
        `INSERT INTO evidence(id, session_id, trust, source_url, captured_at, content_hash, payload_json)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           session_id = excluded.session_id,
           trust = excluded.trust,
           source_url = excluded.source_url,
           captured_at = excluded.captured_at,
           content_hash = excluded.content_hash,
           payload_json = excluded.payload_json`,
      )
      .run(
        evidence.id,
        sessionId,
        evidence.trust,
        evidence.sourceUrl ?? null,
        evidence.capturedAt,
        evidence.contentHash,
        JSON.stringify(evidence.payload),
      );
    return structuredClone(evidence);
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

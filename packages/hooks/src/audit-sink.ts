import type { HookAuditEvent, HookAuditSink } from "./contracts.ts";

export class InMemoryAuditSink implements HookAuditSink {
  readonly events: HookAuditEvent[] = [];

  write(event: HookAuditEvent): void {
    this.events.push(structuredClone(event));
  }
}

export class NoopAuditSink implements HookAuditSink {
  write(_event: HookAuditEvent): void {}
}

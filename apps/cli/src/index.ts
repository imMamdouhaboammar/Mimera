#!/usr/bin/env bun

import { resolve } from "node:path";
import {
  Command,
  CommanderError,
  InvalidArgumentError,
} from "commander";
import {
  HostKindSchema,
  ReferenceModeSchema,
  type HighFidelityAuthorization,
  type HostKind,
  type ReferenceMode,
} from "@mimera/contracts";
import {
  ComponentNotFoundError,
  ComponentSpecificationEvidenceMissingError,
  ComponentSpecificationService,
  ComponentSpecificationStateError,
  StoredComponentSpecificationMissingError,
} from "@mimera/component-spec";
import {
  DesignAnalysisService,
  DesignAnalysisStateError,
  DesignEvidenceIncompleteError,
  StoredDesignAnalysisMissingError,
} from "@mimera/design-analysis";
import {
  CurrentSessionNotFoundError,
  MimeraProject,
  ProjectAlreadyInitializedError,
  ProjectNotInitializedError,
} from "@mimera/core";
import { PreflightService, PreflightStateError } from "@mimera/preflight";
import {
  ReferenceCaptureService,
  ReferenceCaptureStateError,
} from "@mimera/reference-capture";
import {
  PythonRuntimeNotFoundError,
  PythonWorkerClient,
  PythonWorkerError,
  detectPythonRuntime,
} from "@mimera/python-bridge";

export interface CliIo {
  stdout(text: string): void;
  stderr(text: string): void;
}

const defaultIo: CliIo = {
  stdout: (text) => process.stdout.write(text),
  stderr: (text) => process.stderr.write(text),
};

interface JsonOption {
  json?: boolean;
}

interface InitOptions extends JsonOption {
  reference: string[];
  host: HostKind;
  mode: ReferenceMode;
  python?: boolean;
  pythonCommand?: string;
  rightsAssertion?: string;
}

interface CaptureOptions extends JsonOption {
  url?: string;
  allowHttp?: boolean;
  allowLocalhost?: boolean;
}

interface SpecifyOptions extends JsonOption {
  component: string;
}

interface DoctorCheck {
  ok: boolean;
  detail: string;
}

function collect(value: string, previous: string[]): string[] {
  return [...previous, value];
}

function parseHost(value: string): HostKind {
  const parsed = HostKindSchema.safeParse(value);
  if (!parsed.success) {
    throw new InvalidArgumentError(`Unsupported host: ${value}`);
  }
  return parsed.data;
}

function parseMode(value: string): ReferenceMode {
  const parsed = ReferenceModeSchema.safeParse(value);
  if (!parsed.success) {
    throw new InvalidArgumentError(`Unsupported reference mode: ${value}`);
  }
  return parsed.data;
}

function writeJson(io: CliIo, value: unknown, stream: "stdout" | "stderr" = "stdout"): void {
  io[stream](`${JSON.stringify(value, null, 2)}\n`);
}

function authorizationFrom(options: InitOptions): HighFidelityAuthorization | undefined {
  if (options.mode !== "high-fidelity") return undefined;
  if (!options.rightsAssertion?.trim()) {
    throw new InvalidArgumentError(
      "High-fidelity mode requires --rights-assertion confirming authorization to use the reference",
    );
  }
  return {
    assertedBy: "cli-user",
    assertion: options.rightsAssertion.trim(),
    authorizedAt: new Date().toISOString(),
  };
}

function formatHumanStatus(status: ReturnType<MimeraProject["status"]>): string {
  return [
    `Mimera project: ${status.projectId}`,
    `Target: ${status.targetRoot}`,
    `Session: ${status.currentSession.id}`,
    `Status: ${status.currentSession.status}`,
    `Next: ${status.nextStatuses.join(", ") || "none"}`,
    `Evidence: ${status.evidenceCount}`,
    `Audit events: ${status.auditEventCount}`,
    `Python: ${status.python.enabled ? status.python.command : "disabled"}`,
  ].join("\n");
}

async function runDoctor(targetRoot: string): Promise<{
  ok: boolean;
  checks: {
    bun: DoctorCheck;
    python: DoctorCheck;
    project: DoctorCheck;
  };
}> {
  const checks = {
    bun: { ok: true, detail: `Bun ${Bun.version}` },
    python: { ok: true, detail: "Python workers disabled" },
    project: { ok: false, detail: "Project not checked" },
  };
  let project: MimeraProject | undefined;
  try {
    project = await MimeraProject.open(targetRoot);
    const status = project.status();
    checks.project = {
      ok: true,
      detail: `SQLite session ${status.currentSession.id} is readable at version ${status.currentSession.version}`,
    };
    if (status.python.enabled && status.python.command) {
      const runtime = await detectPythonRuntime([status.python.command]);
      const pythonRoot = resolve(import.meta.dir, "../../../python");
      const client = new PythonWorkerClient({
        pythonPath: runtime.command,
        pythonRoot,
      });
      try {
        const health = await client.call<{ protocolVersion: string; runtime: string }>("health", {});
        checks.python = {
          ok: health.protocolVersion === "1",
          detail: `${health.runtime}, protocol ${health.protocolVersion}`,
        };
      } finally {
        await client.close();
      }
    }
  } catch (error) {
    checks.project = {
      ok: false,
      detail: error instanceof Error ? error.message : "Project check failed",
    };
  } finally {
    project?.close();
  }
  return {
    ok: checks.bun.ok && checks.python.ok && checks.project.ok,
    checks,
  };
}

export function createProgram(io: CliIo = defaultIo): Command {
  const program = new Command();
  program
    .name("mimera")
    .description("Reference-driven interface engineering system")
    .version("0.1.0")
    .exitOverride()
    .configureOutput({
      writeOut: (text) => io.stdout(text),
      writeErr: () => {},
    });

  program
    .command("init")
    .description("Initialize Mimera in a target project")
    .argument("[targetRoot]", "Target project root", ".")
    .requiredOption("-r, --reference <url>", "Reference URL. Repeat for multiple references", collect, [])
    .option("--host <host>", "Host adapter", parseHost, "generic")
    .option("--mode <mode>", "Reference mode", parseMode, "structure")
    .option("--python", "Enable optional Python workers", false)
    .option("--python-command <command>", "Python executable")
    .option("--rights-assertion <text>", "Authorization statement for high-fidelity mode")
    .option("--json", "Print machine-readable JSON", false)
    .action(async (targetRoot: string, options: InitOptions) => {
      const highFidelityAuthorization = authorizationFrom(options);
      const project = await MimeraProject.initialize({
        targetRoot,
        referenceUrls: options.reference,
        host: options.host,
        mode: options.mode,
        python: {
          enabled: Boolean(options.python),
          ...(options.pythonCommand ? { command: options.pythonCommand } : {}),
        },
        ...(highFidelityAuthorization ? { highFidelityAuthorization } : {}),
      });
      try {
        const status = project.status();
        const output = {
          projectId: status.projectId,
          targetRoot: status.targetRoot,
          sessionId: status.currentSession.id,
          status: status.currentSession.status,
          nextStatuses: status.nextStatuses,
          python: status.python,
        };
        if (options.json) writeJson(io, output);
        else io.stdout(`${formatHumanStatus(status)}\n`);
      } finally {
        project.close();
      }
    });

  program
    .command("status")
    .description("Show the current Mimera project status")
    .argument("[targetRoot]", "Target project root", ".")
    .option("--json", "Print machine-readable JSON", false)
    .action(async (targetRoot: string, options: JsonOption) => {
      const project = await MimeraProject.open(targetRoot);
      try {
        const status = project.status();
        if (options.json) writeJson(io, status);
        else io.stdout(`${formatHumanStatus(status)}\n`);
      } finally {
        project.close();
      }
    });

  program
    .command("resume")
    .description("Resume the current Mimera session")
    .argument("[targetRoot]", "Target project root", ".")
    .option("--json", "Print machine-readable JSON", false)
    .action(async (targetRoot: string, options: JsonOption) => {
      const project = await MimeraProject.open(targetRoot);
      try {
        const status = project.status();
        const output = {
          projectId: status.projectId,
          targetRoot: status.targetRoot,
          sessionId: status.currentSession.id,
          status: status.currentSession.status,
          referenceUrls: status.currentSession.referenceUrls,
          nextStatuses: status.nextStatuses,
        };
        if (options.json) writeJson(io, output);
        else {
          io.stdout(
            `Resuming ${output.sessionId}\nStatus: ${output.status}\nNext: ${output.nextStatuses.join(", ") || "none"}\n`,
          );
        }
      } finally {
        project.close();
      }
    });

  program
    .command("prepare")
    .description("Inspect the target project and authorize the reference session")
    .argument("[targetRoot]", "Target project root", ".")
    .option("--json", "Print machine-readable JSON", false)
    .action(async (targetRoot: string, options: JsonOption) => {
      const project = await MimeraProject.open(targetRoot);
      try {
        const result = await new PreflightService().prepare(project);
        const output = {
          projectId: project.config.projectId,
          sessionId: result.session.id,
          status: result.session.status,
          profile: result.profile,
          evidenceCount: project.status().evidenceCount,
        };
        if (options.json) writeJson(io, output);
        else {
          io.stdout(
            `Prepared ${output.sessionId}
Status: ${output.status}
Stack: ${result.profile.frameworks.join(", ") || "undetected"}
`,
          );
        }
      } finally {
        project.close();
      }
    });

  program
    .command("capture")
    .description("Capture desktop and mobile reference evidence")
    .argument("[targetRoot]", "Target project root", ".")
    .option("--url <url>", "Authorized reference URL. Defaults to the first session reference")
    .option("--allow-http", "Allow an authorized non-HTTPS reference", false)
    .option("--allow-localhost", "Allow HTTP loopback references for local fixtures", false)
    .option("--json", "Print machine-readable JSON", false)
    .action(async (targetRoot: string, options: CaptureOptions) => {
      const project = await MimeraProject.open(targetRoot);
      try {
        const current = project.currentSession();
        const url = options.url ?? current.referenceUrls[0];
        if (!url) throw new InvalidArgumentError("The session has no reference URL to capture");
        const service = new ReferenceCaptureService({
          allowHttp: Boolean(options.allowHttp || options.allowLocalhost),
          allowLoopback: Boolean(options.allowLocalhost),
        });
        const result = await service.capture(project, {
          url,
          viewports: [
            { id: "desktop", width: 1440, height: 900, isMobile: false },
            { id: "mobile", width: 390, height: 844, isMobile: true },
          ],
        });
        const output = {
          projectId: project.config.projectId,
          sessionId: result.session.id,
          status: result.session.status,
          captureId: result.captureId,
          outputDirectory: result.outputDirectory,
          viewports: result.capture.captures.map((capture) => capture.viewport.id),
          evidenceCount: project.status().evidenceCount,
        };
        if (options.json) writeJson(io, output);
        else {
          io.stdout(
            `Captured ${output.viewports.join(", ")}
Status: ${output.status}
Evidence: ${output.evidenceCount}
Artifacts: ${output.outputDirectory}
`,
          );
        }
      } finally {
        project.close();
      }
    });

  program
    .command("analyze")
    .description("Extract design DNA and decompose the captured reference page")
    .argument("[targetRoot]", "Target project root", ".")
    .option("--json", "Print machine-readable JSON", false)
    .action(async (targetRoot: string, options: JsonOption) => {
      const project = await MimeraProject.open(targetRoot);
      try {
        const result = await new DesignAnalysisService().analyze(project);
        const output = {
          projectId: project.config.projectId,
          sessionId: result.session.id,
          status: result.session.status,
          signature: result.analysis.dna.signature,
          confidence: result.analysis.dna.confidence,
          components: result.analysis.decomposition.components.map((component) => component.id),
          responsiveRuleTypes: [
            ...new Set(result.analysis.dna.responsiveRules.map((rule) => rule.type)),
          ].sort(),
          evidenceCount: project.status().evidenceCount,
        };
        if (options.json) writeJson(io, output);
        else {
          io.stdout(
            `Analyzed ${output.sessionId}
Status: ${output.status}
Components: ${output.components.join(", ") || "none"}
Responsive rules: ${output.responsiveRuleTypes.join(", ") || "none"}
`,
          );
        }
      } finally {
        project.close();
      }
    });

  program
    .command("specify")
    .description("Create an evidence-backed component contract and write scope")
    .argument("[targetRoot]", "Target project root", ".")
    .requiredOption("--component <id>", "Component id from the page decomposition")
    .option("--json", "Print machine-readable JSON", false)
    .action(async (targetRoot: string, options: SpecifyOptions) => {
      const project = await MimeraProject.open(targetRoot);
      try {
        const result = await new ComponentSpecificationService().specify(project, {
          componentId: options.component,
        });
        const output = {
          projectId: project.config.projectId,
          sessionId: result.session.id,
          status: result.session.status,
          pageId: result.spec.pageId,
          componentId: result.spec.id,
          componentName: result.spec.name,
          targetFiles: result.spec.targetFiles,
          allowedCommands: result.writeScope.allowedCommands,
          responsiveRules: result.spec.responsiveContract.rules,
          acceptanceCriteria: result.spec.acceptanceCriteria.map((criterion) => ({
            id: criterion.id,
            kind: criterion.kind,
            required: criterion.required,
          })),
          evidenceCount: project.status().evidenceCount,
        };
        if (options.json) writeJson(io, output);
        else {
          io.stdout(
            `Specified ${output.componentId}
Status: ${output.status}
Files: ${output.targetFiles.join(", ")}
Commands: ${output.allowedCommands.join(", ") || "none"}
`,
          );
        }
      } finally {
        project.close();
      }
    });

  program
    .command("doctor")
    .description("Check Mimera runtime and project health")
    .argument("[targetRoot]", "Target project root", ".")
    .option("--json", "Print machine-readable JSON", false)
    .action(async (targetRoot: string, options: JsonOption) => {
      const report = await runDoctor(targetRoot);
      if (options.json) writeJson(io, report);
      else {
        const lines = Object.entries(report.checks).map(
          ([name, check]) => `${check.ok ? "PASS" : "FAIL"} ${name}: ${check.detail}`,
        );
        io.stdout(`${lines.join("\n")}\nOverall: ${report.ok ? "healthy" : "unhealthy"}\n`);
      }
      if (!report.ok) throw new Error("Doctor checks failed");
    });

  return program;
}

function errorCode(error: unknown): string {
  if (error instanceof InvalidArgumentError) return "INVALID_ARGUMENT";
  if (error instanceof CommanderError) {
    if (error.code === "commander.helpDisplayed" || error.code === "commander.version") return "DISPLAY_ONLY";
    return "INVALID_ARGUMENT";
  }
  if (error instanceof ProjectAlreadyInitializedError) return "PROJECT_ALREADY_INITIALIZED";
  if (error instanceof ProjectNotInitializedError) return "PROJECT_NOT_INITIALIZED";
  if (error instanceof CurrentSessionNotFoundError) return "SESSION_NOT_FOUND";
  if (
    error instanceof PreflightStateError ||
    error instanceof ReferenceCaptureStateError ||
    error instanceof DesignAnalysisStateError ||
    error instanceof ComponentSpecificationStateError
  ) {
    return "INVALID_STATE";
  }
  if (error instanceof DesignEvidenceIncompleteError) return "EVIDENCE_INCOMPLETE";
  if (error instanceof StoredDesignAnalysisMissingError) return "ANALYSIS_MISSING";
  if (error instanceof ComponentNotFoundError) return "COMPONENT_NOT_FOUND";
  if (error instanceof ComponentSpecificationEvidenceMissingError) return "EVIDENCE_MISSING";
  if (error instanceof StoredComponentSpecificationMissingError) return "SPECIFICATION_MISSING";
  if (error instanceof PythonRuntimeNotFoundError) return "PYTHON_NOT_FOUND";
  if (error instanceof PythonWorkerError) return error.code;
  if (error && typeof error === "object" && "name" in error && error.name === "ZodError") {
    return "INVALID_ARGUMENT";
  }
  return "MIMERA_ERROR";
}

export async function runCli(argv: string[], io: CliIo = defaultIo): Promise<number> {
  const json = argv.includes("--json");
  try {
    await createProgram(io).parseAsync(["bun", "mimera", ...argv]);
    return 0;
  } catch (error) {
    const code = errorCode(error);
    if (code === "DISPLAY_ONLY") return 0;
    const message = error instanceof Error ? error.message : "Mimera command failed";
    if (json) {
      writeJson(io, { error: { code, message } }, "stderr");
    } else {
      io.stderr(`Error [${code}]: ${message}\n`);
    }
    return 1;
  }
}

if (import.meta.main) {
  const exitCode = await runCli(process.argv.slice(2));
  process.exitCode = exitCode;
}

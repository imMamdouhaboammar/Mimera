# Graph Report - /Users/mamdouhaboammar/Documents/antigravity/proud-bose  (2026-07-29)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 1119 nodes · 1909 edges · 76 communities (69 shown, 7 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 18 edges (avg confidence: 0.77)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `3110827b`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 68|Community 68]]
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 70|Community 70]]
- [[_COMMUNITY_Community 71|Community 71]]
- [[_COMMUNITY_Community 72|Community 72]]
- [[_COMMUNITY_Community 73|Community 73]]
- [[_COMMUNITY_Community 74|Community 74]]
- [[_COMMUNITY_Community 75|Community 75]]

## God Nodes (most connected - your core abstractions)
1. `MimeraProject` - 44 edges
2. `ReferenceSession` - 42 edges
3. `EvidenceEnvelope` - 29 edges
4. `HostKind` - 28 edges
5. `HookRunner` - 28 edges
6. `MimeraStore` - 26 edges
7. `AgentRegistry` - 24 edges
8. `TrustedScope` - 22 edges
9. `paths` - 22 edges
10. `HookContext` - 18 edges

## Surprising Connections (you probably didn't know these)
- `InitOptions` --references--> `HostKind`  [EXTRACTED]
  apps/cli/src/index.ts → packages/contracts/src/index.ts
- `InitOptions` --references--> `ReferenceMode`  [EXTRACTED]
  apps/cli/src/index.ts → packages/contracts/src/index.ts
- `runDoctor()` --calls--> `detectPythonRuntime()`  [EXTRACTED]
  apps/cli/src/index.ts → packages/python-bridge/src/index.ts
- `ContextCuratorOptions` --references--> `AgentRegistry`  [EXTRACTED]
  packages/context-curator/src/index.ts → packages/agent-runtime/src/registry.ts
- `ReferenceAuthorizationEvidencePayload` --references--> `ReferenceSession`  [EXTRACTED]
  packages/preflight/src/index.ts → packages/contracts/src/index.ts

## Import Cycles
- 1-file cycle: `apps/cli/src/index.ts -> apps/cli/src/index.ts`
- 1-file cycle: `packages/component-spec/src/index.ts -> packages/component-spec/src/index.ts`
- 1-file cycle: `packages/context-curator/src/index.ts -> packages/context-curator/src/index.ts`
- 1-file cycle: `packages/core/src/index.ts -> packages/core/src/index.ts`
- 1-file cycle: `packages/design-analysis/src/index.ts -> packages/design-analysis/src/index.ts`
- 1-file cycle: `packages/evidence-store/src/index.ts -> packages/evidence-store/src/index.ts`
- 1-file cycle: `packages/implementation-workspace/src/index.ts -> packages/implementation-workspace/src/index.ts`
- 1-file cycle: `packages/installer/src/index.ts -> packages/installer/src/index.ts`
- 1-file cycle: `packages/preflight/src/index.ts -> packages/preflight/src/index.ts`
- 1-file cycle: `packages/project-tools/src/index.ts -> packages/project-tools/src/index.ts`
- 1-file cycle: `packages/reference-capture/src/index.ts -> packages/reference-capture/src/index.ts`
- 1-file cycle: `packages/state-machine/src/index.ts -> packages/state-machine/src/index.ts`

## Communities (76 total, 7 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.07
Nodes (44): exists(), GeneratedHostFile, HostAdapter, HostAdapterTier, RenderedHostAdapter, RenderHostAdapterInput, detectHosts(), detectPath() (+36 more)

### Community 1 - "Community 1"
Cohesion: 0.06
Nodes (45): AnalysisEvidence, canonicalize(), BrowserDomEvidencePayload, BrowserDomEvidencePayloadSchema, DesignDna, PageDecomposition, acceptanceCriteria(), allowedCommands() (+37 more)

### Community 2 - "Community 2"
Cohesion: 0.05
Nodes (42): AbsolutePathSchema, AcceptanceCriterion, AcceptanceCriterionSchema, ApprovalDecision, ApprovalDecisionSchema, ApprovalRequirementSchema, AssetUsageDecision, AssetUsageDecisionSchema (+34 more)

### Community 3 - "Community 3"
Cohesion: 0.05
Nodes (40): compilerOptions, allowImportingTsExtensions, baseUrl, exactOptionalPropertyTypes, lib, module, moduleDetection, moduleResolution (+32 more)

### Community 4 - "Community 4"
Cohesion: 0.09
Nodes (25): collectFiles(), detectPackageManager(), ENTRYPOINT_NAMES, evidence(), FRAMEWORK_DEPENDENCIES, IGNORED_DIRECTORIES, inspectProject(), InspectProjectOptions (+17 more)

### Community 5 - "Community 5"
Cohesion: 0.13
Nodes (18): registerBrowserTools(), RegisterBrowserToolsOptions, PageCaptureResult, ViewportProfile, allowedOrigins(), captureScope(), createMimeraMcpServer(), CreateMimeraMcpServerOptions (+10 more)

### Community 6 - "Community 6"
Cohesion: 0.14
Nodes (14): BrowserLab, fileArtifact(), PageSafetyState, sha256(), stableJson(), writeJsonArtifact(), BrowserEvidencePayload, CaptureArtifact (+6 more)

### Community 7 - "Community 7"
Cohesion: 0.09
Nodes (22): dependencies, commander, zod, devDependencies, @types/bun, typescript, name, overrides (+14 more)

### Community 8 - "Community 8"
Cohesion: 0.15
Nodes (16): PageComponentHypothesis, ResponsiveRule, componentKind(), cornerLanguage(), CountEntry, DesignDnaExtractor, DesignDnaExtractorOptions, extractPxValues() (+8 more)

### Community 9 - "Community 9"
Cohesion: 0.11
Nodes (12): CaptureOptions, ComponentNotFoundError, ComponentSpecificationEvidenceMissingError, defaultIo, DoctorCheck, InitOptions, JsonOption, ReferenceMode (+4 more)

### Community 10 - "Community 10"
Cohesion: 0.14
Nodes (13): GuardDeniedError, InvalidTransitionError, ReferenceSessionSchema, SessionStateMachine, SessionStateMachineOptions, SessionStatus, StaleSessionError, TransitionGuard (+5 more)

### Community 11 - "Community 11"
Cohesion: 0.10
Nodes (19): ArtifactReference, ArtifactReferenceSchema, BROWSER_OPEN_REFERENCE_TOOL, BrowserCaptureSummary, BrowserCaptureSummarySchema, BrowserOpenReferenceInput, BrowserOpenReferenceInputSchema, BrowserOpenReferenceOutputSchema (+11 more)

### Community 12 - "Community 12"
Cohesion: 0.17
Nodes (5): AssetProvenanceRecord, EvidenceEnvelope, EvidenceRecord, MimeraStore, directories

### Community 13 - "Community 13"
Cohesion: 0.20
Nodes (9): InMemoryAuditSink, NoopAuditSink, HookAuditEvent, HookAuditSink, canonicalize(), changedFields(), runWithTimeout(), stableDigest() (+1 more)

### Community 14 - "Community 14"
Cohesion: 0.11
Nodes (18): bin, mimera, dependencies, commander, @mimera/component-spec, @mimera/contracts, @mimera/core, @mimera/design-analysis (+10 more)

### Community 15 - "Community 15"
Cohesion: 0.22
Nodes (5): HookLayer, HookContext, context, layerPriority, directories

### Community 16 - "Community 16"
Cohesion: 0.21
Nodes (11): Exception, Mimera optional Python worker runtime., error_response(), main(), dispatch(), handle_request(), ProtocolError, ProtocolError (+3 more)

### Community 17 - "Community 17"
Cohesion: 0.18
Nodes (13): canonicalize(), contentHash(), AgentIdSchema, buildTrustedScope(), ContextCurator, ContextCuratorEvidenceMissingError, ContextCuratorOptions, ContextPacketEvidencePayload (+5 more)

### Community 18 - "Community 18"
Cohesion: 0.14
Nodes (12): portablePath(), ApprovalRequirement, CommandOutputLimitError, CommandResult, CommandTimeoutError, defaultEnvironment(), PolicyApprovalRequiredError, requireAllowed() (+4 more)

### Community 19 - "Community 19"
Cohesion: 0.16
Nodes (6): RobotsDeniedError, RobotsPolicyClient, RobotsPolicyClientOptions, parseRobotsTxt(), RobotsRule, RobotsRules

### Community 20 - "Community 20"
Cohesion: 0.22
Nodes (4): AssetProvenanceHookOptions, createAssetProvenanceHook(), createUntrustedContentHook(), defineHook()

### Community 21 - "Community 21"
Cohesion: 0.18
Nodes (12): exists(), AdvanceSessionOptions, CompleteReferenceCaptureOptions, CurrentSessionNotFoundError, HighFidelityAuthorization, InitializeMimeraProjectOptions, MimeraProjectPaths, MimeraProjectStatus (+4 more)

### Community 22 - "Community 22"
Cohesion: 0.13
Nodes (9): AssetProvenanceRow, DuplicateSessionError, EvidenceNotFoundError, EvidenceRow, HookAuditRow, SessionNotFoundError, SessionRow, SessionVersionConflictError (+1 more)

### Community 23 - "Community 23"
Cohesion: 0.14
Nodes (8): AgentConcurrencyError, AgentDispatchDeniedError, AgentResultMismatchError, AgentToolGrantMismatchError, AgentWorker, FakeWorker, registry, trustedScope

### Community 24 - "Community 24"
Cohesion: 0.21
Nodes (9): AgentDescriptor, AgentDescriptorSchema, AgentGroup, AgentId, AgentDispatcherOptions, CreateContextPacketInput, AgentNotFoundError, AgentRegistry (+1 more)

### Community 25 - "Community 25"
Cohesion: 0.20
Nodes (13): analysisEvidence(), canonicalize(), contentHash(), DesignAnalysisResult, DesignDnaEvidencePayloadSchema, PageDecompositionEvidencePayloadSchema, DesignAnalysisOutput, DesignAnalysisService (+5 more)

### Community 26 - "Community 26"
Cohesion: 0.19
Nodes (13): parseMode(), BROWSER_INTEGRATION_TESTS, collectTests(), createTestPlan(), isTestFile(), portablePath(), expectedBrowserTests, projectRoot (+5 more)

### Community 27 - "Community 27"
Cohesion: 0.17
Nodes (8): ComponentSpecificationStateError, DesignAnalysisStateError, ImplementationWorkspaceStateError, PreflightStateError, ReferenceCaptureStateError, ReferenceSession, createProject(), directories

### Community 28 - "Community 28"
Cohesion: 0.13
Nodes (14): dependencies, @mimera/browser-lab, @mimera/core, @mimera/reference-capture, @mimera/reference-policy, @modelcontextprotocol/sdk, zod, devDependencies (+6 more)

### Community 29 - "Community 29"
Cohesion: 0.14
Nodes (8): ContextPacketSchema, AGENT_DESCRIPTORS, DESCRIPTORS, referenceHooks, stateHooks, writerHooks, adapters, agents

### Community 30 - "Community 30"
Cohesion: 0.19
Nodes (6): BrowserLabOptions, isPrivateOrReservedAddress(), parseIpv4(), NavigationDeniedError, ReferencePolicy, ReferencePolicyOptions

### Community 31 - "Community 31"
Cohesion: 0.22
Nodes (10): AgentResult, ContextPacket, AgentDispatcher, AgentWorkerResultInvalidError, DispatchAgentInput, ensureToolGrant(), leaseKey(), requireHookAllow() (+2 more)

### Community 33 - "Community 33"
Cohesion: 0.15
Nodes (12): dependencies, @mimera/browser-lab, @mimera/contracts, @mimera/core, @mimera/design-dna, @mimera/project-inspector, zod, exports (+4 more)

### Community 34 - "Community 34"
Cohesion: 0.15
Nodes (12): AgentConcurrency, AgentConcurrencySchema, AgentFinding, AgentFindingSchema, AgentGroupSchema, AgentResultSchema, ModelClass, ModelClassSchema (+4 more)

### Community 35 - "Community 35"
Cohesion: 0.17
Nodes (9): PendingRequest, PythonRuntime, PythonRuntimeNotFoundError, PythonWorkerClientOptions, PythonWorkerError, PythonWorkerTimeoutError, WorkerErrorResponse, WorkerResponse (+1 more)

### Community 36 - "Community 36"
Cohesion: 0.15
Nodes (4): BrowserDownloadDeniedError, OriginRateLimiter, OriginRateLimiterOptions, directories

### Community 37 - "Community 37"
Cohesion: 0.17
Nodes (7): CliIo, createProgram(), errorCode(), runCli(), writeJson(), directories, directories

### Community 38 - "Community 38"
Cohesion: 0.17
Nodes (11): dependencies, @mimera/contracts, @mimera/hooks, @mimera/reference-policy, playwright, zod, exports, name (+3 more)

### Community 39 - "Community 39"
Cohesion: 0.17
Nodes (11): dependencies, @mimera/agent-runtime, @mimera/component-spec, @mimera/contracts, @mimera/core, zod, exports, name (+3 more)

### Community 40 - "Community 40"
Cohesion: 0.17
Nodes (11): dependencies, @mimera/contracts, @mimera/evidence-store, @mimera/hooks, @mimera/python-bridge, @mimera/state-machine, exports, name (+3 more)

### Community 41 - "Community 41"
Cohesion: 0.17
Nodes (11): dependencies, @mimera/component-spec, @mimera/contracts, @mimera/core, @mimera/hooks, @mimera/project-tools, exports, name (+3 more)

### Community 42 - "Community 42"
Cohesion: 0.18
Nodes (10): dependencies, @mimera/browser-lab, @mimera/contracts, @mimera/core, @mimera/design-dna, exports, name, private (+2 more)

### Community 43 - "Community 43"
Cohesion: 0.18
Nodes (10): dependencies, @mimera/agent-runtime, @mimera/contracts, @mimera/host-adapters, zod, exports, name, private (+2 more)

### Community 44 - "Community 44"
Cohesion: 0.18
Nodes (10): DesignDnaSchema, PageComponentHypothesisSchema, PageDecompositionSchema, PaletteToken, PaletteTokenSchema, ResponsiveRuleSchema, ScaleValue, ScaleValueSchema (+2 more)

### Community 45 - "Community 45"
Cohesion: 0.18
Nodes (10): dependencies, @mimera/browser-lab, @mimera/contracts, @mimera/core, @mimera/reference-policy, exports, name, private (+2 more)

### Community 46 - "Community 46"
Cohesion: 0.20
Nodes (9): dependencies, @mimera/contracts, @mimera/hooks, zod, exports, name, private, type (+1 more)

### Community 47 - "Community 47"
Cohesion: 0.20
Nodes (9): dependencies, @mimera/agent-runtime, @mimera/contracts, zod, exports, name, private, type (+1 more)

### Community 48 - "Community 48"
Cohesion: 0.22
Nodes (4): HookRunResult, HookDecision, HookPhase, PolicyDeferredError

### Community 49 - "Community 49"
Cohesion: 0.20
Nodes (9): dependencies, @mimera/contracts, @mimera/core, @mimera/project-inspector, exports, name, private, type (+1 more)

### Community 50 - "Community 50"
Cohesion: 0.27
Nodes (8): DesignDnaEvidencePayload, PageDecompositionEvidencePayload, directories, evidence(), fixtureNode(), fixtureSnapshot(), hashPayload(), logicallyAnalyzedProject()

### Community 51 - "Community 51"
Cohesion: 0.22
Nodes (8): dependencies, @mimera/browser-lab, zod, exports, name, private, type, version

### Community 52 - "Community 52"
Cohesion: 0.22
Nodes (8): dependencies, @mimera/contracts, @mimera/hooks, exports, name, private, type, version

### Community 53 - "Community 53"
Cohesion: 0.22
Nodes (8): dependencies, @mimera/contracts, @mimera/state-machine, exports, name, private, type, version

### Community 54 - "Community 54"
Cohesion: 0.42
Nodes (5): MimeraHook, LAYER_ORDER, orderHooks(), HookRegistry, HookRunnerOptions

### Community 55 - "Community 55"
Cohesion: 0.22
Nodes (8): dependencies, @mimera/contracts, @mimera/hooks, exports, name, private, type, version

### Community 56 - "Community 56"
Cohesion: 0.28
Nodes (8): DomNodeEvidence, DomSnapshot, ViewportDomEvidence, desktop, evidence, mobile, node(), snapshot()

### Community 58 - "Community 58"
Cohesion: 0.25
Nodes (7): dependencies, zod, exports, name, private, type, version

### Community 59 - "Community 59"
Cohesion: 0.25
Nodes (7): dependencies, @mimera/contracts, exports, name, private, type, version

### Community 60 - "Community 60"
Cohesion: 0.33
Nodes (5): createHookTransitionGuard(), createStateTransitionHook(), createTrustedScope(), session, trustedScope

### Community 61 - "Community 61"
Cohesion: 0.29
Nodes (6): AssetProvenanceRecordSchema, EvidenceEnvelopeSchema, HookDecisionSchema, MimeraConfigSchema, RecipePackManifestSchema, session

### Community 62 - "Community 62"
Cohesion: 0.29
Nodes (3): ProjectAlreadyInitializedError, ProjectNotInitializedError, directories

### Community 64 - "Community 64"
Cohesion: 0.33
Nodes (5): exports, name, private, type, version

### Community 65 - "Community 65"
Cohesion: 0.33
Nodes (5): exports, name, private, type, version

### Community 66 - "Community 66"
Cohesion: 0.33
Nodes (5): exports, name, private, type, version

### Community 67 - "Community 67"
Cohesion: 0.33
Nodes (3): DesignEvidenceIncompleteError, capturedProject(), directories

### Community 68 - "Community 68"
Cohesion: 0.33
Nodes (5): detectPythonRuntime(), resolvePythonConfig(), runDoctor(), clients, pythonRoot

### Community 69 - "Community 69"
Cohesion: 0.18
Nodes (8): EVIDENCE_BACKED_STATUSES, HookTransitionGuardOptions, StateTransitionInput, SafeProjectToolsOptions, SessionStatusSchema, SqliteHookAuditSink, HookRunner, directories

### Community 71 - "Community 71"
Cohesion: 0.50
Nodes (3): approvedStatuses, auditPath, projectRoot

### Community 75 - "Community 75"
Cohesion: 0.28
Nodes (5): createCommandPolicyHook(), createWriteScopeHook(), PolicyDeniedError, directories, fixture()

## Knowledge Gaps
- **416 isolated node(s):** `name`, `version`, `private`, `type`, `mimera` (+411 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `MimeraProject` connect `Community 32` to `Community 1`, `Community 67`, `Community 4`, `Community 5`, `Community 70`, `Community 9`, `Community 10`, `Community 11`, `Community 12`, `Community 17`, `Community 50`, `Community 21`, `Community 25`, `Community 27`, `Community 60`, `Community 62`?**
  _High betweenness centrality (0.100) - this node is a cross-community bridge._
- **Why does `HostKind` connect `Community 0` to `Community 2`, `Community 69`, `Community 6`, `Community 9`, `Community 18`, `Community 21`, `Community 31`?**
  _High betweenness centrality (0.065) - this node is a cross-community bridge._
- **Why does `EvidenceEnvelope` connect `Community 12` to `Community 32`, `Community 1`, `Community 2`, `Community 4`, `Community 5`, `Community 6`, `Community 17`, `Community 50`, `Community 21`, `Community 22`, `Community 25`, `Community 31`?**
  _High betweenness centrality (0.050) - this node is a cross-community bridge._
- **What connects `name`, `version`, `private` to the rest of the system?**
  _417 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.06806526806526807 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.05649350649350649 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.046511627906976744 - nodes in this community are weakly interconnected._
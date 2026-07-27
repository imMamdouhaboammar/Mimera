import { afterEach, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type { AssetProvenanceRecord } from "@mimera/contracts";
import { MimeraStore } from "../src/index.ts";

const directories: string[] = [];
afterEach(async () => {
  await Promise.all(directories.splice(0).map((directory) => rm(directory, { recursive: true, force: true })));
});

test("persists and updates asset provenance decisions", async () => {
  const directory = await mkdtemp(join(tmpdir(), "mimera-provenance-"));
  directories.push(directory);
  const store = new MimeraStore(join(directory, "mimera.sqlite"));
  const initial: AssetProvenanceRecord = {
    assetId: "asset-1",
    sourceUrl: "https://example.com/logo.svg",
    usageDecision: "manual-review-required",
    reason: "License is not known",
  };
  const approved: AssetProvenanceRecord = {
    ...initial,
    ownershipAssertion: "User confirms ownership",
    usageDecision: "allowed-user-owned",
    reviewer: "user",
    reason: "Ownership confirmed",
  };

  store.putAssetProvenance(initial);
  expect(store.getAssetProvenance("asset-1")?.usageDecision).toBe("manual-review-required");
  store.putAssetProvenance(approved);

  expect(store.getAssetProvenance("asset-1")).toEqual(approved);
  expect(store.listAssetProvenance()).toEqual([approved]);
  store.close();
});

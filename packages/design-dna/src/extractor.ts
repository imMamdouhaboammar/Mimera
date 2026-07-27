import type { DomNodeEvidence } from "@mimera/browser-lab";
import {
  DesignDnaSchema,
  PageDecompositionSchema,
  type DesignAnalysisResult,
  type PageComponentHypothesis,
  type PaletteToken,
  type ResponsiveRule,
  type ScaleValue,
  type TypographySample,
  type ViewportDomEvidence,
} from "./contracts.ts";

export interface DesignDnaExtractorOptions {
  now?: () => string;
}

interface CountEntry {
  count: number;
  evidenceIds: Set<string>;
}

interface PaletteEntry extends CountEntry {
  roles: Set<"foreground" | "background">;
}

interface TypographyEntry extends CountEntry {
  fontFamily: string;
  fontSizePx: number;
  fontWeight: string;
  lineHeightPx: number | null;
}

function parsePx(value: string): number | null {
  const match = value.trim().match(/^(-?\d+(?:\.\d+)?)px$/);
  return match ? Number(match[1]) : null;
}

function extractPxValues(value: string): number[] {
  return [...value.matchAll(/(-?\d+(?:\.\d+)?)px/g)]
    .map((match) => Number(match[1]))
    .filter((number) => Number.isFinite(number) && number > 0);
}

function increment(record: Record<string, number>, key: string): void {
  record[key] = (record[key] ?? 0) + 1;
}

function gcd(left: number, right: number): number {
  let a = Math.abs(Math.round(left));
  let b = Math.abs(Math.round(right));
  while (b !== 0) {
    const remainder = a % b;
    a = b;
    b = remainder;
  }
  return a;
}

function rhythmUnit(values: ScaleValue[]): number | null {
  const integers = values
    .map((item) => Math.round(item.valuePx))
    .filter((value) => value > 0 && value <= 256);
  if (integers.length === 0) return null;
  const result = integers.reduce((current, value) => gcd(current, value));
  return result > 0 ? result : null;
}

function cornerLanguage(values: ScaleValue[]): "square" | "subtle" | "soft" | "rounded" | "pill" {
  const positive = values.map((item) => item.valuePx).filter((value) => value > 0).sort((a, b) => a - b);
  if (positive.length === 0) return "square";
  const median = positive[Math.floor(positive.length / 2)] ?? 0;
  if (median <= 6) return "subtle";
  if (median <= 16) return "soft";
  if (median <= 32) return "rounded";
  return "pill";
}

function identity(node: DomNodeEvidence): string {
  if (node.id) return `id:${node.id}`;
  if (node.dataComponent) return `component:${node.dataComponent}`;
  if (node.ariaLabel) return `aria:${node.ariaLabel}`;
  return `path:${node.domPath}`;
}

function scale(map: Map<number, number>): ScaleValue[] {
  return [...map.entries()]
    .map(([valuePx, count]) => ({ valuePx, count }))
    .sort((left, right) => left.valuePx - right.valuePx || right.count - left.count);
}

function slug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "component";
}

function componentKind(node: DomNodeEvidence): PageComponentHypothesis["kind"] {
  if (node.dataComponent?.toLowerCase().includes("nav")) return "navbar";
  if (node.tag === "header") return "header";
  if (node.tag === "main") return "main";
  if (node.tag === "section") return "section";
  if (node.tag === "footer") return "footer";
  if (node.tag === "nav") return "navigation";
  return "component";
}

export class DesignDnaExtractor {
  readonly #now: () => string;

  constructor(options: DesignDnaExtractorOptions = {}) {
    this.#now = options.now ?? (() => new Date().toISOString());
  }

  extract(input: readonly ViewportDomEvidence[]): DesignAnalysisResult {
    if (input.length === 0) throw new Error("Design DNA extraction requires DOM evidence");
    const evidence = [...input].sort(
      (left, right) => right.viewport.width - left.viewport.width || left.evidenceId.localeCompare(right.evidenceId),
    );
    const paletteMap = new Map<string, PaletteEntry>();
    const typographyMap = new Map<string, TypographyEntry>();
    const spacingMap = new Map<number, number>();
    const radiusMap = new Map<number, number>();
    const displayCounts: Record<string, number> = {};
    const positionCounts: Record<string, number> = {};
    const stickyNodePaths = new Set<string>();
    let observedNodeCount = 0;
    let densityTotal = 0;

    for (const item of evidence) {
      let visibleCount = 0;
      for (const node of item.dom.nodes) {
        if (!node.visible) continue;
        visibleCount += 1;
        observedNodeCount += 1;
        increment(displayCounts, node.styles.display);
        increment(positionCounts, node.styles.position);
        if (node.styles.position === "sticky" || node.styles.position === "fixed") {
          stickyNodePaths.add(node.domPath);
        }

        const colors: Array<[string, "foreground" | "background"]> = [
          [node.styles.color, "foreground"],
          [node.styles.backgroundColor, "background"],
        ];
        for (const [value, role] of colors) {
          if (!value || value === "transparent" || value === "rgba(0, 0, 0, 0)") continue;
          const entry = paletteMap.get(value) ?? {
            count: 0,
            roles: new Set<"foreground" | "background">(),
            evidenceIds: new Set<string>(),
          };
          entry.count += 1;
          entry.roles.add(role);
          entry.evidenceIds.add(item.evidenceId);
          paletteMap.set(value, entry);
        }

        const fontSizePx = parsePx(node.styles.fontSize) ?? 0;
        const lineHeightPx = parsePx(node.styles.lineHeight);
        const typeKey = [node.styles.fontFamily, fontSizePx, node.styles.fontWeight, lineHeightPx ?? "normal"].join("|");
        const typeEntry = typographyMap.get(typeKey) ?? {
          fontFamily: node.styles.fontFamily,
          fontSizePx,
          fontWeight: node.styles.fontWeight,
          lineHeightPx,
          count: 0,
          evidenceIds: new Set<string>(),
        };
        typeEntry.count += 1;
        typeEntry.evidenceIds.add(item.evidenceId);
        typographyMap.set(typeKey, typeEntry);

        for (const styleValue of [node.styles.gap, node.styles.padding, node.styles.margin]) {
          for (const value of extractPxValues(styleValue)) {
            spacingMap.set(value, (spacingMap.get(value) ?? 0) + 1);
          }
        }
        for (const value of extractPxValues(node.styles.borderRadius)) {
          radiusMap.set(value, (radiusMap.get(value) ?? 0) + 1);
        }
      }
      const megapixels = (item.viewport.width * item.viewport.height) / 1_000_000;
      densityTotal += megapixels > 0 ? visibleCount / megapixels : 0;
    }

    const palette: PaletteToken[] = [...paletteMap.entries()]
      .map(([value, entry]) => ({
        value,
        count: entry.count,
        roles: [...entry.roles].sort(),
        evidenceIds: [...entry.evidenceIds].sort(),
      }))
      .sort((left, right) => right.count - left.count || left.value.localeCompare(right.value));
    const typography: TypographySample[] = [...typographyMap.values()]
      .map((entry) => ({
        fontFamily: entry.fontFamily,
        fontSizePx: entry.fontSizePx,
        fontWeight: entry.fontWeight,
        lineHeightPx: entry.lineHeightPx,
        count: entry.count,
        evidenceIds: [...entry.evidenceIds].sort(),
      }))
      .sort((left, right) => right.fontSizePx - left.fontSizePx || right.count - left.count);
    const spacingScale = scale(spacingMap);
    const radiusScale = scale(radiusMap);
    const responsiveRules = this.#responsiveRules(evidence);
    const densityScore = densityTotal / evidence.length;

    const generatedAt = this.#now();
    const dna = DesignDnaSchema.parse({
      schemaVersion: "1",
      generatedAt,
      viewportIds: evidence.map((item) => item.viewport.id),
      palette,
      typography,
      spacingScale,
      radiusScale,
      layout: {
        displayCounts,
        positionCounts,
        stickyNodePaths: [...stickyNodePaths].sort(),
      },
      responsiveRules,
      signature: {
        rhythmUnitPx: rhythmUnit(spacingScale),
        cornerLanguage: cornerLanguage(radiusScale),
        density: densityScore < 6 ? "sparse" : densityScore < 14 ? "balanced" : "dense",
      },
      confidence: {
        overall: Math.min(0.98, 0.55 + evidence.length * 0.12 + Math.min(observedNodeCount, 50) * 0.005),
        viewportCoverage: evidence.length,
        observedNodeCount,
      },
    });

    const decomposition = PageDecompositionSchema.parse({
      schemaVersion: "1",
      sourceUrl: evidence[0]!.dom.url,
      generatedAt,
      components: this.#decompose(evidence),
    });
    return { dna, decomposition };
  }

  #responsiveRules(evidence: readonly ViewportDomEvidence[]): ResponsiveRule[] {
    if (evidence.length < 2) return [];
    const desktop = evidence[0]!;
    const mobile = evidence[evidence.length - 1]!;
    const desktopNodes = new Map(desktop.dom.nodes.map((node) => [identity(node), node]));
    const mobileNodes = new Map(mobile.dom.nodes.map((node) => [identity(node), node]));
    const identities = [...new Set([...desktopNodes.keys(), ...mobileNodes.keys()])].sort();
    const rules: ResponsiveRule[] = [];

    for (const key of identities) {
      const desktopNode = desktopNodes.get(key);
      const mobileNode = mobileNodes.get(key);
      if (desktopNode?.visible && mobileNode && !mobileNode.visible) {
        rules.push({
          type: "hidden-on-mobile",
          identity: key,
          confidence: 0.98,
          rationale: "The element is visible in the widest viewport and hidden in the narrowest viewport.",
          evidenceIds: [desktop.evidenceId, mobile.evidenceId].sort(),
        });
      } else if (desktopNode && !desktopNode.visible && mobileNode?.visible) {
        rules.push({
          type: "mobile-only",
          identity: key,
          confidence: 0.98,
          rationale: "The element is hidden in the widest viewport and visible in the narrowest viewport.",
          evidenceIds: [desktop.evidenceId, mobile.evidenceId].sort(),
        });
      } else if (desktopNode?.visible && mobileNode?.visible) {
        const desktopRatio = desktopNode.rect.width / desktop.viewport.width;
        const mobileRatio = mobileNode.rect.width / mobile.viewport.width;
        if (desktopRatio < 0.75 && mobileRatio >= 0.9) {
          rules.push({
            type: "becomes-full-width",
            identity: key,
            confidence: 0.85,
            rationale: "The element expands from a bounded desktop width to at least 90% of the mobile viewport.",
            evidenceIds: [desktop.evidenceId, mobile.evidenceId].sort(),
          });
        }
      }
    }

    const desktopNavigation = desktop.dom.nodes.some(
      (node) => node.tag === "nav" && node.visible,
    );
    const mobileNavigationHidden = mobile.dom.nodes.some(
      (node) => node.tag === "nav" && !node.visible,
    );
    const mobileMenu = mobile.dom.nodes.find(
      (node) => node.visible && node.tag === "button" && /menu/i.test(node.ariaLabel ?? node.text),
    );
    if (desktopNavigation && mobileNavigationHidden && mobileMenu) {
      rules.push({
        type: "navigation-collapses-to-menu",
        identity: mobileMenu.nearestComponent
          ? `component:${mobileMenu.nearestComponent}`
          : identity(mobileMenu),
        confidence: 0.99,
        rationale: "Desktop navigation is visible while the mobile navigation is hidden and a menu control appears.",
        evidenceIds: [desktop.evidenceId, mobile.evidenceId].sort(),
      });
    }

    return rules.sort((left, right) => left.type.localeCompare(right.type) || left.identity.localeCompare(right.identity));
  }

  #decompose(evidence: readonly ViewportDomEvidence[]): PageComponentHypothesis[] {
    const primary = evidence[0]!;
    const candidates = primary.dom.nodes.filter((node) => {
      if (!node.visible) return false;
      if (node.dataComponent) return true;
      if (!["header", "main", "section", "footer", "nav"].includes(node.tag)) return false;
      return !node.nearestComponent;
    });
    const seenIds = new Set<string>();
    const components: PageComponentHypothesis[] = [];

    for (const node of candidates.sort((left, right) => left.rect.y - right.rect.y || left.domPath.localeCompare(right.domPath))) {
      const baseId = slug(node.dataComponent ?? node.id ?? node.tag);
      let id = baseId;
      let suffix = 2;
      while (seenIds.has(id)) id = `${baseId}-${suffix++}`;
      seenIds.add(id);
      const nodeIdentity = identity(node);
      const visibilityByViewport: Record<string, boolean> = {};
      const evidenceIds: string[] = [];
      for (const item of evidence) {
        const match = item.dom.nodes.find((candidate) => identity(candidate) === nodeIdentity);
        visibilityByViewport[item.viewport.id] = match?.visible ?? false;
        if (match) evidenceIds.push(item.evidenceId);
      }
      components.push({
        id,
        name: node.dataComponent ?? node.tag,
        kind: componentKind(node),
        domPath: node.domPath,
        boundaries: {
          yStart: node.rect.y,
          yEnd: node.rect.y + node.rect.height,
        },
        visibilityByViewport,
        evidenceIds: [...new Set(evidenceIds)].sort(),
        confidence: node.dataComponent ? 0.97 : 0.82,
      });
    }
    return components;
  }
}

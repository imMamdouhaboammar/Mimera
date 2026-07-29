import { z } from "zod";
import { BrandMappingSchema, type BrandMapping } from "@mimera/contracts";
import type { DesignDna, PaletteToken } from "@mimera/design-dna";

export const BrandAdaptationPayloadSchema = z
  .object({
    schemaVersion: z.literal("1"),
    kind: z.literal("brand-mapping"),
    data: BrandMappingSchema,
  })
  .strict();
export type BrandAdaptationPayload = z.infer<typeof BrandAdaptationPayloadSchema>;

export interface BrandAdaptationInput {
  dna: DesignDna;
  targetBrandTokens?: Record<string, string>;
  preserveExistingIdentity?: boolean;
}

export interface BrandAdaptationResult {
  brandMapping: BrandMapping;
  adaptedPalette: PaletteToken[];
}

export class BrandAdapter {
  adapt(input: BrandAdaptationInput): BrandAdaptationResult {
    const preserve = input.preserveExistingIdentity ?? true;
    const targetTokens = input.targetBrandTokens ?? {};
    const tokenMappings: Record<string, string> = {};
    const notes: string[] = [];

    const adaptedPalette: PaletteToken[] = input.dna.palette.map((color) => {
      const primaryRole = color.roles[0] ?? "foreground";
      const targetMapped = targetTokens[primaryRole] ?? targetTokens[color.value];
      if (targetMapped) {
        tokenMappings[color.value] = targetMapped;
        tokenMappings[primaryRole] = targetMapped;
        notes.push(`Mapped ${primaryRole} (${color.value}) -> ${targetMapped}`);
        return { ...color, value: targetMapped };
      }
      return color;
    });

    if (preserve) {
      notes.push("Preserving existing target project typography scale and brand identity");
    }

    const brandMapping: BrandMapping = {
      tokenMappings,
      preserveExistingIdentity: preserve,
      notes,
    };

    return {
      brandMapping,
      adaptedPalette,
    };
  }
}

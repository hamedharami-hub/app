import { describe, expect, it } from "vitest";
import { getScenarioLinks } from "./pharmacyPracticeLinks";
import { PHARMACY_PRACTICE_SCENARIOS } from "./pharmacyScenarioPracticeData";
import { PHARMACY_SEED_DOCUMENTS } from "./pharmacySeedData";

describe("getScenarioLinks", () => {
  it("links scenarios only to documents that exist in the seed", () => {
    const seedIds = new Set(PHARMACY_SEED_DOCUMENTS.map((document) => document.id));
    let linked = 0;
    for (const scenario of PHARMACY_PRACTICE_SCENARIOS) {
      expect(seedIds.has(scenario.documentId)).toBe(true);
      const links = getScenarioLinks(scenario.id);
      for (const disease of links.diseases) expect(seedIds.has(disease.documentId)).toBe(true);
      for (const product of links.products) expect(seedIds.has(product.documentId)).toBe(true);
      linked += links.diseases.length + links.products.length;
    }
    expect(linked).toBeGreaterThan(0);
  });

  it("maps involved medicines to shelf products via the source graph", () => {
    const links = getScenarioLinks("slang-ibuprofen-brand-vs-generic");
    expect(links.products.some((product) => /ibuprofen/i.test(product.genericName))).toBe(true);
  });

  it("returns empty links for an unknown scenario", () => {
    expect(getScenarioLinks("missing")).toEqual({ diseases: [], products: [] });
  });
});

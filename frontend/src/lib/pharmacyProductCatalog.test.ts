import { describe, expect, it } from "vitest";
import { PHARMACY_PRODUCT_CATALOG } from "@/lib/pharmacyProductCatalogData";
import { PHARMACY_SEED_DOCUMENTS } from "@/lib/pharmacySeedData";
import {
  filterPharmacyProducts,
  getPharmacyProductCategories,
  normalizePharmacyCatalogText,
} from "@/lib/pharmacyProductCatalog";

describe("Pharmacy product catalog index", () => {
  it("contains unique metadata-only entries mapped to the matching imported monograph IDs", () => {
    const ids = PHARMACY_PRODUCT_CATALOG.map((product) => product.id);
    const knowledgeDocumentIds = new Set(PHARMACY_SEED_DOCUMENTS.map((document) => document.id));
    expect(PHARMACY_PRODUCT_CATALOG).toHaveLength(121);
    expect(new Set(ids).size).toBe(ids.length);
    expect(PHARMACY_PRODUCT_CATALOG.every((product) => product.documentId === `doc-product-${product.id}`)).toBe(true);
    expect(PHARMACY_PRODUCT_CATALOG.every((product) => knowledgeDocumentIds.has(product.documentId))).toBe(true);
    expect(PHARMACY_PRODUCT_CATALOG.every((product) => product.contentReviewStatus === "unreviewed")).toBe(true);
    expect(PHARMACY_PRODUCT_CATALOG.every((product) => product.sourceUrl.includes("/blob/5b4f7d2443a3ed97aea752c1d0d18583ce6d0067/"))).toBe(true);

    const forbiddenFields = ["counselling", "counseling", "dosing", "pregnancy", "warning", "triage", "safety"];
    for (const product of PHARMACY_PRODUCT_CATALOG) {
      for (const key of Object.keys(product)) {
        expect(forbiddenFields.some((forbidden) => key.toLowerCase().includes(forbidden))).toBe(false);
      }
    }
  });

  it("normalizes Arabic keyboard variants for Persian search", () => {
    expect(normalizePharmacyCatalogText("كِتاب يَك")).toBe("کتاب یک");
    expect(normalizePharmacyCatalogText("۵۰۰ ٤٢")).toBe("500 42");
  });

  it("filters by schedule and category without mutating source entries", () => {
    const originalIds = PHARMACY_PRODUCT_CATALOG.map((product) => product.id);
    const first = PHARMACY_PRODUCT_CATALOG[0];
    const categoryRows = filterPharmacyProducts(PHARMACY_PRODUCT_CATALOG, {
      schedule: first.schedule,
      categoryId: first.categoryId ?? undefined,
    });

    expect(categoryRows.length).toBeGreaterThan(0);
    expect(categoryRows.every((product) => product.schedule === first.schedule)).toBe(true);
    expect(categoryRows.every((product) => product.categoryId === first.categoryId)).toBe(true);
    expect(PHARMACY_PRODUCT_CATALOG.map((product) => product.id)).toEqual(originalIds);
  });

  it("searches across brand and generic labels and builds locale-specific category choices", () => {
    expect(filterPharmacyProducts(PHARMACY_PRODUCT_CATALOG, { query: "panadol" }).length).toBeGreaterThan(0);
    expect(filterPharmacyProducts(PHARMACY_PRODUCT_CATALOG, { query: "paracetamol" }).length).toBeGreaterThan(0);
    expect(filterPharmacyProducts(PHARMACY_PRODUCT_CATALOG, { query: "no matching product" })).toEqual([]);

    const faCategories = getPharmacyProductCategories(PHARMACY_PRODUCT_CATALOG, "fa");
    const enCategories = getPharmacyProductCategories(PHARMACY_PRODUCT_CATALOG, "en");
    expect(faCategories.length).toBeGreaterThan(0);
    expect(new Set(faCategories.map((category) => category.id)).size).toBe(faCategories.length);
    expect(enCategories.find((category) => category.id === "cat-1")?.label).toBe("Primary Care, OTC & First Aid");
  });
});

describe("product grouping and sorting", () => {
  it("groups by mechanism with unmapped products last and keeps every product", async () => {
    const { PHARMACY_PRODUCT_CATALOG } = await import("./pharmacyProductCatalogData");
    const { groupPharmacyProducts, UNMAPPED_MECHANISM_GROUP_ID } = await import("./pharmacyProductCatalog");
    const groups = groupPharmacyProducts(PHARMACY_PRODUCT_CATALOG, "mechanism", "en", "Other");
    expect(groups.reduce((total, group) => total + group.products.length, 0)).toBe(PHARMACY_PRODUCT_CATALOG.length);
    expect(groups.at(-1)?.id).toBe(UNMAPPED_MECHANISM_GROUP_ID);
    expect(groups.filter((group) => group.id !== UNMAPPED_MECHANISM_GROUP_ID).every((group) => group.documentId?.startsWith("doc-mechanism-"))).toBe(true);
  });

  it("sorts by schedule then brand", async () => {
    const { PHARMACY_PRODUCT_CATALOG } = await import("./pharmacyProductCatalogData");
    const { sortPharmacyProducts } = await import("./pharmacyProductCatalog");
    const sorted = sortPharmacyProducts(PHARMACY_PRODUCT_CATALOG, "schedule", "en");
    const order = ["Unscheduled", "S2", "S3", "S4", "S8"];
    for (let index = 1; index < sorted.length; index += 1) {
      expect(order.indexOf(sorted[index].schedule)).toBeGreaterThanOrEqual(order.indexOf(sorted[index - 1].schedule));
    }
  });

  it("links mechanism and CAL entries to existing seed documents", async () => {
    const { PHARMACY_PRODUCT_CATALOG, PHARMACY_CAL_LABELS } = await import("./pharmacyProductCatalogData");
    const { PHARMACY_SEED_DOCUMENTS } = await import("./pharmacySeedData");
    const ids = new Set(PHARMACY_SEED_DOCUMENTS.map((document) => document.id));
    for (const product of PHARMACY_PRODUCT_CATALOG) if (product.mechanism) expect(ids.has(product.mechanism.documentId)).toBe(true);
    for (const label of PHARMACY_CAL_LABELS) expect(ids.has(label.documentId)).toBe(true);
    const codes = new Set(PHARMACY_CAL_LABELS.map((label) => label.code));
    for (const product of PHARMACY_PRODUCT_CATALOG) for (const code of product.calLabels) expect(codes.has(code)).toBe(true);
  });
});

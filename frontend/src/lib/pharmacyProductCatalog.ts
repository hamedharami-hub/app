export type PharmacyProductSchedule = "Unscheduled" | "S2" | "S3" | "S4" | "S8";
export type PharmacyProductScheduleFilter = "all" | PharmacyProductSchedule;

/**
 * A metadata-only index entry. It is not a substitute for the source monograph
 * and intentionally contains no counselling, dosing, safety, or triage fields.
 */
export interface PharmacyProductCatalogEntry {
  id: string;
  documentId: string;
  brandName: string;
  genericName: string;
  activeIngredients: string;
  packSize: string;
  schedule: PharmacyProductSchedule;
  categoryId: string | null;
  categoryFa: string;
  categoryEn: string;
  subcategoryId: string | null;
  subcategoryFa: string;
  subcategoryEn: string;
  mechanism: PharmacyProductMechanism | null;
  calLabels: string[];
  requiresProjectStop: boolean;
  isNarrowTherapeuticIndex: boolean;
  aFlagBioequivalent: boolean;
  equivalentBrands: string[];
  sourceUrl: string;
  contentReviewStatus: "unreviewed";
}

export interface PharmacyProductMechanism {
  classCode: string;
  classNameFa: string;
  classNameEn: string;
  actionTypeFa: string;
  actionTypeEn: string;
  targetSiteFa: string;
  targetSiteEn: string;
  documentId: string;
}

export interface PharmacyCalLabel {
  code: string;
  nameFa: string;
  nameEn: string;
  descriptionFa: string;
  descriptionEn: string;
  documentId: string;
}

export interface PharmacyProductCategory {
  id: string;
  label: string;
}

export interface PharmacyProductCatalogFilters {
  query?: string;
  schedule?: PharmacyProductScheduleFilter;
  categoryId?: string;
}

const SEARCH_FIELDS = [
  "brandName",
  "genericName",
  "activeIngredients",
  "packSize",
  "categoryFa",
  "categoryEn",
  "subcategoryFa",
  "subcategoryEn",
  "schedule",
] as const;

/** Normalize common Persian/Arabic variants while preserving the visible source text. */
export function normalizePharmacyCatalogText(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFKC")
    .replace(/[\u064A\u0649]/g, "ی")
    .replace(/\u0643/g, "ک")
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[\u06F0-\u06F9]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0))
    .replace(/[\u0660-\u0669]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
    .toLocaleLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

export function getPharmacyProductCategories(
  products: readonly PharmacyProductCatalogEntry[],
  language: "fa" | "en",
): PharmacyProductCategory[] {
  const categories = new Map<string, string>();
  for (const product of products) {
    if (!product.categoryId) continue;
    const label = language === "en" ? product.categoryEn : product.categoryFa;
    if (label.trim() && !categories.has(product.categoryId)) categories.set(product.categoryId, label);
  }

  return [...categories.entries()]
    .map(([id, label]) => ({ id, label }))
    .sort((a, b) => a.label.localeCompare(b.label, language === "fa" ? "fa" : "en"));
}

export function filterPharmacyProducts(
  products: readonly PharmacyProductCatalogEntry[],
  filters: PharmacyProductCatalogFilters = {},
): PharmacyProductCatalogEntry[] {
  const query = normalizePharmacyCatalogText(filters.query);
  return products.filter((product) => {
    if (filters.schedule && filters.schedule !== "all" && product.schedule !== filters.schedule) return false;
    if (filters.categoryId && filters.categoryId !== "all" && product.categoryId !== filters.categoryId) return false;
    if (!query) return true;

    return SEARCH_FIELDS.some((field) => normalizePharmacyCatalogText(product[field]).includes(query));
  });
}

export type PharmacyProductGrouping = "none" | "subcategory" | "mechanism";
export type PharmacyProductSort = "brand" | "generic" | "schedule" | "mechanism";

export interface PharmacyProductGroup {
  id: string;
  label: string;
  documentId: string | null;
  products: PharmacyProductCatalogEntry[];
}

const SCHEDULE_ORDER: Record<PharmacyProductSchedule, number> = { Unscheduled: 0, S2: 1, S3: 2, S4: 3, S8: 4 };
export const UNMAPPED_MECHANISM_GROUP_ID = "unmapped-mechanism";

export function sortPharmacyProducts(
  products: readonly PharmacyProductCatalogEntry[],
  sort: PharmacyProductSort,
  language: "fa" | "en",
): PharmacyProductCatalogEntry[] {
  const locale = language === "fa" ? "fa" : "en";
  const mechanismName = (product: PharmacyProductCatalogEntry) =>
    product.mechanism ? (language === "en" ? product.mechanism.classNameEn : product.mechanism.classNameFa) : "\uffff";
  return [...products].sort((a, b) => {
    const primary = sort === "generic"
      ? a.genericName.localeCompare(b.genericName, locale)
      : sort === "schedule"
        ? SCHEDULE_ORDER[a.schedule] - SCHEDULE_ORDER[b.schedule]
        : sort === "mechanism"
          ? mechanismName(a).localeCompare(mechanismName(b), locale)
          : 0;
    return primary || a.brandName.localeCompare(b.brandName, locale);
  });
}

export function groupPharmacyProducts(
  products: readonly PharmacyProductCatalogEntry[],
  grouping: PharmacyProductGrouping,
  language: "fa" | "en",
  unmappedLabel: string,
): PharmacyProductGroup[] {
  if (grouping === "none") return [{ id: "all", label: "", documentId: null, products: [...products] }];
  const groups = new Map<string, PharmacyProductGroup>();
  for (const product of products) {
    const mechanism = product.mechanism;
    const id = grouping === "mechanism"
      ? mechanism?.classCode ?? UNMAPPED_MECHANISM_GROUP_ID
      : product.subcategoryId ?? "none";
    const label = grouping === "mechanism"
      ? mechanism ? (language === "en" ? mechanism.classNameEn : mechanism.classNameFa) : unmappedLabel
      : (language === "en" ? product.subcategoryEn : product.subcategoryFa) || unmappedLabel;
    const group = groups.get(id) ?? { id, label, documentId: grouping === "mechanism" ? mechanism?.documentId ?? null : null, products: [] };
    group.products.push(product);
    groups.set(id, group);
  }
  return [...groups.values()].sort((a, b) => {
    if (a.id === UNMAPPED_MECHANISM_GROUP_ID || a.id === "none") return 1;
    if (b.id === UNMAPPED_MECHANISM_GROUP_ID || b.id === "none") return -1;
    return a.label.localeCompare(b.label, language === "fa" ? "fa" : "en");
  });
}

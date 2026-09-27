import { PHARMACY_CLINICAL_ENTITIES, PHARMACY_CLINICAL_RELATIONS } from "./pharmacyClinicalGraph.generated";
import { PHARMACY_PRODUCT_CATALOG } from "./pharmacyProductCatalogData";
import type { PharmacyProductCatalogEntry } from "./pharmacyProductCatalog";

export interface PharmacyLinkedDocument {
  documentId: string;
  titleFa: string;
  titleEn: string;
}

export interface PharmacyScenarioLinks {
  diseases: PharmacyLinkedDocument[];
  products: PharmacyProductCatalogEntry[];
}

const entityById = new Map(PHARMACY_CLINICAL_ENTITIES.map((entity) => [entity.id, entity]));
const productById = new Map(PHARMACY_PRODUCT_CATALOG.map((product) => [product.id, product]));

/** Source-graph links only (no title guessing); the graph itself is unreviewed. */
export function getScenarioLinks(scenarioId: string): PharmacyScenarioLinks {
  const scenarioNodeId = `triage:${scenarioId}`;
  const diseaseIds = new Set<string>();
  const medicineIds = new Set<string>();
  for (const relation of PHARMACY_CLINICAL_RELATIONS) {
    if (relation.fromId !== scenarioNodeId) continue;
    if (relation.type === "triages") diseaseIds.add(relation.toId);
    if (relation.type === "involves-medicine") medicineIds.add(relation.toId);
  }

  const productIds = new Set<string>();
  for (const relation of PHARMACY_CLINICAL_RELATIONS) {
    if (relation.type === "has-medicine" && medicineIds.has(relation.toId)) productIds.add(relation.fromId);
  }

  const diseases = [...diseaseIds]
    .map((id) => entityById.get(id))
    .filter((entity): entity is NonNullable<typeof entity> => Boolean(entity?.documentId))
    .map((entity) => ({ documentId: entity.documentId!, titleFa: entity.title.fa, titleEn: entity.title.en }));
  const products = [...productIds]
    .map((id) => productById.get(id.replace(/^product:/, "")))
    .filter((product): product is PharmacyProductCatalogEntry => Boolean(product));

  return { diseases, products };
}

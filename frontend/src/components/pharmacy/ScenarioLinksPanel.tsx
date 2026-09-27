import { BookOpen, FileText, Pill, Stethoscope } from "lucide-react";
import { useBilingual } from "@/hooks/useBilingual";
import type { PharmacyScenarioLinks } from "@/lib/pharmacyPracticeLinks";

interface ScenarioLinksPanelProps {
  caseDocumentId: string;
  links: PharmacyScenarioLinks;
  onOpenDocument: (documentId: string) => void;
}

export function ScenarioLinksPanel({ caseDocumentId, links, onOpenDocument }: ScenarioLinksPanelProps) {
  const { T, lang } = useBilingual();
  const isEn = lang === "en";
  const chip = "inline-flex max-w-full items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

  return (
    <section aria-labelledby="scenario-links-heading" className="space-y-2 rounded-xl border bg-card/60 p-3" data-testid="scenario-links-panel">
      <h3 id="scenario-links-heading" className="flex items-center gap-1.5 text-sm font-semibold"><BookOpen className="h-4 w-4" aria-hidden="true" />{T("پیوند به Knowledge", "Linked in Knowledge")}</h3>
      <div className="flex flex-wrap gap-1.5">
        <button type="button" className={chip} onClick={() => onOpenDocument(caseDocumentId)} data-testid="scenario-open-case-doc-btn">
          <FileText className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /><span className="truncate">{T("سند پرونده", "Case document")}</span>
        </button>
        {links.diseases.map((disease) => (
          <button key={disease.documentId} type="button" className={chip} onClick={() => onOpenDocument(disease.documentId)} data-testid={`scenario-disease-link-${disease.documentId}`}>
            <Stethoscope className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /><span className="truncate">{isEn ? disease.titleEn : disease.titleFa}</span>
          </button>
        ))}
        {links.products.map((product) => (
          <button key={product.id} type="button" className={chip} onClick={() => onOpenDocument(product.documentId)} data-testid={`scenario-monograph-link-${product.id}`}>
            <Pill className="h-3.5 w-3.5 shrink-0" aria-hidden="true" /><span className="truncate">{product.brandName}</span>
          </button>
        ))}
      </div>
      {!links.diseases.length && !links.products.length && (
        <p className="text-xs text-muted-foreground">{T("گراف منبع برای این پرونده پیوند بیماری/دارو ندارد.", "The source graph has no disease or medicine links for this case.")}</p>
      )}
    </section>
  );
}

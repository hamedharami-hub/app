import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useBilingual } from "@/hooks/useBilingual";
import type { PharmacyProductCatalogEntry } from "@/lib/pharmacyProductCatalog";
import { PHARMACY_DIALOG_CLASS } from "./pharmacyDialogClass";

interface DrugComparisonDialogProps {
  products: PharmacyProductCatalogEntry[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DrugComparisonDialog({ products, open, onOpenChange }: DrugComparisonDialogProps) {
  const { T, lang } = useBilingual();
  const isEn = lang === "en";
  const yesNo = (value: boolean) => (value ? T("بله", "Yes") : T("خیر", "No"));
  const rows: Array<{ label: string; value: (product: PharmacyProductCatalogEntry) => string }> = [
    { label: T("ژنریک", "Generic"), value: (p) => p.genericName },
    { label: T("مادهٔ مؤثره", "Active ingredient"), value: (p) => p.activeIngredients },
    { label: T("رده", "Schedule"), value: (p) => p.schedule },
    { label: T("دسته", "Category"), value: (p) => (isEn ? p.categoryEn : p.categoryFa) },
    { label: T("زیردسته", "Subcategory"), value: (p) => (isEn ? p.subcategoryEn : p.subcategoryFa) },
    { label: T("کلاس مکانیزم", "Mechanism class"), value: (p) => (p.mechanism ? (isEn ? p.mechanism.classNameEn : p.mechanism.classNameFa) : "—") },
    { label: T("محل اثر", "Target site"), value: (p) => (p.mechanism ? (isEn ? p.mechanism.targetSiteEn : p.mechanism.targetSiteFa) : "—") },
    { label: T("برچسب‌های CAL", "CAL labels"), value: (p) => p.calLabels.join(", ") || "—" },
    { label: T("پنجرهٔ درمانی باریک (NTI)", "Narrow therapeutic index"), value: (p) => yesNo(p.isNarrowTherapeuticIndex) },
    { label: T("جایگزینی A-flag", "A-flag substitutable"), value: (p) => yesNo(p.aFlagBioequivalent) },
    { label: "Project STOP", value: (p) => yesNo(p.requiresProjectStop) },
    { label: T("برندهای معادل", "Equivalent brands"), value: (p) => p.equivalentBrands.join(", ") || "—" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`${PHARMACY_DIALOG_CLASS} sm:max-w-4xl`} dir={isEn ? "ltr" : "rtl"} data-testid="pharmacy-compare-dialog">
        <DialogHeader className="text-start">
          <DialogTitle className="pe-6 text-start">{T("مقایسهٔ داروها", "Compare medicines")}</DialogTitle>
          <DialogDescription className="text-start">{T("برچسب‌های منبع، بازبینی‌نشده؛ فقط برای مطالعه.", "Source labels, unreviewed; for study only.")}</DialogDescription>
        </DialogHeader>
        <div className="overflow-x-auto" dir={isEn ? "ltr" : "rtl"}>
          <table className="w-full min-w-[32rem] border-collapse text-sm" data-testid="pharmacy-compare-table">
            <thead>
              <tr>
                <th className="w-40 border-b p-2 text-start text-xs text-muted-foreground" scope="col">{T("ویژگی", "Attribute")}</th>
                {products.map((product) => <th key={product.id} scope="col" className="border-b p-2 text-start font-semibold">{product.brandName}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const values = products.map(row.value);
                const differs = new Set(values).size > 1;
                return (
                  <tr key={row.label} className={differs ? "bg-primary/5" : undefined}>
                    <th scope="row" className="border-b p-2 text-start align-top text-xs font-medium text-muted-foreground">{row.label}</th>
                    {values.map((value, index) => <td key={products[index].id} className="break-words border-b p-2 align-top">{value || "—"}</td>)}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground">{T("ردیف‌های رنگی بین داروها متفاوت‌اند.", "Tinted rows differ between the selected medicines.")}</p>
      </DialogContent>
    </Dialog>
  );
}

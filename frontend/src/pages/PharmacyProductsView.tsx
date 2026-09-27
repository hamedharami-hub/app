import { useMemo, useState } from "react";
import { AlertTriangle, BookOpen, Check, Columns2, FlaskConical, PackageSearch, Search, ShieldAlert, SlidersHorizontal, Tag } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DrugComparisonDialog } from "@/components/pharmacy/DrugComparisonDialog";
import { PharmacyDocumentDialog } from "@/components/pharmacy/PharmacyDocumentDialog";
import { PharmacyRegulatoryInfoDialog, type PharmacyRegulatoryTopic } from "@/components/pharmacy/PharmacyRegulatoryInfoDialog";
import { PharmacyStudyActions } from "@/components/pharmacy/PharmacyStudyActions";
import { UrlParamListener } from "@/components/pharmacy/UrlParamListener";
import { PHARMACY_DIALOG_CLASS } from "@/components/pharmacy/pharmacyDialogClass";
import { useBilingual } from "@/hooks/useBilingual";
import { PHARMACY_PRODUCT_CATALOG } from "@/lib/pharmacyProductCatalogData";
import {
  filterPharmacyProducts,
  getPharmacyProductCategories,
  groupPharmacyProducts,
  sortPharmacyProducts,
  type PharmacyProductCatalogEntry,
  type PharmacyProductGrouping,
  type PharmacyProductScheduleFilter,
  type PharmacyProductSort,
} from "@/lib/pharmacyProductCatalog";

const MAX_COMPARE = 3;

export default function PharmacyProductsView() {
  const { T, lang } = useBilingual();
  const [query, setQuery] = useState("");
  const [schedule, setSchedule] = useState<PharmacyProductScheduleFilter>("all");
  const [categoryId, setCategoryId] = useState("all");
  const [grouping, setGrouping] = useState<PharmacyProductGrouping>("none");
  const [sort, setSort] = useState<PharmacyProductSort>("brand");
  const [selectedProduct, setSelectedProduct] = useState<PharmacyProductCatalogEntry | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [regulatory, setRegulatory] = useState<{ topic: PharmacyRegulatoryTopic; calCodes?: string[] } | null>(null);
  const [openDocumentId, setOpenDocumentId] = useState<string | null>(null);
  const isEn = lang === "en";

  const categories = useMemo(() => getPharmacyProductCategories(PHARMACY_PRODUCT_CATALOG, lang), [lang]);
  const products = useMemo(
    () => sortPharmacyProducts(filterPharmacyProducts(PHARMACY_PRODUCT_CATALOG, { query, schedule, categoryId }), sort, lang),
    [categoryId, lang, query, schedule, sort],
  );
  const groups = useMemo(
    () => groupPharmacyProducts(products, grouping, lang, T("بدون نگاشت/سایر", "Unmapped / other")),
    [T, grouping, lang, products],
  );
  const compareProducts = compareIds.map((id) => PHARMACY_PRODUCT_CATALOG.find((product) => product.id === id)).filter((product): product is PharmacyProductCatalogEntry => Boolean(product));

  const resetFilters = () => {
    setQuery("");
    setSchedule("all");
    setCategoryId("all");
    setGrouping("none");
    setSort("brand");
  };
  const toggleCompare = (id: string) => {
    setCompareIds((previous) => {
      if (previous.includes(id)) return previous.filter((item) => item !== id);
      if (previous.length >= MAX_COMPARE) {
        toast.info(T(`حداکثر ${MAX_COMPARE} دارو را می‌توان مقایسه کرد.`, `You can compare up to ${MAX_COMPARE} medicines.`));
        return previous;
      }
      return [...previous, id];
    });
  };

  return (
    <main className="mx-auto w-full max-w-6xl space-y-5 px-3 py-4 pb-24 sm:px-5 sm:py-6" dir={isEn ? "ltr" : "rtl"}>
      <UrlParamListener name="product" onValue={(id) => setSelectedProduct(PHARMACY_PRODUCT_CATALOG.find((product) => product.id === id) ?? null)} />
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-primary/10 p-3 text-primary" aria-hidden="true"><PackageSearch className="h-6 w-6" /></div>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{T("فهرست محصولات دارویی", "Pharmacy product catalogue")}</h1>
            <p className="text-sm text-muted-foreground">{T("نمایهٔ جست‌وجوپذیر محصولات منبع Pharmacy؛ برای دسترسی سریع به مدخل‌ها.", "A searchable index of Pharmacy source products for quick reference.")}</p>
          </div>
        </div>
        <Badge variant="outline" className="gap-1.5 rounded-full px-3 py-1"><BookOpen className="h-3.5 w-3.5" />{T("آموزشی", "Educational")}</Badge>
      </header>

      <Card className="flex items-start gap-3 border-amber-500/40 bg-amber-500/5 p-4 text-sm" role="note">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
        <p className="leading-relaxed">
          {T(
            "اطلاعات این نسخه از منبع Pharmacy منتقل شده و هنوز بازبینی مستقل نشده است. این فهرست ابزار جست‌وجو است، نه مرجع بالینی یا راهنمای مصرف؛ برای تصمیم‌گیری به منبع معتبر و به‌روز مراجعه کن.",
            "This snapshot was imported from the Pharmacy source and has not been independently reviewed. It is a search index, not a clinical or directions-for-use reference; consult an authoritative, current source for decisions.",
          )}
        </p>
      </Card>

      <nav aria-label={T("راهنماهای قانونی", "Regulatory guides")} className="flex flex-wrap gap-2" data-testid="pharmacy-regulatory-guides">
        <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={() => setRegulatory({ topic: "s3" })} data-testid="guide-s3-btn"><ShieldAlert className="h-4 w-4" aria-hidden="true" />{T("پروتکل S3", "S3 protocol")}</Button>
        <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={() => setRegulatory({ topic: "safescript" })} data-testid="guide-safescript-btn"><ShieldAlert className="h-4 w-4" aria-hidden="true" />SafeScript</Button>
        <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={() => setRegulatory({ topic: "project-stop" })} data-testid="guide-project-stop-btn"><ShieldAlert className="h-4 w-4" aria-hidden="true" />Project STOP</Button>
        <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={() => setRegulatory({ topic: "cal" })} data-testid="guide-cal-btn"><Tag className="h-4 w-4" aria-hidden="true" />{T("برچسب‌های CAL", "CAL labels")}</Button>
      </nav>

      <section aria-label={T("جست‌وجو و فیلتر", "Search and filters")} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[minmax(14rem,1fr)_10rem_minmax(11rem,14rem)_11rem_11rem_auto]">
          <div className="relative min-w-0 sm:col-span-2 lg:col-span-3 xl:col-span-1">
            <Search className={`pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground ${isEn ? "left-3" : "right-3"}`} aria-hidden="true" />
            <Input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={T("نام تجاری، ژنریک یا مادهٔ مؤثره…", "Brand, generic, or ingredient…")} aria-label={T("جست‌وجوی محصولات", "Search products")} className={isEn ? "ps-9" : "pe-9"} data-testid="products-search-input" />
          </div>
          <Select value={schedule} onValueChange={(value) => setSchedule(value as PharmacyProductScheduleFilter)}>
            <SelectTrigger aria-label={T("فیلتر ردهٔ محصول", "Filter by schedule")} data-testid="products-schedule-select"><SelectValue placeholder={T("همهٔ رده‌ها", "All schedules")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{T("همهٔ رده‌ها", "All schedules")}</SelectItem>
              {(["Unscheduled", "S2", "S3", "S4", "S8"] as const).map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger aria-label={T("فیلتر دسته‌بندی", "Filter by category")} data-testid="products-category-select"><SelectValue placeholder={T("همهٔ دسته‌ها", "All categories")} /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{T("همهٔ دسته‌ها", "All categories")}</SelectItem>
              {categories.map((category) => <SelectItem key={category.id} value={category.id}>{category.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={grouping} onValueChange={(value) => setGrouping(value as PharmacyProductGrouping)}>
            <SelectTrigger aria-label={T("گروه‌بندی", "Group by")} data-testid="products-grouping-select"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{T("بدون گروه‌بندی", "No grouping")}</SelectItem>
              <SelectItem value="subcategory">{T("گروه: زیردسته", "Group: subcategory")}</SelectItem>
              <SelectItem value="mechanism">{T("گروه: مکانیزم", "Group: mechanism")}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(value) => setSort(value as PharmacyProductSort)}>
            <SelectTrigger aria-label={T("مرتب‌سازی", "Sort by")} data-testid="products-sort-select"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="brand">{T("مرتب: نام تجاری", "Sort: brand")}</SelectItem>
              <SelectItem value="generic">{T("مرتب: ژنریک", "Sort: generic")}</SelectItem>
              <SelectItem value="schedule">{T("مرتب: رده", "Sort: schedule")}</SelectItem>
              <SelectItem value="mechanism">{T("مرتب: مکانیزم", "Sort: mechanism")}</SelectItem>
            </SelectContent>
          </Select>
          <button type="button" onClick={resetFilters} data-testid="products-reset-btn" className="inline-flex h-10 items-center justify-center gap-2 rounded-md border px-3 text-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />{T("پاک‌کردن", "Reset")}
          </button>
        </div>
        <p className="text-sm text-muted-foreground" aria-live="polite" data-testid="products-count">
          {T(`${products.length} محصول از ${PHARMACY_PRODUCT_CATALOG.length}`, `${products.length} of ${PHARMACY_PRODUCT_CATALOG.length} products`)}
        </p>
      </section>

      {products.length > 0 ? (
        <div className="space-y-6">
          {groups.map((group) => (
            <section key={group.id} aria-label={group.label || T("محصولات", "Products")} className="space-y-3" data-testid={`products-group-${group.id}`}>
              {grouping !== "none" && (
                <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
                  <h2 className="text-base font-semibold">{group.label} <span className="text-sm font-normal text-muted-foreground">({group.products.length})</span></h2>
                  {group.documentId && (
                    <Button type="button" size="sm" variant="ghost" className="gap-1.5" onClick={() => setOpenDocumentId(group.documentId)} data-testid={`products-group-mechanism-doc-${group.id}`}>
                      <FlaskConical className="h-4 w-4" aria-hidden="true" />{T("سند مکانیزم", "Mechanism document")}
                    </Button>
                  )}
                </div>
              )}
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {group.products.map((product) => (
                  <ProductCard key={product.id} product={product} comparing={compareIds.includes(product.id)} onOpen={() => setSelectedProduct(product)} onToggleCompare={() => toggleCompare(product.id)} />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <Card className="px-5 py-12 text-center">
          <Search className="mx-auto mb-3 h-7 w-7 text-muted-foreground" aria-hidden="true" />
          <h2 className="font-semibold">{T("محصولی پیدا نشد", "No products found")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{T("عبارت یا فیلترها را تغییر بده.", "Try a different search or reset the filters.")}</p>
        </Card>
      )}

      {compareIds.length > 0 && (
        <div className="fixed inset-x-3 bottom-20 z-40 mx-auto flex max-w-xl flex-wrap items-center justify-between gap-2 rounded-2xl border bg-background/95 p-3 shadow-lg backdrop-blur md:bottom-6" data-testid="products-compare-bar">
          <span className="min-w-0 truncate text-sm">{T(`${compareIds.length} دارو برای مقایسه`, `${compareIds.length} selected to compare`)}</span>
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="ghost" onClick={() => setCompareIds([])} data-testid="products-compare-clear-btn">{T("پاک‌کردن", "Clear")}</Button>
            <Button type="button" size="sm" className="gap-1.5" disabled={compareIds.length < 2} onClick={() => setCompareOpen(true)} data-testid="products-compare-open-btn"><Columns2 className="h-4 w-4" aria-hidden="true" />{T("مقایسه", "Compare")}</Button>
          </div>
        </div>
      )}

      <Dialog open={Boolean(selectedProduct)} onOpenChange={(open) => { if (!open) setSelectedProduct(null); }}>
        <DialogContent className={PHARMACY_DIALOG_CLASS} dir={isEn ? "ltr" : "rtl"} data-testid="product-detail-dialog">
          {selectedProduct && (
            <ProductDetail product={selectedProduct} onOpenDocument={setOpenDocumentId} onRegulatory={(topic, calCodes) => setRegulatory({ topic, calCodes })} />
          )}
        </DialogContent>
      </Dialog>
      <DrugComparisonDialog products={compareProducts} open={compareOpen} onOpenChange={setCompareOpen} />
      <PharmacyRegulatoryInfoDialog topic={regulatory?.topic ?? null} calCodes={regulatory?.calCodes} onClose={() => setRegulatory(null)} />
      <PharmacyDocumentDialog documentId={openDocumentId} onClose={() => setOpenDocumentId(null)} />
    </main>
  );
}

function ProductCard({ product, comparing, onOpen, onToggleCompare }: { product: PharmacyProductCatalogEntry; comparing: boolean; onOpen: () => void; onToggleCompare: () => void }) {
  const { T, lang } = useBilingual();
  const isEn = lang === "en";
  const subcategory = isEn ? product.subcategoryEn : product.subcategoryFa;
  return (
    <Card className={`relative h-full p-0 transition-colors hover:border-primary/50 hover:bg-accent/30 focus-within:border-primary ${comparing ? "border-primary ring-1 ring-primary/40" : ""}`} data-testid={`product-card-${product.id}`}>
      <button type="button" onClick={onOpen} className="flex h-full w-full min-w-0 flex-col gap-3 rounded-xl p-4 pb-12 text-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" aria-label={T(`نمایش ${product.brandName}`, `View ${product.brandName}`)}>
        <span className="flex w-full min-w-0 items-start justify-between gap-2">
          <span className="min-w-0 space-y-1">
            <span className="block break-words text-base font-semibold leading-snug">{product.brandName}</span>
            <span className="block break-words text-sm text-muted-foreground">{product.genericName}</span>
          </span>
          <span className="shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold">{product.schedule}</span>
        </span>
        <span className="flex w-full flex-wrap gap-1.5">
          {subcategory && <span className="max-w-full truncate rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold text-secondary-foreground">{subcategory}</span>}
          {product.mechanism && <span className="max-w-full truncate rounded-full border border-violet-500/30 px-2.5 py-0.5 text-xs font-semibold text-violet-700 dark:text-violet-300">{isEn ? product.mechanism.classNameEn : product.mechanism.classNameFa}</span>}
          {product.calLabels.length > 0 && <span className="rounded-full border px-2.5 py-0.5 text-xs font-semibold">CAL ×{product.calLabels.length}</span>}
          {product.requiresProjectStop && <span className="rounded-full border border-rose-500/30 px-2.5 py-0.5 text-xs font-semibold text-rose-700 dark:text-rose-300">Project STOP</span>}
          <span className="rounded-full border px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-300">{T("بازبینی‌نشده", "Unreviewed")}</span>
        </span>
      </button>
      <button type="button" onClick={onToggleCompare} aria-pressed={comparing} data-testid={`product-compare-toggle-${product.id}`}
        className="absolute bottom-3 end-3 inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground">
        {comparing ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Columns2 className="h-3.5 w-3.5" aria-hidden="true" />}
        {T("مقایسه", "Compare")}
      </button>
    </Card>
  );
}

function ProductDetail({ product, onOpenDocument, onRegulatory }: { product: PharmacyProductCatalogEntry; onOpenDocument: (id: string) => void; onRegulatory: (topic: PharmacyRegulatoryTopic, calCodes?: string[]) => void }) {
  const { T, lang } = useBilingual();
  const isEn = lang === "en";
  const mechanism = product.mechanism;
  return (
    <>
      <DialogHeader>
        <DialogTitle className="pe-6 text-start leading-snug">{product.brandName}</DialogTitle>
        <DialogDescription className="text-start">{product.genericName}</DialogDescription>
      </DialogHeader>
      <dl className="grid gap-3 sm:grid-cols-2">
        <Metadata label={T("مادهٔ مؤثره (طبق منبع)", "Active ingredient (source label)")} value={product.activeIngredients} />
        <Metadata label={T("بسته‌بندی (طبق منبع)", "Pack (source label)")} value={product.packSize} />
        <Metadata label={T("ردهٔ منبع", "Source schedule")} value={product.schedule} />
        <Metadata label={T("دسته", "Category")} value={isEn ? product.categoryEn : product.categoryFa} />
        <Metadata label={T("زیردسته", "Subcategory")} value={isEn ? product.subcategoryEn : product.subcategoryFa} />
        <Metadata label={T("وضعیت محتوا", "Content status")} value={T("بازبینی‌نشده", "Unreviewed")} />
      </dl>

      {mechanism && (
        <section className="space-y-2 rounded-xl border border-violet-500/30 bg-violet-500/5 p-3" data-testid="product-mechanism-section">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold"><FlaskConical className="h-4 w-4" aria-hidden="true" />{T("مکانیزم اثر", "Mechanism of action")}</h3>
          <p className="text-sm font-medium">{isEn ? mechanism.classNameEn : mechanism.classNameFa}</p>
          <p className="text-sm text-muted-foreground">{isEn ? mechanism.actionTypeEn : mechanism.actionTypeFa}</p>
          <p className="text-sm text-muted-foreground">{isEn ? mechanism.targetSiteEn : mechanism.targetSiteFa}</p>
          <Button type="button" size="sm" variant="outline" onClick={() => onOpenDocument(mechanism.documentId)} data-testid="product-open-mechanism-btn">{T("سند مکانیزم", "Mechanism document")}</Button>
        </section>
      )}

      {product.calLabels.length > 0 && (
        <section className="space-y-2">
          <h3 className="text-sm font-semibold">{T("برچسب‌های هشدار (CAL)", "Cautionary labels (CAL)")}</h3>
          <div className="flex flex-wrap gap-1.5">
            {product.calLabels.map((code) => (
              <button key={code} type="button" onClick={() => onRegulatory("cal", [code])} className="rounded-full border px-2.5 py-1 font-mono text-xs font-semibold transition-colors hover:bg-accent" data-testid={`product-cal-${code.replace(/\s+/g, "-")}`}>{code}</button>
            ))}
            <button type="button" onClick={() => onRegulatory("cal", product.calLabels)} className="rounded-full px-2.5 py-1 text-xs font-medium text-primary underline-offset-4 hover:underline" data-testid="product-cal-all-btn">{T("همه", "All")}</button>
          </div>
        </section>
      )}

      {(product.schedule === "S3" || product.schedule === "S8" || product.requiresProjectStop) && (
        <div className="flex flex-wrap gap-2">
          {product.schedule === "S3" && <Button type="button" size="sm" variant="outline" onClick={() => onRegulatory("s3")} data-testid="product-s3-protocol-btn">{T("پروتکل S3", "S3 protocol")}</Button>}
          {product.schedule === "S8" && <Button type="button" size="sm" variant="outline" onClick={() => onRegulatory("safescript")} data-testid="product-safescript-btn">SafeScript</Button>}
          {product.requiresProjectStop && <Button type="button" size="sm" variant="outline" onClick={() => onRegulatory("project-stop")} data-testid="product-project-stop-btn">Project STOP</Button>}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t pt-3">
        <Button type="button" size="sm" className="gap-1.5" onClick={() => onOpenDocument(product.documentId)} data-testid="product-open-monograph-btn"><BookOpen className="h-4 w-4" aria-hidden="true" />{T("مونوگراف", "Monograph")}</Button>
        <PharmacyStudyActions
          documentId={product.documentId}
          title={product.brandName}
          cardFront={`${product.brandName}: active ingredient, schedule and mechanism?`}
          cardBack={[product.activeIngredients, product.schedule, mechanism?.classNameEn].filter(Boolean).join(" · ")}
          testIdPrefix="product"
        />
      </div>
      <a href={product.sourceUrl} target="_blank" rel="noreferrer" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
        {T("مشاهدهٔ فایل منبع در GitHub", "View source file on GitHub")}
      </a>
    </>
  );
}

function Metadata({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border bg-card p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-words text-sm font-medium leading-relaxed">{value || "—"}</dd>
    </div>
  );
}

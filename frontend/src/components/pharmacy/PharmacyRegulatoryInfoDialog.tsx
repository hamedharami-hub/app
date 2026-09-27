import { ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useBilingual } from "@/hooks/useBilingual";
import { PHARMACY_CAL_LABELS } from "@/lib/pharmacyProductCatalogData";
import { PHARMACY_DIALOG_CLASS } from "./pharmacyDialogClass";

export type PharmacyRegulatoryTopic = "s3" | "safescript" | "project-stop" | "cal";

interface Section { titleFa: string; titleEn: string; pointsFa: string[]; pointsEn: string[] }
interface TopicContent { titleFa: string; titleEn: string; sections: Section[]; links: Array<{ label: string; href: string }> }

const TOPICS: Record<Exclude<PharmacyRegulatoryTopic, "cal">, TopicContent> = {
  s3: {
    titleFa: "پروتکل عرضهٔ داروی S3 (Pharmacist Only)",
    titleEn: "Schedule 3 (Pharmacist Only) supply protocol",
    sections: [
      {
        titleFa: "گام‌های آموزشی", titleEn: "Study steps",
        pointsFa: ["داروساز باید شخصاً در تصمیم عرضه مشارکت کند.", "نیاز درمانی را با پرسش‌های ساختاریافته (مثل WWHAM) و بررسی red flagها بسنج.", "مناسب‌بودن دارو، تداخل‌ها و شرایط ویژه (بارداری، سن، بیماری همراه) را بررسی کن.", "مشاوره بده و اطلاعات مکتوب/برچسب را طبق قوانین ایالت فراهم کن.", "هر جا قانون ایالت الزام دارد، عرضه را ثبت کن؛ در صورت تردید عرضه نکن یا ارجاع بده."],
        pointsEn: ["A pharmacist must be personally involved in the supply decision.", "Establish therapeutic need with structured questions (e.g. WWHAM) and red-flag screening.", "Check suitability, interactions and special populations (pregnancy, age, comorbidities).", "Counsel and provide written information/labelling as your state requires.", "Record the supply where state law requires it; decline or refer when in doubt."],
      },
    ],
    links: [
      { label: "NSW Health — Guide to the supply of S3 medicines (PDF)", href: "https://www.health.nsw.gov.au/pharmaceutical/Documents/guide-supplyS3.pdf" },
      { label: "PSA — Dispensing Practice Guidelines (PDF)", href: "https://www.psa.org.au/wp-content/uploads/2019/06/5574-PSA-Dispensing-Practice-guidelines_FINAL.pdf" },
    ],
  },
  safescript: {
    titleFa: "هشدارهای SafeScript NSW",
    titleEn: "SafeScript NSW alerts",
    sections: [
      {
        titleFa: "SafeScript چیست؟", titleEn: "What it is",
        pointsFa: ["سامانهٔ پایش آنی نسخه‌های داروهای تحت پایش (همهٔ S8 و برخی S4 مثل بنزودیازپین‌ها، گاباپنتینوئیدها و برخی اپیوئیدها).", "به داروساز و پزشک سابقهٔ عرضهٔ اخیر را نشان می‌دهد."],
        pointsEn: ["Real-time monitoring of monitored medicines (all S8 and selected S4, e.g. benzodiazepines, pregabalin, some opioids).", "Shows prescribers and pharmacists recent supply history."],
      },
      {
        titleFa: "برخورد با هشدار", titleEn: "Responding to an alert",
        pointsFa: ["هشدار یک علامت برای بررسی است، نه دستور یا منع خودکار عرضه.", "متن واقعی هشدار و سابقه را بخوان، با بیمار و در صورت نیاز با پزشک تجویزکننده گفت‌وگو کن.", "قضاوت بالینی و تصمیم نهایی را مستند کن."],
        pointsEn: ["An alert is a prompt for review, not an instruction or automatic prohibition.", "Read the actual alert and history; talk with the patient and, if needed, the prescriber.", "Document your clinical judgement and final decision."],
      },
    ],
    links: [
      { label: "NSW Health — SafeScript monitored medicines", href: "https://www.health.nsw.gov.au/pharmaceutical/safescript/Pages/monitored-medicines.aspx" },
      { label: "NSW Health — SafeScript alerts for practitioners", href: "https://www.health.nsw.gov.au/pharmaceutical/safescript/practitioners/Pages/pop-up-notifications-and-alerts.aspx" },
    ],
  },
  "project-stop": {
    titleFa: "Project STOP (ثبت سودوافدرین)",
    titleEn: "Project STOP (pseudoephedrine recording)",
    sections: [
      {
        titleFa: "کاربرد", titleEn: "Purpose",
        pointsFa: ["پایگاه دادهٔ آنی Pharmacy Guild برای ثبت فروش فرآورده‌های حاوی سودوافدرین و کاهش انحراف مصرف.", "داروساز پس از بررسی کارت شناسایی عکس‌دار، خریدهای قبلی را می‌بیند و آگاهانه تصمیم می‌گیرد."],
        pointsEn: ["Pharmacy Guild real-time database recording pseudoephedrine sales to reduce diversion.", "After checking photo ID, the pharmacist sees prior purchases and makes an informed decision."],
      },
      {
        titleFa: "نکتهٔ قانونی", titleEn: "Legal note",
        pointsFa: ["الزام ثبت و جزئیات آن در هر ایالت متفاوت است و ممکن است تغییر کند؛ قانون محل و تاریخ واقعی عرضه را بررسی کن.", "نتیجهٔ سامانه جایگزین قضاوت داروساز نیست؛ می‌توان عرضه را رد کرد."],
        pointsEn: ["Recording rules differ by state and can change; check the law for the actual place and date of supply.", "The system does not replace pharmacist judgement; supply may be declined."],
      },
    ],
    links: [
      { label: "Pharmacy Guild — Pseudoephedrine recording (NSW)", href: "https://www.guild.org.au/guild-branches/nsw/professional-services/health-services/pseudoephedrine-recording" },
    ],
  },
};

interface PharmacyRegulatoryInfoDialogProps {
  topic: PharmacyRegulatoryTopic | null;
  calCodes?: string[];
  onClose: () => void;
}

export function PharmacyRegulatoryInfoDialog({ topic, calCodes, onClose }: PharmacyRegulatoryInfoDialogProps) {
  const { T, lang } = useBilingual();
  const isEn = lang === "en";
  const content = topic && topic !== "cal" ? TOPICS[topic] : null;
  const calLabels = topic === "cal"
    ? PHARMACY_CAL_LABELS.filter((label) => !calCodes?.length || calCodes.includes(label.code))
    : [];

  return (
    <Dialog open={Boolean(topic)} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className={PHARMACY_DIALOG_CLASS} dir={isEn ? "ltr" : "rtl"} data-testid="pharmacy-regulatory-dialog">
        <DialogHeader className="text-start">
          <DialogTitle className="pe-6 text-start" data-testid="pharmacy-regulatory-title">
            {content ? (isEn ? content.titleEn : content.titleFa) : T("برچسب‌های هشدار CAL (APF)", "Cautionary Advisory Labels (APF)")}
          </DialogTitle>
          <DialogDescription className="text-start">
            {T("اطلاعات آموزشی و بازبینی‌نشده؛ برای عمل واقعی به منبع رسمی و قانون جاری ایالت مراجعه کن.", "Educational and unreviewed; for real practice follow the official source and current state law.")}
          </DialogDescription>
        </DialogHeader>
        <div dir={isEn ? "ltr" : "rtl"} className="space-y-4">
          {content?.sections.map((section) => (
            <section key={section.titleEn} className="space-y-2">
              <h3 className="text-sm font-semibold">{isEn ? section.titleEn : section.titleFa}</h3>
              <ul className="list-disc space-y-1.5 ps-5 text-sm leading-relaxed">
                {(isEn ? section.pointsEn : section.pointsFa).map((point) => <li key={point}>{point}</li>)}
              </ul>
            </section>
          ))}
          {topic === "cal" && (
            <ul className="space-y-2" data-testid="pharmacy-cal-list">
              {calLabels.map((label) => (
                <li key={label.code} className="rounded-lg border p-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="font-mono">{label.code}</Badge>
                    <span className="text-sm font-semibold">{isEn ? label.nameEn : label.nameFa}</span>
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{isEn ? label.descriptionEn : label.descriptionFa}</p>
                </li>
              ))}
            </ul>
          )}
          <div className="space-y-1.5 border-t pt-3">
            {(content?.links ?? [{ label: "PSA — Updated CAL advice in APF Digital", href: "https://www.psa.org.au/updated-cal-advice-issued-in-apf-digital/" }]).map((link) => (
              <a key={link.href} href={link.href} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline">
                <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />{link.label}
              </a>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

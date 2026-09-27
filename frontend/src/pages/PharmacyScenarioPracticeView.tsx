import { useMemo, useState } from "react";
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, ClipboardCheck, FileSignature, RotateCcw, Search, SkipForward } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PharmacyDocumentDialog } from "@/components/pharmacy/PharmacyDocumentDialog";
import { PharmacyStudyActions } from "@/components/pharmacy/PharmacyStudyActions";
import { ReferralLetterDialog } from "@/components/pharmacy/ReferralLetterDialog";
import { ScenarioLinksPanel } from "@/components/pharmacy/ScenarioLinksPanel";
import { StarButton, StarredPhrasesPanel } from "@/components/pharmacy/StarredPhrasesPanel";
import { useStarToggle } from "@/components/pharmacy/useStarToggle";
import { usePharmacyLocalState } from "@/components/pharmacy/usePharmacyLocalState";
import { useBilingual } from "@/hooks/useBilingual";
import { getScenarioLinks } from "@/lib/pharmacyPracticeLinks";
import type { PharmacyScenarioProgress, PharmacyStarredPhrase } from "@/lib/pharmacyPracticeStore";
import { filterPharmacyPracticeScenarios, type PharmacyScenarioModeFilter } from "@/lib/pharmacyScenarioPractice";
import { PHARMACY_PRACTICE_SCENARIOS } from "@/lib/pharmacyScenarioPracticeData";

const PRACTICE_STEPS = ["case", "questions", "response", "debrief"] as const;
type PracticeStep = 0 | 1 | 2 | 3;
type Decision = "supply" | "refer";

const initialScenarioId =
  PHARMACY_PRACTICE_SCENARIOS.find((scenario) => scenario.mode === "MODE_B_SLANG")?.id
  ?? PHARMACY_PRACTICE_SCENARIOS[0]?.id
  ?? "";

export default function PharmacyScenarioPracticeView() {
  const { T, lang } = useBilingual();
  const isEn = lang === "en";
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<PharmacyScenarioModeFilter>("all");
  const [selectedId, setSelectedId] = useState(initialScenarioId);
  const [step, setStep] = useState<PracticeStep>(0);
  const [unlockedStep, setUnlockedStep] = useState<PracticeStep>(0);
  const [revealedAnswers, setRevealedAnswers] = useState<Set<string>>(() => new Set());
  const [screenedFlags, setScreenedFlags] = useState<Set<number>>(() => new Set());
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [letterOpen, setLetterOpen] = useState(false);
  const [openDocumentId, setOpenDocumentId] = useState<string | null>(null);
  const [recorded, setRecorded] = useState(false);
  const [starred, saveStarred] = usePharmacyLocalState<PharmacyStarredPhrase[]>("starred-phrases", []);
  const [progress, saveProgress] = usePharmacyLocalState<Record<string, PharmacyScenarioProgress>>("scenario-progress", {});
  const { isStarred, toggle: toggleStar } = useStarToggle(starred, saveStarred);

  const filteredScenarios = useMemo(
    () => filterPharmacyPracticeScenarios(PHARMACY_PRACTICE_SCENARIOS, query, mode),
    [mode, query],
  );
  const scenario = filteredScenarios.find((item) => item.id === selectedId) ?? filteredScenarios[0] ?? null;
  const selectedOption = scenario?.dialogueOptions.find((option) => option.id === selectedOptionId) ?? null;
  const links = useMemo(() => (scenario ? getScenarioLinks(scenario.id) : { diseases: [], products: [] }), [scenario]);
  const completedCount = PHARMACY_PRACTICE_SCENARIOS.filter((item) => progress[item.id]).length;

  const resetPractice = () => {
    setStep(0);
    setUnlockedStep(0);
    setRevealedAnswers(new Set());
    setScreenedFlags(new Set());
    setSelectedOptionId(null);
    setDecision(null);
    setRecorded(false);
  };
  const updateQuery = (value: string) => { setQuery(value); resetPractice(); };
  const updateMode = (value: PharmacyScenarioModeFilter) => { setMode(value); resetPractice(); };
  const selectScenario = (id: string) => { setSelectedId(id); resetPractice(); };
  const revealAnswer = (key: string) => setRevealedAnswers((previous) => new Set(previous).add(key));
  const toggleFlag = (index: number) => setScreenedFlags((previous) => {
    const next = new Set(previous);
    if (next.has(index)) next.delete(index); else next.add(index);
    return next;
  });

  const allQuestionsRevealed = Boolean(scenario && scenario.questions.every((question) => revealedAnswers.has(question.key)));
  const canContinue = step === 0
    || (step === 1 && allQuestionsRevealed)
    || (step === 2 && (Boolean(selectedOption) || !scenario?.dialogueOptions.length) && Boolean(decision));

  const recordCompletion = (current: NonNullable<typeof scenario>, chosen: Decision) => {
    const entry: PharmacyScenarioProgress = {
      completedAt: new Date().toISOString(),
      decision: chosen,
      matchesSourceLabel: current.outcome ? (chosen === "refer") === current.outcome.requiresReferral : null,
      redFlagsScreened: screenedFlags.size,
      redFlagsTotal: current.redFlags.length,
    };
    const result = saveProgress({ ...progress, [current.id]: entry });
    setRecorded(result.ok);
    if (!result.ok) toast.error(result.reason === "signed-out" ? T("پیشرفت ذخیره نشد: وارد حساب شو.", "Progress not saved: sign in first.") : T("پیشرفت روی دستگاه ذخیره نشد.", "Progress could not be saved on this device."));
  };

  const continueStep = () => {
    if (!canContinue || step >= PRACTICE_STEPS.length - 1) return;
    const next = (step + 1) as PracticeStep;
    setStep(next);
    setUnlockedStep((current) => Math.max(current, next) as PracticeStep);
    if (next === 3 && scenario && decision) recordCompletion(scenario, decision);
  };
  const goToNextCase = () => {
    if (!scenario || filteredScenarios.length < 2) return resetPractice();
    const index = filteredScenarios.findIndex((item) => item.id === scenario.id);
    selectScenario(filteredScenarios[(index + 1) % filteredScenarios.length].id);
  };
  const getModeLabel = (scenarioMode: string) => {
    if (scenarioMode === "MODE_A_ADMIN") return T("مکالمهٔ اجرایی", "Operational case");
    if (scenarioMode === "MODE_C_CONFLICT") return T("تعارض/پیچیدگی", "Complex case");
    return T("درخواست OTC و مکالمه", "OTC & communication");
  };
  const scenarioTitle = (id: string) => {
    const item = PHARMACY_PRACTICE_SCENARIOS.find((candidate) => candidate.id === id);
    return item ? (isEn ? item.titleEn : item.titleFa) : id;
  };

  return (
    <main className="mx-auto w-full max-w-5xl space-y-5 px-3 py-4 sm:px-5 sm:py-6" dir={isEn ? "ltr" : "rtl"}>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="rounded-2xl bg-primary/10 p-3 text-primary" aria-hidden="true"><ClipboardCheck className="h-6 w-6" /></div>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{T("تمرین تعاملی سناریوهای Pharmacy", "Pharmacy scenario practice")}</h1>
            <p className="text-sm text-muted-foreground">{T("پرونده را مرحله‌به‌مرحله بخوان، پاسخ بیمار را باز کن و بعد تصمیم منبع را ببین.", "Work through a case, reveal the patient's replies, then compare your choice with the source label.")}</p>
          </div>
        </div>
        <div className="min-w-[10rem] space-y-1" data-testid="scenario-progress-summary">
          <p className="text-xs text-muted-foreground">{T(`${completedCount} از ${PHARMACY_PRACTICE_SCENARIOS.length} پرونده انجام شده (روی این دستگاه)`, `${completedCount} of ${PHARMACY_PRACTICE_SCENARIOS.length} cases done (this device)`)}</p>
          <Progress value={(completedCount / PHARMACY_PRACTICE_SCENARIOS.length) * 100} aria-label={T("پیشرفت کل سناریوها", "Overall scenario progress")} />
        </div>
      </header>

      <Card role="note" className="flex items-start gap-3 border-amber-500/40 bg-amber-500/5 p-4 text-sm">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
        <p className="leading-relaxed">
          {T(
            "تمام پرونده‌ها snapshot منبع Pharmacy هستند و بازبینی مستقل نشده‌اند. برچسب‌های «پیشنهادی» فقط همان علامت داخل منبع را بازتاب می‌دهند، نه تأیید بالینی ما. این تمرین برای مطالعه است و جایگزین راهنمای جاری، ارزیابی بیمار یا سیاست محل کار نیست.",
            "These cases are snapshots from the Pharmacy source and have not been independently reviewed. “Recommended” only reflects a flag in that source, not our clinical endorsement. For study only; not a substitute for current guidance, patient assessment, or workplace policy.",
          )}
        </p>
      </Card>

      <section className="grid gap-3 md:grid-cols-[minmax(14rem,1fr)_14rem_minmax(15rem,1.4fr)]" aria-label={T("انتخاب سناریو", "Choose a scenario")}>
        <div className="relative min-w-0">
          <Search className={`pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground ${isEn ? "left-3" : "right-3"}`} aria-hidden="true" />
          <Input type="search" value={query} onChange={(event) => updateQuery(event.target.value)} aria-label={T("جست‌وجوی پرونده", "Search cases")} placeholder={T("نام یا موضوع پرونده…", "Case title or topic…")} className={isEn ? "ps-9" : "pe-9"} data-testid="scenario-search-input" />
        </div>
        <Select value={mode} onValueChange={(value) => updateMode(value as PharmacyScenarioModeFilter)}>
          <SelectTrigger aria-label={T("نوع سناریو", "Scenario type")} data-testid="scenario-mode-select"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{T("همهٔ انواع", "All types")}</SelectItem>
            <SelectItem value="MODE_B_SLANG">{T("OTC و مکالمه", "OTC & communication")}</SelectItem>
            <SelectItem value="MODE_C_CONFLICT">{T("تعارض/پیچیدگی", "Complex cases")}</SelectItem>
            <SelectItem value="MODE_A_ADMIN">{T("اجرایی/اداری", "Operational/admin")}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={scenario?.id ?? "none"} onValueChange={selectScenario} disabled={!filteredScenarios.length}>
          <SelectTrigger aria-label={T("پروندهٔ فعال", "Active case")} data-testid="scenario-case-select"><SelectValue placeholder={T("پرونده‌ای نیست", "No cases")} /></SelectTrigger>
          <SelectContent>
            {filteredScenarios.map((item) => (
              <SelectItem key={item.id} value={item.id}>{progress[item.id] ? "✓ " : ""}{isEn ? item.titleEn : item.titleFa}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground md:col-span-3" aria-live="polite">
          {T(`${filteredScenarios.length} پرونده`, `${filteredScenarios.length} cases`)}
        </p>
      </section>

      {scenario ? (
        <Card className="space-y-4 p-4 sm:p-5" data-testid="scenario-practice-card">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0 space-y-1">
              <h2 className="break-words text-lg font-semibold leading-snug">{isEn ? scenario.titleEn : scenario.titleFa}</h2>
              <p className="break-words text-sm text-muted-foreground">{isEn ? scenario.categoryEn : scenario.categoryFa}</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <Badge variant="secondary">{getModeLabel(scenario.mode)}</Badge>
              <Badge variant="outline" className="text-amber-700 dark:text-amber-300">{T("بازبینی‌نشده", "Unreviewed")}</Badge>
            </div>
          </div>

          <div className="space-y-2">
            <Progress value={(step / (PRACTICE_STEPS.length - 1)) * 100} aria-label={T("پیشرفت پرونده", "Case progress")} />
            <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {PRACTICE_STEPS.map((stepId, index) => {
                const labels = [T("پرونده", "Case"), T("پرسش‌ها", "Questions"), T("پاسخ", "Response"), T("مرور", "Debrief")];
                return (
                  <li key={stepId}>
                    <button type="button" disabled={index > unlockedStep} aria-current={step === index ? "step" : undefined} onClick={() => setStep(index as PracticeStep)} data-testid={`scenario-step-${stepId}-btn`}
                      className="w-full rounded-lg border px-2 py-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-45 enabled:hover:bg-accent aria-[current=step]:border-primary aria-[current=step]:bg-primary/10 aria-[current=step]:font-semibold">
                      <span className="me-1 inline-flex h-5 w-5 items-center justify-center rounded-full border text-xs">{index + 1}</span>
                      {labels[index]}
                    </button>
                  </li>
                );
              })}
            </ol>
          </div>

          {step === 0 && (
            <section aria-labelledby="scenario-case-heading" className="space-y-3">
              <h3 id="scenario-case-heading" className="text-base font-semibold">{T("شرح اولیهٔ بیمار", "Initial presentation")}</h3>
              {(scenario.patientName || scenario.patientAge !== null || scenario.patientGender) && (
                <div className="flex flex-wrap gap-2 text-sm">
                  {scenario.patientName && <Badge variant="outline">{scenario.patientName}</Badge>}
                  {scenario.patientAge !== null && <Badge variant="outline">{T(`${scenario.patientAge} سال`, `${scenario.patientAge} years`)}</Badge>}
                  {scenario.patientGender && <Badge variant="outline">{scenario.patientGender}</Badge>}
                </div>
              )}
              <p className="rounded-xl bg-muted/50 p-4 text-sm leading-relaxed">
                {(isEn ? scenario.presentationEn : scenario.presentationFa) || T("شرح اولیه‌ای در منبع ثبت نشده است.", "No initial presentation is recorded in the source.")}
              </p>
              {scenario.currentMedications.length > 0 && (
                <p className="text-sm"><span className="font-semibold">{T("داروهای فعلی: ", "Current medicines: ")}</span><span dir="ltr">{scenario.currentMedications.join(", ")}</span></p>
              )}
              {scenario.keyPhrases.length > 0 && (
                <section aria-labelledby="scenario-phrases-heading" className="space-y-2" data-testid="scenario-key-phrases">
                  <h4 id="scenario-phrases-heading" className="text-sm font-semibold">{T("عبارت‌های کلیدی استرالیایی", "Key Australian phrases")}</h4>
                  <ul className="space-y-1.5">
                    {scenario.keyPhrases.map((phrase, index) => {
                      const target = { scenarioId: scenario.id, textEn: `${phrase.phrase} — ${phrase.meaningEn}`, textFa: `${phrase.phrase} — ${phrase.meaningFa}` };
                      return (
                        <li key={phrase.phrase} className="flex items-start gap-2 rounded-lg border p-2.5">
                          <StarButton starred={isStarred(target)} onToggle={() => toggleStar(target)} testId={`scenario-star-phrase-${index}`} />
                          <div className="min-w-0 text-sm leading-relaxed">
                            <span className="font-semibold" dir="ltr">{phrase.phrase}</span>
                            <span className="block text-muted-foreground">{isEn ? phrase.meaningEn : phrase.meaningFa}</span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              )}
              <ScenarioLinksPanel caseDocumentId={scenario.documentId} links={links} onOpenDocument={setOpenDocumentId} />
            </section>
          )}

          {step === 1 && (
            <section aria-labelledby="scenario-questions-heading" className="space-y-3">
              <div>
                <h3 id="scenario-questions-heading" className="text-base font-semibold">{T("پرسش‌های ارزیابی", "Assessment questions")}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{T("پاسخ بیمار را جداگانه باز کن؛ قبل از آن نتیجه نمایش داده نمی‌شود.", "Reveal each patient reply when ready; the outcome stays hidden until later.")}</p>
              </div>
              {scenario.questions.length ? scenario.questions.map((question, index) => {
                const revealed = revealedAnswers.has(question.key);
                const target = { scenarioId: scenario.id, textEn: question.answerEn, textFa: question.answerFa };
                return (
                  <Card key={question.key} className="space-y-2 p-3 sm:p-4">
                    <p className="font-medium leading-relaxed">{(isEn ? question.questionEn : question.questionFa) || (isEn ? question.labelEn : question.labelFa) || question.key}</p>
                    {revealed ? (
                      <div className="flex items-start gap-2 rounded-lg bg-muted/60 p-3">
                        <p className="min-w-0 flex-1 text-sm leading-relaxed">{isEn ? question.answerEn : question.answerFa}</p>
                        <StarButton starred={isStarred(target)} onToggle={() => toggleStar(target)} testId={`scenario-star-reply-${index}`} />
                      </div>
                    ) : (
                      <Button type="button" variant="outline" size="sm" onClick={() => revealAnswer(question.key)} data-testid={`scenario-reveal-reply-${index}`}>
                        {T("نمایش پاسخ بیمار", "Reveal patient reply")}
                      </Button>
                    )}
                  </Card>
                );
              }) : <p className="rounded-lg bg-muted/50 p-4 text-sm">{T("پرسش ساختاریافته‌ای برای این پرونده ثبت نشده است.", "No structured questions are recorded for this case.")}</p>}
              {scenario.redFlags.length > 0 && (
                <Card className="space-y-2 border-rose-500/30 p-3 sm:p-4" data-testid="scenario-red-flag-checklist">
                  <h4 className="font-semibold">{T("چک‌لیست red flag", "Red-flag checklist")}</h4>
                  <p className="text-xs text-muted-foreground">{T("هر موردی را که در گفت‌وگو بررسی کردی علامت بزن.", "Tick each item you screened for during the conversation.")}</p>
                  <ul className="space-y-2">
                    {scenario.redFlags.map((flag, index) => (
                      <li key={`${scenario.id}-check-${index}`} className="flex items-start gap-2">
                        <Checkbox id={`red-flag-${index}`} checked={screenedFlags.has(index)} onCheckedChange={() => toggleFlag(index)} className="mt-0.5" data-testid={`scenario-red-flag-${index}`} />
                        <label htmlFor={`red-flag-${index}`} className="text-sm leading-relaxed">{isEn ? flag.en || flag.fa : flag.fa || flag.en}</label>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
            </section>
          )}

          {step === 2 && (
            <section aria-labelledby="scenario-response-heading" className="space-y-3">
              <div>
                <h3 id="scenario-response-heading" className="text-base font-semibold">{T("پاسخ خودت را انتخاب کن", "Choose your response")}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{T("این انتخاب‌ها عیناً از گزینه‌های منبع آمده‌اند.", "Options are reproduced from the source snapshot.")}</p>
              </div>
              {scenario.dialogueOptions.length ? scenario.dialogueOptions.map((option, index) => (
                <button key={option.id} type="button" aria-pressed={selectedOptionId === option.id} onClick={() => setSelectedOptionId(option.id)} data-testid={`scenario-option-${index}`}
                  className="w-full rounded-xl border p-3 text-start transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-pressed:border-primary aria-pressed:bg-primary/5 sm:p-4">
                  <span className="mb-2 block text-xs font-semibold text-muted-foreground">{T(`گزینهٔ ${index + 1}`, `Option ${index + 1}`)}</span>
                  <span className="block whitespace-pre-line text-sm leading-relaxed">{isEn ? option.textEn : option.textFa}</span>
                  {selectedOptionId === option.id && (
                    <span className="mt-3 block rounded-lg bg-muted/60 p-3 text-sm leading-relaxed">
                      <span className="mb-1 block text-xs font-semibold text-muted-foreground">{T("واکنش بیمار طبق منبع", "Patient reply in source")}</span>
                      {isEn ? option.patientReplyEn : option.patientReplyFa}
                      {(option.sourceMarksRecommended || option.sourceMarksRedFlagResponse) && (
                        <span className="mt-2 block font-medium text-emerald-700 dark:text-emerald-300">{T("این گزینه در snapshot منبع علامت‌گذاری شده است.", "This option is flagged in the source snapshot.")}</span>
                      )}
                    </span>
                  )}
                </button>
              )) : <p className="rounded-lg bg-muted/50 p-4 text-sm">{T("گزینهٔ پاسخی در منبع ثبت نشده است.", "No response options are recorded in the source.")}</p>}

              <fieldset className="space-y-2 rounded-xl border p-3 sm:p-4" data-testid="scenario-decision">
                <legend className="px-1 text-sm font-semibold">{T("تصمیم تو", "Your decision")}</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {(["supply", "refer"] as const).map((value) => (
                    <button key={value} type="button" aria-pressed={decision === value} onClick={() => setDecision(value)} data-testid={`scenario-decision-${value}-btn`}
                      className="rounded-lg border p-3 text-start text-sm transition-colors hover:bg-accent/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-pressed:border-primary aria-pressed:bg-primary/5">
                      <span className="block font-semibold">{value === "supply" ? T("عرضه/مشاورهٔ OTC", "Supply / OTC advice") : T("ارجاع به پزشک", "Refer to a doctor")}</span>
                      <span className="block text-xs text-muted-foreground">{value === "supply" ? T("اگر red flag ندیدی", "When no red flag was found") : T("اگر red flag یا خارج از حیطه است", "Red flag or outside scope")}</span>
                    </button>
                  ))}
                </div>
                {decision === "refer" && (
                  <Button type="button" variant="secondary" size="sm" className="gap-1.5" onClick={() => setLetterOpen(true)} data-testid="scenario-write-referral-btn">
                    <FileSignature className="h-4 w-4" aria-hidden="true" />{T("نوشتن نامهٔ ارجاع", "Write referral letter")}
                  </Button>
                )}
              </fieldset>
            </section>
          )}

          {step === 3 && (
            <section aria-labelledby="scenario-debrief-heading" className="space-y-4">
              <h3 id="scenario-debrief-heading" className="text-base font-semibold">{T("مرور محتوای منبع", "Source debrief")}</h3>
              <DecisionFeedback decision={decision} requiresReferral={scenario.outcome?.requiresReferral ?? null} screened={screenedFlags.size} total={scenario.redFlags.length} recorded={recorded} />
              {selectedOption && (
                <Card className="space-y-2 border-primary/30 p-4">
                  <p className="text-xs font-semibold text-muted-foreground">{T("انتخاب تو", "Your choice")}</p>
                  <p className="whitespace-pre-line text-sm leading-relaxed">{isEn ? selectedOption.textEn : selectedOption.textFa}</p>
                  <p className="text-sm text-muted-foreground">{selectedOption.sourceMarksRecommended ? T("منبع این گزینه را توصیه‌شده علامت زده است؛ این علامت بازبینی مستقل نیست.", "The source flags this option as recommended; that flag is not an independent review.") : T("منبع این گزینه را به‌عنوان پاسخ پیشنهادی علامت نزده است.", "The source does not flag this option as its recommended response.")}</p>
                </Card>
              )}
              {scenario.outcome && (
                <Card className="space-y-2 p-4">
                  <Badge variant="outline">{scenario.outcome.requiresReferral ? T("ارجاع در متن منبع", "Referral in source") : T("نتیجه در متن منبع", "Outcome in source")}</Badge>
                  <p className="text-sm font-semibold leading-relaxed">{isEn ? scenario.outcome.recommendationEn : scenario.outcome.recommendationFa}</p>
                  <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{isEn ? scenario.outcome.explanationEn : scenario.outcome.explanationFa}</p>
                  {(scenario.outcome.requiresReferral || decision === "refer") && (
                    <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => setLetterOpen(true)} data-testid="scenario-debrief-referral-btn">
                      <FileSignature className="h-4 w-4" aria-hidden="true" />{T("نامهٔ ارجاع", "Referral letter")}
                    </Button>
                  )}
                </Card>
              )}
              {scenario.redFlags.length > 0 && (
                <Card className="space-y-2 border-rose-500/30 p-4">
                  <h4 className="font-semibold">{T("علائم/نکات هشدار درج‌شده در منبع", "Flags and cautions listed in source")}</h4>
                  <ul className="list-inside list-disc space-y-2 text-sm leading-relaxed">
                    {scenario.redFlags.map((flag, index) => <li key={`${scenario.id}-flag-${index}`}>{isEn ? flag.en || flag.fa : flag.fa || flag.en}</li>)}
                  </ul>
                </Card>
              )}
              <ScenarioLinksPanel caseDocumentId={scenario.documentId} links={links} onOpenDocument={setOpenDocumentId} />
              <PharmacyStudyActions
                documentId={scenario.documentId}
                title={isEn ? scenario.titleEn : scenario.titleFa}
                cardFront={`${scenario.titleEn}: refer or supply? Why?`}
                cardBack={scenario.outcome ? `${scenario.outcome.recommendationEn}\n${scenario.outcome.explanationEn}`.trim() : ""}
                testIdPrefix="scenario"
              />
              <a href={scenario.sourceUrl} target="_blank" rel="noreferrer" className="inline-flex text-sm font-medium text-primary underline-offset-4 hover:underline">
                {T("بازکردن فایل سناریو در GitHub", "Open scenario source on GitHub")}
              </a>
            </section>
          )}

          <footer className="flex flex-wrap items-center justify-between gap-2 border-t pt-4">
            <Button type="button" variant="outline" onClick={resetPractice} className="gap-2" data-testid="scenario-restart-btn">
              <RotateCcw className="h-4 w-4" aria-hidden="true" />{T("شروع دوباره", "Restart")}
            </Button>
            <div className="flex flex-wrap gap-2">
              {step > 0 && (
                <Button type="button" variant="outline" onClick={() => setStep((step - 1) as PracticeStep)} className="gap-2" data-testid="scenario-back-btn">
                  {isEn ? <ArrowLeft className="h-4 w-4" aria-hidden="true" /> : <ArrowRight className="h-4 w-4" aria-hidden="true" />}
                  {T("قبلی", "Back")}
                </Button>
              )}
              {step < 3 ? (
                <Button type="button" onClick={continueStep} disabled={!canContinue} className="gap-2" data-testid="scenario-continue-btn">
                  {T("ادامه", "Continue")}
                  {isEn ? <ArrowRight className="h-4 w-4" aria-hidden="true" /> : <ArrowLeft className="h-4 w-4" aria-hidden="true" />}
                </Button>
              ) : (
                <Button type="button" onClick={goToNextCase} className="gap-2" data-testid="scenario-next-case-btn">
                  <SkipForward className="h-4 w-4" aria-hidden="true" />{T("پروندهٔ بعدی", "Next case")}
                </Button>
              )}
            </div>
          </footer>
          <ReferralLetterDialog scenario={scenario} open={letterOpen} onOpenChange={setLetterOpen} />
        </Card>
      ) : (
        <Card className="px-5 py-12 text-center">
          <Search className="mx-auto mb-3 h-7 w-7 text-muted-foreground" aria-hidden="true" />
          <h2 className="font-semibold">{T("پرونده‌ای پیدا نشد", "No cases found")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{T("جست‌وجو را تغییر بده یا نوع دیگری را انتخاب کن.", "Change the search or choose another case type.")}</p>
        </Card>
      )}

      <StarredPhrasesPanel
        phrases={starred}
        onRemove={toggleStar}
        scenarioTitle={scenarioTitle}
        documentIdFor={(id) => PHARMACY_PRACTICE_SCENARIOS.find((item) => item.id === id)?.documentId ?? null}
      />
      <PharmacyDocumentDialog documentId={openDocumentId} onClose={() => setOpenDocumentId(null)} />
    </main>
  );
}

function DecisionFeedback({ decision, requiresReferral, screened, total, recorded }: { decision: Decision | null; requiresReferral: boolean | null; screened: number; total: number; recorded: boolean }) {
  const { T } = useBilingual();
  const matches = decision && requiresReferral !== null ? (decision === "refer") === requiresReferral : null;
  return (
    <Card className={`space-y-2 p-4 ${matches === false ? "border-amber-500/50" : "border-emerald-500/40"}`} data-testid="scenario-decision-feedback">
      <p className="text-sm font-semibold" data-testid="scenario-decision-match">
        {matches === null
          ? T("منبع برای این پرونده برچسب عرضه/ارجاع ندارد.", "The source has no supply/refer label for this case.")
          : matches
            ? T("تصمیم تو با برچسب منبع یکی است.", "Your decision matches the source label.")
            : T("تصمیم تو با برچسب منبع فرق دارد؛ دلیل منبع را پایین بخوان.", "Your decision differs from the source label; read the source reasoning below.")}
      </p>
      {total > 0 && <p className="text-sm text-muted-foreground" data-testid="scenario-red-flag-score">{T(`${screened} از ${total} red flag بررسی شد.`, `${screened} of ${total} red flags screened.`)}</p>}
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground" data-testid="scenario-progress-status">
        {recorded ? <><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />{T("پیشرفت روی همین دستگاه ثبت شد.", "Progress saved on this device.")}</> : T("پیشرفت ثبت نشد.", "Progress was not saved.")}
      </p>
      <p className="text-xs text-muted-foreground">{T("برچسب منبع بازبینی بالینی نیست.", "The source label is not a clinical review.")}</p>
    </Card>
  );
}

import type { PharmacyPracticeScenario, PharmacyReferralLetterTemplate } from "./pharmacyScenarioPractice";

/** Device-local study data. It never claims cloud sync; callers must label it "saved on this device". */
export interface PharmacyLocalSaveResult { ok: boolean; reason?: "signed-out" | "storage-unavailable" }

export interface PharmacyStarredPhrase {
  id: string;
  scenarioId: string;
  textEn: string;
  textFa: string;
  createdAt: string;
}

export interface PharmacyReferralLetterDraft extends PharmacyReferralLetterTemplate {
  notes: string;
  updatedAt: string;
}

export interface PharmacyScenarioProgress {
  completedAt: string;
  decision: "supply" | "refer";
  matchesSourceLabel: boolean | null;
  redFlagsScreened: number;
  redFlagsTotal: number;
}

type StoreName = "starred-phrases" | "referral-letters" | "scenario-progress";

const storageKey = (userId: string, name: StoreName) => `arshnaz:pharmacy:${name}:${userId}`;

export function readPharmacyLocal<T>(userId: string | null | undefined, name: StoreName, fallback: T): T {
  if (!userId) return fallback;
  try {
    const raw = window.localStorage.getItem(storageKey(userId, name));
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writePharmacyLocal<T>(userId: string | null | undefined, name: StoreName, value: T): PharmacyLocalSaveResult {
  if (!userId) return { ok: false, reason: "signed-out" };
  try {
    const key = storageKey(userId, name);
    const serialized = JSON.stringify(value);
    window.localStorage.setItem(key, serialized);
    // Read back so a silently dropped write is never reported as saved.
    if (window.localStorage.getItem(key) !== serialized) return { ok: false, reason: "storage-unavailable" };
    return { ok: true };
  } catch {
    return { ok: false, reason: "storage-unavailable" };
  }
}

export const getStarredPhraseId = (scenarioId: string, textEn: string, textFa: string) =>
  `${scenarioId}::${(textEn || textFa).trim().toLocaleLowerCase()}`;

export function toggleStarredPhrase(
  phrases: readonly PharmacyStarredPhrase[],
  phrase: Omit<PharmacyStarredPhrase, "id" | "createdAt">,
  now = new Date(),
): PharmacyStarredPhrase[] {
  const id = getStarredPhraseId(phrase.scenarioId, phrase.textEn, phrase.textFa);
  if (phrases.some((item) => item.id === id)) return phrases.filter((item) => item.id !== id);
  return [{ ...phrase, id, createdAt: now.toISOString() }, ...phrases];
}

export function formatReferralLetter(
  scenario: Pick<PharmacyPracticeScenario, "patientName" | "patientAge" | "titleEn">,
  draft: Omit<PharmacyReferralLetterDraft, "updatedAt">,
): string {
  const patient = [scenario.patientName, scenario.patientAge !== null ? `${scenario.patientAge}y` : ""].filter(Boolean).join(", ");
  return [
    `To: ${draft.to}`,
    `Re: ${patient || "Patient"} (educational practice case: ${scenario.titleEn})`,
    `Reason for referral: ${draft.reason}`,
    `Presenting symptoms: ${draft.symptomSummary}`,
    `Current medicines: ${draft.currentMeds}`,
    `Suggested action: ${draft.suggestedAction}`,
    draft.notes ? `Pharmacist notes: ${draft.notes}` : "",
  ].filter(Boolean).join("\n");
}

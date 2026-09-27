import { toast } from "sonner";
import { useBilingual } from "@/hooks/useBilingual";
import { getStarredPhraseId, toggleStarredPhrase, type PharmacyLocalSaveResult, type PharmacyStarredPhrase } from "@/lib/pharmacyPracticeStore";

export interface StarTarget {
  scenarioId: string;
  textEn: string;
  textFa: string;
}

export function useStarToggle(phrases: PharmacyStarredPhrase[], save: (next: PharmacyStarredPhrase[]) => PharmacyLocalSaveResult) {
  const { T } = useBilingual();
  const isStarred = (target: StarTarget) => phrases.some((item) => item.id === getStarredPhraseId(target.scenarioId, target.textEn, target.textFa));
  const toggle = (target: StarTarget) => {
    const result = save(toggleStarredPhrase(phrases, target));
    if (!result.ok) toast.error(result.reason === "signed-out" ? T("برای ستاره‌دارکردن وارد حساب شو.", "Sign in to star phrases.") : T("ذخیره روی دستگاه ناموفق بود.", "Could not save on this device."));
  };
  return { isStarred, toggle };
}

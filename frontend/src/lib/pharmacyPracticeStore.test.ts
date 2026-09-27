import { afterEach, describe, expect, it, vi } from "vitest";
import { formatReferralLetter, readPharmacyLocal, toggleStarredPhrase, writePharmacyLocal } from "./pharmacyPracticeStore";

describe("pharmacyPracticeStore", () => {
  afterEach(() => { vi.restoreAllMocks(); window.localStorage.clear(); });

  it("keeps each account's data separate and refuses signed-out writes", () => {
    expect(writePharmacyLocal("a", "scenario-progress", { x: 1 })).toEqual({ ok: true });
    expect(readPharmacyLocal("b", "scenario-progress", {})).toEqual({});
    expect(readPharmacyLocal("a", "scenario-progress", {})).toEqual({ x: 1 });
    expect(writePharmacyLocal(null, "scenario-progress", {})).toEqual({ ok: false, reason: "signed-out" });
  });

  it("reports storage failure instead of a false save", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("quota"); });
    expect(writePharmacyLocal("a", "starred-phrases", [])).toEqual({ ok: false, reason: "storage-unavailable" });
  });

  it("toggles a starred phrase by scenario and text", () => {
    const once = toggleStarredPhrase([], { scenarioId: "s1", textEn: "Bunged up", textFa: "" });
    expect(once).toHaveLength(1);
    expect(toggleStarredPhrase(once, { scenarioId: "s1", textEn: "bunged up ", textFa: "" })).toHaveLength(0);
    expect(toggleStarredPhrase(once, { scenarioId: "s2", textEn: "Bunged up", textFa: "" })).toHaveLength(2);
  });

  it("formats a referral letter without empty optional notes", () => {
    const text = formatReferralLetter({ patientName: "Jo", patientAge: 40, titleEn: "Case" }, { to: "GP", reason: "R", symptomSummary: "S", currentMeds: "M", suggestedAction: "A", notes: "" });
    expect(text).toContain("To: GP");
    expect(text).toContain("Re: Jo, 40y");
    expect(text).not.toContain("Pharmacist notes");
  });
});

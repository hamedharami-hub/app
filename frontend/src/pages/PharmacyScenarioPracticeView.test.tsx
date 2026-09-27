import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PharmacyScenarioPracticeView from "./PharmacyScenarioPracticeView";
import { PHARMACY_PRACTICE_SCENARIOS } from "@/lib/pharmacyScenarioPracticeData";

const { languageState, authState } = vi.hoisted(() => ({
  languageState: { lang: "en" as "en" | "fa" },
  authState: { user: { id: "user-a" } as { id: string } | null },
}));

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: authState.user }) }));
vi.mock("@/lib/firebase", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/firebase")>()),
  getDocs: vi.fn(async () => ({ forEach: () => undefined })),
}));
vi.mock("@/lib/firestoreSync", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/firestoreSync")>()),
  saveEntityToFirestoreWithOutcome: vi.fn(async () => "saved"),
}));

vi.mock("@/hooks/useBilingual", () => ({
  useBilingual: () => ({
    lang: languageState.lang,
    T: (fa: string, en: string) => languageState.lang === "en" ? en : fa,
  }),
}));

describe("PharmacyScenarioPracticeView", () => {
  beforeEach(() => {
    languageState.lang = "en";
    authState.user = { id: "user-a" };
    window.localStorage.clear();
  });

  const walkToResponse = () => {
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    for (const button of screen.getAllByRole("button", { name: "Reveal patient reply" })) fireEvent.click(button);
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    fireEvent.click(screen.getByText("Option 1").closest("button")!);
  };

  it("stars a key phrase, lists it and syncs it for the account", async () => {
    const scenario = PHARMACY_PRACTICE_SCENARIOS.find((item) => item.mode === "MODE_B_SLANG")!;
    render(<PharmacyScenarioPracticeView />);
    expect(screen.getByTestId("starred-phrases-empty")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("scenario-star-phrase-0"));
    await waitFor(() => expect(screen.getByTestId("scenario-star-phrase-0")).toHaveAttribute("aria-pressed", "true"));
    expect(screen.getAllByTestId("starred-phrase-item")).toHaveLength(1);
    expect(screen.getByTestId("starred-phrase-item")).toHaveTextContent(scenario.keyPhrases[0].phrase);
    expect(window.localStorage.getItem("arshnaz:pharmacy:records:user-a")).toContain(scenario.keyPhrases[0].phrase);
    fireEvent.click(screen.getByTestId("starred-phrase-remove-btn"));
    await waitFor(() => expect(screen.getByTestId("starred-phrases-empty")).toBeInTheDocument());
  });

  it("does not claim a star was saved when signed out", () => {
    authState.user = null;
    render(<PharmacyScenarioPracticeView />);
    fireEvent.click(screen.getByTestId("scenario-star-phrase-0"));
    expect(screen.getByTestId("scenario-star-phrase-0")).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByTestId("starred-phrases-empty")).toBeInTheDocument();
  });

  it("shows source-graph links to Knowledge documents on the case step", () => {
    render(<PharmacyScenarioPracticeView />);
    expect(screen.getByTestId("scenario-links-panel")).toBeInTheDocument();
    expect(screen.getByTestId("scenario-open-case-doc-btn")).toBeInTheDocument();
  });

  it("lets the learner refer, write and save a referral letter draft", async () => {
    render(<PharmacyScenarioPracticeView />);
    walkToResponse();
    fireEvent.click(screen.getByTestId("scenario-decision-refer-btn"));
    fireEvent.click(screen.getByTestId("scenario-write-referral-btn"));
    expect(screen.getByTestId("referral-letter-dialog")).toBeInTheDocument();
    fireEvent.change(screen.getByTestId("referral-field-to"), { target: { value: "Dr Example (GP)" } });
    fireEvent.change(screen.getByTestId("referral-field-reason"), { target: { value: "Needs medical review" } });
    fireEvent.click(screen.getByTestId("referral-save-btn"));
    expect(await screen.findByTestId("referral-status-saved")).toHaveTextContent("Draft saved and synced");
    expect(window.localStorage.getItem("arshnaz:pharmacy:records:user-a")).toContain("Dr Example (GP)");
  });


  it("starts with the case briefing and keeps the outcome hidden", () => {
    render(<PharmacyScenarioPracticeView />);
    expect(screen.getByRole("heading", { name: "Pharmacy scenario practice" })).toBeInTheDocument();
    expect(screen.getByRole("note")).toHaveTextContent("have not been independently reviewed");
    expect(screen.getByRole("heading", { name: "Initial presentation" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Source debrief" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled();
  });

  it("gates progression until patient replies are revealed and a response is selected", async () => {
    const scenario = PHARMACY_PRACTICE_SCENARIOS.find((item) => item.mode === "MODE_B_SLANG")!;
    render(<PharmacyScenarioPracticeView />);
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(screen.getByRole("heading", { name: "Assessment questions" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
    expect(scenario.questions.length).toBeGreaterThan(0);
    for (const _question of scenario.questions) {
      fireEvent.click(screen.getAllByRole("button", { name: "Reveal patient reply" })[0]);
    }
    expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));

    expect(screen.getByRole("heading", { name: "Choose your response" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
    const optionButton = screen.getByText("Option 1").closest("button");
    expect(optionButton).not.toBeNull();
    fireEvent.click(optionButton!);
    expect(screen.getByText("Patient reply in source")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
    fireEvent.click(screen.getByTestId(scenario.outcome?.requiresReferral ? "scenario-decision-refer-btn" : "scenario-decision-supply-btn"));
    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByRole("heading", { name: "Source debrief" })).toBeInTheDocument();
    expect(screen.getByTestId("scenario-decision-match")).toHaveTextContent("matches the source label");
    await waitFor(() => expect(screen.getByTestId("scenario-progress-status")).toHaveTextContent("Progress saved and synced."));
    expect(screen.getByTestId("scenario-progress-summary")).toHaveTextContent("1 of 32 cases done");
  });

  it("supports Persian RTL labels and a no-results search", () => {
    languageState.lang = "fa";
    render(<PharmacyScenarioPracticeView />);
    expect(screen.getByRole("main")).toHaveAttribute("dir", "rtl");
    expect(screen.getByRole("heading", { name: "تمرین تعاملی سناریوهای Pharmacy" })).toBeInTheDocument();
    fireEvent.change(screen.getByRole("searchbox", { name: "جست‌وجوی پرونده" }), { target: { value: "هیچ پرونده‌ای با این عنوان نیست" } });
    expect(screen.getByRole("heading", { name: "پرونده‌ای پیدا نشد" })).toBeInTheDocument();
  });
});

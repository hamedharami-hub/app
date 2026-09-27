// Dev-only QA harness: renders Pharmacy pages with a fictional signed-in user. Not part of the production build.
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import { AuthContext } from "@/hooks/useAuth";
import { Toaster } from "@/components/ui/sonner";
import i18n, { LANGUAGE_STORAGE_KEY } from "@/i18n";
import PharmacyProductsView from "@/pages/PharmacyProductsView";
import PharmacyScenarioPracticeView from "@/pages/PharmacyScenarioPracticeView";
import PharmacyCypView from "@/pages/PharmacyCypView";
import PharmacyFredPracticeView from "@/pages/PharmacyFredPracticeView";
import CommandPalette from "@/components/CommandPalette";
import "@/index.css";

const params = new URLSearchParams(window.location.search);
const lang = params.get("lang") === "fa" ? "fa" : "en";
localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
void i18n.changeLanguage(lang);
const fakeUser = { id: "qa-harness-user", uid: "qa-harness-user", email: "qa@example.invalid", displayName: "QA" };
const views = { products: PharmacyProductsView, cyp: PharmacyCypView, fred: PharmacyFredPracticeView, scenario: PharmacyScenarioPracticeView };
const View = views[(params.get("view") as keyof typeof views) ?? "scenario"] ?? PharmacyScenarioPracticeView;

createRoot(document.getElementById("root")!).render(
  <AuthContext.Provider value={{ user: fakeUser, session: null, loading: false } as unknown as React.ContextType<typeof AuthContext>}>
    <MemoryRouter>
      <View />
      <CommandPalette />
      <Toaster />
    </MemoryRouter>
  </AuthContext.Provider>,
);

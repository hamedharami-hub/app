import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import PharmacyProductsView from "./PharmacyProductsView";

const { languageState } = vi.hoisted(() => ({ languageState: { lang: "en" as "en" | "fa" } }));

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "user-a" } }) }));

vi.mock("@/hooks/useBilingual", () => ({
  useBilingual: () => ({
    lang: languageState.lang,
    T: (fa: string, en: string) => languageState.lang === "en" ? en : fa,
  }),
}));

describe("PharmacyProductsView", () => {
  beforeEach(() => { languageState.lang = "en"; });

  it("renders bilingual catalogue controls and clearly marks the data as unreviewed", () => {
    render(<PharmacyProductsView />);
    expect(screen.getByRole("heading", { name: "Pharmacy product catalogue" })).toBeInTheDocument();
    expect(screen.getByRole("note")).toHaveTextContent("has not been independently reviewed");
    expect(screen.getByRole("searchbox", { name: "Search products" })).toBeInTheDocument();
    expect(screen.getByText("121 of 121 products")).toBeInTheDocument();
  });

  it("uses right-to-left layout and Persian labels when Persian is selected", () => {
    languageState.lang = "fa";
    render(<PharmacyProductsView />);
    expect(screen.getByRole("main")).toHaveAttribute("dir", "rtl");
    expect(screen.getByRole("heading", { name: "فهرست محصولات دارویی" })).toBeInTheDocument();
    expect(screen.getByRole("searchbox", { name: "جست‌وجوی محصولات" })).toBeInTheDocument();
  });

  it("filters results and opens a read-only detail panel with the source link", () => {
    render(<PharmacyProductsView />);
    fireEvent.change(screen.getByRole("searchbox", { name: "Search products" }), { target: { value: "Panadol" } });

    const productButton = screen.getByRole("button", { name: "View Panadol 500mg" });
    expect(productButton).toBeInTheDocument();
    expect(screen.getByText(/^\d+ of 121 products$/)).toBeInTheDocument();
    fireEvent.click(productButton);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View source file on GitHub" })).toHaveAttribute(
      "href",
      expect.stringContaining("/blob/5b4f7d2443a3ed97aea752c1d0d18583ce6d0067/data/shelf/shelfProducts.ts"),
    );
  });

  it("shows an empty state for a missing search and can reset search", () => {
    render(<PharmacyProductsView />);
    const search = screen.getByRole("searchbox", { name: "Search products" });
    fireEvent.change(search, { target: { value: "no product with this name" } });
    expect(screen.getByRole("heading", { name: "No products found" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Reset" }));
    expect(screen.getByText("121 of 121 products")).toBeInTheDocument();
  });

  it("compares two selected medicines side by side", () => {
    render(<PharmacyProductsView />);
    fireEvent.click(screen.getByTestId("product-compare-toggle-prod-panadol-500"));
    expect(screen.getByTestId("products-compare-open-btn")).toBeDisabled();
    const secondToggle = screen.getAllByRole("button", { name: "Compare" }).find((button) => button.getAttribute("aria-pressed") === "false")!;
    fireEvent.click(secondToggle);
    fireEvent.click(screen.getByTestId("products-compare-open-btn"));
    const table = screen.getByTestId("pharmacy-compare-table");
    expect(table).toHaveTextContent("Panadol 500mg");
    expect(table).toHaveTextContent("Mechanism class");
  });

  it("shows mechanism and CAL details and opens the educational CAL guide", () => {
    render(<PharmacyProductsView />);
    fireEvent.click(screen.getByRole("button", { name: "View Panadol 500mg" }));
    expect(screen.getByTestId("product-open-monograph-btn")).toBeInTheDocument();
    expect(screen.getByTestId("product-make-card-btn")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("product-cal-all-btn"));
    expect(screen.getByTestId("pharmacy-regulatory-title")).toHaveTextContent("Cautionary Advisory Labels");
    expect(screen.getByTestId("pharmacy-cal-list")).toBeInTheDocument();
  });

  it("opens the SafeScript guide as unreviewed educational information", () => {
    render(<PharmacyProductsView />);
    fireEvent.click(screen.getByTestId("guide-safescript-btn"));
    const dialog = screen.getByTestId("pharmacy-regulatory-dialog");
    expect(dialog).toHaveTextContent("not an instruction or automatic prohibition");
    expect(dialog).toHaveTextContent("Educational and unreviewed");
  });
});

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PharmacyDocumentDialog } from "./PharmacyDocumentDialog";

const mocks = vi.hoisted(() => ({
  getKnowledgeDocument: vi.fn(),
  getPharmacySeedDocument: vi.fn(),
}));

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "user-a" } }) }));
vi.mock("@/hooks/useBilingual", () => ({ useBilingual: () => ({ lang: "en", T: (_fa: string, en: string) => en }) }));
vi.mock("@/lib/knowledgeService", () => ({ getKnowledgeDocument: mocks.getKnowledgeDocument }));
vi.mock("@/lib/pharmacyImportService", () => ({ getPharmacySeedDocument: mocks.getPharmacySeedDocument }));

const doc = (id: string, title: string, html: string) => ({ id, title, title_en: title, content_html: html, content_en: html });

describe("PharmacyDocumentDialog", () => {
  beforeEach(() => {
    mocks.getKnowledgeDocument.mockReset();
    mocks.getPharmacySeedDocument.mockReset();
  });

  it("prefers the user's Knowledge copy and follows in-content links with a back stack", async () => {
    mocks.getKnowledgeDocument.mockImplementation(async (_user: string, id: string) =>
      id === "doc-a" ? doc("doc-a", "Doc A", '<p>See <span data-doc-link="doc-b">Doc B link</span></p>') : null);
    mocks.getPharmacySeedDocument.mockImplementation(async (id: string) => (id === "doc-b" ? doc("doc-b", "Doc B", "<p>B body</p>") : null));

    render(<PharmacyDocumentDialog documentId="doc-a" onClose={() => {}} />);
    await waitFor(() => expect(screen.getByTestId("pharmacy-document-title")).toHaveTextContent("Doc A"));
    expect(screen.getByTestId("pharmacy-document-origin")).toHaveTextContent("Your Knowledge copy");

    fireEvent.click(screen.getByText("Doc B link"));
    await waitFor(() => expect(screen.getByTestId("pharmacy-document-title")).toHaveTextContent("Doc B"));
    expect(screen.getByTestId("pharmacy-document-origin")).toHaveTextContent("Source snapshot");

    fireEvent.click(screen.getByTestId("pharmacy-document-back-btn"));
    await waitFor(() => expect(screen.getByTestId("pharmacy-document-title")).toHaveTextContent("Doc A"));
    expect(screen.queryByTestId("pharmacy-document-back-btn")).not.toBeInTheDocument();
  });

  it("shows a clear message when the document exists nowhere", async () => {
    mocks.getKnowledgeDocument.mockResolvedValue(null);
    mocks.getPharmacySeedDocument.mockResolvedValue(null);
    render(<PharmacyDocumentDialog documentId="doc-missing" onClose={() => {}} />);
    expect(await screen.findByTestId("pharmacy-document-missing")).toBeInTheDocument();
  });
});

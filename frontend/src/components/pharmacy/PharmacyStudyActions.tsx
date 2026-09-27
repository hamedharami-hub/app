import { useState } from "react";
import { CalendarPlus, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StudyTaskScheduleModal } from "@/components/knowledge/StudyTaskScheduleModal";
import { useBilingual } from "@/hooks/useBilingual";
import { PharmacyLeitnerCardDialog, type PharmacyCardDraft } from "./PharmacyLeitnerCardDialog";

interface PharmacyStudyActionsProps {
  documentId: string;
  title: string;
  cardFront: string;
  cardBack: string;
  testIdPrefix: string;
}

/** Turns any Pharmacy item into a linked Leitner card or a scheduled study task. */
export function PharmacyStudyActions({ documentId, title, cardFront, cardBack, testIdPrefix }: PharmacyStudyActionsProps) {
  const { T } = useBilingual();
  const [cardDraft, setCardDraft] = useState<PharmacyCardDraft | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);

  return (
    <div className="flex flex-wrap gap-2">
      <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={() => setCardDraft({ front: cardFront, back: cardBack, documentId })} data-testid={`${testIdPrefix}-make-card-btn`}>
        <Layers className="h-4 w-4" aria-hidden="true" />{T("کارت Leitner", "Leitner card")}
      </Button>
      <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={() => setScheduleOpen(true)} data-testid={`${testIdPrefix}-schedule-task-btn`}>
        <CalendarPlus className="h-4 w-4" aria-hidden="true" />{T("تسک مطالعه", "Study task")}
      </Button>
      <PharmacyLeitnerCardDialog draft={cardDraft} onClose={() => setCardDraft(null)} />
      {scheduleOpen && (
        <StudyTaskScheduleModal open={scheduleOpen} onOpenChange={setScheduleOpen} targetType="knowledge_doc" targetId={documentId} targetTitle={title} folderBreadcrumb="Pharmacy" />
      )}
    </div>
  );
}

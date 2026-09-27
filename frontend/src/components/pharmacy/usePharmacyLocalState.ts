import { useCallback, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { readPharmacyLocal, writePharmacyLocal, type PharmacyLocalSaveResult } from "@/lib/pharmacyPracticeStore";

type StoreName = Parameters<typeof readPharmacyLocal>[1];

/** Device-local state that only updates after the write is confirmed. */
export function usePharmacyLocalState<T>(name: StoreName, fallback: T) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [state, setState] = useState<{ userId: string | null; value: T }>(() => ({ userId, value: readPharmacyLocal(userId, name, fallback) }));
  const value = state.userId === userId ? state.value : readPharmacyLocal(userId, name, fallback);

  const save = useCallback((next: T): PharmacyLocalSaveResult => {
    const result = writePharmacyLocal(userId, name, next);
    if (result.ok) setState({ userId, value: next });
    return result;
  }, [name, userId]);

  return [value, save] as const;
}

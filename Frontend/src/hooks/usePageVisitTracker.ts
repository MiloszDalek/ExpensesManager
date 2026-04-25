import { useEffect, useState } from "react";

const STORAGE_KEY_PREFIX = "page_visited_";

export function usePageVisitTracker(pageKey: string) {
  const [shouldShowDialog, setShouldShowDialog] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const storageKey = `${STORAGE_KEY_PREFIX}${pageKey}`;
    const hasVisited = localStorage.getItem(storageKey);

    if (!hasVisited) {
      setShouldShowDialog(true);
    }

    setIsInitialized(true);
  }, [pageKey]);

  const markAsVisited = () => {
    const storageKey = `${STORAGE_KEY_PREFIX}${pageKey}`;
    localStorage.setItem(storageKey, "true");
    setShouldShowDialog(false);
  };

  const resetVisit = () => {
    const storageKey = `${STORAGE_KEY_PREFIX}${pageKey}`;
    localStorage.removeItem(storageKey);
    setShouldShowDialog(true);
  };

  return {
    shouldShowDialog,
    isInitialized,
    markAsVisited,
    resetVisit,
  };
}

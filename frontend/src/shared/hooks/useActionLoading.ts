import { useState, useCallback, useRef } from 'react';

export interface UseActionLoadingReturn {
  /** True if any action is currently executing */
  isPending: boolean;
  /** Active ID if an item-level action is executing, otherwise null */
  activeId: string | number | null;
  /** Checks if a specific item ID is currently pending */
  isItemPending: (id: string | number) => boolean;
  /**
   * Executes a standalone async action with automatic loading state management.
   * Prevents duplicate execution if an action is already in flight.
   */
  execute: <T>(action: () => Promise<T>) => Promise<T | undefined>;
  /**
   * Executes an item-level async action with per-ID loading state management.
   * Prevents duplicate execution for that specific item ID while running.
   */
  executeItem: <T>(id: string | number, action: () => Promise<T>) => Promise<T | undefined>;
}

export function useActionLoading(): UseActionLoadingReturn {
  const [activeId, setActiveId] = useState<string | number | null>(null);
  const [isPending, setIsPending] = useState(false);
  const pendingRef = useRef(false);
  const activeIdRef = useRef<string | number | null>(null);

  const isItemPending = useCallback(
    (id: string | number) => {
      return activeId === id;
    },
    [activeId]
  );

  const execute = useCallback(async <T>(action: () => Promise<T>): Promise<T | undefined> => {
    if (pendingRef.current) {
      // Guard against duplicate concurrent submissions
      return undefined;
    }

    pendingRef.current = true;
    setIsPending(true);

    try {
      return await action();
    } finally {
      pendingRef.current = false;
      setIsPending(false);
    }
  }, []);

  const executeItem = useCallback(
    async <T>(id: string | number, action: () => Promise<T>): Promise<T | undefined> => {
      if (activeIdRef.current === id) {
        // Prevent duplicate clicks on the same row/item
        return undefined;
      }

      activeIdRef.current = id;
      setActiveId(id);
      pendingRef.current = true;
      setIsPending(true);

      try {
        return await action();
      } finally {
        activeIdRef.current = null;
        setActiveId(null);
        pendingRef.current = false;
        setIsPending(false);
      }
    },
    []
  );

  return {
    isPending,
    activeId,
    isItemPending,
    execute,
    executeItem,
  };
}

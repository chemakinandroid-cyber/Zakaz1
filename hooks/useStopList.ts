"use client";

import { useEffect, useMemo, useState } from "react";
import { STORAGE_KEYS } from "@/lib/storage";
import { getStopList, saveStopList, STOPLIST_CHANNEL } from "@/lib/stoplist";
import type { BranchId, StopListState } from "@/lib/types";

export function useStopList() {
  const [state, setState] = useState<StopListState>(getStopList);

  useEffect(() => {
    const sync = () => setState(getStopList());

    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.STOPLIST) sync();
    };

    window.addEventListener("storage", onStorage);

    let channel: BroadcastChannel | null = null;
    if ("BroadcastChannel" in window) {
      channel = new BroadcastChannel(STOPLIST_CHANNEL);
      channel.onmessage = sync;
    }

    return () => {
      window.removeEventListener("storage", onStorage);
      if (channel) channel.close();
    };
  }, []);

  return useMemo(
    () => ({
      stopList: state,
      isStopped: (branch: BranchId, productId: string) =>
        state[branch]?.includes(productId) ?? false,
      toggleItem: (branch: BranchId, productId: string) => {
        const current = getStopList();
        const exists = current[branch]?.includes(productId);

        const next: StopListState = {
          ...current,
          [branch]: exists
            ? current[branch].filter((id) => id !== productId)
            : [...current[branch], productId],
        };

        setState(next);
        saveStopList(next);
      },
      replaceBranch: (branch: BranchId, productIds: string[]) => {
        const current = getStopList();
        const next = {
          ...current,
          [branch]: productIds,
        };
        setState(next);
        saveStopList(next);
      },
    }),
    [state]
  );
}

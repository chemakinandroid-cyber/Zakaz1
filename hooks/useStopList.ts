'use client';

import { useEffect, useMemo, useState } from 'react';
import { STORAGE_KEYS } from '../lib/storage';
import { getStopList, saveStopList, STOPLIST_CHANNEL } from '../lib/stoplist';
import type { BranchId, StopListState } from '../lib/types';

export function useStopList() {
  const [stopList, setStopList] = useState<StopListState>({ airport: [], konechnaya: [] });

  useEffect(() => {
    const sync = () => setStopList(getStopList());
    sync();

    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEYS.stopList) sync();
    };

    window.addEventListener('storage', onStorage);

    let channel: BroadcastChannel | null = null;
    if ('BroadcastChannel' in window) {
      channel = new BroadcastChannel(STOPLIST_CHANNEL);
      channel.onmessage = sync;
    }

    return () => {
      window.removeEventListener('storage', onStorage);
      if (channel) channel.close();
    };
  }, []);

  return useMemo(
    () => ({
      stopList,
      isStopped: (branch: BranchId, productId: string) => stopList[branch]?.includes(productId) ?? false,
      toggleItem: (branch: BranchId, productId: string) => {
        const current = getStopList();
        const exists = current[branch].includes(productId);
        const next: StopListState = {
          ...current,
          [branch]: exists ? current[branch].filter((id) => id !== productId) : [...current[branch], productId]
        };
        setStopList(next);
        saveStopList(next);
      }
    }),
    [stopList]
  );
}

import { STORAGE_KEYS, readLocal, writeLocal } from "./storage";
import type { BranchId, StopListState } from "./types";

export const STOPLIST_CHANNEL = "na-virazhah-stoplist";

const defaultState: StopListState = {
  konechnaya: [],
  airport: [],
};

export function getStopList(): StopListState {
  return readLocal<StopListState>(STORAGE_KEYS.STOPLIST, defaultState);
}

export function saveStopList(next: StopListState) {
  writeLocal(STORAGE_KEYS.STOPLIST, next);

  if (typeof window !== "undefined" && "BroadcastChannel" in window) {
    const channel = new BroadcastChannel(STOPLIST_CHANNEL);
    channel.postMessage({ type: "STOPLIST_UPDATED", payload: next });
    channel.close();
  }
}

export function isStopped(branch: BranchId, productId: string, state?: StopListState) {
  const src = state ?? getStopList();
  return src[branch]?.includes(productId) ?? false;
}

export function toggleStop(branch: BranchId, productId: string) {
  const current = getStopList();
  const set = new Set(current[branch] ?? []);

  if (set.has(productId)) {
    set.delete(productId);
  } else {
    set.add(productId);
  }

  const next: StopListState = {
    ...current,
    [branch]: [...set],
  };

  saveStopList(next);
  return next;
}

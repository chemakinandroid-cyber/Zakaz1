import { STORAGE_KEYS, readLocal, writeLocal } from './storage';
import type { BranchId, StopListState } from './types';

const defaultState: StopListState = {
  airport: [],
  konechnaya: []
};

export const STOPLIST_CHANNEL = 'na-virazhah-stoplist';

export function getStopList(): StopListState {
  return readLocal<StopListState>(STORAGE_KEYS.stopList, defaultState);
}

export function saveStopList(state: StopListState) {
  writeLocal(STORAGE_KEYS.stopList, state);
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    const channel = new BroadcastChannel(STOPLIST_CHANNEL);
    channel.postMessage({ type: 'stoplist-updated' });
    channel.close();
  }
}

export function isStopped(branch: BranchId, productId: string, state?: StopListState) {
  const source = state ?? getStopList();
  return source[branch]?.includes(productId) ?? false;
}

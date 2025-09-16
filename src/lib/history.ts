export type HistoryEntry = {
  id: string;
  ts: number;
  feature: string;
  format: string;
  aspect: string;
  promptText: string;
  seeds: string[]; // data URLs
  variants: number;
  thumbs?: string[]; // result thumbnails (data URLs)
  note?: string;
};

const KEY = "gemini_image_history_v1";

export function loadHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as HistoryEntry[]) : [];
  } catch {
    return [];
  }
}

export function saveHistory(list: HistoryEntry[]) {
  localStorage.setItem(KEY, JSON.stringify(list.slice(0, 200))); // cap to 200
}

export function addHistory(entry: HistoryEntry) {
  const list = loadHistory();
  list.unshift(entry);
  saveHistory(list);
  return list;
}

export function updateHistory(id: string, patch: Partial<HistoryEntry>) {
  const list = loadHistory();
  const idx = list.findIndex((e) => e.id === id);
  if (idx >= 0) {
    list[idx] = { ...list[idx], ...patch } as HistoryEntry;
  }
  saveHistory(list);
  return list;
}

export function deleteHistory(id: string) {
  const list = loadHistory().filter((e) => e.id !== id);
  saveHistory(list);
  return list;
}

export function clearHistory() {
  saveHistory([]);
  return [];
}
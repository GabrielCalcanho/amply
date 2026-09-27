type Listener = () => void;

let totalUnread = 0;
const listeners = new Set<Listener>();

export function getTotalUnread(): number {
  return totalUnread;
}

export function setTotalUnread(value: number): void {
  const next = Math.max(0, Math.floor(value));
  if (next === totalUnread) return;
  totalUnread = next;
  listeners.forEach((l) => l());
}

export function subscribeUnread(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

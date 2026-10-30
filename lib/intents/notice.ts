type Listener = (line: string) => void;

let line = "";
const listeners = new Set<Listener>();

export function readIntentLine() {
  return line;
}

export function publishIntentLine(next: string) {
  line = next;
  for (const listener of listeners) listener(next);
}

export function subscribeIntentLine(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

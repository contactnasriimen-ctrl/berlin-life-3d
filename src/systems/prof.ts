/** startup timings (ms since page start), readable as window.__prof */
const marks: Record<string, number> = {};
(window as any).__prof = marks;
export function timed<T>(name: string, f: () => T): T { const t = performance.now(); const r = f(); marks[name] = Math.round((marks[name] || 0) + performance.now() - t); return r; }
export function mark(name: string) { marks[name] = Math.round(performance.now()); }

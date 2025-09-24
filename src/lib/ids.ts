export function nextId(existing: number[]): number {
  return (existing.length ? Math.max(...existing) : 0) + 1;
}

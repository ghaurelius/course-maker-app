export function estimateBytes(obj: unknown): number {
  try {
    // Blob is supported in all modern browsers CRA targets
    return new Blob([JSON.stringify(obj)]).size;
  } catch {
    // Fallback
    return JSON.stringify(obj).length;
  }
}

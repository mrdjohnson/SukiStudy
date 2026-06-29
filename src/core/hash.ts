// Deterministic 32-bit FNV-1a hash. Used for stable seeds and derived layout/
// color choices (e.g. collection word clouds) that must be reproducible across
// sessions and devices.
export const hashString = (value: string) => {
  let hash = 2166136261

  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i)
    hash = Math.imul(hash, 16777619)
  }

  return hash >>> 0
}

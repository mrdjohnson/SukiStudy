export function flush() {
  return new Promise(resolve => setTimeout(resolve, 100))
}

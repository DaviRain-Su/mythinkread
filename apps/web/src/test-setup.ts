import '@testing-library/jest-dom/vitest'

// jsdom in recent Node / vitest can expose localStorage as a read-only prop
// that is not a functioning Storage instance. Replace it with a tiny in-memory
// implementation so components that call setItem/getItem/clear work in tests.
class MemoryStorage implements Storage {
  private store = new Map<string, string>()
  get length(): number {
    return this.store.size
  }
  clear(): void {
    this.store.clear()
  }
  getItem(key: string): string | null {
    return this.store.has(key) ? (this.store.get(key) as string) : null
  }
  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null
  }
  removeItem(key: string): void {
    this.store.delete(key)
  }
  setItem(key: string, value: string): void {
    this.store.set(key, String(value))
  }
}

Object.defineProperty(globalThis, 'localStorage', {
  value: new MemoryStorage(),
  configurable: true,
  writable: true
})
Object.defineProperty(globalThis, 'sessionStorage', {
  value: new MemoryStorage(),
  configurable: true,
  writable: true
})

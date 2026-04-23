export function generateUUID(): string {
  const timestamp = Date.now()
  const timeHex = timestamp.toString(16).padStart(12, '0')
  const random = Array.from(crypto.getRandomValues(new Uint8Array(10)))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
  return `${timeHex.slice(0, 8)}-${timeHex.slice(8)}-7${random.slice(0, 3)}-${(
    (parseInt(random.slice(3, 4), 16) & 0x3) |
    0x8
  ).toString(16)}${random.slice(4, 7)}-${random.slice(7, 15)}`
}

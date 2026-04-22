import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ProfilePage from './ProfilePage'
import { useAuthStore } from '../stores/authStore'

/**
 * Verifies assertion A2.1-wallet-real-adapter:
 *  - ProfilePage calls wallet.signMessage (not a mock signature literal)
 *  - Fetches the nonce, submits a real base58 signature to /api/solana/link
 */

// Mock the wallet adapter hook — we don't want to spin up a real wallet in jsdom.
const mockSignMessage = vi.fn()
const mockConnect = vi.fn()
const mockPublicKey = {
  toBase58: () => '11111111111111111111111111111111'
}

vi.mock('@solana/wallet-adapter-react', () => ({
  useWallet: () => ({
    connected: true,
    publicKey: mockPublicKey,
    connect: mockConnect,
    signMessage: mockSignMessage
  })
}))

describe('ProfilePage wallet tab', () => {
  beforeEach(() => {
    // Seed an authenticated user so ProfilePage renders the tabs.
    useAuthStore.setState({
      user: {
        id: 'u1',
        username: 'alice',
        display_name: 'Alice',
        role: 'reader'
      },
      token: 'fake-token',
      isAuthenticated: true
    })
    localStorage.setItem('mtr_token', 'fake-token')

    mockSignMessage.mockReset()
    mockConnect.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    localStorage.clear()
  })

  function setupFetch(responses: Record<string, { status: number; body: unknown }>) {
    // Returns a mock for global fetch that matches on URL substring.
    return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = typeof input === 'string' ? input : (input as Request).url
      for (const [key, res] of Object.entries(responses)) {
        if (url.includes(key)) {
          return new Response(JSON.stringify(res.body), { status: res.status })
        }
      }
      return new Response('{}', { status: 200 })
    })
  }

  it('renders a Connect Wallet button when no wallet is linked', async () => {
    setupFetch({
      '/api/books': { status: 200, body: { items: [] } },
      '/api/export/reading': { status: 200, body: { reading_progress: [] } },
      '/api/solana/wallet': { status: 200, body: { wallet_address: null } }
    })

    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>
    )

    // Switch to Wallet tab (the top-level tab button is the first match).
    const walletTabs = await screen.findAllByRole('button', { name: '钱包' })
    fireEvent.click(walletTabs[0])

    const btn = await screen.findByRole('button', { name: /connect-wallet/i })
    expect(btn).toBeInTheDocument()
  })

  it('fetches a nonce, calls wallet.signMessage, and POSTs base58 signature to /api/solana/link', async () => {
    const nonce = 'abc123nonce'
    // Fake signature bytes (64-byte ed25519 signature).
    const fakeSigBytes = new Uint8Array(64)
    for (let i = 0; i < 64; i++) fakeSigBytes[i] = i

    mockSignMessage.mockResolvedValue(fakeSigBytes)

    const fetchSpy = setupFetch({
      '/api/books': { status: 200, body: { items: [] } },
      '/api/export/reading': { status: 200, body: { reading_progress: [] } },
      '/api/solana/wallet': { status: 200, body: { wallet_address: null } },
      '/api/solana/nonce': {
        status: 200,
        body: { nonce, message: nonce, expires_in: 300 }
      },
      '/api/solana/link': {
        status: 200,
        body: { success: true, wallet_address: '11111111111111111111111111111111' }
      }
    })

    render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>
    )

    const walletTabs = await screen.findAllByRole('button', { name: '钱包' })
    fireEvent.click(walletTabs[0])

    const btn = await screen.findByRole('button', { name: /connect-wallet/i })
    fireEvent.click(btn)

    await waitFor(() => {
      expect(mockSignMessage).toHaveBeenCalledTimes(1)
    })

    // Inspect the arguments passed to signMessage: should be the TextEncoder'd nonce.
    const signArg = mockSignMessage.mock.calls[0][0] as Uint8Array
    expect(new TextDecoder().decode(signArg)).toBe(nonce)

    // Inspect the POST /link call: body must NOT contain 'mock_signature' and
    // signature must be base58 of the 64-byte signature.
    await waitFor(() => {
      const linkCall = fetchSpy.mock.calls.find((call) => {
        const url = typeof call[0] === 'string' ? call[0] : (call[0] as Request).url
        return url.includes('/api/solana/link')
      })
      expect(linkCall).toBeDefined()
      const init = linkCall?.[1] as RequestInit
      const body = JSON.parse(init.body as string) as {
        wallet_address: string
        signature: string
        message: string
      }
      expect(body.signature).not.toBe('mock_signature')
      expect(body.signature.length).toBeGreaterThan(40) // base58 of 64 bytes ~ 88 chars
      expect(body.message).toBe(nonce)
      expect(body.wallet_address).toBe('11111111111111111111111111111111')
    })
  })
})

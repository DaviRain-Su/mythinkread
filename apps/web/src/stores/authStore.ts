import { create } from 'zustand'

interface User {
  id: string
  username: string
  display_name: string | null
  role: 'reader' | 'creator' | 'admin'
}

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<void>
  register: (username: string, password: string) => Promise<void>
  logout: () => void
  init: () => void
}

const API_BASE = '/api'

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,

  init: () => {
    const token = localStorage.getItem('mtr_token')
    const userStr = localStorage.getItem('mtr_user')
    if (token && userStr) {
      try {
        const user = JSON.parse(userStr)
        set({ user, token, isAuthenticated: true })
      } catch {
        localStorage.removeItem('mtr_token')
        localStorage.removeItem('mtr_user')
      }
    }
  },

  login: async (username: string, password: string) => {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    })

    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || '登录失败')
    }

    const data = await res.json()
    localStorage.setItem('mtr_token', data.token)
    localStorage.setItem('mtr_user', JSON.stringify(data.user))
    set({ user: data.user, token: data.token, isAuthenticated: true })
  },

  register: async (username: string, password: string) => {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    })

    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error || '注册失败')
    }

    // Auto login after register
    await get().login(username, password)
  },

  logout: () => {
    localStorage.removeItem('mtr_token')
    localStorage.removeItem('mtr_user')
    set({ user: null, token: null, isAuthenticated: false })
  }
}))

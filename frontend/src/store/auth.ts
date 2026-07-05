import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface GCUser { id: string; name: string; email: string }

interface AuthStore {
  user: GCUser | null
  setUser: (user: GCUser | null) => void
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
    }),
    { name: 'weebrook-auth' }
  )
)

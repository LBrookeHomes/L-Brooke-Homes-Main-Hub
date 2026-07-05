import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { useAuthStore } from '../store/auth'
import { t } from '../theme'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const setUser = useAuthStore((s) => s.setUser)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await api.post<{ id: string; name: string; email: string }>('/auth/login', { email, password })
      setUser(user)
      navigate('/')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: t.paper, padding: '1rem' }}>
      <div style={{ background: t.card, border: `2px solid ${t.line}`, padding: '2.5rem 2rem', width: '100%', maxWidth: 360 }}>
        <div style={{ marginBottom: '1.75rem' }}>
          <h1 style={{ fontWeight: 900, fontSize: '1.6rem', textTransform: 'uppercase', letterSpacing: '-0.01em', color: t.ink, marginBottom: 6 }}>Weebrook</h1>
          <p style={{ fontSize: 11, color: t.muted, textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: 700 }}>GC Project Management</p>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <input
            style={{ padding: '0.65rem 0.9rem', border: `1.5px solid ${t.line}`, fontSize: '0.95rem', background: '#fff', outline: 'none' }}
            type="email" placeholder="Email" value={email}
            onChange={(e) => setEmail(e.target.value)} required
          />
          <input
            style={{ padding: '0.65rem 0.9rem', border: `1.5px solid ${t.line}`, fontSize: '0.95rem', background: '#fff', outline: 'none' }}
            type="password" placeholder="Password" value={password}
            onChange={(e) => setPassword(e.target.value)} required
          />
          {error && <p style={{ color: t.red, fontSize: '0.85rem' }}>{error}</p>}
          <button
            style={{ padding: '0.7rem', background: t.rust, border: `2px solid ${t.rust}`, color: '#fff', fontSize: '0.82rem', cursor: 'pointer', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 4 }}
            type="submit" disabled={loading}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}

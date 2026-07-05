import { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { PUBLIC_BASE } from '../../api/client'
import { t } from '../../theme'

export default function ClientLogin() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [error, setError] = useState('')

  useEffect(() => {
    const token = params.get('token')
    if (!token) { setError('No login token provided.'); return }

    fetch(`${PUBLIC_BASE}/client-session/${token}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((data) => {
        if (data.error) { setError(data.error); return }
        sessionStorage.setItem('clientId', data.clientId)
        sessionStorage.setItem('clientName', data.name)
        const projectId = data.projects?.[0]?.id
        if (projectId) navigate(`/portal/project/${projectId}`, { replace: true })
        else setError('No project found for your account.')
      })
      .catch(() => setError('Login failed. Please request a new link.'))
  }, [])

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: t.paper }}>
      <div style={{ background: t.card, border: `2px solid ${t.line}`, padding: '2.5rem 2rem', width: 360, textAlign: 'center' }}>
        <h1 style={{ fontWeight: 900, fontSize: '1.3rem', textTransform: 'uppercase', letterSpacing: '-0.01em', marginBottom: 6 }}>Weebrook</h1>
        <p style={{ fontSize: 11, color: t.muted, textTransform: 'uppercase', letterSpacing: '0.14em', fontWeight: 700, marginBottom: '1.5rem' }}>Client Portal</p>
        {error ? (
          <>
            <div style={{ borderLeft: `4px solid ${t.red}`, padding: '10px 12px', background: '#fff', textAlign: 'left', marginBottom: '1rem' }}>
              <p style={{ fontWeight: 900, fontSize: '0.78rem', textTransform: 'uppercase', color: t.red, marginBottom: 4, fontFamily: 'monospace' }}>Login Error</p>
              <p style={{ fontSize: '0.875rem', color: t.ink }}>{error}</p>
            </div>
            <p style={{ fontSize: '0.82rem', color: t.muted }}>Contact your contractor for a new access link.</p>
          </>
        ) : (
          <p style={{ color: t.muted, fontSize: '0.875rem', fontFamily: 'monospace', textTransform: 'uppercase' }}>Logging you in…</p>
        )}
      </div>
    </div>
  )
}

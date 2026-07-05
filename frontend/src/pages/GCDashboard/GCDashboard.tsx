import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { projectsApi, ProjectWithMeta } from '../../api/projects'
import ProjectCard from '../../components/ProjectCard/ProjectCard'
import NewProjectModal from './NewProjectModal'
import GCLayout from '../../components/GCLayout/GCLayout'
import { useIsMobile } from '../../hooks/useIsMobile'
import { t } from '../../theme'

export default function GCDashboard() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const isMobile = useIsMobile()
  const [showNew, setShowNew] = useState(false)

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: projectsApi.list,
  })

  const active = projects.filter((p) => ['planning', 'active'].includes(p.status))
  const other = projects.filter((p) => !['planning', 'active'].includes(p.status))

  return (
    <GCLayout>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: isMobile ? '20px 14px 80px' : '28px 24px 80px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 900, textTransform: 'uppercase', marginBottom: 4 }}>Dashboard</h1>
            <p style={{ fontSize: 13, color: t.muted }}>Project management · selection tracking · contractor dispatch</p>
          </div>
          <button
            style={{ background: t.rust, border: `2px solid ${t.rust}`, color: '#fff', padding: '9px 14px', fontWeight: 800, textTransform: 'uppercase', fontSize: 12, cursor: 'pointer', letterSpacing: '0.05em' }}
            onClick={() => setShowNew(true)}
          >+ New Project</button>
        </div>

        {isLoading ? (
          <p style={{ color: t.muted, fontSize: '0.9rem' }}>Loading projects…</p>
        ) : (
          <>
            {active.length > 0 && (
              <section style={{ marginBottom: '2rem' }}>
                <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: t.muted, fontWeight: 700, marginBottom: '0.75rem', fontFamily: 'monospace' }}>Active</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
                  {active.map((p) => (
                    <ProjectCard key={p.id} project={p} onClick={() => navigate(`/projects/${p.id}`)} />
                  ))}
                </div>
              </section>
            )}
            {active.length === 0 && (
              <p style={{ color: t.muted, fontSize: '0.9rem', padding: '2rem 0' }}>No active projects. Create one to get started.</p>
            )}
            {other.length > 0 && (
              <section>
                <p style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', color: t.muted, fontWeight: 700, marginBottom: '0.75rem', fontFamily: 'monospace' }}>Archived</p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
                  {other.map((p) => (
                    <ProjectCard key={p.id} project={p} onClick={() => navigate(`/projects/${p.id}`)} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>

      {showNew && (
        <NewProjectModal
          onClose={() => setShowNew(false)}
          onCreated={(p: ProjectWithMeta) => { qc.invalidateQueries({ queryKey: ['projects'] }); navigate(`/projects/${p.id}`) }}
        />
      )}
    </GCLayout>
  )
}

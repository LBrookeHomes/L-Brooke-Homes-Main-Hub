import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { scheduleApi, type WorkItem } from '../../api/schedule'
import GCLayout from '../../components/GCLayout/GCLayout'
import { useIsMobile } from '../../hooks/useIsMobile'
import { t } from '../../theme'
import { btnPrimary, btnGhost } from './scheduleStyles'
import StatsCards from './StatsCards'
import FilterBar, { EMPTY_FILTERS, type Filters } from './FilterBar'
import WorkItemsTable from './WorkItemsTable'
import AddModal from './AddModal'
import EditModal from './EditModal'
import WorkersModal from './WorkersModal'
import CrewPushPreview from './CrewPushPreview'
import TeamScheduleCalendar from './TeamScheduleCalendar'
import WeeklyPreview from './WeeklyPreview'
import WorkerLog from './WorkerLog'

type Tab = 'list' | 'calendar' | 'weekly' | 'crew' | 'log'

const TABS: { id: Tab; label: string }[] = [
  { id: 'list', label: 'Work Items' },
  { id: 'calendar', label: 'Calendar' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'crew', label: 'Crew Push' },
  { id: 'log', label: 'Worker Log' },
]

export default function SchedulePage() {
  const isMobile = useIsMobile()
  const [tab, setTab] = useState<Tab>('list')
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS)
  const [showAdd, setShowAdd] = useState(false)
  const [showWorkers, setShowWorkers] = useState(false)
  const [editItem, setEditItem] = useState<WorkItem | null>(null)

  const { data: workers = [] } = useQuery({
    queryKey: ['schedule', 'workers'],
    queryFn: scheduleApi.fetchWorkers,
  })
  const { data: locations = [] } = useQuery({
    queryKey: ['schedule', 'locations'],
    queryFn: scheduleApi.fetchLocations,
  })
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['schedule', 'work-items'],
    queryFn: scheduleApi.fetchWorkItems,
  })

  const filtered = useMemo(() => {
    return items.filter((i) => {
      if (filters.workerId && !i.workerIds.includes(filters.workerId)) return false
      if (filters.locationId && !i.locationIds.includes(filters.locationId)) return false
      if (filters.status && i.status !== filters.status) return false
      if (filters.date && (i.jobDate?.slice(0, 10) ?? '') !== filters.date) return false
      return true
    })
  }, [items, filters])

  const tabStyle = (active: boolean): React.CSSProperties => ({
    padding: '8px 14px',
    cursor: 'pointer',
    fontSize: '0.72rem',
    fontWeight: 900,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    background: active ? t.ink : 'transparent',
    color: active ? '#fff' : t.muted,
    border: `2px solid ${active ? t.ink : t.line}`,
  })

  return (
    <GCLayout>
      <div style={{ maxWidth: 1000, margin: '0 auto', padding: isMobile ? '20px 14px 80px' : '28px 24px 80px' }}>
        {/* Heading */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 900, textTransform: 'uppercase', marginBottom: 4 }}>Work Schedule</h1>
            <p style={{ fontSize: 13, color: t.muted }}>Crew scheduling, daily pushes, and job tracking</p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button onClick={() => setShowWorkers(true)} style={{ ...btnGhost }}>Crew</button>
            <button onClick={() => setShowAdd(true)} style={{ ...btnPrimary }}>+ New Work Item</button>
          </div>
        </div>

        <StatsCards items={items} />

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 18, overflowX: 'auto' }}>
          {TABS.map((tb) => (
            <button key={tb.id} style={tabStyle(tab === tb.id)} onClick={() => setTab(tb.id)}>{tb.label}</button>
          ))}
        </div>

        {isLoading && (
          <p style={{ color: t.muted, fontFamily: 'monospace', textTransform: 'uppercase', fontSize: '0.8rem' }}>Loading…</p>
        )}

        {!isLoading && tab === 'list' && (
          <>
            <FilterBar workers={workers} locations={locations} filters={filters} onChange={setFilters} />
            <WorkItemsTable items={filtered} onEdit={setEditItem} isMobile={isMobile} />
          </>
        )}
        {!isLoading && tab === 'calendar' && <TeamScheduleCalendar items={items} onSelect={setEditItem} />}
        {!isLoading && tab === 'weekly' && <WeeklyPreview items={items} />}
        {!isLoading && tab === 'crew' && <CrewPushPreview workers={workers} items={items} />}
        {!isLoading && tab === 'log' && <WorkerLog workers={workers} items={items} />}
      </div>

      {showAdd && <AddModal workers={workers} locations={locations} onClose={() => setShowAdd(false)} />}
      {showWorkers && <WorkersModal workers={workers} onClose={() => setShowWorkers(false)} />}
      {editItem && <EditModal item={editItem} workers={workers} locations={locations} onClose={() => setEditItem(null)} />}
    </GCLayout>
  )
}

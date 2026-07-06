import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './store/auth'
import GCDashboard from './pages/GCDashboard/GCDashboard'
import ProjectPage from './pages/Project/ProjectPage'
import AttentionPage from './pages/Project/AttentionPage'
import DecisionsPage from './pages/Project/DecisionsPage'
import WorkOrdersPage from './pages/Project/WorkOrdersPage'
import DocumentsPage from './pages/Project/DocumentsPage'
import TimelinePage from './pages/Project/TimelinePage'
import ContractorsPage from './pages/Project/ContractorsPage'
import ContractorsRoster from './pages/Contractors/ContractorsRoster'
import SchedulePage from './pages/Schedule/SchedulePage'
import LoginPage from './pages/LoginPage'
import ClientPortal from './pages/ClientPortal/ClientPortal'
import ClientLogin from './pages/ClientPortal/ClientLogin'
import WorkOrderView from './pages/WorkOrderView/WorkOrderView'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore()
  return user ? <>{children}</> : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<ProtectedRoute><GCDashboard /></ProtectedRoute>} />
        <Route path="/projects/:id" element={<ProtectedRoute><ProjectPage /></ProtectedRoute>}>
          <Route index element={<AttentionPage />} />
          <Route path="decisions" element={<DecisionsPage />} />
          <Route path="workorders" element={<WorkOrdersPage />} />
          <Route path="documents" element={<DocumentsPage />} />
          <Route path="timeline" element={<TimelinePage />} />
          <Route path="contractors" element={<ContractorsPage />} />
        </Route>
        <Route path="/contractors" element={<ProtectedRoute><ContractorsRoster /></ProtectedRoute>} />
        <Route path="/schedule" element={<ProtectedRoute><SchedulePage /></ProtectedRoute>} />
        <Route path="/portal/login" element={<ClientLogin />} />
        <Route path="/portal/project/:projectId" element={<ClientPortal />} />
        <Route path="/wo/:token" element={<WorkOrderView />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

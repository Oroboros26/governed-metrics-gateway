import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MotionConfig } from 'framer-motion'
import './index.css'
import { ThemeProvider } from './lib/theme'
import { RoleProvider, useRole } from './lib/role'
import ReviewQueue from './pages/analyst/ReviewQueue'
import MyTeam from './pages/analyst/MyTeam'
import Warehouse from './pages/Warehouse'
import EngOverview from './pages/engineer/EngOverview'
import Setup from './pages/Setup'
import Agents from './pages/engineer/Agents'
import People from './pages/engineer/People'
import Repository from './pages/engineer/Repository'
import { MergeRequestList, MergeRequestPage } from './pages/engineer/MergeRequests'
import Layout from './components/Layout'
import Landing from './pages/Landing'
import Login from './pages/Login'
import SectionPage from './pages/SectionPage'
import AllViews from './pages/AllViews'
import MetricDetail from './pages/MetricDetail'
import EditMetric from './pages/EditMetric'
import MyChanges from './pages/MyChanges'

const Home = () => <Navigate to={useRole().persona.home} replace />
const qc = new QueryClient({ defaultOptions: { queries: { staleTime: 30_000, retry: false } } })

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <RoleProvider>
      <QueryClientProvider client={qc}>
        <MotionConfig reducedMotion="user">
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/app" element={<Layout />}>
                <Route index element={<Home />} />
                <Route path="views" element={<AllViews />} />
                <Route path="v/:view">
                  <Route index element={<Navigate to="overview" replace />} />
                  <Route path="overview" element={<SectionPage section="overview" />} />
                  <Route path="tables" element={<SectionPage section="tables" />} />
                  <Route path="metrics" element={<SectionPage section="metrics" />} />
                  <Route path="metrics/:name" element={<MetricDetail />} />
                  <Route path="metrics/:name/edit" element={<EditMetric />} />
                  <Route path="new" element={<EditMetric />} />
                  <Route path="filters" element={<SectionPage section="filters" />} />
                  <Route path="rules" element={<SectionPage section="rules" />} />
                  <Route path="queries" element={<SectionPage section="queries" />} />
                  <Route path="questions" element={<Navigate to="../queries" replace />} />
                  <Route path="context" element={<SectionPage section="context" />} />
                </Route>
                <Route path="layer/*" element={<Navigate to="/app/v/d2c/overview" replace />} />
                <Route path="changes" element={<MyChanges />} />
                <Route path="review" element={<ReviewQueue />} />
                <Route path="team" element={<MyTeam />} />
                <Route path="warehouse" element={<Warehouse />} />
                <Route path="setup" element={<Setup />} />
                <Route path="engineering" element={<EngOverview />} />
                <Route path="mrs" element={<MergeRequestList />} />
                <Route path="mrs/:id" element={<MergeRequestPage />} />
                <Route path="people" element={<People />} />
                <Route path="mcp" element={<Agents />} />
                <Route path="agents" element={<Navigate to="/app/mcp" replace />} />
                <Route path="repo" element={<Repository />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </MotionConfig>
      </QueryClientProvider>
      </RoleProvider>
    </ThemeProvider>
  </React.StrictMode>,
)

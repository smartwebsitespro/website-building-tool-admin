// v1.0 | 10/10/2026

import { BrowserRouter, Routes, Route } from 'react-router-dom'
import AdminLayout     from './components/AdminLayout'
import Dashboard       from './pages/Dashboard'
import Shops           from './pages/Shops'
import DomainManager   from './pages/DomainManager'
import Wizard          from './pages/Wizard'
import PlatformUpdates from './pages/PlatformUpdates'
import Settings        from './Settings'
import BionicBackups   from './pages/BionicBackups'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AdminLayout />}>
          <Route index                    element={<Dashboard />}       />
          <Route path="/shops"            element={<Shops />}           />
          <Route path="/wizard"           element={<Wizard />}          />
          <Route path="/wizard/:slug"     element={<Wizard />}          />
          <Route path="/domains"          element={<DomainManager />}   />
          <Route path="/platform-updates" element={<PlatformUpdates />} />
          <Route path="/settings"         element={<Settings />}        />
          <Route path="/bionic-backups"   element={<BionicBackups />}   />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

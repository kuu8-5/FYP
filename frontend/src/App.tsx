import { useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import Dashboard from './components/Dashboard'
import Login from './components/Login'
import Page1 from './components/page1/Page1'
import Page2 from './components/page2/Page2'
import { getSession, type Session } from './api'

function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    getSession()
      .then(setSession)
      .finally(() => setChecking(false))
  }, [])

  if (checking) {
    return <p>Checking session...</p>
  }

  if (!session) {
    return (
      <Routes>
        <Route path="/login" element={<Login onLogin={setSession} />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }

  return (
    <Routes>
      <Route
        element={
          <Dashboard
            username={session.username}
            onLogout={() => setSession(null)}
          />
        }
      >
        <Route path="/page1" element={<Page1 />} />
        <Route path="/page2" element={<Page2 />} />
      </Route>
      <Route path="*" element={<Navigate to="/page1" replace />} />
    </Routes>
  )
}

export default App

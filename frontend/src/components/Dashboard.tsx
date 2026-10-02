import { Outlet, useNavigate } from 'react-router-dom'
import ApiTester from './ApiTester'
import { logout } from '../api'

type DashboardProps = {
  username: string
  onLogout: () => void
}

function Dashboard({ username, onLogout }: DashboardProps) {
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    onLogout()
  }

  return (
    <div>
      <header>
        <h1>Dashboard</h1>
        <p>Signed in as {username}</p>
        <button type="button" onClick={handleLogout}>
          Logout
        </button>
      </header>
      <nav>
        <button type="button" onClick={() => navigate('/page1')}>
          Page 1
        </button>
        <button type="button" onClick={() => navigate('/page2')}>
          Page 2
        </button>
      </nav>
      <main>
        <Outlet />
      </main>
      <ApiTester />
    </div>
  )
}

export default Dashboard

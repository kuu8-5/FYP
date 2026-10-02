import { useState, type FormEvent } from 'react'
import { login, type Session } from '../api'

type LoginProps = {
  onLogin: (session: Session) => void
}

function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const session = await login(username, password)
    if (session) {
      onLogin(session)
    } else {
      setError('Login failed. Check username and password.')
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <h1>Login</h1>
      <label>
        Username
        <input
          value={username}
          onChange={(event) => setUsername(event.target.value)}
        />
      </label>
      <label>
        Password
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </label>
      <button type="submit">Login</button>
      {error !== '' && <p role="alert">{error}</p>}
    </form>
  )
}

export default Login

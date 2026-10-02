export type Session = {
  authenticated: boolean
  username: string
}

export type ApiResult = {
  ok: boolean
  status: number
  body: string
}

export async function getSession(): Promise<Session | null> {
  const response = await fetch('/api/auth/me')
  if (!response.ok) {
    return null
  }
  return response.json() as Promise<Session>
}

export async function login(
  username: string,
  password: string,
): Promise<Session | null> {
  const body = new URLSearchParams({ username, password })
  const response = await fetch('/api/auth/login', { method: 'POST', body })
  if (!response.ok) {
    return null
  }
  return getSession()
}

export async function logout(): Promise<void> {
  await fetch('/api/auth/logout', { method: 'POST' })
}

export async function callApi(
  path: string,
  init?: RequestInit,
): Promise<ApiResult> {
  const response = await fetch(path, init)
  return {
    ok: response.ok,
    status: response.status,
    body: await response.text(),
  }
}

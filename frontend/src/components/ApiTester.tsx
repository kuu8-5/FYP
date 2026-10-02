import { useState } from 'react'
import { callApi, type ApiResult } from '../api'

function ApiTester() {
  const [result, setResult] = useState<ApiResult | null>(null)
  const [pending, setPending] = useState(false)

  async function run(path: string, init?: RequestInit) {
    setPending(true)
    setResult(await callApi(path, init))
    setPending(false)
  }

  return (
    <section>
      <h2>API Test</h2>
      <button
        type="button"
        disabled={pending}
        onClick={() => run('/api/hello')}
      >
        GET /api/hello
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          run('/api/echo', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: 'hello from frontend' }),
          })
        }
      >
        POST /api/echo
      </button>
      {result && (
        <pre>
          {result.ok ? 'OK' : 'FAILED'} {result.status}
          {'\n'}
          {result.body}
        </pre>
      )}
    </section>
  )
}

export default ApiTester

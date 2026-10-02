# Frontend Documentation

React 19 + TypeScript + Vite single-page app that talks to the Spring Boot backend.
There is no CSS framework or decorative styling.

## Commands

Run from `frontend/`:

| Command | Purpose |
| --- | --- |
| `npm install` | Install dependencies |
| `npm run dev` | Dev server on http://localhost:5173 (proxies `/api/*` to `localhost:8080`) |
| `npm run build` | Type-check (`tsc -b`) then build into `../src/main/resources/static` |
| `npm run lint` | Lint with oxlint |

The backend must be running (`.\gradlew.bat bootRun`, port 8080) for login and API calls to work.

## Routes (URL paths)

| Path | View | Access |
| --- | --- | --- |
| `/login` | Login form | Public |
| `/page1` | Dashboard with Page 1 | Requires an authenticated session |
| `/page2` | Dashboard with Page 2 | Requires an authenticated session |
| `/` and any other path | Redirect to `/page1` when logged in, otherwise `/login` | - |

Routing uses `react-router-dom` (`BrowserRouter` in `src/main.tsx`). The dashboard header
has **Page 1** / **Page 2** buttons that call `navigate(...)`, so the browser URL changes.

### Refresh / deep links

Refreshing on `/page2` keeps you on Page 2:

- Dev: the Vite dev server serves `index.html` for any unknown path (SPA fallback).
- Production: `SpaController` on the backend forwards `/login`, `/page1`, `/page2` to
  `/index.html`. Add any new client route to that controller, otherwise a refresh returns 404.

## Authentication

Session-based login handled by Spring Security (HttpOnly `JSESSIONID` cookie).

1. On load, `App.tsx` calls `GET /api/auth/me`.
2. If it returns 401 the app renders the login routes and redirects to `/login`.
3. `POST /api/auth/login` (form params `username`, `password`) authenticates and stores the session.
4. `POST /api/auth/logout` invalidates the session.

Demo credentials: `user` / `password`.

Every API request except login goes through Spring Security and returns 401 when not
authenticated. The SPA shell (`/`, `/login`, `/page1`, `/page2`, `/assets/**`) is public so
the app can load; data access is protected server-side.

## Backend API used

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/api/auth/me` | Current session user (401 if not logged in) |
| `POST` | `/api/auth/login` | Login (`username`, `password` form params) |
| `POST` | `/api/auth/logout` | Logout |
| `GET` | `/api/hello` | Sample authenticated JSON response |
| `POST` | `/api/echo` | Echoes the posted JSON body |

The dashboard's **API Test** section has buttons for `GET /api/hello` and `POST /api/echo`
and prints the status code and response body, which verifies frontend/backend communication.

## Detailed flow: login -> page1 -> page2, and refresh on page1

The app is a client-side SPA. Only `/api/**` calls reach the backend; route changes happen
in the browser through React Router (`pushState`/`replaceState`) and do not reload the page.
The backend only serves the SPA shell (`index.html`) for the public routes.

### 1. Load the login page (not authenticated)

1. Browser `GET /login`.
2. Spring Security: `/login` is `permitAll`, so the request reaches `SpaController.index()`,
   which returns `forward:/index.html`; the DispatcherServlet serves the built `index.html`.
3. `index.html` loads `/assets/index-*.js` (`/assets/**` is `permitAll`).
4. `main.tsx` renders `<BrowserRouter><App/></BrowserRouter>`.
5. `App` starts with `checking = true` and runs its `useEffect` -> `getSession()`.
6. `getSession()` (`src/api.ts`) calls `fetch('/api/auth/me')`.
7. Spring Security: `/api/auth/me` requires authentication; with no session
   `HttpStatusEntryPoint` returns **401** (no redirect to a login page).
8. `getSession()` returns `null`; `App` sets `session = null`, `checking = false`.
9. `App` renders the unauthenticated `<Routes>`. The path `/login` matches
   `<Route path="/login">` -> `<Login/>`.
   - If the initial path was `/page1` or `/page2`, it matches `<Route path="*">` ->
     `<Navigate to="/login" replace/>`, which rewrites the URL to `/login` and renders `<Login/>`.

### 2. Login (login -> page1)

1. User submits the form -> `Login.handleSubmit(event)`.
2. `event.preventDefault()` stops a full-page form POST; then `login(username, password)` runs.
3. `api.login()` sends `POST /api/auth/login` with body `username=user&password=password`
   (`application/x-www-form-urlencoded`).
4. Dev: the request goes to Vite (`localhost:5173`) and is proxied to `localhost:8080`.
   Production: it is same-origin to `8080`.
5. Spring Security: `/api/auth/login` is `permitAll`; `UsernamePasswordAuthenticationFilter`
   handles it (`loginProcessingUrl`).
   - Success: `successHandler` returns **200**, the `Authentication` is stored in the
     `HttpSession`, and the response sets `Set-Cookie: JSESSIONID=...; HttpOnly`.
   - Failure: `failureHandler` returns **401**.
6. `api.login()` sees `response.ok`, so it calls `getSession()` -> `GET /api/auth/me`
   (the browser attaches `JSESSIONID` automatically, same origin).
7. Spring Security authenticates the session -> `AuthController.me(authentication)` returns
   `{"authenticated":true,"username":"user"}`.
8. `login()` resolves with the `Session`; `Login.handleSubmit` calls `onLogin(session)` ->
   `App.setSession(session)`.
9. `App` re-renders with a session and mounts the authenticated `<Routes>`. The current path
   `/login` matches neither `/page1` nor `/page2`, so it matches `<Route path="*">` ->
   `<Navigate to="/page1" replace/>`.
10. React Router replaces the URL with `/page1` (no server request). `Dashboard` renders the
    layout and its nested route renders `<Page1/>` inside `<Outlet/>`.

### 3. page1 -> page2 (and back)

1. Clicking the **Page 2** button calls `Dashboard`'s `onClick` -> `navigate('/page2')`.
2. React Router updates the URL to `/page2` with `history.pushState` and re-matches routes.
   No HTTP request is made.
3. `/page2` matches `<Route path="/page2">` -> `<Page2/>` inside `Dashboard`'s `<Outlet/>`.
   The header, nav and `<ApiTester/>` stay mounted; only the outlet content changes.
4. **Page 1** behaves the same through `navigate('/page1')`.

### 4. Refresh while on page1

1. Browser reloads: `GET /page1` with the `JSESSIONID` cookie.
2. Spring Security: `/page1` is `permitAll`, so `SpaController` forwards it to `/index.html`;
   the shell is served regardless of session state.
3. The app boots again: `main.tsx` -> `BrowserRouter` reads `window.location.pathname`
   (`/page1`) -> `App`.
4. `App.useEffect` -> `getSession()` -> `GET /api/auth/me` with the `JSESSIONID` cookie.
5. If the session is still valid, `App` gets the `Session` and renders the authenticated routes
   at the initial path `/page1` -> `Dashboard` + `<Page1/>`. **The page stays on Page 1.**
6. If the session is gone/expired, `/api/auth/me` returns 401 -> `session = null` ->
   unauthenticated routes -> `/page1` matches `*` -> `<Navigate to="/login" replace/>`.

### Logout

`Dashboard.handleLogout()` -> `api.logout()` -> `POST /api/auth/logout`. Spring Security's
logout filter invalidates the session, clears the cookie and returns 200. Then `onLogout()`
sets `session = null`, so `App` renders the unauthenticated routes and the current path
redirects to `/login`.

### API Test buttons

`ApiTester.run()` -> `api.callApi('/api/hello')` (or `POST /api/echo`). The request carries the
session cookie, Spring Security requires authentication, and `HelloWorldController` returns
JSON. The status and body are rendered in a `<pre>`.

### Dev vs production

| | Dev (`npm run dev`) | Production (`npm run build` + `bootRun`) |
| --- | --- | --- |
| SPA routes (`/login`, `/page1`, `/page2`) | Served by the Vite dev server (SPA fallback) | Served by `SpaController` -> `index.html` |
| `/api/**` | Proxied to `localhost:8080` | Same origin (`8080`) |
| Session cookie | Set on `localhost:5173`, forwarded by the proxy | Set on `localhost:8080` |

Because `/login`, `/page1` and `/page2` are `permitAll`, the server always returns the shell;
the real authorization boundary is every `/api/**` request except login. The client-side guard
in `App` only decides which view to show.

## Unauthenticated and failed-login flows

`permitAll` in `SecurityConfig` only lists the login endpoint and the static SPA shell. Every
other path falls through to `.anyRequest().authenticated()`, so all data endpoints stay
protected. The Spring Security filter chain runs before any controller.

### Where the real check happens

| Path | Rule | Without a session |
| --- | --- | --- |
| `POST /api/auth/login` | `permitAll` | Login is attempted |
| `/`, `/index.html`, `/assets/**`, `/favicon.svg` | `permitAll` | Static shell/JS, no data |
| `/login`, `/page1`, `/page2` | `permitAll` | SPA shell; the view is guarded in `App` |
| `/register` | `permitAll` | (no controller yet) |
| `GET /api/auth/me` | `authenticated` | **401** |
| `GET /api/hello`, `POST /api/echo` | `authenticated` | **401** |
| anything else | `authenticated` | **401** |

The shell has to be public: if `/page1` required a session, the browser could not load the
React app (and therefore the login form) at all. Those routes serve no data.

### A. Not logged in: open a page (e.g. `/page1`)

1. `GET /page1` -> `permitAll` -> `SpaController` forwards to `index.html` -> 200 (shell).
2. `App` -> `getSession()` -> `GET /api/auth/me`.
3. Filter chain: `SecurityContextHolderFilter` finds no context,
   `AnonymousAuthenticationFilter` marks the request anonymous, `AuthorizationFilter` denies
   it, and `ExceptionTranslationFilter` sees an anonymous authentication and calls the
   configured `AuthenticationEntryPoint`.
4. `HttpStatusEntryPoint` returns **401** with an empty body (not a 302). This is deliberate:
   a redirect would make `fetch` receive the HTML login page instead of an error status.
5. `getSession()` returns `null` -> `App` renders the unauthenticated routes -> `/page1`
   matches `*` -> `<Navigate to="/login" replace/>`.

### B. Not logged in: call a protected API directly

`GET /api/hello` or `GET /api/auth/me` -> same chain as above -> **401**.
`SecurityConfigTest.anonymousRequestIsRejected` asserts this. This is the real verification
boundary: the server refuses to run the controller without an authenticated session.

### C. Wrong username or password

1. `api.login()` -> `POST /api/auth/login`.
2. `UsernamePasswordAuthenticationFilter` builds a token and calls the `AuthenticationManager`
   -> `DaoAuthenticationProvider` -> `InMemoryUserDetailsManager` + `BCryptPasswordEncoder`.
3. Credentials do not match -> `BadCredentialsException` -> `failureHandler` -> **401**. No
   session is created and no `JSESSIONID` is set.
4. `api.login()` returns `null` -> `Login` sets the error message and stays on `/login`.

### D. Session expires while using the app

1. The SPA is not notified of expiry; it discovers it on the next API call.
2. That call returns 401. On the next load/refresh, `getSession()` turns it into a redirect to
   `/login`. The **API Test** panel only prints `FAILED 401`; it does not redirect by itself.
3. Either way the server keeps refusing the data request.

### E. Logout, then a protected call

`POST /api/auth/logout` invalidates the session and clears the cookie. The next
`/api/auth/me` or `/api/hello` returns **401** again.

### Why this is safe

- `permitAll` is a whitelist: only the login endpoint and the data-free shell/static assets are
  listed. `.anyRequest().authenticated()` is the default for everything else, including all
  future `/api/**` endpoints.
- Controllers only run after the filter chain authorizes the request, so `AuthController` and
  `HelloWorldController` cannot be reached without a session.
- The client-side guard in `App` is only for UX (which view to show). The server enforces the
  rule; removing the frontend guard would still leave every API returning 401.
- Known trade-off: CSRF is disabled. That is common for a JSON SPA during development but is
  weaker than using CSRF tokens; enable it before treating this as production.

## Source layout

```
src/
  main.tsx              BrowserRouter + render
  App.tsx               Session check and route table
  api.ts                fetch helpers (login, logout, getSession, callApi)
  blocklyLocale.ts      Shared zh-Hant locale setup for Blockly
  components/
    Login.tsx           Login form
    Dashboard.tsx       Header, Page 1/Page 2 navigation, <Outlet/>, logout
    ApiTester.tsx       Buttons that call the backend API
    page1/              Blockly maze game (Page 1)
      blocks.ts         Custom maze blocks, generators, toolbox
      logic.ts          Maze SVG rendering, player state, run/replay engine
      Page1.tsx         UI: workspace injection, run/reset handlers, layout
      page1.css         Page 1 styles
    page2/              Blockly turtle game, level 2 (Page 2)
      blocks.ts         Custom turtle blocks, generators, toolbox
      logic.ts          Canvas turtle runtime, answer drawing, answer check
      Page2.tsx         UI: workspace injection, run/reset handlers, layout
      page2.css         Page 2 styles
```

Each game page keeps custom blocks (`blocks.ts`), game logic (`logic.ts`) and the
React UI (`Page1.tsx`/`Page2.tsx`) in separate files.

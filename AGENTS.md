# AGENTS.md

## Layout
- Spring Boot backend at repo root (Java 21, Gradle 9.7.1 wrapper). Base package `com.hkmu.blockly`; entrypoint `BlocklyApplication.java`.
- `frontend/` is a **separate** React 19 + Vite + TS project (own `package-lock.json`). It is NOT a Gradle subproject — no `settings.gradle` include.

## Commands
Backend (use `.\gradlew.bat` on Windows, `./gradlew` otherwise):
- Run app: `.\gradlew.bat bootRun` (port 8080)
- All tests: `.\gradlew.bat test`
- Single test: `.\gradlew.bat test --tests "com.hkmu.blockly.BlocklyApplicationTests"`

Frontend (run from `frontend/`):
- Install: `npm install`
- Dev server: `npm run dev` (port 5173)
- Build: `npm run build` (runs `tsc -b` then `vite build`)
- Lint: `npm run lint` (oxlint, config in `frontend/.oxlintrc.json`)

## Gotchas
- `vite.config.ts` sets `build.outDir` to `../src/main/resources/static` and `emptyOutDir: true`. Never hand-edit that directory; it is wiped on every frontend build.
- Dev proxy only forwards `/api/*` to `localhost:8080`. Backend routes without an `/api` prefix (e.g. `/`) are NOT reachable through the Vite dev server.
- `BlocklyApplication` excludes `DataSourceAutoConfiguration`. Postgres/JPA are on the classpath but no datasource is configured (`application.properties` only sets the app name). Adding entities/repositories requires wiring a datasource first.
- `SecurityConfig`: session-based form login. Public paths are `POST /api/auth/login`, `/login`, `/register`, `/page1`, `/page2`, plus the static SPA shell (`/`, `/index.html`, `/assets/**`, `/favicon.svg`) so the React app can load. All other paths require an authenticated session and return 401 (no redirect). CSRF disabled; no HTTP Basic. In-memory demo user `user` / `password` (BCrypt). `loginPage("/login")` disables Spring's generated login page so the SPA owns `/login`.
- Auth/API surface: `POST /api/auth/login` (form params `username`/`password`), `POST /api/auth/logout`, `GET /api/auth/me`, `GET /api/hello`, `POST /api/echo`. `/` is no longer a controller mapping — the built SPA is served there.
- Frontend uses `react-router-dom` (`BrowserRouter` in `main.tsx`). Client routes: `/login`, `/page1`, `/page2`; anything else redirects. `App.tsx` gates on `GET /api/auth/me`; `Dashboard.tsx` is a layout with `<Outlet/>`; `src/api.ts` holds the fetch helpers.
- Deep-link refresh works via SPA fallback: Vite dev serves `index.html` automatically, and `SpaController` forwards `/login`, `/page1`, `/page2` to `/index.html`. Add any new client route to that controller or a refresh will 404.
- Spring Boot 4 moved MVC test annotations: use `org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc` / `@WebMvcTest`, not the old `org.springframework.boot.test.autoconfigure.web.servlet` package. `SecurityConfigTest` shows the session-login MockMvc pattern.
- Lombok is annotation-processor only (`compileOnly` + `annotationProcessor`); no runtime Lombok.
- No CI, no formatter, no pre-commit hooks. `HELP.md` is gitignored generated Spring Initializr output.

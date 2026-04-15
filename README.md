# Sunroom CRM — Vue Frontend

A full-featured customer relationship management application built with Vue 3, Vuetify 4, and Pinia. This is the Vue frontend for [Sunroom CRM](https://sunroomcrm.net), backed by a .NET 8 REST API with SQL Server.

## About Sunroom CRM

Sunroom CRM is a multi-frontend CRM platform designed to demonstrate the same business requirements implemented across multiple modern frameworks — all sharing a single .NET 8 REST API and SQL Server database. The project showcases how different frontend ecosystems approach the same real-world problems: authentication, CRUD operations, real-time data visualization, drag-and-drop workflows, role-based access control, and AI-powered features.

### The Full Stack

| Repository | Technology | Description |
|------------|------------|-------------|
| [sunroom-crm-dotnet](https://github.com/rvnminers-A-and-N/sunroom-crm-dotnet) | .NET 8, EF Core, SQL Server | Shared REST API with JWT auth, AI endpoints, and Docker support |
| [sunroom-crm-angular](https://github.com/rvnminers-A-and-N/sunroom-crm-angular) | Angular 21, Material, Vitest | Angular frontend with 100% test coverage |
| [sunroom-crm-react](https://github.com/rvnminers-A-and-N/sunroom-crm-react) | React 19, shadcn/ui, Vitest | React frontend with 100% test coverage |
| **sunroom-crm-vue** (this repo) | Vue 3, Vuetify 4, Vitest | Vue frontend with 100% test coverage |
| [sunroom-crm-blazor](https://github.com/rvnminers-A-and-N/sunroom-crm-blazor) | Blazor, .NET 8 | Blazor WebAssembly frontend |
| [sunroom-crm-laravel](https://github.com/rvnminers-A-and-N/sunroom-crm-laravel) | Laravel, PHP | Laravel full-stack implementation |

## Tech Stack

| Layer         | Technology                                          |
|---------------|-----------------------------------------------------|
| Framework     | Vue 3.5 with Composition API (`<script setup>`)    |
| UI            | Vuetify 4 (Material Design 3)                       |
| Charts        | Chart.js 4 via vue-chartjs                           |
| State         | Pinia 3                                              |
| Routing       | Vue Router 5 with navigation guards                 |
| Drag & Drop   | vuedraggable (Sortable.js)                           |
| HTTP          | Axios with JWT interceptors                          |
| Unit Tests    | Vitest 4 + Testing Library + MSW 2 + coverage-v8    |
| E2E Tests     | Playwright 1.59 (Chromium, Firefox, WebKit)          |
| CI/CD         | GitHub Actions                                       |
| Language      | TypeScript 6, Vite 8                                 |

## Features

- **Authentication** — JWT-based login and registration with Vue Router guards and Axios token interceptor
- **Contacts** — Full CRUD with search, tag filtering, pagination, and sorting
- **Companies** — Company management with associated contacts and deals
- **Deals** — List view and Kanban-style pipeline board with vuedraggable drag-and-drop between stages
- **Activities** — Activity log with timeline view linked to contacts and deals
- **Dashboard** — Overview with Chart.js visualizations for pipeline value, deals by stage, and recent activity
- **AI Features** — AI-powered natural language search, activity summarization, and deal insights
- **Admin Panel** — User management restricted to admin roles
- **Settings** — User profile editing and tag management
- **Responsive Layout** — Collapsible Vuetify navigation drawer with mobile hamburger menu

## Getting Started

### Prerequisites

- Node.js 24+ (LTS)
- npm 11+
- The [.NET API](https://github.com/rvnminers-A-and-N/sunroom-crm-dotnet) running on `http://localhost:5236`

### Setup

```bash
git clone https://github.com/rvnminers-A-and-N/sunroom-crm-vue.git
cd sunroom-crm-vue
npm install
npm run dev
```

The dev server runs at `http://localhost:5173` and expects the API at the URL defined in `.env`.

### Running the API

The .NET API can be started via Docker Compose from the `sunroom-crm-dotnet` repo:

```bash
cd ../sunroom-crm-dotnet
cp .env.example .env   # Set SA_PASSWORD
docker compose up -d
```

## Available Scripts

| Command                  | Description                              |
|--------------------------|------------------------------------------|
| `npm run dev`            | Start the dev server on port 5173        |
| `npm run build`          | Type-check and production build to `dist/` |
| `npm run preview`        | Preview the production build locally     |
| `npm run test:unit`      | Run unit tests in watch mode             |
| `npm run test:unit:run`  | Run unit tests once                      |
| `npm run test:coverage`  | Run unit tests with coverage report      |
| `npm run test:e2e`       | Run Playwright end-to-end tests          |
| `npm run lint`           | Lint with oxlint and eslint              |
| `npm run format`         | Format code with Prettier                |

## Testing

### Unit Tests

368 tests across 44 test suites at **100% code coverage** (statements, branches, functions, and lines). Coverage thresholds are enforced in `vitest.config.ts` — the test run fails if any metric drops below 100%.

Tests use [Vitest](https://vitest.dev/) with jsdom, [Testing Library](https://testing-library.com/docs/vue-testing-library/intro/) for component rendering, [user-event](https://testing-library.com/docs/user-event/intro/) for interaction simulation, and [MSW](https://mswjs.io/) (Mock Service Worker) for API mocking.

```bash
npm run test:coverage
```

### End-to-End Tests

29 Playwright tests across 8 feature areas, run against Chromium, Firefox, and WebKit:

- **Authentication** — unauthenticated redirect, login form, login success, invalid credentials, and registration link
- **Dashboard** — stat cards, pipeline chart, and recent activity list
- **Contacts** — sidebar navigation, data table, create dialog, form submission, and detail page
- **Companies** — list display, create dialog, and detail page navigation
- **Deals** — sidebar navigation, data table, create dialog, and pipeline view with stage columns
- **Activities** — list page and create dialog
- **Navigation & Layout** — sidebar links, section routing, settings page, AI panel, and unknown route redirect
- **Admin** — non-admin redirect and admin user management access

All API calls are intercepted via Playwright's `page.route()` so the mocked E2E suite runs without a backend.

```bash
npx playwright install --with-deps   # Install browsers (first time)
npm run test:e2e                      # Run tests across all browsers
```

## CI/CD Pipeline

GitHub Actions runs three jobs on every push and pull request to `main`:

**Build, Lint, and Test** — Runs oxlint + eslint, vue-tsc type checking, Vite production build, and the full Vitest suite with 100% coverage enforcement. Uploads coverage report as a build artifact.

**E2E Tests (mocked)** — Installs all three Playwright browsers, builds the app, and runs all 29 E2E tests with API calls intercepted via `page.route()`.

**E2E Integration (Docker)** — Clones the .NET API repo, spins up SQL Server and the API via Docker Compose, then runs the full Playwright suite against the live stack. Gated behind the `RUN_E2E` repository variable.

## Architecture

```
src/
  core/                    # API client and domain models
    api/                   # Axios client with JWT interceptor
    models/                # TypeScript interfaces for all domain entities
  features/                # Feature pages and dialogs
    activities/            # Activity log and timeline
    admin/                 # User management (admin-only)
    ai/                    # AI search, summaries, and deal insights
    auth/                  # Login and registration forms
    companies/             # Company CRUD and detail views
    contacts/              # Contact CRUD, search, tag sync, and detail views
    dashboard/             # Charts and recent activity overview
    deals/                 # Deal CRUD, list view, and pipeline Kanban board
    settings/              # User profile and tag management
  layouts/                 # App shell with responsive Vuetify navigation drawer
  plugins/                 # Vue plugins (Vuetify theme, Router configuration)
  shared/                  # Reusable components, utilities, and styles
    components/            # Shared Vue components (PageHeader, ActivityIcon, etc.)
    utils/                 # Formatting and helper utilities
    styles/                # Global SCSS styles and variables
  stores/                  # Pinia stores for all domain entities
  test/                    # Test infrastructure (MSW server, handlers, fixtures)
e2e/                       # Playwright E2E test specs and fixtures
.github/workflows/         # CI pipeline configuration
```

### Key Patterns

- **Composition API** — All components use `<script setup>` with reactive refs, computed properties, and composable functions
- **Pinia Stores** — Centralized state management with one store per domain (auth, contacts, companies, deals, activities, dashboard, ai, admin, tags, settings)
- **Vuetify 4** — Material Design 3 component library providing data tables, dialogs, forms, navigation drawers, and responsive layout primitives
- **Axios Interceptors** — Request interceptor injects the Bearer token from `localStorage`; response interceptor handles 401 by clearing auth and redirecting to login
- **Vue Router Guards** — `beforeEach` guard redirects unauthenticated users to login and restricts admin routes by role
- **Lazy Loading** — Every feature route is lazy-loaded via dynamic `import()` for optimized bundle size
- **vuedraggable** — The deals pipeline uses Sortable.js bindings for Kanban-style stage transitions with API persistence
- **MSW** — Unit tests mock the API layer through MSW request handlers rather than mocking Axios directly, keeping tests close to real network behavior
- **Testing Library** — Component tests render through Testing Library for user-centric assertions rather than implementation-detail testing
- **Path Aliases** — `@/` alias maps to `src/` for clean imports across the codebase

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

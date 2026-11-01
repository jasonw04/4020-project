Xiaozhan Liu  - 220803748
Jason Wu - 219977438 
Yuki Ni - 223279607

University Degree Progress Assistant (UDPA)

## Frontend

A responsive HTML, CSS, and JavaScript frontend with no build step or package dependencies. Requires Node.js 20 or later.

```sh
npm start
```

Open http://localhost:3000. Run `npm test` for the degree-audit and planning-rule checks.

### Included

- Overview with degree progress and suggested courses.
- Requirement breakdown and completed coursework.
- Searchable course explorer with area, availability, and prerequisite filters.
- Semester planner with a 15-credit cap, prerequisite validation, removal, browser saving, and text export.
- Confirmed, simulated enrolment and waitlist actions.
- Preferences-based planning assistant. The demo uses deterministic rules, not an LLM.
- Responsive layouts, keyboard navigation, accessible labels, status announcements, and confirmation dialogs.

### Demonstration data

All records in `public/data.js` are fictional fixtures, including program requirements, course prerequisites, titles, timetables, and seat counts. They are not official York requirements and are not extracted from DORIS. The demo student's completed credits total 66 of 120. No real enrolment occurs. Plans and action statuses persist in local storage under `udpa-demo-v1`; clear that key in browser developer tools to reset the demo. Seat changes are session-only; the backend must own authoritative capacity.

Google Fonts improves typography when online; system sans-serif fonts work offline.

### Backend handoff

See [API contract](docs/API.md). Add this before the module script in `public/index.html` to use real endpoints:

```html
<script>window.UDPA_CONFIG = { mode: 'api', baseUrl: '/api' };</script>
```

Demo mode is the default. API mode loads student information from the server and never silently substitutes demo data when a request fails. The included static server does not implement `/api`; mount the frontend in the Express backend or configure an API URL and appropriate CORS handling. All secrets and AI-provider calls belong on the backend.

### Project submission notes

Confirm assessment-specific written AI permission and disclose assistance according to the course instructions. This frontend was generated with Codex assistance; the team must review, understand, adapt, and validate the implementation and report actual evaluation results. The fictional fixtures and browser-only demo are not evidence of completed DORIS preprocessing or backend/AI integration.

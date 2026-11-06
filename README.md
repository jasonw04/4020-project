Xiaozhan Liu  - 220803748
Jason Wu - 219977438 
Yuki Ni - 223279607

University Degree Progress Assistant (UDPA)

## Frontend

A responsive HTML, CSS, and JavaScript frontend with no build step. Requires Node.js 20 or later.

```bash
npm install
npm start
```

Open `http://localhost:3000`.

Run:

```bash
npm test
```

for the degree-audit and planning-rule checks.

### Included

- Overview with degree progress and suggested courses.
- Requirement breakdown and completed coursework.
- Searchable course explorer with area, availability, and prerequisite filters.
- Semester planner with a 15-credit cap, prerequisite validation, removal, saving, and text export.
- Enrolment and waitlist actions connected to the backend API.
- Preferences-based planning assistant connected through a backend planning endpoint.
- Responsive layouts, keyboard navigation, accessible labels, status announcements, and confirmation dialogs.

### Demonstration data

The current records in `public/data.js` are fictional fixtures, including the student profile, program requirements, course prerequisites, titles, timetables, and seat counts. They are not official York University requirements and are not currently extracted from DORIS.

The demo student's completed credits total 66 of 120.

The application now runs in API mode and retrieves workspace information through the Express backend. Current data is still temporary demonstration data and will later be replaced or supplemented with processed dataset records and program requirements.

Plan and enrolment data are currently stored in server memory and will reset when the server restarts. Persistent database storage is planned for a later development stage.

### Backend

The project now uses Node.js with Express to provide REST API endpoints for the frontend.

Current endpoints include:

```text
GET  /api/workspace
GET  /api/student
PUT  /api/plans
POST /api/enrolments
POST /api/assistant/plans
```

`GET /api/workspace` supplies the student profile, completed coursework, degree requirements, course catalogue, saved semester plan, and enrolment statuses.

`PUT /api/plans` saves the current semester plan.

`POST /api/enrolments` records simulated enrolment and waitlist actions.

`POST /api/assistant/plans` provides course-plan recommendations using the current deterministic planning rules.

The frontend is configured in `public/index.html` with:

```html
<script>
  window.UDPA_CONFIG = {
    mode: "api",
    baseUrl: "/api"
  };
</script>
```

The next development stages include persistent database storage, real dataset integration, program-checklist integration, and an LLM-based agentic planning component.

All secrets and AI-provider calls will remain on the backend.

### Project submission notes

Confirm assessment-specific written AI permission and disclose assistance according to the course instructions.

The frontend was generated with Codex assistance and has been reviewed and extended by the team. 

The team is responsible for understanding, testing, validating, and documenting all submitted functionality. The current fictional fixtures are not evidence of completed DORIS preprocessing, database integration, or final AI-agent evaluation.



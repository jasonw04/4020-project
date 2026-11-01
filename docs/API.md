# UDPA frontend API contract

The client adapter is `public/api.js`. Endpoints below are proposed contracts for backend implementation, not existing services. All JSON responses must use the documented shapes. Serve frontend and API from the same origin where possible. The backend must authenticate the student, authorize all access, validate requests, and enforce rules independently of the frontend.

## GET /api/workspace

Return an object with:

- `student`: `{ id, name, program, degree, year, target }`.
- `completed`: array of `{ code, title, credits, area, term }`.
- `requirements`: array of `{ id, label, target, description }`.
- `courses`: array of `{ code, title, credits, area, prereqs: string[], seats, capacity, term, days, time, interest, description }`.
- `plan`: `{ term, codes: string[] }`, or null.
- `enrolments`: object mapping course codes to `"enrolled"` or `"waitlisted"`.

`public/data.js` provides full example records. `area` must reference a requirement ID. Credits and seats are numbers; course codes are unique identifiers. The frontend expects a curated, finite catalogue; add server pagination if the full DORIS catalogue is exposed. Semester time strings are display-only; actual conflict detection needs structured meeting intervals on the server.

## PUT /api/plans

Request: `{ "term": "Winter 2027", "codes": ["ITEC 3020"] }`.

Return saved plan JSON or HTTP 204. Reject duplicates, completed courses, missing prerequisites, unavailable terms, or credit overload. A full course can be planned for a waitlist.

## POST /api/enrolments

Request: `{ "code": "ITEC 3020", "action": "enrolled" }` or action `"waitlisted"`.

Return JSON or HTTP 204 only after the action is successfully recorded. Enforce current capacity atomically and prevent duplicate actions. Return HTTP 409 if capacity or eligibility changed. The UI requests confirmation before sending; no action should occur merely from generating a plan. For production integration return and refresh authoritative seats and enrolment status after each action; current UI updates its session view after success.

## POST /api/assistant/plans

Request: `{ "term": "Winter 2027", "interest": "data", "maxCredits": 12, "openOnly": true }`.

`interest` is `balanced`, `web`, `data`, or `software`. Return `{ "codes": ["ITEC 3220", "MATH 2030"] }`. The frontend validates returned codes, prerequisites, term, and credit limit before allowing application. The backend must enforce all preferences and validate any AI-generated recommendation against its own rules. Keep API keys on the server. Suggestions must never execute enrolment actions.

## Errors and boundaries

Use appropriate non-2xx status codes and `{ "message": "A useful explanation" }`. Requests time out after 15 seconds. No real authentication, withdrawal, multi-semester graduation optimization, timetable conflict algorithm, or AI provider is included in this frontend. Simulated enrolment is clearly labelled. The app is a project prototype, not an institutional registration system.

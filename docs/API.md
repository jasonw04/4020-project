# UDPA API Contract

The UDPA frontend communicates with the backend through `public/api.js`.

The API is implemented by the Express server in `server.mjs` and is used by both the local application and the AWS Elastic Beanstalk deployment.

The current demonstration scenario is based on DORIS Student 150 and plans for:

```text
2018-19 Semester 1
```

The backend is responsible for academic validation, AI integration, persistence, and simulated enrolment logic.

---

## GET `/api/workspace`

Returns the complete workspace required by the frontend.

### Response

```json
{
  "student": {
    "id": "150",
    "name": "Student 150",
    "program": "Computer Science and Technology",
    "degree": "Undergraduate",
    "year": 3,
    "target": 140
  },
  "completed": [],
  "requirements": [],
  "courses": [],
  "plan": {
    "term": "2018-19 Semester 1",
    "codes": []
  },
  "enrolments": {},
  "source": {}
}
```

### `student`

Shape:

```text
{
  id,
  name,
  program,
  degree,
  year,
  target
}
```

The current demonstration student is derived from the DORIS dataset.

---

### `completed`

Array of completed courses:

```text
{
  code,
  title,
  credits,
  area,
  term
}
```

Only successfully passed courses at or before the historical snapshot are counted as completed.

For this project:

- score >= 60 → passed;
- score < 60 → failed;
- missing score → unknown and not counted as completed credit.

---

### `requirements`

Array of degree requirement areas:

```text
{
  id,
  label,
  target
}
```

Current requirement areas include:

```text
major_required
school_compulsory
restricted
general_elective
other_electives
```

The current 140-credit model is simulated from comparable DORIS cohort patterns and is not an official university degree audit.

---

### `courses`

Returns the curated planning catalogue for the current scenario.

Shape:

```text
{
  code,
  title,
  description,
  credits,
  term,
  days,
  time,
  area,
  seats,
  capacity,
  prereqs
}
```

The current candidate pool is derived from comparable Computer Science and Technology students in the same DORIS cohort.

Historical course offerings are DORIS-backed.

Operational fields including capacity, remaining seats, days, and times are simulated by UDPA.

---

### `plan`

Current saved semester plan:

```json
{
  "term": "2018-19 Semester 1",
  "codes": ["4580", "4736"]
}
```

The plan is stored in SQLite.

---

### `enrolments`

Object mapping course IDs to recorded simulated actions.

Example:

```json
{
  "4580": "enrolled",
  "4603": "waitlisted"
}
```

No real university enrolment occurs.

---

## PUT `/api/plans`

Saves a semester plan.

### Request

```json
{
  "term": "2018-19 Semester 1",
  "codes": ["4580", "4736", "4593"]
}
```

The backend stores the selected plan in SQLite.

Plan generation and validation remain separate from saving. The frontend does not automatically enrol a student when a plan is saved.

---

## POST `/api/enrolments`

Records a confirmed simulated enrolment or waitlist action.

### Request

```json
{
  "code": "4580",
  "action": "enrolled"
}
```

or:

```json
{
  "code": "4603",
  "action": "waitlisted"
}
```

Supported actions are:

```text
enrolled
waitlisted
```

The action is stored in SQLite and persists across page refreshes and server restarts.

The current project performs simulated enrolment only.

---

# AI Planning API

## POST `/api/assistant/plans`

Requests an AI-generated semester plan.

### Request

```json
{
  "term": "2018-19 Semester 1",
  "interest": "balanced",
  "maxCredits": 12,
  "openOnly": true
}
```

Supported interest values include:

```text
balanced
web
data
software
```

### Response

The response includes AI-selected course codes together with deterministic validation information.

The core recommendation shape is:

```json
{
  "codes": ["4580", "4736", "4583"]
}
```

The server validates the recommendation using `validateDorisPlan()` before returning an accepted plan.

Validation includes:

- course exists in the curated planning pool;
- no duplicate recommendations;
- requested maximum credits are respected;
- simulated-hard prerequisite rules are satisfied;
- seat availability is respected when `openOnly` is enabled.

The AI does not determine whether its own answer is valid.

Deterministic backend logic performs final validation.

---

## POST `/api/assistant/enrolment-actions`

Requests AI-proposed enrolment or waitlist actions for courses in the current semester plan.

The AI may propose:

```text
enrolled
waitlisted
```

Before returning the recommendation, the backend verifies each proposed action against the current simulated course availability.

Examples:

```text
course has remaining seats
→ enrolled
```

```text
course is full
→ waitlisted
```

Previously recorded enrolment actions are excluded from new recommendations.

Generating enrolment actions does not itself modify the database.

The user must explicitly approve the proposed actions before they are saved.

---

# Agent Tool Endpoints

The backend currently exposes development/testing routes used to inspect agent data.

These routes are useful during development and evaluation but may be removed from the final production-style version.

---

## GET `/api/tools/profile`

Returns the current DORIS-backed student profile.

Example information:

```text
Student ID: 150
Education: Undergraduate
Major: Computer Science and Technology
Enrollment year: 2016
Snapshot: 2017-18 Semester 3
```

---

## GET `/api/tools/progress`

Returns the current degree-progress calculation.

Current demonstration values:

```text
Completed credits: 77.5
Target credits: 140
Remaining credits: 62.5
```

The response also contains progress by requirement area.

---

## GET `/api/tools/eligible`

Returns the curated eligible planning-course pool for the current scenario.

The current course pool is based on:

- same major;
- same enrollment year;
- historical selection patterns;
- remaining requirement areas;
- prerequisite eligibility;
- current planning term.

Peer evidence may also be included for each candidate.

---

## GET `/api/tools/availability/:code`

Returns course availability for a specific course.

Example:

```json
{
  "code": "4580",
  "title": "Data Structure and Algorithm (A)",
  "term": "2018-19 Semester 1",
  "seats": 15,
  "capacity": 40,
  "available": true,
  "waitlist": false
}
```

Course offering existence is DORIS-backed.

Capacity and remaining-seat values are UDPA-simulated.

---

# Agent Architecture

The planning agent does not receive unrestricted access to the SQLite database.

Instead, it uses controlled tools including:

```text
getStudentProfile
getDegreeProgress
getEligibleCourses
getCourseAvailability
```

This creates the following workflow:

```text
Frontend request
      ↓
Express API
      ↓
Planning agent
      ↓
Controlled agent tools
      ↓
DORIS / SQLite data
      ↓
AI recommendation
      ↓
Deterministic validation
      ↓
Frontend response
```

This separation reduces the risk of allowing model output to directly control academic or enrolment decisions.

---

# Data Sources

## DORIS-backed

The API uses DORIS-derived data for:

- student information;
- course information;
- historical course selections;
- historical scores;
- historical offerings;
- course types;
- prerequisite text;
- peer selection patterns.

---

## UDPA-simulated

The API simulates operational information that is not available in DORIS, including:

- capacity;
- remaining seats;
- meeting days;
- meeting times;
- hard prerequisite enforcement;
- degree requirement credit targets.

These values are used only for the academic project prototype.

---

# Persistence

The current application uses SQLite.

The following information is persisted:

- saved semester plans;
- approved simulated enrolment actions;
- DORIS imported data;
- derived course offerings;
- derived prerequisite rules;
- simulated degree requirement model;
- demonstration scenario configuration.

The local database file is:

```text
udpa.db
```

It is excluded from Git because it is generated locally.

---

# Validation and Evaluation

AI recommendations are evaluated independently using deterministic checks.

The frozen evaluation run contains:

```text
10 AI planning scenarios
37 total recommendations
```

Results:

| Metric | Result |
|---|---:|
| Valid Plan Rate | 100.0% |
| Credit Limit Compliance | 100.0% |
| Eligibility Compliance | 100.0% |
| Open-Seat Compliance | 100.0% |
| Prerequisite Compliance | 100.0% |
| Historical Selection Overlap | 27.0% |
| Passed Future-Course Overlap | 18.9% |

Evaluation artifacts:

```text
evaluate-batch.mjs
evaluation-results.json
evaluation-results.csv
docs/udpa_evaluation_metrics.png
```

Historical overlap measures recommendation relevance and should not be interpreted as prediction accuracy.

---

# Error Handling

The frontend expects API failures to return an appropriate non-success HTTP status and a useful JSON message where possible.

Example:

```json
{
  "message": "Unable to generate a valid plan."
}
```

The backend should reject invalid or unsupported requests rather than silently substituting fictional frontend data.

---

# Security

The OpenAI API key is stored only on the backend through:

```text
OPENAI_API_KEY
```

The local development key is loaded from `.env`.

The AWS deployment uses an Elastic Beanstalk environment property.

Secrets must never be stored in frontend JavaScript or committed to Git.

The following files should remain excluded from source control:

```text
.env
udpa.db
node_modules/
temporary AWS deployment bundles
```

---

# Project Boundaries

UDPA is a university project prototype.

The current API does not provide:

- real institutional authentication;
- real York University enrolment;
- official York University degree auditing;
- withdrawal functionality;
- production payment or identity systems;
- guaranteed production-grade database durability;
- authoritative academic advising.

All enrolment actions are simulated.

The system is intended to demonstrate an agentic AI workflow combining historical academic data, deterministic validation, persistence, and cloud deployment.
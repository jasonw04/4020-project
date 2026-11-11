# University Degree Progress Assistant (UDPA)

**ITEC 4020 – Fall 2026**

**Team Members**

- Xiaozhan Liu – 220803748
- Jason Wu – 219977438
- Yuki Ni – 223279607

## Overview

The **University Degree Progress Assistant (UDPA)** is an AI-assisted academic planning system that helps a university student review degree progress, explore eligible courses, build a semester plan, and review simulated enrolment or waitlist actions.

The project integrates:

- a responsive HTML/CSS/JavaScript frontend;
- a Node.js and Express backend;
- a SQLite database;
- the DORIS educational dataset;
- an AI planning agent using tool/function calling;
- deterministic validation of AI-generated plans;
- AWS Elastic Beanstalk deployment.

The system is designed so that the AI proposes plans, while deterministic application logic verifies academic and operational constraints before a recommendation is accepted.

---

## Current Demonstration Scenario

The current demonstration uses an anonymized DORIS student:

- **Student ID:** 150
- **Education level:** Undergraduate
- **Major:** Computer Science and Technology
- **Enrollment year:** 2016
- **Historical snapshot:** End of 2017-18 Semester 3
- **Planning term:** 2018-19 Semester 1

At the snapshot:

- **77.5 credits completed**
- **140-credit simulated degree target**
- **62.5 credits remaining**

Future course selections after the snapshot are excluded from the planning agent and are used separately for historical evaluation.

---

## Technology Stack

### Frontend

- HTML
- CSS
- Vanilla JavaScript

The frontend includes:

- Overview
- Degree Requirements
- Course Explorer
- Semester Planner
- Planning Assistant

### Backend

- Node.js 22
- Express
- SQLite
- `better-sqlite3`

### AI

The planning assistant uses an OpenAI model through backend tool/function calling.

The agent can access controlled tools for:

- student profile information;
- degree progress;
- eligible planning courses;
- course availability.

AI-generated plans are passed through deterministic validation before being returned to the user.

### Deployment

The application is deployed using **AWS Elastic Beanstalk** on:

- Node.js 22
- Amazon Linux 2023
- Single EC2 instance
- nginx proxy

The deployment includes the frontend, Express backend, SQLite database, DORIS-derived data, and AI integration.

---

## DORIS Dataset

The project uses the DORIS dataset as its primary academic data source.

Imported source files include:

- `StudentInformationTable.xlsx`
- `CourseInformationTable.xlsx`
- `CourseSelectionTable.xlsx`

The local database contains approximately:

- **4,568 students**
- **5,591 courses**
- **208,941 imported course-selection records**

Eight source course-selection records with missing required identifiers were skipped during import.

### Course Completion Rule

For this project:

- score **60 or above** = passed / credit earned;
- score **below 60** = failed;
- missing score = unknown and not counted as completed credit.

Repeated courses count toward completed credit once after a successful pass.

---

## Real vs. Simulated Data

The project intentionally separates historical DORIS data from operational values that are not available in the dataset.

### DORIS-backed data

The following are derived from the DORIS dataset:

- students;
- majors;
- historical course selections;
- historical scores;
- course information;
- course types;
- historical course offerings;
- course prerequisite text;
- peer course-selection patterns.

### UDPA-simulated data

DORIS does not provide all information required for a live planning and enrolment system.

The following values are therefore simulated:

- course capacities;
- remaining seats;
- meeting days;
- meeting times;
- hard prerequisite enforcement;
- degree requirement credit targets.

Simulated values are deterministic where appropriate so that repeated system runs remain consistent.

---

## Degree Requirement Model

A simulated **140-credit degree model** was derived from comparable Computer Science and Technology students in the DORIS cohort.

The current requirement model is:

| Requirement Area | Target Credits |
|---|---:|
| Required major | 60 |
| School-wide compulsory | 24 |
| Restricted | 15 |
| General elective | 15 |
| Other electives | 26 |
| **Total** | **140** |

These targets are not presented as official university degree requirements. They are a project model derived from historical DORIS cohort patterns.

---

## Prerequisite Model

DORIS contains natural-language prerequisite information but does not provide a complete machine-readable hard-prerequisite graph.

UDPA therefore performs conservative prerequisite extraction.

Only high-confidence prerequisite relationships are converted into simulated hard rules.

The current database contains **218 high-confidence prerequisite relationships** derived from DORIS prerequisite text.

Each derived relationship records:

- target course;
- required course;
- original DORIS prerequisite text;
- derivation method;
- source.

Ambiguous prerequisite text remains advisory rather than being enforced as a hard restriction.

---

## Course Recommendation Logic

For the current Student 150 scenario, planning candidates are derived from comparable students who:

- share the same major;
- entered in the same enrollment year;
- selected courses during the target planning semester.

Courses are ranked using information including:

- remaining degree requirement gaps;
- peer selection frequency;
- course availability;
- prerequisite eligibility;
- previous course completion.

The current curated planning pool contains approximately **27 relevant candidate courses** for the demonstration scenario.

---

## AI Planning Workflow

The planning process follows this general sequence:

1. User selects planning preferences.
2. The AI agent retrieves degree progress.
3. The agent retrieves eligible courses.
4. The agent checks course availability.
5. The agent proposes a set of course codes.
6. The backend validates the proposed plan.
7. Invalid recommendations are rejected.
8. Valid recommendations are shown to the user.
9. The user may choose whether to use the proposed plan.

The AI does not directly control authoritative academic validation.

---

## Plan Validation

Generated plans are checked for:

- valid course identifiers;
- course eligibility;
- duplicate recommendations;
- credit-limit compliance;
- simulated-hard prerequisites;
- seat availability when `openOnly` is enabled.

The semester planner and enrolment workflow therefore use deterministic application rules in addition to AI reasoning.

---

## Enrolment Workflow

After selecting a plan, the user may request proposed enrolment actions.

The AI can recommend:

- `enrolled`
- `waitlisted`

The backend validates the recommendation against simulated course availability before the user can approve it.

Approved actions are stored in SQLite and persist between page refreshes and server restarts.

No real university enrolment occurs.

---

## Running the Project Locally

### Requirements

- Node.js 22
- npm
- OpenAI API key

Install dependencies:

```sh
npm install
```

On Windows PowerShell, if script execution blocks `npm.ps1`, use:

```powershell
npm.cmd install
```

Create a local `.env` file:

```text
OPENAI_API_KEY=your_api_key_here
```

The `.env` file must not be committed to GitHub.

A populated `udpa.db` database is also required for the current demonstration scenario.

Start the application:

```sh
npm start
```

or on Windows:

```powershell
npm.cmd start
```

Then open:

```text
http://localhost:3000
```

---

## Database Setup

The repository includes scripts used to rebuild the DORIS-backed database, including:

- `import-doris.mjs`
- `import-doris-courses.mjs`
- `import-course-selections.mjs`
- `import-prerequisite-rules.mjs`
- `setup-demo-scenario.mjs`
- `setup-course-offerings.mjs`
- `setup-degree-model.mjs`

The generated `udpa.db` file is intentionally excluded from Git.

---

## AWS Deployment

The application has been successfully deployed to AWS Elastic Beanstalk.

The deployment verifies an end-to-end cloud workflow:

```text
Browser
→ AWS-hosted frontend
→ Express backend
→ SQLite / DORIS data
→ OpenAI planning agent
→ deterministic validation
→ enrolment action
→ SQLite persistence
```

The current Elastic Beanstalk environment uses HTTP for the course demonstration. HTTPS and production-grade persistent database infrastructure are outside the current project scope.

---

## Evaluation

UDPA was evaluated using a frozen test run containing:

- **10 AI planning scenarios**
- **37 total course recommendations**

The test scenarios varied:

- planning interest;
- requested credit maximum;
- course-load preference.

### Frozen Evaluation Metrics

| Metric | Result |
|---|---:|
| Valid Plan Rate | **100.0%** |
| Credit Limit Compliance | **100.0%** |
| Eligibility Compliance | **100.0%** |
| Open-Seat Compliance | **100.0%** |
| Prerequisite Compliance | **100.0%** |
| Historical Selection Overlap | **27.0%** |
| Passed Future-Course Overlap | **18.9%** |

The first five metrics measure deterministic constraint correctness.

The final two metrics measure historical recommendation relevance and should **not** be interpreted as prediction accuracy.

Historical overlap compares AI recommendations with Student 150's hidden DORIS selections from the following semester.

Because multiple valid academic plans may exist, an AI recommendation does not need to reproduce the student's exact historical choices to be considered valid.

Evaluation artifacts are stored in:

- `evaluate-batch.mjs`
- `evaluation-results.json`
- `evaluation-results.csv`
- `docs/udpa_evaluation_metrics.png`

---

## External Testing

Ten external test cases are provided in:

```text
external-test-cases.md
```

Another group can use these cases to test the Planning Assistant through the user interface and record:

- recommended courses;
- total credits;
- credit-limit compliance;
- course availability;
- unexpected system behavior.

AI recommendations may vary between runs. External testing therefore focuses primarily on constraint compliance rather than reproduction of an exact course list.

---

## Important Limitations

UDPA is an academic prototype.

It does not:

- access an official university student information system;
- perform real course enrolment;
- use official York University degree requirements;
- provide authoritative academic advising;
- guarantee future course availability;
- treat historical student behavior as an optimal academic plan.

Operational fields and degree rules that are absent from DORIS are transparently simulated for the project.

---

## Security

Secrets such as the OpenAI API key remain on the backend and must not be committed to GitHub.

The following should remain excluded from Git:

- `.env`
- `udpa.db`
- `node_modules/`
- temporary deployment bundles

---

## AI Assistance Disclosure

AI tools were used during development for activities including debugging, architecture discussion, documentation, and project refinement.

The development team is responsible for reviewing, understanding, testing, validating, and presenting the final implementation.

The project evaluation uses recorded system outputs and deterministic validation rather than treating AI-generated claims as evidence of correctness.
import Database from "better-sqlite3";

const db = new Database("udpa.db");

// Create tables if they do not already exist
db.exec(`
  CREATE TABLE IF NOT EXISTS plans (
    id INTEGER PRIMARY KEY,
    term TEXT NOT NULL,
    codes TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS enrolments (
    course_code TEXT PRIMARY KEY,
    action TEXT NOT NULL
  );
`);

export function getPlan() {
  const row = db.prepare("SELECT * FROM plans WHERE id = 1").get();

  if (!row) {
    return {
      term: "2018-19 Semester 1",
      codes: []
    };
  }

  return {
    term: row.term,
    codes: JSON.parse(row.codes)
  };
}

export function savePlan(plan) {
  db.prepare(`
    INSERT INTO plans (id, term, codes)
    VALUES (1, ?, ?)
    ON CONFLICT(id)
    DO UPDATE SET
      term = excluded.term,
      codes = excluded.codes
  `).run(plan.term, JSON.stringify(plan.codes));
}

export function getEnrolments() {
  const rows = db.prepare("SELECT * FROM enrolments").all();

  const result = {};

  for (const row of rows) {
    result[row.course_code] = row.action;
  }

  return result;
}

export function saveEnrolment(code, action) {
  db.prepare(`
    INSERT INTO enrolments (course_code, action)
    VALUES (?, ?)
    ON CONFLICT(course_code)
    DO UPDATE SET action = excluded.action
  `).run(code, action);
}
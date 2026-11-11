import Database from "better-sqlite3";

const db = new Database("udpa.db");

db.exec(`
  CREATE TABLE IF NOT EXISTS student_scenarios (
    scenario_id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL,

    cutoff_academic_year TEXT NOT NULL,
    cutoff_semester INTEGER NOT NULL,

    description TEXT,
    source TEXT NOT NULL,

    FOREIGN KEY (student_id)
      REFERENCES students(student_id)
  );
`);

const insertScenario = db.prepare(`
  INSERT INTO student_scenarios (
    scenario_id,
    student_id,
    cutoff_academic_year,
    cutoff_semester,
    description,
    source
  )
  VALUES (?, ?, ?, ?, ?, ?)

  ON CONFLICT(scenario_id)
  DO UPDATE SET
    student_id = excluded.student_id,
    cutoff_academic_year = excluded.cutoff_academic_year,
    cutoff_semester = excluded.cutoff_semester,
    description = excluded.description,
    source = excluded.source
`);

insertScenario.run(
  "default",
  "150",
  "17-18",
  3,
  "Computer Science and Technology undergraduate historical planning snapshot",
  "DORIS"
);

console.log("\nSaved UDPA demo scenario:");

console.table(
  db.prepare(`
    SELECT
      sc.scenario_id,
      sc.student_id,
      s.enrollment_year,
      s.education,
      s.major,
      sc.cutoff_academic_year,
      sc.cutoff_semester,
      sc.source

    FROM student_scenarios sc

    JOIN students s
      ON s.student_id = sc.student_id

    WHERE sc.scenario_id = 'default'
  `).all()
);

db.close();
import Database from "better-sqlite3";

const db = new Database("udpa.db");

db.exec(`
  CREATE TABLE IF NOT EXISTS degree_requirements (
    scenario_id TEXT NOT NULL,
    requirement_id TEXT NOT NULL,
    label TEXT NOT NULL,
    target_credits REAL NOT NULL,

    source TEXT NOT NULL,
    derivation_note TEXT,

    PRIMARY KEY (
      scenario_id,
      requirement_id
    )
  );
`);

const requirements = [
  {
    id: "major_required",
    label: "Required major",
    target: 60,
    note: "Rounded from DORIS CS peer average of 61.0 credits."
  },

  {
    id: "school_compulsory",
    label: "School-wide compulsory",
    target: 24,
    note: "Rounded from DORIS CS peer average of 24.1 credits."
  },

  {
    id: "restricted",
    label: "Restricted",
    target: 15,
    note: "Rounded from DORIS CS peer average of 14.9 credits."
  },

  {
    id: "general_elective",
    label: "General elective",
    target: 15,
    note: "Rounded from DORIS CS peer average of 15.4 credits."
  },

  {
    id: "other_electives",
    label: "Other electives",
    target: 26,
    note:
      "Combines DORIS optional, whole-school optional, and elective categories; peer average approximately 26.3 credits."
  }
];

const insert = db.prepare(`
  INSERT INTO degree_requirements (
    scenario_id,
    requirement_id,
    label,
    target_credits,
    source,
    derivation_note
  )

  VALUES (?, ?, ?, ?, ?, ?)

  ON CONFLICT(
    scenario_id,
    requirement_id
  )

  DO UPDATE SET
    label = excluded.label,
    target_credits = excluded.target_credits,
    source = excluded.source,
    derivation_note = excluded.derivation_note
`);

const saveRequirements = db.transaction(() => {

  for (const requirement of requirements) {
    insert.run(
      "default",
      requirement.id,
      requirement.label,
      requirement.target,
      "UDPA-simulated from DORIS cohort",
      requirement.note
    );
  }
});

saveRequirements();

console.log("\nSaved degree model:");

console.table(
  db.prepare(`
    SELECT
      requirement_id,
      label,
      target_credits,
      source

    FROM degree_requirements

    WHERE scenario_id = 'default'

    ORDER BY target_credits DESC
  `).all()
);

const total = db.prepare(`
  SELECT SUM(target_credits) AS total
  FROM degree_requirements
  WHERE scenario_id = 'default'
`).get();

console.log(
  "\nTotal simulated degree target: " +
  total.total +
  " credits"
);

db.close();
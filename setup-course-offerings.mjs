import Database from "better-sqlite3";

const db = new Database("udpa.db");

const academicYear = "18-19";
const semester = "1";

db.exec(`
  CREATE TABLE IF NOT EXISTS course_offerings (
    academic_year TEXT NOT NULL,
    semester TEXT NOT NULL,
    course_id TEXT NOT NULL,

    historical_enrolments INTEGER NOT NULL,

    simulated_capacity INTEGER NOT NULL,
    simulated_remaining_seats INTEGER NOT NULL,

    simulated_days TEXT NOT NULL,
    simulated_time TEXT NOT NULL,

    source TEXT NOT NULL,

    PRIMARY KEY (
      academic_year,
      semester,
      course_id
    )
  );
`);

function hashCourseId(courseId) {
  let hash = 0;

  for (const char of String(courseId)) {
    hash =
      ((hash * 31) + char.charCodeAt(0))
      >>> 0;
  }

  return hash;
}

function simulateOffering(courseId, historicalEnrolments) {
  const hash = hashCourseId(courseId);

  /*
    Capacity is based on historical demand,
    rounded upward to a plausible class size.
  */
  const capacity = Math.max(
    20,
    Math.ceil(
      (historicalEnrolments * 1.15) / 10
    ) * 10
  );

  /*
    Deterministic simulation:
    roughly 20% of offerings are full.
  */
  const full = hash % 5 === 0;

  const remainingSeats = full
    ? 0
    : Math.max(
        1,
        Math.min(
          20,
          capacity - historicalEnrolments +
            (hash % 5)
        )
      );

  const dayOptions = [
    "Mon / Wed",
    "Tue / Thu",
    "Mon / Fri",
    "Wed / Fri"
  ];

  const timeOptions = [
    "09:00–10:30",
    "10:30–12:00",
    "13:00–14:30",
    "14:30–16:00",
    "16:00–17:30"
  ];

  return {
    capacity,
    remainingSeats,

    days:
      dayOptions[
        hash % dayOptions.length
      ],

    time:
      timeOptions[
        Math.floor(hash / 7) %
        timeOptions.length
      ]
  };
}

const observed = db.prepare(`
  SELECT
    course_id,
    COUNT(DISTINCT student_id)
      AS historical_enrolments

  FROM course_selections

  WHERE academic_year = ?
    AND semester = ?

  GROUP BY course_id
`).all(
  academicYear,
  semester
);

db.prepare(`
  DELETE FROM course_offerings
  WHERE academic_year = ?
    AND semester = ?
`).run(
  academicYear,
  semester
);

const insertOffering = db.prepare(`
  INSERT INTO course_offerings (
    academic_year,
    semester,
    course_id,

    historical_enrolments,

    simulated_capacity,
    simulated_remaining_seats,

    simulated_days,
    simulated_time,

    source
  )

  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const importOfferings = db.transaction(() => {

  for (const row of observed) {
    const simulated = simulateOffering(
      row.course_id,
      row.historical_enrolments
    );

    insertOffering.run(
      academicYear,
      semester,
      row.course_id,

      row.historical_enrolments,

      simulated.capacity,
      simulated.remainingSeats,

      simulated.days,
      simulated.time,

      "DORIS-observed + UDPA-simulated"
    );
  }
});

importOfferings();

const count = db.prepare(`
  SELECT COUNT(*) AS count
  FROM course_offerings
  WHERE academic_year = ?
    AND semester = ?
`).get(
  academicYear,
  semester
);

console.log(
  "Imported " +
  count.count +
  " planning-term offerings."
);

const fullCount = db.prepare(`
  SELECT COUNT(*) AS count
  FROM course_offerings
  WHERE academic_year = ?
    AND semester = ?
    AND simulated_remaining_seats = 0
`).get(
  academicYear,
  semester
);

console.log(
  "Simulated full courses: " +
  fullCount.count
);

console.log(
  "\nSample computer-related offerings:"
);

console.table(
  db.prepare(`
    SELECT
      o.course_id,
      c.course_name,
      c.course_type,
      c.credits,

      o.historical_enrolments,
      o.simulated_capacity,
      o.simulated_remaining_seats,

      o.simulated_days,
      o.simulated_time

    FROM course_offerings o

    LEFT JOIN courses c
      ON c.course_id = o.course_id

    WHERE o.academic_year = ?
      AND o.semester = ?

      AND (
        LOWER(c.course_name)
          LIKE '%computer%'

        OR LOWER(c.course_name)
          LIKE '%data%'

        OR LOWER(c.course_name)
          LIKE '%algorithm%'

        OR LOWER(c.course_name)
          LIKE '%information%'

        OR LOWER(c.college)
          LIKE '%computer%'
      )

    ORDER BY
      o.historical_enrolments DESC

    LIMIT 20
  `).all(
    academicYear,
    semester
  )
);

db.close();
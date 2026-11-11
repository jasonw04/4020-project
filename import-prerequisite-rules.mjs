import Database from "better-sqlite3";

const db = new Database("udpa.db");

function normalize(text) {
  return String(text ?? "")
    .toLowerCase()
    .replace(/["'“”‘’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const courses = db.prepare(`
  SELECT
    course_id,
    course_name,
    college,
    prerequisite_text
  FROM courses
`).all();

const nameMap = new Map();

for (const course of courses) {
  const name = normalize(course.course_name);

  if (name.length < 5) continue;

  if (!nameMap.has(name)) {
    nameMap.set(name, []);
  }

  nameMap.get(name).push(course);
}

const names = [...nameMap.keys()]
  .sort((a, b) => b.length - a.length);

function findCourseNames(text) {
  const normalizedText = normalize(text);
  const paddedText = ` ${normalizedText} `;

  const found = [];
  const usedRanges = [];

  for (const name of names) {
    const needle = ` ${name} `;

    let start = paddedText.indexOf(needle);

    while (start !== -1) {
      const end = start + needle.length;

      const overlaps = usedRanges.some(
        range =>
          start < range.end &&
          end > range.start
      );

      if (!overlaps) {
        found.push({
          normalizedName: name,
          start,
          end
        });

        usedRanges.push({ start, end });
      }

      start = paddedText.indexOf(
        needle,
        start + 1
      );
    }
  }

  return found;
}

function resolveCandidate(targetCourse, normalizedName) {
  const candidates = nameMap.get(normalizedName) || [];

  const others = candidates.filter(
    course =>
      course.course_id !== targetCourse.course_id
  );

  if (others.length === 1) {
    return {
      course: others[0],
      method: "unique-name"
    };
  }

  if (others.length > 1) {
    const sameCollege = others.filter(
      course =>
        course.college &&
        targetCourse.college &&
        normalize(course.college) ===
          normalize(targetCourse.college)
    );

    if (sameCollege.length === 1) {
      return {
        course: sameCollege[0],
        method: "same-college"
      };
    }
  }

  return null;
}

function isCleanCourseList(text, matches) {
  let remaining = ` ${normalize(text)} `;

  const namesToRemove = matches
    .map(match => match.normalizedName)
    .sort((a, b) => b.length - a.length);

  for (const name of namesToRemove) {
    remaining = remaining.replace(
      ` ${name} `,
      " "
    );
  }

  remaining = remaining
    .replace(/\b(and|or)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return remaining === "";
}

// Create normalized prerequisite table
db.exec(`
  CREATE TABLE IF NOT EXISTS prerequisite_rules (
    course_id TEXT NOT NULL,
    required_course_id TEXT NOT NULL,

    rule_type TEXT NOT NULL,
    source TEXT NOT NULL,
    derivation_method TEXT NOT NULL,

    original_text TEXT,

    PRIMARY KEY (
      course_id,
      required_course_id
    ),

    FOREIGN KEY (course_id)
      REFERENCES courses(course_id),

    FOREIGN KEY (required_course_id)
      REFERENCES courses(course_id)
  );
`);

// Rebuild derived rules cleanly
db.prepare(`
  DELETE FROM prerequisite_rules
  WHERE source = 'DORIS-derived'
`).run();

const insertRule = db.prepare(`
  INSERT OR IGNORE INTO prerequisite_rules (
    course_id,
    required_course_id,
    rule_type,
    source,
    derivation_method,
    original_text
  )
  VALUES (?, ?, ?, ?, ?, ?)
`);

const importRules = db.transaction(() => {

  for (const course of courses) {

    if (
      !course.prerequisite_text ||
      !course.prerequisite_text.trim()
    ) {
      continue;
    }

    const matches = findCourseNames(
      course.prerequisite_text
    );

    if (
      matches.length === 0 ||
      !isCleanCourseList(
        course.prerequisite_text,
        matches
      )
    ) {
      continue;
    }

    const resolved = [];

    let ambiguous = false;

    for (const match of matches) {
      const result = resolveCandidate(
        course,
        match.normalizedName
      );

      if (!result) {
        ambiguous = true;
        break;
      }

      resolved.push(result);
    }

    // Do not create hard rules when uncertain
    if (ambiguous) continue;

    for (const result of resolved) {
      insertRule.run(
        course.course_id,
        result.course.course_id,

        "simulated_hard",
        "DORIS-derived",
        result.method,

        course.prerequisite_text
      );
    }
  }
});

importRules();

const count = db.prepare(`
  SELECT COUNT(*) AS count
  FROM prerequisite_rules
`).get();

console.log(
  `Imported ${count.count} prerequisite relationships.`
);

console.log("\nSample rules:");

console.table(
  db.prepare(`
    SELECT
      target.course_id,
      target.course_name,
      required.course_id AS required_id,
      required.course_name AS required_course,
      rules.derivation_method,
      rules.original_text

    FROM prerequisite_rules rules

    JOIN courses target
      ON target.course_id = rules.course_id

    JOIN courses required
      ON required.course_id =
         rules.required_course_id

    LIMIT 15
  `).all()
);

db.close();
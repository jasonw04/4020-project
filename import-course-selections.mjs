import ExcelJS from "exceljs";
import Database from "better-sqlite3";
import path from "path";

const db = new Database("udpa.db");

const filePath = path.join(
  process.cwd(),
  "data",
  "doris",
  "CourseSelectionTable.xlsx"
);

// Historical DORIS enrolment records
db.exec(`
  CREATE TABLE IF NOT EXISTS course_selections (
    selection_id INTEGER PRIMARY KEY AUTOINCREMENT,

    student_id TEXT NOT NULL,
    academic_year TEXT NOT NULL,
    semester TEXT NOT NULL,
    course_id TEXT NOT NULL,

    -- Preserve the original historical text from DORIS
    course_name_raw TEXT,
    course_college_raw TEXT,

    score REAL,

    source TEXT NOT NULL DEFAULT 'DORIS'
  );

  CREATE INDEX IF NOT EXISTS idx_selections_student
  ON course_selections(student_id);

  CREATE INDEX IF NOT EXISTS idx_selections_course
  ON course_selections(course_id);

  CREATE INDEX IF NOT EXISTS idx_selections_term
  ON course_selections(academic_year, semester);
`);

// Re-running the importer should not duplicate DORIS records
db.prepare(`
  DELETE FROM course_selections
  WHERE source = 'DORIS'
`).run();

const insertSelection = db.prepare(`
  INSERT INTO course_selections (
    student_id,
    academic_year,
    semester,
    course_id,
    course_name_raw,
    course_college_raw,
    score,
    source
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, 'DORIS')
`);

const workbook = new ExcelJS.Workbook();

console.log("Reading CourseSelectionTable.xlsx...");

await workbook.xlsx.readFile(filePath);

const worksheet = workbook.worksheets[0];

let imported = 0;

const importSelections = db.transaction(() => {

  for (
    let rowNumber = 2;
    rowNumber <= worksheet.rowCount;
    rowNumber++
  ) {
    const row = worksheet.getRow(rowNumber);

    const studentId =
      row.getCell(1).text.trim();

    const academicYear =
      row.getCell(2).text.trim();

    const semester =
      row.getCell(3).text.trim();

    const courseId =
      row.getCell(4).text.trim();

    const courseName =
      row.getCell(5).text.trim();

    const courseCollege =
      row.getCell(6).text.trim();

    const scoreText =
      row.getCell(7).text.trim();

    const numericScore = Number(scoreText);

    const score =
      scoreText !== "" &&
      Number.isFinite(numericScore)
        ? numericScore
        : null;

    if (
      !studentId ||
      !academicYear ||
      !semester ||
      !courseId
    ) {
      continue;
    }

    insertSelection.run(
      studentId,
      academicYear,
      semester,
      courseId,
      courseName,
      courseCollege,
      score
    );

    imported++;
  }
});

importSelections();

console.log(
  `Imported ${imported} DORIS course selections.`
);

const count = db.prepare(`
  SELECT COUNT(*) AS count
  FROM course_selections
`).get();

console.log(
  `Database contains ${count.count} course selections.`
);

const missingScores = db.prepare(`
  SELECT COUNT(*) AS count
  FROM course_selections
  WHERE score IS NULL
`).get();

console.log(
  `Selections without a score: ${missingScores.count}`
);

console.log("\nSample selections:");

console.table(
  db.prepare(`
    SELECT
      student_id,
      academic_year,
      semester,
      course_id,
      course_name_raw,
      score
    FROM course_selections
    LIMIT 10
  `).all()
);

db.close();
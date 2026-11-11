import ExcelJS from "exceljs";
import Database from "better-sqlite3";
import path from "path";

const db = new Database("udpa.db");

const filePath = path.join(
  process.cwd(),
  "data",
  "doris",
  "CourseInformationTable.xlsx"
);

// Real DORIS course catalogue
db.exec(`
  CREATE TABLE IF NOT EXISTS courses (
    course_id TEXT PRIMARY KEY,
    course_name TEXT NOT NULL,
    college TEXT,
    course_type TEXT,

    -- Original DORIS field
    grade_raw TEXT,

    -- Derived from the numeric Grade field.
    -- Kept separate so the original dataset value is preserved.
    credits REAL,

    prerequisite_text TEXT,
    introduction TEXT,

    source TEXT NOT NULL DEFAULT 'DORIS'
  );

  CREATE INDEX IF NOT EXISTS idx_courses_name
  ON courses(course_name);

  CREATE INDEX IF NOT EXISTS idx_courses_college
  ON courses(college);
`);

const workbook = new ExcelJS.Workbook();
await workbook.xlsx.readFile(filePath);

const worksheet = workbook.worksheets[0];

const insertCourse = db.prepare(`
  INSERT INTO courses (
    course_id,
    course_name,
    college,
    course_type,
    grade_raw,
    credits,
    prerequisite_text,
    introduction,
    source
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'DORIS')

  ON CONFLICT(course_id)
  DO UPDATE SET
    course_name = excluded.course_name,
    college = excluded.college,
    course_type = excluded.course_type,
    grade_raw = excluded.grade_raw,
    credits = excluded.credits,
    prerequisite_text = excluded.prerequisite_text,
    introduction = excluded.introduction,
    source = excluded.source
`);

const importCourses = db.transaction(() => {

  for (
    let rowNumber = 2;
    rowNumber <= worksheet.rowCount;
    rowNumber++
  ) {
    const row = worksheet.getRow(rowNumber);

    const courseId = row.getCell(1).text.trim();
    const courseName = row.getCell(2).text.trim();
    const college = row.getCell(3).text.trim();
    const courseType = row.getCell(4).text.trim();

    const gradeRaw = row.getCell(5).text.trim();

    const numericGrade = Number(gradeRaw);

    const credits =
      gradeRaw !== "" && Number.isFinite(numericGrade)
        ? numericGrade
        : null;

    const prerequisiteText = row.getCell(6).text.trim();
    const introduction = row.getCell(7).text.trim();

    if (!courseId || !courseName) continue;

    insertCourse.run(
      courseId,
      courseName,
      college,
      courseType,
      gradeRaw,
      credits,
      prerequisiteText,
      introduction
    );
  }
});

importCourses();

const count = db
  .prepare("SELECT COUNT(*) AS count FROM courses")
  .get();

console.log(`Imported ${count.count} DORIS courses.`);

const prerequisiteCount = db.prepare(`
  SELECT COUNT(*) AS count
  FROM courses
  WHERE prerequisite_text IS NOT NULL
    AND TRIM(prerequisite_text) <> ''
`).get();

console.log(
  `${prerequisiteCount.count} courses contain prerequisite text.`
);

console.log("\nSample courses:");

console.table(
  db.prepare(`
    SELECT
      course_id,
      course_name,
      college,
      credits,
      prerequisite_text
    FROM courses
    LIMIT 5
  `).all()
);

db.close();
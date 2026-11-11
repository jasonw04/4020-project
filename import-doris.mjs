import ExcelJS from "exceljs";
import path from "path";

const filePath = path.join(
  process.cwd(),
  "data",
  "doris",
  "CourseInformationTable.xlsx"
);

const workbook = new ExcelJS.Workbook();
await workbook.xlsx.readFile(filePath);

const worksheet = workbook.worksheets[0];

console.log("Rows:", worksheet.rowCount);

// Check Grade values
const gradeCounts = {};

for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
  const grade = String(
    worksheet.getRow(rowNumber).getCell(5).value ?? ""
  ).trim();

  if (!grade) continue;

  gradeCounts[grade] = (gradeCounts[grade] || 0) + 1;
}

console.log("\nGrade values:");
console.table(gradeCounts);

// Show prerequisite examples
console.log("\nFirst 20 courses with prerequisites:");

let found = 0;

for (
  let rowNumber = 2;
  rowNumber <= worksheet.rowCount && found < 20;
  rowNumber++
) {
  const row = worksheet.getRow(rowNumber);

  const courseId = String(row.getCell(1).value ?? "").trim();
  const courseName = String(row.getCell(2).value ?? "").trim();
  const prerequisite = String(row.getCell(6).value ?? "").trim();

  if (!prerequisite) continue;

  console.log({
    courseId,
    courseName,
    prerequisite
  });

  found++;
}
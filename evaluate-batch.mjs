import fs from "fs";
import Database from "better-sqlite3";
import { runPlanningAgent } from "./agent.mjs";
import {
  validateDorisPlan,
  getMajorRelevantPlanningCourses,
  getSnapshotPassedCourses,
} from "./doris-repository.mjs";

const db = new Database("udpa.db");

const testCases = [
  { name: "Balanced 6 credits", interest: "balanced", maxCredits: 6, openOnly: true },
  { name: "Balanced 9 credits", interest: "balanced", maxCredits: 9, openOnly: true },
  { name: "Balanced 12 credits", interest: "balanced", maxCredits: 12, openOnly: true },
  { name: "Balanced 15 credits", interest: "balanced", maxCredits: 15, openOnly: true },

  { name: "Data 9 credits", interest: "data", maxCredits: 9, openOnly: true },
  { name: "Data 12 credits", interest: "data", maxCredits: 12, openOnly: true },

  { name: "Software 9 credits", interest: "software", maxCredits: 9, openOnly: true },
  { name: "Software 12 credits", interest: "software", maxCredits: 12, openOnly: true },

  { name: "Web 9 credits", interest: "web", maxCredits: 9, openOnly: true },
  { name: "Web 12 credits", interest: "web", maxCredits: 12, openOnly: true },
];

// ----------------------------------------------------
// Hidden future DORIS records
// ----------------------------------------------------

const futureRows = db
  .prepare(`
    SELECT course_id, score
    FROM course_selections
    WHERE student_id = ?
      AND academic_year = ?
      AND semester = ?
  `)
  .all("150", "18-19", "1");

const futureSelected = new Set(
  futureRows.map((row) => String(row.course_id))
);

const futurePassed = new Set(
  futureRows
    .filter((row) => row.score !== null && row.score >= 60)
    .map((row) => String(row.course_id))
);

// ----------------------------------------------------
// Eligibility ground truth
// ----------------------------------------------------

const eligibleCourses = getMajorRelevantPlanningCourses();

const eligibleSet = new Set(
  eligibleCourses.map((course) =>
    String(course.code ?? course.course_id)
  )
);

// ----------------------------------------------------
// Snapshot completed courses
// ----------------------------------------------------

const snapshotPassed = getSnapshotPassedCourses();

const completedSet = new Set(
  snapshotPassed.map((course) =>
    String(course.code ?? course.course_id)
  )
);

// ----------------------------------------------------
// SQL helpers
// ----------------------------------------------------

const availabilityQuery = db.prepare(`
  SELECT simulated_remaining_seats
  FROM course_offerings
  WHERE academic_year = ?
    AND semester = ?
    AND course_id = ?
`);

const prerequisiteQuery = db.prepare(`
  SELECT required_course_id
  FROM prerequisite_rules
  WHERE course_id = ?
    AND rule_type = 'simulated_hard'
`);

// ----------------------------------------------------
// Evaluation counters
// ----------------------------------------------------

const results = [];

let totalRecommendations = 0;

let historicalMatches = 0;
let passedHistoricalMatches = 0;

let eligibleRecommendations = 0;
let openSeatRecommendations = 0;
let prerequisiteCompliantRecommendations = 0;

// ----------------------------------------------------
// Run tests
// ----------------------------------------------------

for (let i = 0; i < testCases.length; i++) {
  const test = testCases[i];

  console.log("\n========================================");
  console.log(`TEST ${i + 1}: ${test.name}`);
  console.log("========================================");

  try {
    const preferences = {
      term: "2018-19 Semester 1",
      interest: test.interest,
      maxCredits: test.maxCredits,
      openOnly: test.openOnly,
    };

    const plan = await runPlanningAgent(preferences);

    const validation = validateDorisPlan(plan.codes, {
      maxCredits: test.maxCredits,
      openOnly: test.openOnly,
    });

    const codes = plan.codes.map(String);

    totalRecommendations += codes.length;

    // ----------------------------------------
    // Historical relevance
    // ----------------------------------------

    const matchedFuture = codes.filter((code) =>
      futureSelected.has(code)
    );

    const matchedPassedFuture = codes.filter((code) =>
      futurePassed.has(code)
    );

    historicalMatches += matchedFuture.length;
    passedHistoricalMatches += matchedPassedFuture.length;

    // ----------------------------------------
    // Eligibility compliance
    // ----------------------------------------

    const eligibilityResults = codes.map((code) =>
      eligibleSet.has(code)
    );

    eligibleRecommendations +=
      eligibilityResults.filter(Boolean).length;

    // ----------------------------------------
    // Open-seat compliance
    // ----------------------------------------

    const openSeatResults = codes.map((code) => {
      const offering = availabilityQuery.get(
        "18-19",
        "1",
        code
      );

      return (
        offering &&
        offering.simulated_remaining_seats > 0
      );
    });

    openSeatRecommendations +=
      openSeatResults.filter(Boolean).length;

    // ----------------------------------------
    // Prerequisite compliance
    // ----------------------------------------

    const prerequisiteResults = codes.map((code) => {
      const prerequisites = prerequisiteQuery.all(code);

      return prerequisites.every((rule) =>
        completedSet.has(String(rule.required_course_id))
      );
    });

    prerequisiteCompliantRecommendations +=
      prerequisiteResults.filter(Boolean).length;

    // ----------------------------------------
    // Credit compliance
    // ----------------------------------------

    const creditCompliant =
      validation.credits <= test.maxCredits;

    // ----------------------------------------
    // Per-test result
    // ----------------------------------------

    results.push({
      test: test.name,
      codes: codes.join(", "),
      credits: validation.credits,
      maxCredits: test.maxCredits,

      valid: validation.valid,
      creditCompliant,

      eligibilityCompliant:
        eligibilityResults.every(Boolean),

      openSeatCompliant:
        openSeatResults.every(Boolean),

      prerequisiteCompliant:
        prerequisiteResults.every(Boolean),

      futureMatches:
        matchedFuture.join(", "),

      passedFutureMatches:
        matchedPassedFuture.join(", "),

      errors:
        validation.errors.join("; "),
    });

    console.log("Courses:", codes);
    console.log("Credits:", validation.credits);
    console.log("Valid:", validation.valid);

    console.log(
      "Eligibility:",
      eligibilityResults.every(Boolean)
    );

    console.log(
      "Open seats:",
      openSeatResults.every(Boolean)
    );

    console.log(
      "Prerequisites:",
      prerequisiteResults.every(Boolean)
    );

    console.log(
      "Future matches:",
      matchedFuture
    );

  } catch (error) {
    results.push({
      test: test.name,
      codes: "",
      credits: 0,
      maxCredits: test.maxCredits,

      valid: false,
      creditCompliant: false,
      eligibilityCompliant: false,
      openSeatCompliant: false,
      prerequisiteCompliant: false,

      futureMatches: "",
      passedFutureMatches: "",

      errors: error.message,
    });

    console.error("ERROR:", error.message);
  }
}

// ----------------------------------------------------
// Results table
// ----------------------------------------------------

console.log("\n\n============== RESULTS ==============\n");

console.table(results);

// ----------------------------------------------------
// Aggregate metrics
// ----------------------------------------------------

const totalTests = results.length;

const validPlans =
  results.filter((r) => r.valid).length;

const creditCompliantPlans =
  results.filter((r) => r.creditCompliant).length;

const validPlanRate =
  (validPlans / totalTests) * 100;

const creditComplianceRate =
  (creditCompliantPlans / totalTests) * 100;

const eligibilityComplianceRate =
  totalRecommendations > 0
    ? (eligibleRecommendations /
        totalRecommendations) *
      100
    : 0;

const openSeatComplianceRate =
  totalRecommendations > 0
    ? (openSeatRecommendations /
        totalRecommendations) *
      100
    : 0;

const prerequisiteComplianceRate =
  totalRecommendations > 0
    ? (prerequisiteCompliantRecommendations /
        totalRecommendations) *
      100
    : 0;

const historicalOverlapRate =
  totalRecommendations > 0
    ? (historicalMatches /
        totalRecommendations) *
      100
    : 0;

const passedHistoricalOverlapRate =
  totalRecommendations > 0
    ? (passedHistoricalMatches /
        totalRecommendations) *
      100
    : 0;

// ----------------------------------------------------
// Metrics output
// ----------------------------------------------------

console.log(
  "\n============== METRICS ==============\n"
);

console.log(
  `Valid Plan Rate: ${validPlans}/${totalTests} = ${validPlanRate.toFixed(1)}%`
);

console.log(
  `Credit Limit Compliance: ${creditCompliantPlans}/${totalTests} = ${creditComplianceRate.toFixed(1)}%`
);

console.log(
  `Eligibility Compliance: ${eligibleRecommendations}/${totalRecommendations} = ${eligibilityComplianceRate.toFixed(1)}%`
);

console.log(
  `Open-Seat Compliance: ${openSeatRecommendations}/${totalRecommendations} = ${openSeatComplianceRate.toFixed(1)}%`
);

console.log(
  `Prerequisite Compliance: ${prerequisiteCompliantRecommendations}/${totalRecommendations} = ${prerequisiteComplianceRate.toFixed(1)}%`
);

console.log(
  `Historical Selection Overlap: ${historicalMatches}/${totalRecommendations} = ${historicalOverlapRate.toFixed(1)}%`
);

console.log(
  `Passed Future-Course Overlap: ${passedHistoricalMatches}/${totalRecommendations} = ${passedHistoricalOverlapRate.toFixed(1)}%`
);

const metrics = {
  generatedAt: new Date().toISOString(),

  totalTests,
  totalRecommendations,

  validPlanRate: Number(validPlanRate.toFixed(1)),
  creditLimitCompliance: Number(creditComplianceRate.toFixed(1)),
  eligibilityCompliance: Number(eligibilityComplianceRate.toFixed(1)),
  openSeatCompliance: Number(openSeatComplianceRate.toFixed(1)),
  prerequisiteCompliance: Number(prerequisiteComplianceRate.toFixed(1)),
  historicalSelectionOverlap: Number(historicalOverlapRate.toFixed(1)),
  passedFutureCourseOverlap: Number(passedHistoricalOverlapRate.toFixed(1)),
};

const output = {
  metrics,
  results,
};

fs.writeFileSync(
  "evaluation-results.json",
  JSON.stringify(output, null, 2)
);

const csvHeaders = [
  "test",
  "codes",
  "credits",
  "maxCredits",
  "valid",
  "creditCompliant",
  "eligibilityCompliant",
  "openSeatCompliant",
  "prerequisiteCompliant",
  "futureMatches",
  "passedFutureMatches",
  "errors",
];

const escapeCsv = (value) => {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
};

const csvRows = results.map((row) =>
  csvHeaders
    .map((header) => escapeCsv(row[header]))
    .join(",")
);

const csv = [
  csvHeaders.join(","),
  ...csvRows,
].join("\n");

fs.writeFileSync(
  "evaluation-results.csv",
  csv
);

console.log("\nSaved:");
console.log("- evaluation-results.json");
console.log("- evaluation-results.csv");

db.close();
import Database from "better-sqlite3";

const db = new Database("udpa.db");

// Convert "17-18" -> 17
function academicYearStart(year) {
  return Number(String(year).split("-")[0]);
}

export function getDefaultScenario() {
  return db.prepare(`
    SELECT
      sc.scenario_id,
      sc.student_id,
      sc.cutoff_academic_year,
      sc.cutoff_semester,

      s.enrollment_year,
      s.education,
      s.major

    FROM student_scenarios sc

    JOIN students s
      ON s.student_id = sc.student_id

    WHERE sc.scenario_id = 'default'
  `).get();
}

export function getSnapshotPassedCourses() {
  const scenario = getDefaultScenario();

  const rows = db.prepare(`
    SELECT
  cs.academic_year,
  cs.semester,
  cs.course_id,
  COALESCE(c.course_name, cs.course_name_raw)
    AS course_name,
  c.college,
  c.course_type,
  c.credits,
  cs.score

    FROM course_selections cs

    LEFT JOIN courses c
      ON c.course_id = cs.course_id

    WHERE cs.student_id = ?
  `).all(scenario.student_id);

  const cutoffYear =
    academicYearStart(
      scenario.cutoff_academic_year
    );

  // First remove all future records
  const snapshotRows = rows.filter(row => {
    const year =
      academicYearStart(row.academic_year);

    const semester =
      Number(row.semester);

    return (
      year < cutoffYear ||
      (
        year === cutoffYear &&
        semester <= scenario.cutoff_semester
      )
    );
  });

  // Then determine passed courses using only
  // information available at the snapshot date
  const passedByCourse = new Map();

  for (const row of snapshotRows) {
    if (
      row.score === null ||
      Number(row.score) < 60
    ) {
      continue;
    }

    const existing =
      passedByCourse.get(row.course_id);

    if (
      !existing ||
      Number(row.score) >
        Number(existing.best_score)
    ) {
      passedByCourse.set(
        row.course_id,
        {
          ...row,
          best_score: Number(row.score)
        }
      );
    }
  }

  return [...passedByCourse.values()];
}

export function getSnapshotSummary() {
  const scenario = getDefaultScenario();
  const passed = getSnapshotPassedCourses();

  const earnedCredits = passed.reduce(
    (sum, course) =>
      sum + (Number(course.credits) || 0),
    0
  );

  return {
    student: {
      id: scenario.student_id,
      education: scenario.education,
      major: scenario.major,
      enrollmentYear: scenario.enrollment_year
    },

    snapshot: {
      academicYear:
        scenario.cutoff_academic_year,

      semester:
        scenario.cutoff_semester
    },

    passedCourses:
      passed.length,

    earnedCredits
  };
}

export function getPlanningTermCourses() {
  const scenario = getDefaultScenario();

  // Historical planning term immediately after the snapshot
  const academicYear = "18-19";
  const semester = "1";

  const passedCourses = getSnapshotPassedCourses();

  const passedIds = new Set(
    passedCourses.map(course => course.course_id)
  );

  const offerings = db.prepare(`
    SELECT
      o.academic_year,
      o.semester,

      c.course_id,
      c.course_name,
      c.college,
      c.course_type,
      c.credits,
      c.prerequisite_text,

      o.historical_enrolments,
      o.simulated_capacity,
      o.simulated_remaining_seats,
      o.simulated_days,
      o.simulated_time

    FROM course_offerings o

    JOIN courses c
      ON c.course_id = o.course_id

    WHERE o.academic_year = ?
      AND o.semester = ?

      -- Don't use missing/non-credit values
      AND c.credits IS NOT NULL
      AND c.credits > 0

    ORDER BY o.historical_enrolments DESC
  `).all(
    academicYear,
    semester
  );

  const prerequisiteStatement = db.prepare(`
    SELECT required_course_id
    FROM prerequisite_rules
    WHERE course_id = ?
      AND rule_type = 'simulated_hard'
  `);

  return offerings.map(course => {
    const prerequisites =
      prerequisiteStatement
        .all(course.course_id)
        .map(row => row.required_course_id);

    const missingPrerequisites =
      prerequisites.filter(
        requiredId =>
          !passedIds.has(requiredId)
      );

    return {
      ...course,

      completed:
        passedIds.has(course.course_id),

      prerequisites,

      missingPrerequisites,

      eligible:
        !passedIds.has(course.course_id) &&
        missingPrerequisites.length === 0,

      available:
        course.simulated_remaining_seats > 0,

      waitlistAvailable:
        course.simulated_remaining_seats === 0
    };
  });
}

export function getDegreeRequirements() {
  return db.prepare(`
    SELECT
      requirement_id,
      label,
      target_credits,
      source,
      derivation_note
    FROM degree_requirements
    WHERE scenario_id = 'default'
    ORDER BY target_credits DESC
  `).all();
}

function mapCourseTypeToRequirement(courseType) {
  const type =
    String(courseType || "")
      .trim()
      .toLowerCase();

  if (type === "required major") {
    return "major_required";
  }

  if (type === "school-wide compulsory") {
    return "school_compulsory";
  }

  if (type === "restricted") {
    return "restricted";
  }

  if (type === "general elective course") {
    return "general_elective";
  }

  if (
    type === "optional" ||
    type === "whole school optional" ||
    type === "elective"
  ) {
    return "other_electives";
  }

  return null;
}

function mapCourseToCSRequirement(course, peerRate) {
  const type = String(
    course.course_type || ""
  )
    .trim()
    .toLowerCase();

  const college = String(
    course.college || ""
  )
    .trim()
    .toLowerCase();

  const fromCSSchool =
    college.includes(
      "electronics engineering and computer science"
    );

  /*
    "Required major" is only treated as a CS
    major requirement when:

    1. It comes from the CS/electronics school, OR
    2. At least 40% of comparable CS peers took it.

    Otherwise we do not assume it is a
    Computer Science requirement.
  */
  if (type === "required major") {
    if (
      fromCSSchool ||
      peerRate >= 0.4
    ) {
      return "major_required";
    }

    return null;
  }

  /*
    Restricted courses get a similar,
    slightly looser requirement.
  */
  if (type === "restricted") {
    if (
      fromCSSchool ||
      peerRate >= 0.25
    ) {
      return "restricted";
    }

    return null;
  }

  if (
    type ===
    "school-wide compulsory"
  ) {
    return "school_compulsory";
  }

  if (
    type ===
    "general elective course"
  ) {
    return "general_elective";
  }

  if (
    type === "optional" ||
    type === "whole school optional" ||
    type === "elective"
  ) {
    return "other_electives";
  }

  return null;
}

export function getSnapshotDegreeProgress() {
  const passed =
    getSnapshotPassedCourses();

  const requirements =
    getDegreeRequirements();

  const earnedByRequirement = {};

  for (const requirement of requirements) {
    earnedByRequirement[
      requirement.requirement_id
    ] = 0;
  }

  let unmappedCredits = 0;

  for (const course of passed) {
    const requirementId =
      mapCourseTypeToRequirement(
        course.course_type
      );

    const credits =
      Number(course.credits) || 0;

    if (
      requirementId &&
      Object.hasOwn(
        earnedByRequirement,
        requirementId
      )
    ) {
      earnedByRequirement[
        requirementId
      ] += credits;
    } else {
      unmappedCredits += credits;
    }
  }

  const areas = requirements.map(
    requirement => {
      const earned =
        earnedByRequirement[
          requirement.requirement_id
        ] || 0;

      return {
        id: requirement.requirement_id,
        label: requirement.label,
        earned,
        target:
          requirement.target_credits,
        remaining: Math.max(
          0,
          requirement.target_credits -
            earned
        ),
        complete:
          earned >=
          requirement.target_credits
      };
    }
  );

  const earnedCredits =
    passed.reduce(
      (sum, course) =>
        sum +
        (Number(course.credits) || 0),
      0
    );

  const targetCredits =
    requirements.reduce(
      (sum, requirement) =>
        sum +
        requirement.target_credits,
      0
    );

  return {
    earnedCredits,
    targetCredits,

    remainingCredits:
      Math.max(
        0,
        targetCredits - earnedCredits
      ),

    unmappedCredits,

    areas
  };
}

export function getMajorRelevantPlanningCourses() {
  const scenario = getDefaultScenario();

  const planningCourses =
    getPlanningTermCourses();

  const progress =
    getSnapshotDegreeProgress();

  const remainingByRequirement =
    new Map(
      progress.areas.map(area => [
        area.id,
        area.remaining
      ])
    );

  // Comparable peers:
  // same major + same entry year,
  // excluding our demo student.
  const peerTotal = db.prepare(`
    SELECT COUNT(*) AS count
    FROM students
    WHERE education = 'Undergraduate'
      AND major = ?
      AND enrollment_year = ?
      AND student_id <> ?
  `).get(
    scenario.major,
    scenario.enrollment_year,
    scenario.student_id
  ).count;

  const peerRows = db.prepare(`
    SELECT
      cs.course_id,

      COUNT(DISTINCT cs.student_id)
        AS cohort_peer_count

    FROM course_selections cs

    JOIN students s
      ON s.student_id = cs.student_id

    WHERE cs.academic_year = '18-19'
      AND cs.semester = '1'

      AND s.education = 'Undergraduate'
      AND s.major = ?
      AND s.enrollment_year = ?
      AND s.student_id <> ?

    GROUP BY cs.course_id
  `).all(
    scenario.major,
    scenario.enrollment_year,
    scenario.student_id
  );

  const peerCounts =
    new Map(
      peerRows.map(row => [
        row.course_id,
        row.cohort_peer_count
      ])
    );

  const candidates = [];

  for (const course of planningCourses) {

    if (!course.eligible) continue;

    const peerCount =
      peerCounts.get(course.course_id) || 0;

    // Must actually have been taken by
    // at least one comparable CS peer.
    if (peerCount === 0) continue;

    const peerRate =
  peerTotal > 0
    ? peerCount / peerTotal
    : 0;

const requirementId =
  mapCourseToCSRequirement(
    course,
    peerRate
  );

if (!requirementId) continue;

    let relevanceTier = "observed";

    if (peerRate >= 0.4) {
      relevanceTier = "core-pattern";
    } else if (peerRate >= 0.25) {
      relevanceTier = "common-pattern";
    }

    candidates.push({
      ...course,

      requirementId,

      requirementRemaining:
        remainingByRequirement.get(
          requirementId
        ) || 0,

      cohortPeerCount: peerCount,

      cohortPeerRate: peerRate,

      relevanceTier
    });
  }

  /*
    Ranking:
    1. areas where the student still needs credits
    2. courses most common among comparable peers
    3. larger remaining requirement gap
    4. open seats before waitlisted courses
  */
  candidates.sort((a, b) => {

    const aNeeded =
      a.requirementRemaining > 0 ? 1 : 0;

    const bNeeded =
      b.requirementRemaining > 0 ? 1 : 0;

    if (bNeeded !== aNeeded) {
      return bNeeded - aNeeded;
    }

    if (
      b.cohortPeerCount !==
      a.cohortPeerCount
    ) {
      return (
        b.cohortPeerCount -
        a.cohortPeerCount
      );
    }

    if (
      b.requirementRemaining !==
      a.requirementRemaining
    ) {
      return (
        b.requirementRemaining -
        a.requirementRemaining
      );
    }

    return (
      Number(b.available) -
      Number(a.available)
    );
  });

  return candidates;
}

export function validateDorisPlan(
  codes,
  {
    maxCredits = 15,
    openOnly = false
  } = {}
) {
  const candidates =
    getMajorRelevantPlanningCourses();

  const candidateMap =
    new Map(
      candidates.map(course => [
        course.course_id,
        course
      ])
    );

  const errors = [];
  const seen = new Set();

  let totalCredits = 0;

  for (const code of codes) {

    const normalizedCode =
      String(code);

    if (seen.has(normalizedCode)) {
      errors.push(
        `${normalizedCode} appears more than once.`
      );

      continue;
    }

    seen.add(normalizedCode);

    const course =
      candidateMap.get(normalizedCode);

    if (!course) {
      errors.push(
        `${normalizedCode} is not an eligible planning candidate.`
      );

      continue;
    }

    if (
      openOnly &&
      !course.available
    ) {
      errors.push(
        `${course.course_name} has no open seats.`
      );
    }

    totalCredits +=
      Number(course.credits) || 0;
  }

  if (totalCredits > maxCredits) {
    errors.push(
      `Plan contains ${totalCredits} credits, exceeding the ${maxCredits}-credit maximum.`
    );
  }

  return {
    valid: errors.length === 0,
    credits: totalCredits,
    maxCredits,
    errors
  };
}
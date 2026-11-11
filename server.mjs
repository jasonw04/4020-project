import express from "express";

import {
  runAgent,
  runPlanningAgent,
  runEnrolmentAgent
} from "./agent.mjs";

import {
  validateDorisPlan,
  getDefaultScenario,
  getSnapshotPassedCourses,
  getSnapshotDegreeProgress,
  getMajorRelevantPlanningCourses
} from "./doris-repository.mjs";

import {
  getStudentProfile,
  getDegreeProgress,
  getEligibleCourses,
  getCourseAvailability
} from "./agent-tools.mjs";

import {
  getPlan,
  savePlan,
  getEnrolments,
  saveEnrolment
} from "./db.mjs";

/*
  TEMPORARY:
  /api/workspace still uses the old frontend fixture data.
  We will replace this with DORIS data during the frontend migration.
*/
import {
  student,
  completed,
  requirements,
  courses
} from "./public/data.js";


const app = express();
const PORT = process.env.PORT || 3000;


app.use(express.json());

function mapDorisCourseType(courseType) {
  const type = String(courseType || "")
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

  return "other_electives";
}

// ============================================================
// WORKSPACE
// ============================================================

app.get("/api/workspace", (req, res) => {
  const scenario = getDefaultScenario();
  const progress = getSnapshotDegreeProgress();
  const passed = getSnapshotPassedCourses();
  const candidates = getMajorRelevantPlanningCourses();

  const student = {
    name: `Student ${scenario.student_id}`,
    program: scenario.major,
    degree: scenario.education,
    year: 3,
    target: progress.targetCredits
  };

  const requirements = progress.areas.map(area => ({
    id: area.id,
    label: area.label,
    target: area.target
  }));

  const completed = passed.map(course => ({
    code: course.course_id,
    title: course.course_name,
    term: `${course.academic_year} Semester ${course.semester}`,
    credits: Number(course.credits),
    area: mapDorisCourseType(course.course_type)
  }));

  const courses = candidates.map(course => ({
    code: course.course_id,
    title: course.course_name,

    description:
      `${course.relevanceTier} · ${Math.round(
        course.cohortPeerRate * 100
      )}% of comparable CS peers selected this course.`,

    credits: Number(course.credits),

    term: "2018-19 Semester 1",

    days: course.simulated_days,
    time: course.simulated_time,

    area: course.requirementId,

    seats: course.simulated_remaining_seats,
    capacity: course.simulated_capacity,

    prereqs: course.prerequisites || []
  }));

  res.json({
    student,
    completed,
    requirements,
    courses,

    plan: getPlan(),
    enrolments: getEnrolments(),

    source: {
      academic: "DORIS",
      operational: "UDPA simulated",
      scenario: "Historical snapshot of DORIS student 150"
    }
  });
});


app.get("/api/student", (req, res) => {
  res.json(student);
});


// ============================================================
// PLAN PERSISTENCE
// ============================================================

app.put("/api/plans", (req, res) => {
  savePlan(req.body);

  res.json({
    message: "Plan saved",
    plan: req.body
  });
});


// ============================================================
// ENROLMENT / WAITLIST ACTIONS
// ============================================================

app.post("/api/enrolments", (req, res) => {
  const { code, action } = req.body;

  if (!code || !action) {
    return res.status(400).json({
      message: "Course code and action are required."
    });
  }

  if (!["enrolled", "waitlisted"].includes(action)) {
    return res.status(400).json({
      message: "Invalid enrolment action."
    });
  }

  saveEnrolment(code, action);

  res.status(201).json({
    message: `${code} ${action}`,
    enrolments: getEnrolments()
  });
});


// ============================================================
// AI COURSE PLANNING
// ============================================================

app.post("/api/assistant/plans", async (req, res) => {
  try {
    const preferences = req.body;

    const result =
      await runPlanningAgent(preferences);

    /*
      Deterministically validate the AI plan.

      The AI may recommend courses,
      but the backend decides whether the
      plan is actually allowed.
    */
    const validation =
      validateDorisPlan(
        result.codes,
        {
          maxCredits:
            Number(preferences.maxCredits) || 15,

          openOnly:
            Boolean(preferences.openOnly)
        }
      );

    if (!validation.valid) {
      console.error(
        "AI plan failed DORIS validation:",
        validation.errors
      );

      return res.status(422).json({
        message:
          "The AI generated an invalid course plan.",

        errors:
          validation.errors,

        validation
      });
    }

    res.json({
      codes: result.codes,
      validation
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message:
        "The AI planning assistant could not generate a plan."
    });
  }
});


// ============================================================
// AGENT TOOLS
// ============================================================

app.get("/api/tools/profile", (req, res) => {
  res.json(
    getStudentProfile()
  );
});


app.get("/api/tools/progress", (req, res) => {
  res.json(
    getDegreeProgress()
  );
});


app.get("/api/tools/eligible", (req, res) => {
  const term =
    req.query.term ||
    "2018-19 Semester 1";

  res.json(
    getEligibleCourses(term)
  );
});


app.get(
  "/api/tools/availability/:code",
  (req, res) => {

    const result =
      getCourseAvailability(
        req.params.code
      );

    if (!result) {
      return res.status(404).json({
        message: "Course not found"
      });
    }

    res.json(result);
  }
);


// ============================================================
// TEMPORARY AGENT TEST
// ============================================================

app.get("/api/agent/test", async (req, res) => {
  try {
    const answer = await runAgent(
      `Assess this student's degree progress and recommend a course plan for 2018-19 Semester 1.

Use the student's unmet degree requirements, course eligibility, comparable-cohort evidence, and availability.

Prefer courses that:
1. Help satisfy unfinished degree requirements.
2. Were commonly taken by comparable Computer Science and Technology students.
3. Have available seats when reasonable.

Check eligibility and availability before recommending courses.`
    );

    res.json({
      answer
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: error.message
    });
  }
});


// ============================================================
// AI ENROLMENT REVIEW
// ============================================================

app.post(
  "/api/assistant/enrolment-actions",
  async (req, res) => {

    try {
      const plan = req.body;

      if (
        !plan ||
        !Array.isArray(plan.codes) ||
        !plan.term
      ) {
        return res.status(400).json({
          message:
            "A valid approved plan is required."
        });
      }

      const existingEnrolments =
        getEnrolments();

      /*
        Do not ask the AI to repeat actions
        that have already been recorded.
      */
      const pendingPlan = {
        term: plan.term,

        codes: plan.codes.filter(
          code =>
            !existingEnrolments[code]
        )
      };

      if (
        pendingPlan.codes.length === 0
      ) {
        return res.json({
          actions: []
        });
      }

      const result =
        await runEnrolmentAgent(
          pendingPlan
        );

      const errors = [];
      const seen = new Set();

      for (
        const item of result.actions || []
      ) {

        // Course must be in approved plan
        if (
          !pendingPlan.codes.includes(
            item.code
          )
        ) {
          errors.push(
            `${item.code} is not in the approved plan.`
          );

          continue;
        }

        // No duplicate actions
        if (seen.has(item.code)) {
          errors.push(
            `${item.code} appears more than once.`
          );

          continue;
        }

        seen.add(item.code);

        const availability =
          getCourseAvailability(
            item.code
          );

        if (!availability) {
          errors.push(
            `${item.code} does not exist.`
          );

          continue;
        }

        // Open seats → enrol
        if (
          availability.available &&
          item.action !== "enrolled"
        ) {
          errors.push(
            `${item.code} should be enrolled because seats are available.`
          );
        }

        // Full → waitlist
        if (
          !availability.available &&
          item.action !== "waitlisted"
        ) {
          errors.push(
            `${item.code} should be waitlisted because the course is full.`
          );
        }
      }

      /*
        AI must return one action
        for every pending course.
      */
      for (
        const code of pendingPlan.codes
      ) {
        if (!seen.has(code)) {
          errors.push(
            `No action was proposed for ${code}.`
          );
        }
      }

      if (errors.length > 0) {
        return res.status(422).json({
          message:
            "The AI enrolment proposal failed validation.",

          errors
        });
      }

      res.json(result);

    } catch (error) {
      console.error(error);

      res.status(500).json({
        message:
          "The AI could not generate enrolment actions."
      });
    }
  }
);


// ============================================================
// FRONTEND
// ============================================================

app.use(
  express.static("public")
);


// ============================================================
// SERVER
// ============================================================

app.listen(PORT, () => {
  console.log(
    `UDPA running at http://localhost:${PORT}`
  );
});
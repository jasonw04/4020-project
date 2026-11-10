import {
  runAgent,
  runPlanningAgent
} from "./agent.mjs";
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
import { recommend } from "./public/domain.js";
import express from "express";
import {
  student,
  completed,
  requirements,
  courses
} from "./public/data.js";

const app = express();
const PORT = process.env.PORT || 3000;



app.use(express.json());

app.get("/api/workspace", (req, res) => {
  res.json({
    student,
    completed,
    requirements,
    courses,
    plan: getPlan(),
    enrolments: getEnrolments()
  });
});


app.get("/api/student", (req, res) => {
  res.json(student);
});

app.put("/api/plans", (req, res) => {
  savePlan(req.body);

  res.json({
    message: "Plan saved",
    plan: req.body
  });
});

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

app.post("/api/assistant/plans", async (req, res) => {
  try {
    const preferences = req.body;

    const result = await runPlanningAgent(preferences);

    res.json({
      codes: result.codes
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      message: "The AI planning assistant could not generate a plan."
    });
  }
});

app.get("/api/tools/profile", (req, res) => {
  res.json(getStudentProfile());
});

app.get("/api/tools/progress", (req, res) => {
  res.json(getDegreeProgress());
});

app.get("/api/tools/eligible", (req, res) => {
  const term = req.query.term || "Winter 2027";
  res.json(getEligibleCourses(term));
});

app.get("/api/tools/availability/:code", (req, res) => {
  const result = getCourseAvailability(req.params.code);

  if (!result) {
    return res.status(404).json({
      message: "Course not found"
    });
  }

  res.json(result);
});

app.get("/api/agent/test", async (req, res) => {
  try {
    const answer = await runAgent(
      "Assess this student's degree progress and recommend a Winter 2027 course plan. Check eligibility and availability before recommending courses."
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

app.use(express.static("public"));

app.listen(PORT, () => {
  console.log(`UDPA running at http://localhost:${PORT}`);
});

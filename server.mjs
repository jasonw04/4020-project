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

let savedPlan = {
  term: "Winter 2027",
  codes: []
};

let enrolments = {};

app.use(express.json());

app.get("/api/workspace", (req, res) => {
  res.json({
    student,
    completed,
    requirements,
    courses,
    plan: savedPlan,
    enrolments
  });
});


app.get("/api/student", (req, res) => {
  res.json(student);
});

app.put("/api/plans", (req, res) => {
  savedPlan = req.body;
  res.json({
    message: "Plan saved",
    plan: savedPlan
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

  enrolments[code] = action;

  res.status(201).json({
    message: `${code} ${action}`,
    enrolments
  });
});

app.post("/api/assistant/plans", (req, res) => {
  const preferences = req.body;

  const codes = recommend(
    courses,
    completed,
    preferences
  );

  res.json({
    codes
  });
});

app.use(express.static("public"));

app.listen(PORT, () => {
  console.log(`UDPA running at http://localhost:${PORT}`);
});

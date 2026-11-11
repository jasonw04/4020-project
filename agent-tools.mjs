import {
  getDefaultScenario,
  getSnapshotDegreeProgress,
  getPlanningTermCourses,
  getMajorRelevantPlanningCourses
} from "./doris-repository.mjs";
import {
  student,
  completed,
  requirements,
  courses
} from "./public/data.js";

import {
  audit,
  eligibility
} from "./public/domain.js";

export function getStudentProfile() {
  const scenario = getDefaultScenario();

  return {
    id: scenario.student_id,
    education: scenario.education,
    major: scenario.major,
    enrollmentYear: scenario.enrollment_year,

    source: "DORIS",
    snapshot: {
      academicYear: scenario.cutoff_academic_year,
      semester: scenario.cutoff_semester
    }
  };
}

export function getDegreeProgress() {
  const scenario = getDefaultScenario();
  const progress = getSnapshotDegreeProgress();

  return {
    student: {
      id: scenario.student_id,
      major: scenario.major,
      education: scenario.education
    },

    snapshot: {
      academicYear: scenario.cutoff_academic_year,
      semester: scenario.cutoff_semester
    },

    earnedCredits: progress.earnedCredits,
    targetCredits: progress.targetCredits,
    remainingCredits: progress.remainingCredits,

    requirements: progress.areas,

    source: "DORIS-backed historical snapshot"
  };
}

const PLANNING_TERM = "2018-19 Semester 1";


export function getEligibleCourses(term = PLANNING_TERM) {
  if (term !== PLANNING_TERM) {
    return [];
  }

  return getMajorRelevantPlanningCourses()
    .map(course => ({
      code: course.course_id,
      title: course.course_name,

      term: PLANNING_TERM,

      requirement:
        course.requirementId,

      credits:
        course.credits,

      seats:
        course.simulated_remaining_seats,

      capacity:
        course.simulated_capacity,

      days:
        course.simulated_days,

      time:
        course.simulated_time,

      available:
        course.available,

      waitlistAvailable:
        course.waitlistAvailable,

      peerEvidence: {
        count:
          course.cohortPeerCount,

        rate:
          course.cohortPeerRate,

        relevance:
          course.relevanceTier
      },

      source:
        "DORIS same-cohort candidate + simulated operational data"
    }));
}

export function getCourseAvailability(code) {
  const course =
    getPlanningTermCourses().find(
      course =>
        course.course_id === String(code)
    );

  if (!course) {
    return null;
  }

  return {
    code: course.course_id,
    title: course.course_name,

    term: PLANNING_TERM,

    seats:
      course.simulated_remaining_seats,

    capacity:
      course.simulated_capacity,

    available:
      course.simulated_remaining_seats > 0,

    waitlistAvailable:
      course.simulated_remaining_seats === 0,

    source:
      "DORIS-observed offering + UDPA-simulated availability"
  };
}
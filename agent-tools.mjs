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
  return student;
}

export function getDegreeProgress() {
  return {
    student,
    completedCredits: completed.reduce((sum, course) => sum + course.credits, 0),
    requirements: audit(completed, requirements)
  };
}

export function getEligibleCourses(term) {
  return courses
    .filter(course => course.term === term)
    .filter(course => {
      const result = eligibility(course, completed);

      return !result.completed && result.missing.length === 0;
    });
}

export function getCourseAvailability(code) {
  const course = courses.find(course => course.code === code);

  if (!course) {
    return null;
  }

  return {
    code: course.code,
    title: course.title,
    seats: course.seats,
    capacity: course.capacity,
    available: course.seats > 0,
    waitlistAvailable: course.seats === 0
  };
}

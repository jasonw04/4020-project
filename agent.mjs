import "dotenv/config";
import OpenAI from "openai";

import {
  getStudentProfile,
  getDegreeProgress,
  getEligibleCourses,
  getCourseAvailability
} from "./agent-tools.mjs";

const client = new OpenAI();

const tools = [
  {
    type: "function",
    name: "getStudentProfile",
    description: "Get the current student's basic academic profile.",
    parameters: {
      type: "object",
      properties: {},
      additionalProperties: false
    }
  },
  {
    type: "function",
    name: "getDegreeProgress",
    description: "Get the student's completed credits and progress toward degree requirement areas.",
    parameters: {
      type: "object",
      properties: {},
      additionalProperties: false
    }
  },
  {
    type: "function",
    name: "getEligibleCourses",
    description: "Get courses the student is eligible to take in a specific term.",
    parameters: {
      type: "object",
      properties: {
        term: {
          type: "string",
          description: "Academic term, for example Winter 2027."
        }
      },
      required: ["term"],
      additionalProperties: false
    }
  },
  {
    type: "function",
    name: "getCourseAvailability",
    description: "Check seat and waitlist availability for a specific course.",
    parameters: {
      type: "object",
      properties: {
        code: {
          type: "string",
          description: "Course code, for example ITEC 3020."
        }
      },
      required: ["code"],
      additionalProperties: false
    }
  }
];

function runTool(name, args = {}) {
  console.log(`[AGENT TOOL] ${name}`, args);

  switch (name) {
    case "getStudentProfile":
      return getStudentProfile();

    case "getDegreeProgress":
      return getDegreeProgress();

    case "getEligibleCourses":
      return getEligibleCourses(args.term);

    case "getCourseAvailability":
      return getCourseAvailability(args.code);

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

export async function runAgent(userMessage) {
  const input = [
    {
      role: "user",
      content: userMessage
    }
  ];

  let response = await client.responses.create({
    model: "gpt-6-luna",
    instructions: `
You are the planning agent for UDPA, a university degree planning system.

Use the available tools instead of guessing student records, degree progress,
course eligibility, prerequisites, or course availability.

Help the student make sensible course-planning decisions.
Do not claim that a real university enrolment has occurred.
`,
    input,
    tools
  });

  while (response.output.some(item => item.type === "function_call")) {
    input.push(...response.output);

    for (const item of response.output) {
      if (item.type !== "function_call") continue;

      const args = JSON.parse(item.arguments);
      const result = runTool(item.name, args);

      input.push({
        type: "function_call_output",
        call_id: item.call_id,
        output: JSON.stringify(result)
      });
    }

    response = await client.responses.create({
      model: "gpt-6-luna",
      instructions: `
You are the planning agent for UDPA.

Use tool results as the authoritative source for academic information.
Explain recommendations clearly and concisely.
`,
      input,
      tools
    });
  }

  return response.output_text;
}

export async function runPlanningAgent(preferences) {
  const input = [
    {
      role: "user",
      content: `
Create a course plan using these preferences:

${JSON.stringify(preferences)}

Before creating the plan:
1. Check the student's degree progress.
2. Check which courses they are eligible for in the requested term.
3. Check availability for courses you are considering.
4. Respect the requested maximum credits.
5. If openOnly is true, do not select full courses.

Only recommend courses returned by the UDPA tools.
`
    }
  ];

  const format = {
    type: "json_schema",
    name: "course_plan",
    strict: true,
    schema: {
      type: "object",
      properties: {
        codes: {
          type: "array",
          items: {
            type: "string"
          }
        }
      },
      required: ["codes"],
      additionalProperties: false
    }
  };

  let response = await client.responses.create({
    model: "gpt-6-luna",
    instructions: `
You are the agentic degree-planning assistant for UDPA.

Use the available tools instead of guessing.
Degree progress, prerequisites, eligibility, and availability from the tools
are authoritative.

Your final response must be a valid course plan.
`,
    input,
    tools,
    text: {
      format
    }
  });

  while (response.output.some(item => item.type === "function_call")) {
    input.push(...response.output);

    for (const item of response.output) {
      if (item.type !== "function_call") continue;

      const args = JSON.parse(item.arguments);
      const result = runTool(item.name, args);

      input.push({
        type: "function_call_output",
        call_id: item.call_id,
        output: JSON.stringify(result)
      });
    }

    response = await client.responses.create({
      model: "gpt-6-luna",
      instructions: `
You are the agentic degree-planning assistant for UDPA.

Use tool results as authoritative.
Return only a valid plan using courses supported by the tool results.
`,
      input,
      tools,
      text: {
        format
      }
    });
  }

  return JSON.parse(response.output_text);
}

# UDPA External Test Cases

## Purpose

These test cases are designed for an external group to evaluate the University Degree Progress Assistant (UDPA).

For each test, use the **Planning Assistant** and record the generated recommendation.

The evaluator does not need to inspect source code or the database.

---

## Test Instructions

For each test case:

1. Open the Planning Assistant.
2. Select the specified semester, interest, course load, and seat preference.
3. Click **Find my starting point**.
4. Record the recommended courses and total credits.
5. Check whether the generated plan follows the requested constraints.

Use:

**Semester:** 2018-19 Semester 1

---

## Test Cases

| Test | Interest | Maximum Credits | Open Seats Only |
|---|---|---:|---|
| 1 | Balanced semester | 6 | Yes |
| 2 | Balanced semester | 9 | Yes |
| 3 | Balanced semester | 12 | Yes |
| 4 | Balanced semester | 15 | Yes |
| 5 | Data | 9 | Yes |
| 6 | Data | 12 | Yes |
| 7 | Software | 9 | Yes |
| 8 | Software | 12 | Yes |
| 9 | Web | 9 | Yes |
| 10 | Web | 12 | Yes |

---

## Results

| Test | Recommended Courses | Total Credits | Within Credit Limit? | All Courses Available? | Any Obvious Errors? |
|---|---|---:|---|---|---|
| 1 |  |  | Yes / No | Yes / No | Yes / No |
| 2 |  |  | Yes / No | Yes / No | Yes / No |
| 3 |  |  | Yes / No | Yes / No | Yes / No |
| 4 |  |  | Yes / No | Yes / No | Yes / No |
| 5 |  |  | Yes / No | Yes / No | Yes / No |
| 6 |  |  | Yes / No | Yes / No | Yes / No |
| 7 |  |  | Yes / No | Yes / No | Yes / No |
| 8 |  |  | Yes / No | Yes / No | Yes / No |
| 9 |  |  | Yes / No | Yes / No | Yes / No |
| 10 |  |  | Yes / No | Yes / No | Yes / No |

---

## Evaluation Notes

A plan passes the basic external test when:

- the total recommended credits do not exceed the selected maximum;
- all recommended courses have available seats when **Open Seats Only** is selected;
- the system produces valid course recommendations without errors;
- the interface displays the recommendation correctly.

The external tester should record any unexpected behavior, incorrect recommendation, error message, or usability issue encountered during testing.

## Important Note

The AI may generate slightly different valid recommendations when the same test is repeated. The goal of this external test is therefore to evaluate whether the generated plan respects the requested academic and operational constraints, rather than whether it reproduces one exact list of courses.
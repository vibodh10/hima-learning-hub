import { unitByCode } from "./learning-catalog";

export const journeyMilestones = ["starting_point", "learning", "progress_check_1", "progress_check_2", "final"] as const;
export type JourneyMilestone = typeof journeyMilestones[number];

export type ConfiguredJourneyWeek = {
  week: number;
  topicCode: string;
  title: string;
  focus: string;
  milestone: JourneyMilestone;
};

const sharedMilestones: Record<number, JourneyMilestone> = {
  1: "starting_point",
  6: "progress_check_1",
  10: "progress_check_2",
  12: "final",
};

function weeks(rows: Array<[string, string, string]>): ConfiguredJourneyWeek[] {
  return rows.map(([topicCode, title, focus], index) => ({
    week: index + 1,
    topicCode,
    title,
    focus,
    milestone: sharedMilestones[index + 1] ?? "learning",
  }));
}

export const configuredUnitJourneys: Record<"2" | "4" | "6", ConfiguredJourneyWeek[]> = {
  "2": weeks([
    ["A1", "Database systems and starting point", "Establish prior understanding, then explain relational database purpose, structures and terminology."],
    ["A2", "SQL and relational data", "Retrieve and manipulate relational data using appropriate RDBMS tools and SQL."],
    ["A3", "Normalisation", "Transform data from UNF through 1NF, 2NF and 3NF with justified keys and relationships."],
    ["B1", "Relational database design", "Translate a client brief into entities, attributes, keys, relationships and constraints."],
    ["B2", "Design documentation", "Produce traceable designs, data dictionaries, validation and interface specifications."],
    ["C1", "Progress Check 1: build a database solution", "Apply the first half of the journey in a comparable practical database task."],
    ["C1", "Forms, queries and reports", "Develop usable data-entry, processing and reporting features from the approved design."],
    ["C2", "Testing and refinement", "Test normal, boundary and erroneous data, correct faults and preserve retest evidence."],
    ["D1–D3", "Evaluate the database project", "Evaluate design decisions, testing evidence and fitness for the client brief."],
    ["D1–D3", "Progress Check 2: integrated database task", "Complete a later comparable task and identify evidenced progress and remaining gaps."],
    ["D1–D3", "External assessment preparation", "Practise the linked database-development process without presenting it as an internal Pearson assignment."],
    ["D1–D3", "Final evidence and readiness", "Complete the final comparable task, preserve after evidence and review assessment readiness."],
  ]),
  "4": weeks([
    ["A1", "Computational thinking and starting point", "Establish prior understanding, then apply decomposition, pattern recognition, abstraction and algorithmic thinking."],
    ["A2–A3", "Software uses and languages", "Compare software purposes and choose language characteristics that fit a stated problem."],
    ["A4", "Programming constructs", "Use variables, sequence, selection, iteration, data structures and reusable program structures."],
    ["A5–A6", "Logic and software quality", "Apply logical operations and evaluate reliability, maintainability, usability and efficiency."],
    ["B1", "Software development life cycle", "Use an iterative lifecycle to analyse, design, develop, test and review a solution."],
    ["B2", "Progress Check 1: software design", "Produce and review a comparable design using algorithms, data, interfaces and test planning."],
    ["B2", "Refine the software design", "Act on review evidence and make the design traceable to the client requirements."],
    ["C1–C2", "Develop and test software", "Implement the design and record systematic normal, boundary and erroneous testing."],
    ["C1–C2", "Debug and improve", "Diagnose faults, apply corrections and retain evidence of retesting and improvement."],
    ["C3–C5", "Progress Check 2: independent program", "Complete a later comparable programming task and evaluate progress from the starting point."],
    ["C3–C5", "Optimisation and review", "Improve performance, usability and maintainability and justify changes with evidence."],
    ["C3–C5", "Final software evidence", "Preserve the final product, testing and evaluation as after evidence without inventing an official assignment."],
  ]),
  "6": weeks([
    ["A1", "Website purpose and starting point", "Establish prior understanding, then explain how purpose, audience and principles shape website products."],
    ["A2", "Website performance factors", "Analyse usability, accessibility, compatibility, performance, security and legal considerations."],
    ["B1", "Website design", "Create audience-led requirements, site structure, wireframes and visual design decisions."],
    ["B2", "Web production techniques", "Apply semantic HTML, responsive CSS, assets and development tools appropriately."],
    ["C1", "Client-side scripting", "Use JavaScript to create purposeful interaction with accessible behaviour and error handling."],
    ["C2", "Progress Check 1: develop and publish", "Build a comparable responsive site section and check it against its requirements."],
    ["C2", "Responsive implementation", "Develop, integrate and publish the planned website across target viewport sizes."],
    ["C3–C5", "Test and review", "Test functionality, accessibility, compatibility and performance and record actionable findings."],
    ["C3–C5", "Optimise the website", "Act on test and feedback evidence while retaining traceable before and improved versions."],
    ["C3–C5", "Progress Check 2: independent website task", "Complete a later comparable build and identify evidenced progress and remaining gaps."],
    ["C3–C5", "Professional review", "Evaluate the product against the client brief and justify prioritised refinements."],
    ["C3–C5", "Final website evidence", "Preserve the final website, tests and evaluation as after evidence without inventing an official assignment."],
  ]),
};

export function journeyWeekFor(unitCode: string, teachingWeek: number) {
  if (!(unitCode in configuredUnitJourneys)) return undefined;
  return configuredUnitJourneys[unitCode as keyof typeof configuredUnitJourneys]
    .find(item => item.week === teachingWeek);
}

export function evidenceStageForMilestone(milestone: JourneyMilestone) {
  if (milestone === "starting_point") return "before";
  if (milestone === "final") return "after";
  return milestone;
}

export function validateConfiguredUnitJourneys() {
  return Object.entries(configuredUnitJourneys).every(([unitCode, journey]) => {
    const unit = unitByCode(unitCode);
    const topicCodes = new Set(unit?.topics.map(topic => topic.code) ?? []);
    return journey.length === 12
      && journey.every((item, index) => item.week === index + 1 && topicCodes.has(item.topicCode))
      && journey[0]?.milestone === "starting_point"
      && journey[5]?.milestone === "progress_check_1"
      && journey[9]?.milestone === "progress_check_2"
      && journey[11]?.milestone === "final";
  });
}

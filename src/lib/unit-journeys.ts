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

export const configuredUnitJourneys: Record<"2" | "4" | "6" | "10" | "14" | "19", ConfiguredJourneyWeek[]> = {
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
  "10": weeks([
    ["A1", "Business information and starting point", "Establish prior knowledge, then investigate why organisations analyse data and the legal, ethical, security and capability constraints."],
    ["A2", "Data types, storage and access", "Classify data and select secure warehouses, data marts, software and access processes for an organisational need."],
    ["A3", "Big-data analysis", "Use specialist tools and OLAP concepts while checking volume, velocity, compatibility and data quality."],
    ["A4", "Four levels of analytics", "Apply descriptive, diagnostic, predictive and prescriptive analytics to connected organisational decisions."],
    ["B1", "Statistical techniques", "Use software to present data and calculate central tendency and dispersion accurately."],
    ["B2", "Progress Check 1: probability", "Apply normal-distribution operations and a software-based t-test in a comparable dataset task."],
    ["B3", "Regression and model fit", "Use scatter diagrams, regression equations, correlation and appropriate linear or non-linear models."],
    ["C1", "Select a defensible dataset", "Frame a precise question and justify system, access, security, reliability and data-quality requirements."],
    ["C2", "Prepare and analyse data", "Clean and format the dataset, apply suitable software techniques and check validity, accuracy and relevance."],
    ["C2", "Progress Check 2: analytics investigation", "Complete a later comparable investigation and identify evidenced progress and remaining gaps."],
    ["C2", "Audience-led reporting", "Present graphical and numerical outcomes with language, detail and recommendations suited to each audience."],
    ["C2", "Final analytics evidence", "Preserve the final analysis, conclusions and recommendations as after evidence for teacher assessment."],
  ]),
  "14": weeks([
    ["A1", "Service life cycle and starting point", "Establish prior knowledge, then apply service identification, design, management and continual improvement."],
    ["A2–A3", "Organisation and service identification", "Analyse aims, functions, people, locations, diagrams and contextual factors to prioritise service needs."],
    ["B1–B2", "Define service requirements", "Produce a service catalogue and test technical requirements against cost, risk, law, security and sustainability."],
    ["B3–B4", "Design the IT service solution", "Design information, data, hardware, software, infrastructure and user-management components and compare alternatives."],
    ["C1–C2", "Information and data requirements", "Analyse strategic, management and operational information and the data needed to generate it."],
    ["D1", "Progress Check 1: software services", "Select and justify software-service options in a comparable organisational scenario."],
    ["D2", "Hardware and connectivity", "Select integrated hardware and connectivity using user, organisation, technical and implementation evidence."],
    ["D3", "Manage delivery and change", "Plan support, assets, incidents, metrics, acceptable use, SLAs and lawful external provision."],
    ["B3–B4", "Integrated service design", "Synthesize all requirements into a complete solution with traceable design decisions."],
    ["D3", "Progress Check 2: timed set-task rehearsal", "Complete a later comparable external-style task and diagnose evidenced strengths and gaps."],
    ["B3–B4", "Alternatives and justification", "Evaluate credible alternatives, implementation impact, operational management and prioritised improvement."],
    ["D3", "Final external-assessment readiness", "Complete a final original rehearsal covering all content areas without presenting it as Pearson's live task."],
  ]),
  "19": weeks([
    ["A1", "IoT purpose and starting point", "Establish prior knowledge, then compare why connected systems are used and the benefits they offer in contrasting sectors."],
    ["A2", "How IoT systems work", "Trace identification, sensing, communication, processing, services and actuation through a complete IoT data flow."],
    ["A3", "IoT characteristics and implications", "Evaluate reliability, scalability, interoperability, accessibility, privacy, ethics, law and sustainability."],
    ["A3", "Systems and services investigation", "Use evidence from contrasting IoT systems to reach supported conclusions for learning aim A."],
    ["B1", "Define and design an IoT solution", "Turn a problem into users, requirements, constraints, success criteria, diagrams and reviewable design documentation."],
    ["B2", "Progress Check 1: system architecture", "Design a comparable machine-to-machine architecture using sensors, actuators, devices, gateways, services and applications."],
    ["B3", "Standards and interoperability", "Select compatible device, network, messaging, data and application standards for the proposed system."],
    ["B4-B5", "Communication and security", "Balance range, bandwidth, latency, reliability and power while protecting devices, communications and data."],
    ["C1", "Build the integrated prototype", "Connect sensing, processing, communication, storage, output and user notification into an end-to-end prototype."],
    ["C2", "Progress Check 2: program the prototype", "Complete a later comparable programming task using suitable constructs, interfaces, validation and error handling."],
    ["C3", "Test, analyse and optimise", "Use functional, performance, security and user tests plus recorded data and feedback to improve the prototype."],
    ["C3", "Final IoT evidence and evaluation", "Preserve the final design, prototype, source, tests, analytics and evaluation as authentic internal-assessment evidence."],
  ]),
};

export function journeyWeekFor(unitCode: string, teachingWeek: number) {
  if (!(unitCode in configuredUnitJourneys)) return undefined;
  return configuredUnitJourneys[unitCode as keyof typeof configuredUnitJourneys]
    .find(item => item.week === teachingWeek);
}

export function nextJourneyMilestone(unitCode: string, teachingWeek: number) {
  if (!(unitCode in configuredUnitJourneys)) return undefined;
  return configuredUnitJourneys[unitCode as keyof typeof configuredUnitJourneys]
    .find(item => item.week >= teachingWeek && item.milestone !== "learning");
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

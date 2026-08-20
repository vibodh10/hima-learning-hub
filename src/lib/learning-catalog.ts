import { pearsonUnits, type PearsonTopic, type PearsonUnit } from "./pearson-curriculum";

export const expertiseLevels = ["Support", "Core", "Stretch", "Challenge"] as const;
export type ExpertiseLevel = typeof expertiseLevels[number];

export type ChallengeProject = {
  title: string;
  scenario: string;
  brief: string;
  deliverables: string[];
  aims: string[];
  criteria: string[];
  extension: string;
  stages: string[];
  evidence: string[];
  checklist: string[];
  rubric: { band: string; description: string }[];
  reflection: string[];
};

type UnitMeta = {
  aims: string[];
  criteria: string[];
  project: ChallengeProject;
};

function topic(code: string, title: string, content: string[], example: string, outcome: string): PearsonTopic {
  return {
    code, title, content,
    phases: [
      { label: "Explain", detail: `Learn the purpose, vocabulary and decisions involved in ${title.toLowerCase()}.` },
      { label: "Worked examples", detail: example },
      { label: "Practice", detail: `Complete a scaffolded scenario, then apply ${content.slice(0, 3).join(", ")} independently.` },
      { label: "Challenge", detail: `Analyse an unfamiliar vocational case and justify a solution using ${title.toLowerCase()}.` },
      { label: "Assignment goal", detail: outcome },
    ],
  };
}

const unit1: PearsonUnit = {
  code: "1" as PearsonUnit["code"],
  title: "Information Technology Systems",
  assessment: "Externally assessed written examination. Learners apply knowledge of IT systems to individual and organisational scenarios.",
  topics: [
    topic("A1–A2", "Digital devices and peripheral systems", ["digital devices and their uses", "peripheral devices", "computer technology in organisations", "accessibility and user needs"], "Compare the device and peripheral choices for a mobile engineer and a design studio.", "Explain and justify device choices in context."),
    topic("A3", "Computer software in an IT system", ["operating-system types and functions", "utility and application software", "open-source and proprietary software", "user interfaces", "file types and formats", "hardware and software relationships"], "Select a software stack and suitable file formats for a college media department.", "Assess software choices, compatibility, performance and implications."),
    topic("A4", "Emerging technologies", ["current and emerging digital technologies", "effects on IT-system performance", "implications for personal use", "implications for organisational use"], "Evaluate an emerging technology for a college and for an individual user.", "Assess benefits, limitations and wider implications of emerging technology."),
    topic("A5", "Choosing IT systems", ["user experience and accessibility", "user needs and specifications", "compatibility and connectivity", "cost and efficiency", "implementation, testing and migration", "productivity and security"], "Compare two complete IT-system options for a growing organisation.", "Recommend and justify an IT system against the full set of selection factors."),
    topic("B1–B3", "Transmitting data", ["wired and wireless connection types", "PAN, LAN, WAN and VPN", "network components and selection factors", "protocols and transmission security", "bandwidth and latency", "lossy and lossless compression", "codecs and digital media transmission"], "Trace a compressed media file from a remote learner through a VPN to a college server.", "Analyse how network and transmission decisions affect performance and users."),
    topic("C1–C2", "Operating online", ["cloud storage and cloud computing", "VPN and remote-desktop technologies", "online-system selection factors", "online communities and communication channels", "privacy, security and accessibility", "organisational implementation and working practices"], "Evaluate cloud collaboration and online-community use for a distributed support team.", "Assess the suitability and implications of operating online."),
    topic("D1–D2", "Protecting data and information", ["accidental and malicious threats", "file permissions and access levels", "backup and recovery", "antivirus and firewalls", "encryption for stored and transmitted data", "current legislation and professional codes of practice"], "Build layered protection for a small healthcare provider after a phishing incident.", "Recommend justified protection measures for a given risk profile."),
    topic("E1", "Online services", ["retail and financial services", "education, news and entertainment services", "productivity and booking systems", "transactional data", "targeted marketing", "collaborative working"], "Compare an online booking service and a financial service from user and organisational viewpoints.", "Explain how online-service features meet needs and evaluate their implications."),
    topic("E2", "Impact of IT systems on organisations", ["stock control and data logging", "data analysis and office tasks", "creative, advertising and manufacturing uses", "employee and customer experience", "implementation, integration and downtime", "productivity, training, support and security"], "Evaluate the effect of a new stock-control system on staff, customers and operations.", "Analyse organisational uses, implementation effects and supported improvements."),
    topic("E3", "Using and manipulating data", ["primary and secondary data sources", "reliability of data", "surveys, questionnaires, focus groups and interviews", "verification and validation", "extracting, sorting and numerical modelling", "presenting data and results", "accessible data-collection interfaces"], "Plan, validate, analyse and present data from a customer-service investigation.", "Use reliable data and suitable processing methods to support a justified conclusion."),
    topic("F1–F2", "Moral, ethical and legal issues", ["privacy and environmental impact", "unequal access and the digital divide", "online behaviour, globalisation and censorship", "professional codes of practice", "computer misuse, copyright and data-protection law", "health, safety, equality and accessibility requirements"], "Assess a facial-recognition deployment from legal, ethical and stakeholder viewpoints.", "Discuss IT issues using balanced evidence, current responsibilities and justified recommendations."),
  ],
};

const unit8: PearsonUnit = {
  code: "8" as PearsonUnit["code"],
  title: "Computer Games Development",
  assessment: "Internally assessed. Learning aim A investigates gaming technology; learning aims B and C design, develop and review a game.",
  topics: [
    topic("A1", "Social trends in computer gaming", ["genres and audiences", "player motivations", "social and multiplayer trends", "distribution and business models", "positive and negative impacts"], "Compare how a free-to-play mobile game and a premium console game attract and retain players.", "Evaluate how social trends influence a proposed game."),
    topic("A2", "Technologies used in computer gaming", ["platforms and hardware", "game engines", "graphics, audio and input technology", "networking and artificial intelligence", "technical constraints"], "Select an engine and target platform for a two-dimensional educational game.", "Evaluate technologies and their effect on design and development."),
    topic("B1–B3", "Computer game design and refinement", ["mathematical and graphic design techniques", "platform and delivery", "client and audience requirements", "gameplay, mechanics and rules", "story, characters and levels", "game states and interfaces", "assets, sound and animation", "design documentation, feedback and refinement", "test planning and constraints"], "Turn a museum brief into a game design document, state diagram and refined playable-level plan.", "Produce, review and justify a feasible game design that meets requirements."),
    topic("C1–C3", "Developing and testing a computer game", ["principles of games development", "development environment", "variables, events and game loops", "collision, scoring and lives", "assets and user interface", "functional, playability and performance testing", "iteration and defect correction"], "Implement and test a collect-and-avoid game loop using recorded test evidence.", "Create a functioning game and use planned testing to improve it."),
    topic("C4–C6", "Reviewing quality and professional practice", ["quality of the computer game", "fitness for audience, purpose and requirements", "legal, ethical and technology constraints", "platforms and compatibility", "quality characteristics and optimisation", "professional skills, knowledge and behaviours", "supported evaluation and alternatives"], "Use frame-rate evidence and player observations to prioritise three refinements.", "Optimise and evaluate the game while evidencing professional practice."),
  ],
};

const unit9: PearsonUnit = {
  code: "9" as PearsonUnit["code"],
  title: "IT Project Management",
  assessment: "Internally assessed. Learners investigate methodologies, initiate and run an IT project, then close it and reflect on performance.",
  topics: [
    topic("A1", "Project definitions and life cycle", ["defined objective, scope, beginning and end", "time, cost and quality constraints", "initiation, planning, execution, control and closure", "risks, issues and benefits"], "Classify routine operations and projects, then map a network installation through the five stages.", "Explain project characteristics and life-cycle decisions."),
    topic("A2–A3", "Methodologies and project structures", ["Waterfall, Agile and PRINCE2", "benefits and limitations", "roles, responsibilities and governance", "organisation and communication structures"], "Compare three IT projects and select a justified methodology for each.", "Compare and evaluate methodologies and structures in context."),
    topic("B1", "Project idea generation and solution creation", ["business need and stakeholders", "options and constraints", "scope and objectives", "success criteria", "solution selection"], "Turn a college booking problem into three options and a justified preferred solution.", "Define a viable IT project with measurable objectives."),
    topic("B2–B3", "Feasibility and project requirements", ["technical, economic, legal, operational and schedule feasibility", "requirements and acceptance criteria", "resources and budgets", "risk assessment", "project initiation documentation"], "Complete a TELOS feasibility study and initiation document for a cloud migration.", "Produce evidence that a proposed project is feasible and controlled."),
    topic("C1–C2", "Project phasing, planning and control", ["work breakdown", "dependencies, milestones and critical activities", "Gantt planning", "resource and risk management", "monitoring and reporting", "change and issue control", "quality management"], "Build a dependency-aware plan, then process a change request without losing control of scope.", "Manage a live or simulated project using an appropriate methodology."),
    topic("D1", "Project closure and lessons learned", ["formal acceptance and handover", "outcome against objectives", "stakeholder feedback", "personal performance", "lessons learned and recommendations"], "Close a delayed project using evidence to separate outcome success from process weaknesses.", "Evaluate the project outcome and reflect honestly on personal performance."),
  ],
};

export const configuredUnits: PearsonUnit[] = [unit1, ...pearsonUnits, unit8, unit9]
  .sort((a, b) => Number(a.code) - Number(b.code));

const unitMeta: Record<string, UnitMeta> = {
  "1": {
    aims: ["A Digital devices in IT systems", "B Transmitting data", "C Operating online", "D Protecting data and information", "E Impact of IT systems", "F Moral, ethical and legal issues"],
    criteria: ["AO1 knowledge and understanding", "AO2 application of IT terms, standards, concepts and processes", "AO3 selecting technologies and procedures to solve contextual problems", "AO4 analysis, evaluation and justified solutions", "AO5 connections between technologies, procedures, outcomes and solutions"],
    project: project("IT systems consultancy review", "Northbridge Community Health is replacing ageing devices, networks and online services after a security incident.", "Act as an IT consultant. Recommend a secure, accessible and sustainable system and defend the choices.", ["Requirements and stakeholder analysis", "Annotated system and network design", "Security and recovery plan", "Impact and data-use assessment", "Executive recommendation"], ["Content areas A–F"], ["AO1–AO5 applied practice"], "Model total cost of ownership and a phased migration.", ["Discover requirements", "Compare options", "Design the system", "Assess risks and impacts", "Present recommendations"]),
  },
  "2": {
    aims: ["A Understand relational database purpose and structure", "B Design relational database solutions", "C Create and test a relational database", "D Evaluate the database development project"],
    criteria: ["AO1 terminology, standards, concepts and processes", "AO2 apply knowledge to a client brief", "AO3 analyse problems and test evidence", "AO4 evaluate design and performance", "AO5 develop and justify a solution"],
    project: project("Community equipment-loan database", "A community charity currently manages borrowers, equipment, loans and returns in inconsistent spreadsheets.", "Design, build, test and evaluate a normalised relational database that staff can use safely.", ["Requirements analysis", "ERD and 3NF design", "Data dictionary", "Working forms, queries and reports", "SQL evidence", "Test log and evaluation"], ["A, B, C and D"], ["AO1–AO5"], "Add role-based access and an overdue-loan dashboard.", ["Analyse source data", "Normalise and design", "Build the solution", "Test and refine", "Evaluate against requirements"]),
  },
  "4": {
    aims: ["A Examine computational thinking and programming principles", "B Design a software solution", "C Develop a software solution"],
    criteria: ["A.P1–A.P3, A.M1, A.D1", "B.P4–B.P5, B.M2", "C.P6–C.P7, C.M3", "BC.D2–BC.D3"],
    project: project("Volunteer rota application", "A regional food bank needs a reliable application to allocate volunteers to shifts and identify uncovered roles.", "Design, develop, test and review a maintainable program that meets the food bank's requirements.", ["Problem definition", "Algorithms, interface and data design", "Working program", "Typical, extreme and erroneous tests", "Development log", "Client review and optimisation"], ["A, B and C"], ["A.P1–BC.D3"], "Persist rota data and produce a coverage report.", ["Analyse and decompose", "Design and review", "Develop iteratively", "Test and optimise", "Evaluate"]),
  },
  "6": {
    aims: ["A Understand website-development principles", "B Design a website", "C Develop a website"],
    criteria: ["A.P1, A.M1, A.D1", "B.P2–B.P3, B.M2", "C.P4–C.P6, C.M3", "BC.D2–BC.D3"],
    project: project("Accessible community arts website", "A community arts centre needs a responsive site that promotes events and accepts accessible expressions of interest.", "Design, build, test, optimise and evaluate an interactive website for the centre.", ["Audience and competitor analysis", "Mood board, sitemap and responsive wireframes", "HTML/CSS website", "Original client-side script", "Accessibility and compatibility evidence", "Evaluation"], ["A, B and C"], ["A.P1–BC.D3"], "Add a filterable event finder while maintaining keyboard accessibility.", ["Research and define", "Design and obtain feedback", "Build semantic pages", "Script, test and optimise", "Evaluate"]),
  },
  "8": {
    aims: ["A Investigate technologies used in computer gaming", "B Design a computer game", "C Develop a computer game"],
    criteria: ["A.P1–A.P2, A.M1, A.D1", "B.P3–B.P4, B.M2", "C.P5–C.P7, C.M3", "BC.D2–BC.D3"],
    project: project("Museum discovery game", "A local museum wants a short, accessible game that encourages 11–14 year-olds to explore its collection.", "Design, develop, test and review a playable game for the museum.", ["Audience and technology investigation", "Game design document", "Assets and state diagrams", "Playable game", "Test and player-feedback log", "Optimisation and review"], ["A, B and C"], ["Unit 8 pass, merit and distinction criteria"], "Add adaptive difficulty based on player performance.", ["Investigate", "Design and review", "Prototype mechanics", "Develop content", "Test, optimise and evaluate"]),
  },
  "9": {
    aims: ["A Investigate project-management principles and methodologies", "B Carry out project initiation", "C Carry out and manage an IT project", "D Close and reflect on the project"],
    criteria: ["A.P1–A.P2, A.M1, A.D1", "B.P3–B.P4, B.M2", "C.P5–C.P7, C.M3", "BC.D2–BC.D3", "D.P8–D.P9, D.M4, D.D4"],
    project: project("College help-desk improvement project", "A college wants to replace email-based support requests with a structured help-desk process.", "Initiate, plan, manage and close a simulated implementation project using a justified methodology.", ["Methodology comparison", "Business case and feasibility study", "Project initiation document", "Plan, risks, issues and change log", "Monitoring reports", "Closure and lessons-learned report"], ["A, B, C and D"], ["Unit 9 pass, merit and distinction criteria"], "Model benefits realisation for three months after handover.", ["Investigate methods", "Initiate and assess feasibility", "Plan", "Execute and control", "Close and reflect"]),
  },
};

function project(title: string, scenario: string, brief: string, deliverables: string[], aims: string[], criteria: string[], extension: string, stages: string[]): ChallengeProject {
  return {
    title, scenario, brief, deliverables, aims, criteria, extension, stages,
    evidence: ["Dated planning and decision records", "Drafts or iterations showing development", "Independent test or review evidence", "Final product and supported evaluation"],
    checklist: ["Every requirement is traceable to evidence", "The product works in the intended context", "Testing includes expected and unexpected conditions", "Decisions and improvements are justified", "No project is marked complete automatically"],
    rubric: [
      { band: "Developing", description: "A partial solution with limited evidence or weak links to requirements." },
      { band: "Secure", description: "A functioning solution with appropriate evidence, testing and a reasoned review." },
      { band: "Challenge", description: "A polished, independently managed solution with optimisation and justified evaluation." },
    ],
    reflection: ["Which decision had the greatest effect on quality?", "What evidence best demonstrates independent work?", "What would you change if the project continued?", "Which skill should be strengthened next?"],
  };
}

export function unitByCode(code: string) {
  return configuredUnits.find(unit => unit.code === code);
}

export function topicByCode(unitCode: string, topicCode: string) {
  return unitByCode(unitCode)?.topics.find(topic => topic.code === decodeURIComponent(topicCode));
}

export function metaForUnit(code: string) {
  return unitMeta[code];
}

export function topicHref(unitCode: string, topicCode: string) {
  return `/curriculum/units/${unitCode}/topics/${encodeURIComponent(topicCode)}`;
}

export function recommendedLevel(score: number | null): ExpertiseLevel {
  if (score === null) return "Support";
  if (score >= 85) return "Challenge";
  if (score >= 70) return "Stretch";
  if (score >= 50) return "Core";
  return "Support";
}

export type LessonView = {
  objectives: string[];
  explanation: string[];
  terms: { term: string; meaning: string }[];
  example: { scenario: string; steps: string[]; result: string };
  codeExample?: { language: string; code: string; caption: string };
  mistakes: string[];
  guided: { task: string; steps: string[]; hint: string };
  independent: string;
  independentTask: { responseType: "written" | "code"; prompt: string; hint: string; acceptedAlternatives: string[]; markScheme: string[]; workedSolution: string };
  knowledge: { prompt: string; options: string[]; answer: number; feedback: string };
  mastery: { prompt: string; comparablePrompts: string[]; checklist: string[]; markScheme: string[] };
  summary: string[];
};

export function lessonFor(unit: PearsonUnit, selected: PearsonTopic, level: ExpertiseLevel): LessonView {
  const other = unit.topics.filter(item => item.code !== selected.code);
  const distractors = other.flatMap(item => item.content).slice(0, 3);
  const scaffolding = level === "Support"
    ? "We will name each decision and show why it is made before you try it."
    : level === "Core"
      ? "Connect each decision to the requirement and explain the consequence."
      : level === "Stretch"
        ? "Solve the applied problem with limited prompts, then compare an alternative."
        : "Evaluate alternatives, constraints and trade-offs without a supplied method.";
  const depth = level === "Challenge"
    ? `At Challenge level, treat ${selected.title.toLowerCase()} as a connected system: choices affect quality, users, evidence and later development.`
    : level === "Stretch"
      ? `At Stretch level, transfer ${selected.title.toLowerCase()} to a less familiar context and justify trade-offs.`
      : level === "Core"
        ? `At Core level, apply ${selected.title.toLowerCase()} to a realistic brief and justify the main choices.`
        : `At Support level, learn the language and process of ${selected.title.toLowerCase()} one step at a time.`;
  const exampleFocus = selected.content.slice(0, level === "Support" ? 3 : selected.content.length);
  return {
    objectives: [
      `Explain ${selected.content[0]}.`,
      `Apply ${selected.content[1]} in a vocational scenario.`,
      `Use evidence to justify a decision about ${selected.title.toLowerCase()}.`,
    ],
    explanation: [
      `${selected.title} is part of ${unit.title}. ${scaffolding}`,
      `${depth} The essential content connects ${selected.content.join("; ")}.`,
      `A strong response does more than name a feature. It states the requirement, selects an appropriate approach, shows how it works and evaluates whether the result meets the requirement.`,
    ],
    terms: selected.content.slice(0, 5).map((item, index) => ({
      term: item,
      meaning: conceptMeaning(item, selected.title, index),
    })),
    example: {
      scenario: (selected.phases.find(phase => phase.label === "Worked examples")?.detail ?? `Apply ${selected.title} to a client brief.`)
        .replace(/^Model at least two examples, including /, "Worked scenario: ")
        .replace(/^Compare /, "Worked comparison: "),
      steps: [
        `Extract the audience, purpose, constraints and success conditions from the scenario.`,
        `Apply ${exampleFocus[0]} and record the decision.`,
        `Connect the decision to ${exampleFocus[1]} and check that the two are consistent.`,
        ...(level !== "Support" ? [`Compare an alternative using ${exampleFocus[2] ?? exampleFocus[0]}.`] : []),
        ...(level === "Challenge" ? [`Evaluate the trade-off using ${exampleFocus.at(-1)} and justify the final choice.`] : []),
      ],
      result: `The final outcome is traceable: scenario requirement → ${selected.title.toLowerCase()} decision → evidence → justified conclusion.`,
    },
    codeExample: codeExampleFor(unit.code, selected.code),
    mistakes: [
      `Listing ${selected.content[0]} without explaining how it meets the scenario.`,
      `Using terminology such as “${selected.content[1]}” inaccurately or without evidence.`,
      "Treating a first attempt as final instead of checking, testing or refining it.",
    ],
    guided: {
      task: `A small organisation needs a solution involving ${selected.title.toLowerCase()}. Identify the need, apply ${selected.content.slice(0, 2).join(" and ")}, then state how success will be checked.`,
      steps: level === "Challenge" ? ["Define measurable success.", "Select and justify an approach."] : level === "Stretch" ? ["Identify constraints.", "Apply a justified solution.", "Evaluate one alternative."] : ["Underline the user and purpose.", "Name the required concept.", "Apply it.", "Check against the purpose."],
      hint: `Use the sentence frame: “Because the requirement is …, I will …; this can be checked by …”.`,
    },
    independent: level === "Support"
      ? `Apply ${selected.title.toLowerCase()} to a new small-organisation scenario. Use the sentence frame from guided practice, include two accurate terms and explain one success check.`
      : level === "Core"
        ? `Without using the worked steps, apply ${selected.title.toLowerCase()} to a different organisation. Produce an outcome and a justification using at least three required terms and one test or source of evidence.`
        : level === "Stretch"
          ? `Apply ${selected.title.toLowerCase()} to an unfamiliar context with limited prompts. Compare one alternative and justify the preferred approach.`
          : `Independently resolve an unfamiliar, constrained scenario using ${selected.title.toLowerCase()}. Compare two viable approaches, defend the selected trade-off with evidence and propose a measurable refinement.`,
    independentTask: {
      responseType: ["2", "4", "6", "8"].includes(unit.code) && /A2|A4|B2|C1|C2/.test(selected.code) ? "code" : "written",
      prompt: `Produce independent evidence for ${selected.code} ${selected.title}: apply the requirement, show the outcome and explain how success would be checked.`,
      hint: `Return to teaching Part 3 and use requirement → decision → evidence → conclusion.`,
      acceptedAlternatives: ["A technically different solution is accepted when it meets the same stated requirement and is justified."],
      markScheme: ["Accurate use of topic knowledge", "Application to the new context", "Independent evidence or test", "Justified conclusion or refinement"],
      workedSolution: `A secure response identifies the client requirement, applies ${selected.content[0]} accurately, links the choice to ${selected.content[1]}, presents a measurable check and explains what the result means.`,
    },
    knowledge: {
      prompt: level === "Challenge"
        ? `Which concept must be applied most directly when evaluating ${selected.code} ${selected.title}?`
        : level === "Core"
          ? `Which item should be applied when solving a scenario about ${selected.code} ${selected.title}?`
          : level === "Stretch"
            ? `Which item is most important when transferring ${selected.code} ${selected.title} to an unfamiliar context?`
            : `Which item is required content for ${selected.code} ${selected.title}?`,
      options: [selected.content[0], ...distractors].slice(0, 4),
      answer: 0,
      feedback: `${selected.content[0]} belongs directly to ${selected.code}. The other options come from different topics and may be related, but they are not the best answer here.`,
    },
    mastery: {
      prompt: `Independently solve a new scenario using ${selected.title.toLowerCase()}. Your response must show selection, application, evidence and evaluation.`,
      comparablePrompts: [
        `A community organisation has a new requirement involving ${selected.title.toLowerCase()}. Select and apply an approach, show evidence and evaluate the outcome.`,
        `A small business rejects the first proposed solution for ${selected.title.toLowerCase()}. Produce a justified alternative and a measurable test of success.`,
        `An education provider must improve an existing solution involving ${selected.title.toLowerCase()}. Diagnose one weakness, implement or specify a refinement and evaluate the evidence.`,
      ],
      checklist: ["No hints or copied worked-example wording", "At least three accurate topic terms", "A decision linked to the scenario", "Evidence or a test", "A justified improvement or conclusion"],
      markScheme: ["Three or more accurate mapped concepts", "Correct application rather than description only", "Independent evidence without hints", "Reasoned evaluation", "Minimum three comparable attempts overall"],
    },
    summary: [
      `${selected.title} covers ${selected.content.join(", ")}.`,
      "Successful work connects requirements, decisions, implementation evidence and evaluation.",
      "Independent mastery, not topic choice alone, contributes to project readiness.",
    ],
  };
}

function codeExampleFor(unitCode: string, topicCode: string): LessonView["codeExample"] {
  if (unitCode === "2" && topicCode === "A2") return {
    language: "SQL",
    caption: "A parameter value should be supplied safely by the application rather than joined into the SQL string.",
    code: `SELECT b.borrower_name, e.item_name, l.due_date
FROM loan AS l
JOIN borrower AS b ON b.borrower_id = l.borrower_id
JOIN equipment AS e ON e.equipment_id = l.equipment_id
WHERE l.returned_at IS NULL
  AND l.due_date < CURRENT_DATE
ORDER BY l.due_date;`,
  };
  if (unitCode === "2" && ["A1", "A3", "B1", "B2"].includes(topicCode)) return {
    language: "SQL design",
    caption: "Primary and foreign keys make the relationship explicit and allow referential integrity to be enforced.",
    code: `BORROWER(borrower_id PK, borrower_name, email)
EQUIPMENT(equipment_id PK, item_name, condition)
LOAN(
  loan_id PK,
  borrower_id FK → BORROWER.borrower_id,
  equipment_id FK → EQUIPMENT.equipment_id,
  loan_date,
  due_date
)`,
  };
  if (unitCode === "4" && ["A1", "A4", "A5–A6", "B2", "C1–C2"].includes(topicCode)) return {
    language: "Python",
    caption: "The function has one responsibility, validates the boundary and returns a value that can be tested independently.",
    code: `def calculate_shift_gap(required: int, allocated: int) -> int:
    if required < 0 or allocated < 0:
        raise ValueError("Shift counts cannot be negative")
    return max(0, required - allocated)

gap = calculate_shift_gap(required=6, allocated=4)
print(f"Volunteers still needed: {gap}")  # 2`,
  };
  if (unitCode === "4" && topicCode === "B1") return {
    language: "Development log",
    caption: "A traceable life-cycle record links the requirement to design, implementation and evidence.",
    code: `Requirement R3 → prevent negative shift counts
Design        → validate at function boundary
Implementation→ raise ValueError for values below zero
Test T3       → input (-1, 4), expected error, actual error
Refinement    → add a clear message for the user`,
  };
  if (unitCode === "6" && ["B2", "C2"].includes(topicCode)) return {
    language: "HTML and CSS",
    caption: "Semantic structure, a real label and a responsive grid provide a stronger accessible foundation than visually positioned generic elements.",
    code: `<main>
  <h1>Community arts events</h1>
  <form id="interest-form">
    <label for="email">Email address</label>
    <input id="email" name="email" type="email" required>
    <button type="submit">Register interest</button>
  </form>
</main>

<style>
  main { width: min(70rem, 100% - 2rem); margin-inline: auto; }
  form { display: grid; gap: .75rem; max-width: 32rem; }
</style>`,
  };
  if (unitCode === "6" && topicCode === "C1") return {
    language: "JavaScript",
    caption: "The script listens for a real event, checks the value and exposes feedback through a live region rather than an inaccessible alert.",
    code: `const form = document.querySelector("#interest-form");
const status = document.querySelector("#form-status");

form.addEventListener("submit", (event) => {
  event.preventDefault();
  status.textContent = form.checkValidity()
    ? "Details checked. Ready to submit."
    : "Correct the highlighted field.";
});`,
  };
  if (unitCode === "8" && ["B1–B3", "C1–C3"].includes(topicCode)) return {
    language: "Game-loop pseudocode",
    caption: "Input, state update, collision rules and rendering are separated so each part can be tested and refined.",
    code: `WHILE game_state = PLAYING
  input ← read_player_input()
  player.move(input, delta_time)
  FOR EACH exhibit IN exhibits
    IF player.collides_with(exhibit) AND NOT exhibit.collected
      exhibit.collected ← TRUE
      score ← score + exhibit.points
    END IF
  NEXT exhibit
  render_scene()
END WHILE`,
  };
  if (unitCode === "9" && ["A1", "C1–C2"].includes(topicCode)) return {
    language: "Dependency plan",
    caption: "Dependencies determine the earliest start. A delayed critical task moves every dependent milestone unless action is taken.",
    code: `T1 Confirm requirements       2 days  dependency: none
T2 Approve process design    1 day   dependency: T1
T3 Configure help desk       4 days  dependency: T2
T4 Import users              1 day   dependency: T2
T5 Acceptance testing        2 days  dependency: T3, T4
M1 Service handover          0 days  dependency: T5`,
  };
  return undefined;
}

function conceptMeaning(concept: string, topicTitle: string, index: number) {
  const lower = concept.toLowerCase();
  const definitions: [RegExp, string][] = [
    [/rdbms/, "Software that stores data in related tables and enforces rules for querying, integrity, security and recovery."],
    [/relations, attributes, domains, tuples and cardinality/, "A relation is a table, an attribute is a column, a tuple is a row, a domain limits valid values, and cardinality describes the number of rows or relationship instances."],
    [/relational algebra/, "Formal operations on relations: select filters rows, join combines related rows, while union and intersect combine compatible result sets."],
    [/super, candidate, primary and foreign keys/, "A super key uniquely identifies a row; a minimal super key is a candidate key; one candidate becomes the primary key; a foreign key references a key in another table."],
    [/entity and referential integrity/, "Entity integrity requires a unique, non-null primary key. Referential integrity prevents a foreign key from referring to a missing record."],
    [/one-to-one, one-to-many and many-to-many/, "Relationship cardinalities state how many instances may connect. Many-to-many relationships normally require a junction table."],
    [/normalisation|unf, 1nf, 2nf and 3nf/, "Normalisation separates data to reduce repetition and anomalies: 1NF removes repeating groups, 2NF removes partial dependencies, and 3NF removes transitive dependencies."],
    [/update, insertion and deletion anomalies/, "Problems caused by duplicated or badly structured data: a fact may require several updates, be impossible to insert alone, or disappear when an unrelated row is deleted."],
    [/data dictionar/, "A design record defining each table and field, including name, purpose, type, size, key status, validation and required values."],
    [/sql|insert, update and delete/, "Structured Query Language defines, retrieves and changes relational data. Data-changing statements must be constrained, tested and protected by permissions and transactions."],
    [/conceptual, logical and physical/, "Conceptual design identifies business entities; logical design defines attributes, keys and relationships; physical design implements them in a chosen DBMS."],
    [/computational thinking/, "A disciplined approach using decomposition, pattern recognition, abstraction and algorithmic representation to turn a problem into a computable solution."],
    [/decomposition/, "Breaking a complex problem or process into smaller, clearly defined parts that can be designed, implemented and tested separately."],
    [/generalisation and abstraction/, "Abstraction removes irrelevant detail; generalisation identifies a reusable pattern that solves a wider class of related problems."],
    [/sequence, iteration and selection/, "Sequence orders statements, selection chooses a path using a condition, and iteration repeats work while or until a condition is met."],
    [/subroutines|functions|procedures/, "Named reusable blocks that reduce duplication. Parameters supply inputs; functions return a value, while procedures may perform an action."],
    [/boolean|truth table/, "Boolean logic combines true/false conditions using operations such as AND, OR and NOT; a truth table shows every possible input and output."],
    [/maintainability, portability and reliability/, "Maintainability is ease of safe change, portability is the ability to run on different platforms, and reliability is consistent correct operation."],
    [/white-box and black-box/, "White-box testing uses knowledge of internal paths; black-box testing checks externally observable behaviour against requirements."],
    [/typical, extreme and erroneous/, "Typical data represents normal use, extreme data sits at valid boundaries, and erroneous data is invalid and should be rejected safely."],
    [/semantic html/, "HTML elements such as header, nav, main, article and button communicate meaning to browsers and assistive technology, not merely appearance."],
    [/html/, "The markup language that gives a web document its structure, meaning, links, forms and embedded content."],
    [/css|box model/, "CSS controls presentation and layout. The box model calculates an element from content, padding, border and margin."],
    [/javascript|client-side script/, "Code executed by the browser to respond to events, validate input and update a page without requiring a full reload."],
    [/accessibility|w3c/, "Design and implementation practices that let disabled users perceive, operate and understand the site, supported by standards such as WCAG and valid HTML."],
    [/responsive/, "A layout approach that adapts content and controls to available screen size, input method and user preferences."],
    [/search engine optimisation|seo/, "Making content understandable and discoverable through semantic structure, useful titles, metadata, crawlable links, performance and relevant text."],
    [/browser compliance|compatibility/, "The degree to which standards-based features behave correctly across browsers, operating systems and device capabilities."],
    [/bandwidth|performance/, "Performance is affected by transfer capacity, latency, file size, server load, processing, caching and the amount of client-side work."],
    [/game loop/, "The repeating cycle that reads input, updates game state, resolves rules or physics, and renders the next frame."],
    [/game state/, "A controlled representation of the current mode and data, such as menu, playing, paused or game over, used to govern valid transitions."],
    [/collision/, "Detection of overlapping game objects followed by a rule-based response such as blocking movement, collecting an item or losing health."],
    [/game engine/, "A development environment providing rendering, input, physics, audio, scene and scripting services so developers can focus on game rules and content."],
    [/genres and audiences|player motivation/, "Genre sets expected mechanics and conventions; audience research identifies player abilities, motivations, access needs and content expectations."],
    [/project life cycle|initiation, planning, execution/, "The controlled progression from justification and definition, through planning and delivery, to monitoring, acceptance, closure and learning."],
    [/waterfall, agile and prince2/, "Waterfall uses planned sequential stages, Agile uses short feedback-led iterations, and PRINCE2 uses governed stages, defined roles and continued business justification."],
    [/scope and objectives/, "Scope defines what is and is not included; an objective states a measurable outcome the project must deliver."],
    [/feasibility|telos/, "A structured check that a proposal is technically possible, economically worthwhile, legally compliant, operationally usable and achievable on schedule."],
    [/dependencies|critical activities/, "A dependency constrains task order. Critical-path activities have no scheduling flexibility without moving the project end date."],
    [/risk|issues/, "A risk is an uncertain future event assessed by probability and impact; an issue has already occurred and requires ownership and action."],
    [/change control/, "A documented process for requesting, analysing, approving or rejecting, implementing and reviewing changes to controlled scope or products."],
    [/security threats/, "Potential causes of harm, such as malware, social engineering, unauthorised access or physical loss, considered with likelihood, vulnerability and impact."],
    [/physical and logical protection/, "Physical controls protect people, buildings and devices; logical controls such as authentication, permissions and encryption protect systems and data."],
    [/pan, lan, wan and vpn/, "PAN, LAN and WAN describe increasing network scope; a VPN creates an authenticated encrypted connection across an untrusted network."],
    [/operating systems/, "System software that manages hardware resources, files, processes, users, security and the services needed by applications."],
    [/cloud storage and computing/, "Remote, network-accessed storage or processing supplied as a service, offering scalability and collaboration alongside dependency, cost and security considerations."],
  ];
  const match = definitions.find(([pattern]) => pattern.test(lower));
  if (match) return match[1];
  return index === 0
    ? `${concept} is the main decision area in ${topicTitle.toLowerCase()}; it must be selected for a stated purpose and supported with evidence.`
    : `${concept} is required Pearson content within ${topicTitle.toLowerCase()}; apply it accurately, connect it to a requirement and show how the result will be checked.`;
}

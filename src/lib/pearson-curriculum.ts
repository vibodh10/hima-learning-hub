export type LearningPhase = {
  label: "Explain" | "Worked examples" | "Practice" | "Challenge" | "Assignment goal";
  detail: string;
};

export type PearsonTopic = {
  code: string;
  title: string;
  content: string[];
  phases: LearningPhase[];
  availableLessonId?: string;
};

export type PearsonUnit = {
  code: string;
  title: string;
  assessment: string;
  topics: PearsonTopic[];
};

function phases(example: string, practice: string, challenge: string, goal: string): LearningPhase[] {
  return [
    { label: "Explain", detail: "Teach the vocabulary, purpose, process and common misconceptions before independent work." },
    { label: "Worked examples", detail: `Model at least two examples, including ${example}.` },
    { label: "Practice", detail: practice },
    { label: "Challenge", detail: challenge },
    { label: "Assignment goal", detail: goal },
  ];
}

export const pearsonUnits: PearsonUnit[] = [
  {
    code: "2",
    title: "Creating Systems to Manage Information",
    assessment: "Externally assessed set task: learners must design, create, test and evaluate a relational database solution.",
    topics: [
      {
        code: "A1", title: "Relational database management systems",
        content: ["RDBMS types and characteristics", "relations, attributes, domains, tuples and cardinality", "relational algebra: union, intersect, join and select", "entity, generic and semantic relations", "super, candidate, primary and foreign keys", "entity and referential integrity", "one-to-one, one-to-many and many-to-many relationships"],
        phases: phases("a college enrolment model and a retail stock model", "Identify structures, keys, integrity constraints and relationships in unfamiliar scenarios.", "Repair a flawed relational model and justify every change.", "Produce an accurate relational model that can be carried into a database design."),
      },
      {
        code: "A2", title: "Manipulating relational data with RDBMS tools and SQL",
        content: ["define, modify and remove structures and data", "update, insert and delete", "queries and reports", "user administration", "security, integrity and recovery"],
        phases: phases("SQL CRUD operations and a secured multi-user database", "Write and trace SQL, retrieve information and explain safe administration and recovery.", "Optimise a multi-table query and propose role-based access.", "Use suitable RDBMS and SQL tools accurately in the Pearson set-task context."),
      },
      {
        code: "A3", title: "Normalisation",
        content: ["update, insertion and deletion anomalies", "primary, foreign and composite keys", "indexing and referential integrity", "data dictionaries, validation and cascading updates", "joins, unions and intersects", "UNF, 1NF, 2NF and 3NF"],
        phases: phases("an invoice from UNF to 3NF and a learner-record example", "Normalise raw documents, state dependencies, identify keys and build the data dictionary.", "Diagnose a misleading 3NF claim and defend a corrected design.", "Create efficient 3NF structures with traceable reasoning."),
      },
      {
        code: "B1", title: "Relational database design",
        content: ["conceptual, logical and physical modelling", "entity relationship modelling", "relational operators and relationship types", "RDBMS and SQL tool selection", "application and interface design", "prototyping, conversion and testing", "quality, effectiveness, data integrity and normalisation"],
        phases: phases("conceptual-to-physical designs for two client briefs", "Select tools and convert requirements into ERDs, interfaces and implementation decisions.", "Compare alternative designs under realistic constraints.", "Deliver a justified relational design that meets the client brief."),
      },
      {
        code: "B2", title: "Design documentation",
        content: ["audience, purpose and client requirements", "current data-protection, security and legal considerations", "data dictionaries, naming conventions, ERDs and normalisation", "input validation, verification, masks and calculated fields", "reports, queries and task automation", "multi-criteria, wildcard, action and calculated queries", "test plans for correctness, functionality, accessibility and usability"],
        phases: phases("a complete data dictionary and test plan", "Create and peer-review all required design documents from a vocational brief.", "Find omissions in an incomplete design pack and improve it.", "Produce documentation that another developer could implement without guessing."),
      },
      {
        code: "C1", title: "Producing a database solution",
        content: ["tables and relationships", "validation rules", "queries and reports", "navigation, forms and sub-forms", "automated functions", "importing, adding and manipulating data", "SQL extraction, manipulation and modification"],
        phases: phases("a working order system and a service-booking system", "Build each feature from an approved design and capture evidence as it is completed.", "Add safe automation and solve a new client requirement.", "Produce a functional database solution whose features map to the brief."),
      },
      {
        code: "C2", title: "Testing and refining the database",
        content: ["referential-integrity, functionality and security testing", "normal, erroneous and extreme test data", "test records and screenshots", "using outcomes to refine the solution"],
        phases: phases("a failed validation test and a broken relationship test", "Run planned tests, record actual results and retest after changes.", "Design tests that expose hidden integrity and usability failures.", "Show reliable evidence that refinements improved the solution."),
      },
      {
        code: "D1–D3", title: "Evaluating database design, testing and the final solution",
        content: ["design against requirements", "ERD, dictionary and normalisation quality", "functionality coverage, omissions, strengths and improvements", "analysis of normal, erroneous and extreme test results", "quality, performance, usability and fitness for purpose", "justified recommendations"],
        phases: phases("a balanced evaluation using evidence and a weak evaluation improved live", "Link each judgement to a requirement, test result or user observation.", "Prioritise improvements and justify the trade-offs.", "Evaluate design, testing and final performance with supported judgements."),
      },
    ],
  },
  {
    code: "4",
    title: "Programming",
    assessment: "Internally assessed and synoptic: a maximum of two assignments covers learning aim A and combined learning aims B/C.",
    topics: [
      {
        code: "A1", title: "Computational thinking",
        content: ["decomposition", "pattern recognition", "generalisation and abstraction", "variables, constants, processes, repetition, inputs and outputs"],
        phases: phases("decomposing a booking system and abstracting a quiz", "Turn unfamiliar problems into structured, communicable steps.", "Compare two decompositions and defend the more maintainable one.", "Apply computational thinking explicitly when analysing a new client problem."),
      },
      {
        code: "A2–A3", title: "Software uses and programming language characteristics",
        content: ["gaming, productivity, information management, automation, social media and search", "procedural, object-oriented, event-driven, machine and markup languages", "hardware/software needs, performance, application area and development effort"],
        phases: phases("contrasting Python, JavaScript and a lower-level language", "Select and compare languages for vocational scenarios.", "Recommend a language where requirements conflict.", "Evaluate how language choice affects a software solution."),
      },
      {
        code: "A4", title: "Programming constructs and techniques",
        content: ["commands, constants, local and global variables", "character, string, integer, real and Boolean types", "assignment, input, output, sequence, iteration and selection", "logical operations", "subroutines, functions, procedures, parameters, arrays and data structures"],
        phases: phases("input-process-output and a validated menu program", "Trace, complete, debug and write progressively less-scaffolded code.", "Build a reusable multi-function program from a fresh brief.", "Use appropriate constructs accurately and explain the decisions."),
        availableLessonId: "60000000-0000-0000-0000-000000000001",
      },
      {
        code: "A5–A6", title: "Logic and software quality",
        content: ["Boolean and mathematical logic, truth tables and sets", "efficiency and performance", "maintainability, portability and reliability", "robustness and usability"],
        phases: phases("truth-table decisions and two quality reviews", "Predict logic outcomes and assess code against named quality factors.", "Refactor a correct but low-quality solution and measure the improvement.", "Evaluate how design and implementation affect software quality."),
      },
      {
        code: "B1", title: "Software development life cycle",
        content: ["requirements assessment", "design specification", "development and implementation", "white-box and black-box testing", "refinement and optimisation", "corrective, adaptive and perfective maintenance"],
        phases: phases("a small project moving through every life-cycle stage", "Order, apply and critique life-cycle decisions for different projects.", "Recover a failing project by revising its process.", "Apply the life cycle and keep evidence of decisions and refinements."),
      },
      {
        code: "B2", title: "Software solution design",
        content: ["problem definition, users, constraints, benefits, interaction and complexity", "tasks, inputs, outputs, interfaces and navigation", "flowcharts, pseudocode, events and processing", "data structures, storage, validation and error handling", "language, assets and code selection", "feedback, prototypes and test plans with typical, extreme and erroneous data"],
        phases: phases("a complete design pack and a peer-feedback revision", "Create, review and refine designs that map directly to requirements.", "Resolve conflicting client feedback with a justified decision.", "Produce a feasible, testable design ready for implementation."),
      },
      {
        code: "C1–C2", title: "Developing and testing software",
        content: ["development environments and suitable languages", "refinement, libraries and reusable routines", "test plans and typical, extreme and erroneous data", "functional, stability and compatibility testing"],
        phases: phases("incremental development with a visible test log", "Implement in stages, test each feature and correct defects.", "Add a substantial feature without regressing existing behaviour.", "Produce a functioning, tested solution that meets the brief."),
      },
      {
        code: "C3–C5", title: "Optimisation, review and professional behaviours",
        content: ["improvement, refinement and optimisation", "review against client requirements", "feedback and alternative solutions", "professionalism, accountability, communication and self-management"],
        phases: phases("a before/after optimisation and an evidence-based review", "Use feedback and test evidence to refine code and write balanced judgements.", "Deliver a client project with independent project records.", "Optimise and evaluate the solution while evidencing responsible working."),
      },
    ],
  },
  {
    code: "6",
    title: "Website Development",
    assessment: "Internally assessed: a maximum of two assignments covers learning aim A and combined learning aims B/C.",
    topics: [
      {
        code: "A1", title: "Purpose and principles of website products",
        content: ["content and product/service websites", "audiences and requirements", "usability, layout, accessibility, navigation, typography and consistency", "media, colour, contrast and appropriateness", "creativity, innovation and golden ratio", "SEO: indexing, keywords, updates and crawling"],
        phases: phases("a comparison of two contrasting live-site designs", "Analyse purpose, audience and design principles using annotated evidence.", "Redesign a weak page and justify the expected impact.", "Compare, analyse and evaluate how design principles meet client needs."),
      },
      {
        code: "A2", title: "Factors affecting website performance",
        content: ["server-side and client-side scripts", "browser compliance", "bandwidth, hits and file types", "connection speed, cache, processor and interactivity"],
        phases: phases("a performance waterfall and cross-browser failure", "Predict, measure and explain the effect of client and server factors.", "Optimise under a constrained-device and slow-network scenario.", "Explain performance factors and connect them to user and client requirements."),
      },
      {
        code: "B1", title: "Website design",
        content: ["problem definition, audience, constraints, benefits and interactivity", "client purpose and requirements", "storyboards, mood boards, wireframes and site maps", "realistic prototypes, SEO and responsive alternatives", "pseudocode and BCS-standard flowcharts", "assets, feedback and refinement", "test plans, constraints, copyright and current data protection"],
        phases: phases("a full responsive design pack and a feedback-led revision", "Produce and peer-review designs for a realistic brief.", "Reconcile accessibility, brand and technical constraints.", "Create justified designs that are implementable and testable."),
      },
      {
        code: "B2", title: "Tools and techniques used to produce websites",
        content: ["HTML and semantic structure", "tables and forms", "navigation, links and anchors", "interactive components", "colour, styles and templates", "CSS box model, layout and typography", "multimedia and asset formats", "accessibility, W3C standards and platform compatibility", "asset export and compression"],
        phases: phases("an accessible multi-page site and a responsive form", "Build focused components, validate them and explain tool suitability.", "Recreate a design without sacrificing semantics or accessibility.", "Select and use suitable tools to implement the approved design."),
      },
      {
        code: "C1", title: "Client-side scripting",
        content: ["original scripts embedded in pages", "JavaScript and other client-side languages", "alerts, confirmations, browser detection, rollovers, validation and forms", "syntax, loops, decisions, functions, parameters, events and methods"],
        phases: phases("form validation and an event-driven interactive component", "Trace, repair and write original scripts attached to accessible interfaces.", "Build a useful interaction with graceful failure and no library.", "Use original client-side code to improve interactivity and usability."),
      },
      {
        code: "C2", title: "Website development and publishing",
        content: ["HTML, CSS frameworks and the box model", "original client-side scripts", "mobile and tablet compatibility", "effective use of tools and techniques", "uploading to a web server or host device"],
        phases: phases("a responsive site built and published from a design", "Implement page-by-page while keeping a requirements and evidence log.", "Deliver a polished microsite from a new vocational brief.", "Produce a working site for the intended audience and purpose."),
      },
      {
        code: "C3–C5", title: "Review, optimisation and professional behaviours",
        content: ["comparison with similar websites", "purpose, audience, legal and ethical constraints", "strengths and improvements", "performance and user testing", "feedback, interactivity and compatibility checks", "optimisation and justified recommendations", "professionalism, accountability and self-management"],
        phases: phases("a usability test leading to measurable optimisation", "Test with users and devices, record evidence, refine and retest.", "Optimise an independently built client project and defend priorities.", "Evaluate the design and optimised site against requirements with evidence."),
      },
    ],
  },
];

export const learningCycle = ["Explain", "Worked examples", "Practice", "Challenge", "Assignment goal"] as const;

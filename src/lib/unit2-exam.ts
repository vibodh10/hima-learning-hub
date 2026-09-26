export type Unit2PracticeActivity={
  number:number;
  title:string;
  session:1|2;
  focus:string;
  task:string;
  evidence:string[];
  review:string[];
};

export const unit2PracticeScenarios=[
  {
    id:"community-library",
    title:"Community Library",
    extract:[
      "MemberID, MemberName, Email, BookID, BookTitle, Author, LoanDate, DueDate, ReturnDate",
      "M001, Aisha Khan, aisha@example.org, B014, The Long Road, J Patel, 2026-09-02, 2026-09-16,",
      "M001, Aisha Khan, aisha@example.org, B021, Data Stories, L Chen, 2026-09-04, 2026-09-18, 2026-09-17",
      "M002, Ben Cole, ben@example.org, B014, The Long Road, J Patel, 2026-09-08, 2026-09-22,"
    ],
    note:"The extract deliberately repeats member and book details so learners can identify entities, keys and relationships."
  },
  {
    id:"repair-workshop",
    title:"Vehicle Repair Workshop",
    extract:[
      "CustomerID, CustomerName, VehicleReg, VehicleMake, JobID, JobDate, Fault, PartID, PartName, Quantity",
      "C101, R Malik, AB12CDE, Ford, J9001, 2026-09-03, Brake noise, P15, Brake Pad, 1",
      "C101, R Malik, AB12CDE, Ford, J9001, 2026-09-03, Brake noise, P22, Brake Fluid, 2",
      "C104, S Jones, XY66QRT, Toyota, J9002, 2026-09-04, Battery fault, P31, Battery, 1"
    ],
    note:"The extract contains repeated customer, vehicle, job and part information suitable for relational decomposition."
  }
];

export const unit2PracticeActivities:Unit2PracticeActivity[]=[
  {
    number:1,session:1,title:"Turn a data extract into relational tables",focus:"Current class focus: identify entities, tables, primary keys, foreign keys and relationships from an unfamiliar extract.",
    task:"Study the extract. Propose the tables you would create. For each table, list the fields, choose a primary key, identify any foreign keys and state the relationship between the tables. Explain why your design reduces duplication. Then state what evidence you would capture to prove the structure was created correctly.",
    evidence:["Table names and fields","Primary key for every table","Foreign keys where relationships are required","Relationship type and direction","Short explanation of duplicated data removed","Evidence list: table design view, relationship window and sample records"],
    review:["Each table represents one clear entity or transaction","Every PK uniquely identifies a record","Every FK points to an appropriate parent key","One-to-many relationships are used where the scenario requires them","The design does not keep repeated member/customer/product details in every transaction row","Evidence would let another person verify what was built"]
  },
  {
    number:2,session:1,title:"Define table structures and validation",focus:"Turn the relational design into implementable fields and rules.",
    task:"Create a data dictionary for the main tables. Choose suitable data types, sizes/formats, required fields, validation rules and useful validation messages. Include PK/FK roles and explain two design choices.",
    evidence:["Field name and purpose","Data type and size/format","Required/null rule","Validation rule and message","PK/FK role","Two justified design choices"],
    review:["Types match the values stored","Identifiers are not treated as calculations","Validation rules are testable","Messages tell the user how to correct invalid input","Keys match Activity 1 relationships"]
  },
  {
    number:3,session:1,title:"Build a selection query",focus:"Retrieve useful information from related tables.",
    task:"Design a multi-table selection query for a realistic management question. Include the joins, fields, criteria, at least one calculated value or alias where appropriate, and a useful sort order. Explain what information the query provides.",
    evidence:["Tables and joins","Selected fields","Precise criteria","Calculated field or alias where useful","Sort order","Result evidence"],
    review:["The query answers a clear information need","Join fields match PK/FK relationships","Criteria are unambiguous","Calculated fields are valid","Results are sorted for the intended user"]
  },
  {
    number:4,session:1,title:"Build a parameter or summary query",focus:"Use parameters and aggregation to answer changing questions.",
    task:"Design a query that accepts a useful parameter or produces a grouped summary. Include any joins, aggregate calculation, grouping and sorting. State the expected result for one example input.",
    evidence:["Parameter prompt or summary purpose","Required joins","Aggregate function where relevant","Grouping","Sort order","One expected result"],
    review:["The parameter is meaningful to the user","Grouped fields and aggregate fields are valid together","The result can be checked against a known example","The query could be reused without rebuilding the criteria"]
  },
  {
    number:5,session:2,title:"Create a safe data-entry form",focus:"Build an interface that supports accurate data entry.",
    task:"Plan or build a data-entry form linked to the correct table/query. Include suitable controls, lookup/combo boxes where appropriate, locked or calculated fields, navigation and validation feedback. Explain how the form reduces input errors.",
    evidence:["Correct record source","Appropriate controls","Lookup for related records","Locked/calculated fields where needed","Validation feedback","Screenshot or annotated design"],
    review:["Users do not type foreign-key IDs unnecessarily","Calculated values are not manually re-entered","Required fields are obvious","Validation messages are specific","The form matches the staff task"]
  },
  {
    number:6,session:2,title:"Create a management report",focus:"Present useful information clearly for a named audience.",
    task:"Plan or build a report based on an appropriate query. Include grouping, detail fields, totals or summaries where useful and sensible handling of missing values. Explain why the layout suits the manager or staff member.",
    evidence:["Report record source","Grouping","Relevant detail fields","Totals/summary","Null handling","Audience justification"],
    review:["The report answers a management question","Grouping makes the information easier to read","Totals are calculated from the correct records","Missing values do not create misleading output","The report is based on a tested query"]
  },
  {
    number:7,session:2,title:"Test and gather evidence",focus:"Prove that tables, relationships, validation, queries, forms and reports work.",
    task:"Create a test table with at least eight precise tests using normal, boundary/extreme and erroneous data. Record input, expected result, actual result, pass/fail and evidence. Include at least one failed test, the correction made and a retest.",
    evidence:["Eight exact tests","Normal data","Boundary/extreme data","Erroneous data","Expected result written before testing","Actual result and pass/fail","Screenshot or output evidence","Fix and retest"],
    review:["Tests come from requirements and validation rules","Expected and actual results are different columns","A failure is not hidden or deleted","The retest proves the specific correction","Relationships and referential integrity are tested as well as forms"]
  },
  {
    number:8,session:2,title:"Evaluate the database solution",focus:"Use requirements and evidence to reach a supported judgement.",
    task:"Evaluate the solution against the requirements. Use evidence from design, implementation and testing. Identify strengths, limitations and at least two prioritised improvements, explaining why each matters to the user or organisation.",
    evidence:["Requirement-by-requirement judgement","Design evidence","Testing evidence","Strengths","Limitations","Two prioritised improvements"],
    review:["Every major judgement is supported by evidence","The evaluation distinguishes what was tested from what is assumed","Improvements are specific and feasible","Priorities are justified by user impact, integrity or reliability"]
  }
];

export const unit2PracticeSessions=[
  {number:1,title:"Practice session 1",activities:unit2PracticeActivities.filter(a=>a.session===1)},
  {number:2,title:"Practice session 2",activities:unit2PracticeActivities.filter(a=>a.session===2)},
];

export function unit2Activity(index:number){return unit2PracticeActivities[index];}

import {studyDay} from "./mini-study";

export const assignmentOne = {
  dueOn: "2026-09-28",
  dueLabel: "28 September 2026",
  specification: "https://qualifications.pearson.com/content/dam/pdf/BTEC-Nationals/Information-Technology/2016/specification-and-sample-assessments/specification-pearson-btec-level-3-national-diploma-in-information-technology.pdf",
};

export type AssignmentStep = {
  id: string; from: string; until: string; dates: string; title: string;
  idea: string; task: string[]; evidence: string; help: string;
  links?: {title:string;url:string}[];
  check: {question:string;options:string[];correct:number;feedback:string};
};

/** Teacher-requested preparation dates, not Pearson-set dates or a submission record.
 * Original teaching prompts: no model answers to the learner's assessed comparison.
 * No lesson/assignment completion is inferred from reading these cards.
 */
export const assignmentSteps: AssignmentStep[] = [
  {
    id:"choose",from:"2026-09-15",until:"2026-09-17",dates:"15–17 September",
    title:"Choose your two websites",
    idea:"Start with your teacher's brief. Choose websites that let you make a useful comparison for a similar task.",
    task:["Confirm your two websites with your teacher. Write who each website serves and what it helps those people do.","Choose one task to try on both, such as finding a course's entry requirements. Save the exact page addresses.","Start a source log now: author or organisation, page title, publication or update year, URL and the date you opened it. Check that a footer year really dates the content."],
    evidence:"Two website names and page URLs, an audience and purpose for each, your shared task, and your first source-log entries.",
    help:"If the websites serve different audiences, explain that difference. Do not assume that the same design is best for everyone. Save notes in your own assignment document.",
    check:{question:"Which comparison gives useful evidence?",options:["Choose whichever logo you prefer","Try the same relevant task on both sites","Compare unrelated tasks without explaining the difference"],correct:1,feedback:"A shared task helps you compare what users actually experience. Still explain differences in audience and content."},
  },
  {
    id:"design",from:"2026-09-18",until:"2026-09-20",dates:"18–20 September",
    title:"Look closely at the design",
    idea:"Describe a feature, show where you found it, then explain how it affects the intended user.",
    task:["On each site, try your shared task. Capture a useful screenshot and label the feature you are discussing.","Inspect navigation, layout, spacing, typography, colour, contrast, images and content accuracy. Include creative choices and whether they help the task.","Look at page titles and relevant wording for search discovery. Notice consistency, flexibility and any personalisation. If something cannot be checked, say so."],
    evidence:"Paired observations: feature → evidence on site A → evidence on site B → effect on each audience.",
    help:"Use your own findings. A screenshot needs an explanation. A fashionable layout or golden-ratio proportion does not by itself show that a task is easy to complete.",
    check:{question:"What turns a screenshot into useful comparison evidence?",options:["Explain the feature and its effect on the user","Add as many screenshots as possible without comments","Say that every colourful page is effective"],correct:0,feedback:"Identify what the screenshot shows and connect it to the user's task on each site."},
  },
  {
    id:"accessibility",from:"2026-09-18",until:"2026-09-20",dates:"18–20 September",
    title:"Check access for different users",
    idea:"W3C publishes web standards. WCAG addresses accessibility. A code validator and an accessibility check answer different questions.",
    task:["Use Tab and Shift+Tab to move through the task, and Enter to activate links. Note whether you can see the focused control and finish the task.","Enlarge the page and inspect labels, image alternatives and colour contrast. Use a contrast-checking tool if available; record the colours, result and tool used.","Save a specific barrier or successful check for each site. Explain who is affected and what you did not test."],
    evidence:"The page, test method, observed result, screenshot where useful, and the impact on a user.",
    help:"These are initial checks, not a full accessibility audit. An automated score cannot establish full WCAG conformance. Tool guidance below is practical support, not an extra Pearson grading criterion.",
    links:[{title:"W3C: initial accessibility checks",url:"https://www.w3.org/WAI/test-evaluate/preliminary/"},{title:"W3C: choosing evaluation tools",url:"https://www.w3.org/WAI/test-evaluate/tools/"}],
    check:{question:"A checker reports no accessibility errors. What can you conclude?",options:["Everyone can use the entire site","It meets every WCAG requirement","That checker found none; manual checks and wider testing are still needed"],correct:2,feedback:"Record the tool's scope and your manual observations. A clean automated report is not proof of complete accessibility."},
  },
  {
    id:"validation",from:"2026-09-18",until:"2026-09-20",dates:"18–20 September",
    title:"Use the W3C validators",
    idea:"Validation checks code against rules. It does not measure whether someone can understand the content or finish a task.",
    task:["Open the W3C markup validator below. Enter a public page URL from site A, run the check and save the result. Repeat for site B.","Try the CSS validator for the same pages. Record the date, exact URL and settings. Keep errors and warnings distinct.","Read one reported issue before discussing it. If a site blocks the tool or a result is unclear, record that limitation instead of inventing a result."],
    evidence:"A labelled report for each tested page, one explained finding and a clear limit on what the result proves.",
    help:"Do not rank whole websites just by error counts. A large page and a small page may not be comparable. An error may have different practical effects depending on how browsers handle it.",
    links:[{title:"W3C markup validator",url:"https://validator.w3.org/"},{title:"W3C CSS validator",url:"https://jigsaw.w3.org/css-validator/"}],
    check:{question:"What does a successful markup validation establish?",options:["That the checked markup passed that validation","That the website is fastest","That all users can use every part of the website"],correct:0,feedback:"Keep the conclusion within the test: markup validation does not prove speed, usability or accessibility."},
  },
  {
    id:"performance",from:"2026-09-18",until:"2026-09-20",dates:"18–20 September",
    title:"Measure performance fairly",
    idea:"A loading score is a measurement under particular conditions. Explain those conditions before comparing results.",
    task:["Open a public page in PageSpeed Insights, or use Lighthouse in Chrome DevTools. Run a report, then repeat for the other website using the same device setting.","Record the URL, date, settings and the labelled measurements. Repeat under similar conditions if a result looks unusual. Keep simulated lab results separate from real-user field data.","Read a specific finding, such as image transfer size or delayed visible content. Explain a plausible effect on the task; do not claim access to private server details."],
    evidence:"Comparable reports plus an explanation of a finding, its user impact and the limits of the measurement.",
    help:"Consider network speed, browser and cache, device processing, media files, server demand and where scripts run. Treat an untested cause as a possibility, not an observed fact.",
    links:[{title:"PageSpeed Insights",url:"https://pagespeed.web.dev/"},{title:"Lighthouse instructions",url:"https://developer.chrome.com/docs/lighthouse/overview"}],
    check:{question:"Site A was tested on mobile and B on desktop. Is the score alone a fair comparison?",options:["Yes, a number is always fair","No; use comparable settings and explain the limits","Yes, if A has a better logo"],correct:1,feedback:"Match the test conditions and inspect the findings. One score cannot establish which whole website is better."},
  },
  {
    id:"compare",from:"2026-09-21",until:"2026-09-23",dates:"21–23 September",
    title:"Write your comparison and analysis",
    idea:"Use your own observations to explain similarities, differences and consequences.",
    task:["Choose one design principle. Bring together evidence from both sites in the same discussion.","Explain how the difference affects the audience's task and the client's needs. Repeat for the principles relevant to your brief.","Connect creative choices and performance findings to benefits and drawbacks. Add a citation beside any borrowed idea, definition or claim."],
    evidence:"Your own comparison draft, with evidence identifiers and citations that can be checked.",
    help:"A useful thinking pattern is: feature → observed result → effect on the user → effect on the organisation. This is a planning prompt, not text to submit. Do not invent timings or visitors' opinions.",
    check:{question:"Which approach demonstrates analysis?",options:["Count pictures and stop there","Describe each homepage separately with no links","Explain how a design choice changes the user's ability to complete a task"],correct:2,feedback:"Analysis explains connected effects. Support the connection using your evidence and acknowledge uncertainty."},
  },
  {
    id:"evaluate",from:"2026-09-24",until:"2026-09-25",dates:"24–25 September",
    title:"Reach a balanced judgement",
    idea:"Weigh the strongest evidence. Explain what works well, what causes problems and why your judgement matters.",
    task:["Decide which design choices best meet the users' and client's requirements, using evidence from both websites.","Discuss benefits, drawbacks and likely organisational effects. Consider creativity and performance as well as appearance.","Explain a limitation of your investigation and recommend a specific improvement with a reason."],
    evidence:"An independent, balanced conclusion that follows from your own comparison and analysis.",
    help:"A website may suit one task better and another worse. Explain the trade-off instead of declaring a winner from an overall score. Your assessor decides whether the criteria are met.",
    check:{question:"Which judgement is most defensible?",options:["A conclusion supported by findings and qualified by test limitations","This site is always best because I like it","The checker gave 100, so no improvement is possible"],correct:0,feedback:"Evaluation weighs evidence and limitations. An unsupported preference or tool score is not enough."},
  },
  {
    id:"harvard",from:"2026-09-24",until:"2026-09-25",dates:"24–25 September",
    title:"Credit your sources with Harvard referencing",
    idea:"Use a short author–date citation beside a borrowed idea, and full details in your reference list. Pearson's Unit 6 specification does not prescribe a Harvard variant.",
    task:["Use your source log. A citation such as (Pearson, 2020) points the reader to the matching reference. The year belongs to the source, not the year you accessed it.","For a webpage, use this teaching format consistently: Author or organisation (Year) Page title. Available at: URL (Accessed: day month year). Use the actual page details; never guess them.","If no date is supplied, use ‘no date’ consistently. If no named author is given, check for the responsible organisation. Put references in author order, and distinguish the same author's same-year sources with a, b and so on."],
    evidence:"A reference list matching the citations in your text, including the websites investigated and any guidance you actually used.",
    help:"Paraphrasing still needs a citation. Put exact borrowed wording in quotation marks and include a page number where one exists. Caption your screenshots with the site/page and capture date. Follow any formatting instructions in your teacher's brief. The example below illustrates a format; it is not an extra Pearson criterion.",
    links:[{title:"Pearson Diploma specification — source for the example",url:assignmentOne.specification}],
    check:{question:"You explain a source's idea in your own words. What should you do?",options:["Omit the source because the words are yours","Add an author–date citation and a matching full reference","Invent a recent year so the reference looks current"],correct:1,feedback:"Your wording can be original while the idea comes from a source. Credit the source and use its real details."},
  },
  {
    id:"review",from:"2026-09-26",until:"2026-09-27",dates:"26–27 September",
    title:"Check your work against the brief",
    idea:"Leave time to check evidence, references and the file you will submit.",
    task:["Read the actual assignment brief beside your work. Check that both websites, audience and purpose, design, creativity and performance are addressed.","Check that screenshots are readable, measurements have dates and conditions, and judgements follow from evidence. Remove placeholders and unsupported claims.","Open every reference link and match citations to references. Save a backup, open the final file and check the required format, submission location and deadline time with your teacher."],
    evidence:"A checked final file and confirmation of the teacher's submission instructions.",
    help:"Reading these steps or passing a practice check does not mean the assignment is complete. If you are behind, ask your teacher which missing evidence to prioritise.",
    check:{question:"What should you do before submitting?",options:["Assume the portal has submitted it for you","Rely on your quiz score","Open the final file and check it against the actual brief"],correct:2,feedback:"The guide does not inspect or submit your file. Verify the final document and use the teacher's required submission route."},
  },
  {
    id:"submit",from:"2026-09-28",until:"2026-09-28",dates:"28 September",
    title:"Submit through your teacher's chosen route",
    idea:"Your due date is 28 September. Confirm the exact time; do not assume it is midnight.",
    task:["Submit your own final work to the location your teacher specified, before the confirmed time.","Check the correct file arrived and keep the submission confirmation or receipt.","If upload fails or you need support, contact your teacher promptly and keep evidence of the issue."],
    evidence:"The submission receipt from the actual submission system.",
    help:"This guide cannot confirm receipt, award a grade or change the deadline. An agreed individual extension takes precedence over these general preparation dates.",
    check:{question:"What confirms that the assignment was received?",options:["A receipt or confirmation from the actual submission system","Finishing this guide","A practice quiz score"],correct:0,feedback:"Check the real submission confirmation and its file details. This guide does not submit assignments."},
  },
];

export function assignmentSchedule(now: Date, steps: AssignmentStep[] = assignmentSteps) {
  const today=studyDay(now);
  const phase=today>assignmentOne.dueOn?"past":today===assignmentOne.dueOn?"due":today<steps[0].from?"before":"preparing";
  const current=phase==="past"?steps.length-1:Math.max(0,steps.findIndex(step=>today<=step.until));
  const days=Math.round((Date.parse(`${assignmentOne.dueOn}T12:00:00Z`)-Date.parse(`${today}T12:00:00Z`))/86400000);
  return {today,phase,current,days} as const;
}

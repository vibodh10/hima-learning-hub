export type SowRelease={lessonId:string;releaseOn:string;title:string};

/**
 * Automatic second-practice release dates for the 2026-27 teaching sequence.
 * Dates are placed after the corresponding classroom teaching point so the
 * Digital Learning Hub reinforces taught content rather than introducing it.
 */
const unit4Releases:SowRelease[]=[
  {lessonId:"u4-variables-v1",releaseOn:"2026-09-01",title:"Variables"},
  {lessonId:"u4-data-types-operators-v1",releaseOn:"2026-09-04",title:"Data types and operators"},
  {lessonId:"u4-selection-v1",releaseOn:"2026-09-08",title:"Selection and control statements"},
  {lessonId:"u4-iteration-v1",releaseOn:"2026-09-11",title:"Loops and iteration"},
  {lessonId:"u4-functions-basics-v1",releaseOn:"2026-09-18",title:"Create and call simple functions"},
  {lessonId:"u4-functions-parameters-v1",releaseOn:"2026-09-23",title:"Functions with parameters and return values"},
  {lessonId:"u4-scope-v1",releaseOn:"2026-09-25",title:"Local and global scope"},
  {lessonId:"u4-file-handling-v1",releaseOn:"2026-09-30",title:"Open, read, write and close files"},
  {lessonId:"u4-files-functions-v1",releaseOn:"2026-10-02",title:"Use files with functions"},
  {lessonId:"u4-arrays-collections-v1",releaseOn:"2026-10-07",title:"Lists, arrays and collections"},
  {lessonId:"u4-tuples-dictionaries-v1",releaseOn:"2026-10-09",title:"Tuples and dictionaries"},
  {lessonId:"u4-validation-errors-v1",releaseOn:"2026-10-14",title:"Validation and error handling"},
  {lessonId:"u4-modular-programming-v1",releaseOn:"2026-10-16",title:"Modular programming"},
  {lessonId:"u4-boolean-logic-v1",releaseOn:"2026-10-21",title:"Boolean logic"},
  {lessonId:"u4-language-paradigms-v1",releaseOn:"2026-11-04",title:"Event-driven programming"},
  {lessonId:"u4-pygame-events-v1",releaseOn:"2026-11-06",title:"Pygame events and user interaction"},
  {lessonId:"u4-sdlc-v1",releaseOn:"2026-11-11",title:"Software development life cycle"},
  {lessonId:"u4-pseudocode-flowcharts-v1",releaseOn:"2026-11-13",title:"Pseudocode and flowcharts"},
  {lessonId:"u4-csv-data-v1",releaseOn:"2026-11-18",title:"CSV data in an application"},
  {lessonId:"u4-software-quality-v1",releaseOn:"2026-11-20",title:"Software quality"},
  {lessonId:"u4-testing-v1",releaseOn:"2026-11-25",title:"Testing typical, extreme and erroneous data"},
  {lessonId:"u4-debug-refactor-v1",releaseOn:"2026-11-27",title:"Debugging and refactoring"},
  {lessonId:"u4-libraries-reuse-v1",releaseOn:"2026-12-02",title:"Libraries and reusable routines"},
];

// Unit 19 follows the supplied 20-week IoT delivery plan. Friday release dates
// place Hub practice after that week's teaching focus.
const unit19Releases:SowRelease[]=[
  {lessonId:"u19-iot-foundations-v1",releaseOn:"2026-09-11",title:"Recognise a complete IoT system"},
  {lessonId:"u19-applications-v1",releaseOn:"2026-09-18",title:"Purpose and applications of IoT"},
  {lessonId:"u19-principles-v1",releaseOn:"2026-09-25",title:"IoT principles and data-to-action"},
  {lessonId:"u19-architecture-v1",releaseOn:"2026-10-02",title:"IoT architecture and characteristics"},
  {lessonId:"u19-edge-cloud-v1",releaseOn:"2026-10-02",title:"Local and cloud processing"},
  {lessonId:"u19-risks-v1",releaseOn:"2026-10-09",title:"IoT risks and issues"},
  {lessonId:"u19-compare-sectors-v1",releaseOn:"2026-10-16",title:"Compare and evaluate IoT systems"},
  {lessonId:"u19-client-requirements-v1",releaseOn:"2026-10-23",title:"Robot scenario and client requirements"},
  {lessonId:"u19-sense-act-v1",releaseOn:"2026-11-13",title:"Sensors, controllers and actuators"},
  {lessonId:"u19-communication-v1",releaseOn:"2026-11-20",title:"IoT communication choices"},
  {lessonId:"u19-design-docs-v1",releaseOn:"2026-11-27",title:"Design documentation and diagrams"},
  {lessonId:"u19-prototype-evidence-v1",releaseOn:"2026-12-04",title:"Prototype build evidence"},
  {lessonId:"u19-data-handling-v1",releaseOn:"2026-12-11",title:"Capture, display and store IoT data"},
  {lessonId:"u19-failure-v1",releaseOn:"2026-12-18",title:"Test missing and implausible readings"},
  {lessonId:"u19-feedback-improvement-v1",releaseOn:"2027-01-08",title:"Improve the design from feedback"},
  {lessonId:"u19-security-reliability-v1",releaseOn:"2027-01-22",title:"Security and reliability review"},
  {lessonId:"u19-final-evidence-v1",releaseOn:"2027-01-29",title:"Final testing evidence"},
  {lessonId:"u19-evaluation-v1",releaseOn:"2027-02-05",title:"Evaluate against requirements"},
];

const alwaysAvailable:Record<string,SowRelease[]>={
  "2":[
    {lessonId:"u2-records-v1",releaseOn:"0001-01-01",title:"Records and fields"},
    {lessonId:"u2-validation-v1",releaseOn:"0001-01-01",title:"Validation"},
    {lessonId:"u2-queries-reports-v1",releaseOn:"0001-01-01",title:"Queries and reports"},
  ],
  "6":[
    {lessonId:"u6-html-page-basics-v1",releaseOn:"0001-01-01",title:"HTML page structure"},
    {lessonId:"u6-links-images-folders-v1",releaseOn:"0001-01-01",title:"Links, images and folders"},
    {lessonId:"u6-css-methods-v1",releaseOn:"0001-01-01",title:"CSS methods"},
  ],
};

export function sowReleasesFor(unitCode:string):SowRelease[]{
  if(unitCode==="4")return unit4Releases;
  if(unitCode==="19")return unit19Releases;
  return alwaysAvailable[unitCode]??[];
}

export function releasedSowLessonIds(unitCode:string,day:string):string[]{
  return sowReleasesFor(unitCode).filter(item=>item.releaseOn<=day).map(item=>item.lessonId);
}

export function nextSowRelease(unitCode:string,day:string):SowRelease|undefined{
  return sowReleasesFor(unitCode).find(item=>item.releaseOn>day);
}

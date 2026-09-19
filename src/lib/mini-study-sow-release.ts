export type SowRelease={lessonId:string;releaseOn:string;title:string};

/**
 * Automatic second-practice release dates for the 2026-27 teaching sequence.
 * Unit 4 follows the tutor's current Tuesday/Friday progression: existing
 * foundations first, then functions with parameters/returns, files, data
 * structures, error handling/modularity, event-driven work and project skills.
 * Release dates are deliberately after the relevant classroom teaching point so
 * the Digital Learning Hub remains reinforcement rather than first teaching.
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
  return alwaysAvailable[unitCode]??[];
}

export function releasedSowLessonIds(unitCode:string,day:string):string[]{
  return sowReleasesFor(unitCode).filter(item=>item.releaseOn<=day).map(item=>item.lessonId);
}

export function nextSowRelease(unitCode:string,day:string):SowRelease|undefined{
  return sowReleasesFor(unitCode).find(item=>item.releaseOn>day);
}

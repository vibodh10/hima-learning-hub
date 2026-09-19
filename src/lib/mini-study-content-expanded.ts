import {studyContentFor as baseStudyContentFor} from "./mini-study-content";
import {unit6PerformanceStudy} from "./mini-study-unit6-performance";
import {unit6ExtensionStudy} from "./mini-study-unit6-extension";
import {unit4TaughtProgressStudy,unit6TaughtProgressStudy} from "./mini-study-taught-progress";
import {unit4SowPracticeStudy} from "./mini-study-unit4-sow-practice";

/**
 * The wider lesson bank remains available for future teaching progress, while
 * the assessment/second-practice planner decides which lessons are released by
 * the SOW calendar. Existing content IDs stay unchanged.
 */
export function studyContentFor(unitCode:string) {
  const base=baseStudyContentFor(unitCode);
  if(!base)return undefined;
  if(unitCode==="4")return {...base,version:"u4-complete-v3",lessons:[...base.lessons,...unit4TaughtProgressStudy.lessons,...unit4SowPracticeStudy.lessons]};
  if(unitCode!=="6")return base;
  return {...base,version:"u6-complete-v2",lessons:[...base.lessons,...unit6PerformanceStudy.lessons,...unit6ExtensionStudy.lessons,...unit6TaughtProgressStudy.lessons]};
}

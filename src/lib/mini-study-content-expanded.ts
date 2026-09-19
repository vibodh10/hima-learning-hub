import {studyContentFor as baseStudyContentFor} from "./mini-study-content";
import {unit6PerformanceStudy} from "./mini-study-unit6-performance";
import {unit6ExtensionStudy} from "./mini-study-unit6-extension";
import {unit4TaughtProgressStudy,unit6TaughtProgressStudy} from "./mini-study-taught-progress";

/**
 * The wider lesson bank remains available for future teaching progress, but the
 * assessment/second-practice planner selects only tutor-confirmed taught topics.
 * Existing content IDs stay unchanged.
 */
export function studyContentFor(unitCode:string) {
  const base=baseStudyContentFor(unitCode);
  if(!base)return undefined;
  if(unitCode==="4")return {...base,version:"u4-complete-v2",lessons:[...base.lessons,...unit4TaughtProgressStudy.lessons]};
  if(unitCode!=="6")return base;
  return {...base,version:"u6-complete-v2",lessons:[...base.lessons,...unit6PerformanceStudy.lessons,...unit6ExtensionStudy.lessons,...unit6TaughtProgressStudy.lessons]};
}

import {studyContentFor as baseStudyContentFor} from "./mini-study-content";
import {unit6PerformanceStudy} from "./mini-study-unit6-performance";
import {unit6ExtensionStudy} from "./mini-study-unit6-extension";

/**
 * Student self-study uses the complete bank. Existing content IDs stay unchanged,
 * while Unit 6 gains performance, design, build, scripting, publishing and stretch steps.
 */
export function studyContentFor(unitCode:string) {
  const base=baseStudyContentFor(unitCode);
  if(!base)return undefined;
  if(unitCode!=="6")return base;
  return {...base,version:"u6-complete-v1",lessons:[...base.lessons,...unit6PerformanceStudy.lessons,...unit6ExtensionStudy.lessons]};
}

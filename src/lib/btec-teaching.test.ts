import {describe,expect,it} from "vitest";
import {configuredUnits} from "./learning-catalog";
import {teachingSequenceFor} from "./btec-teaching";

describe("BTEC teaching sequences",()=>{
 it("introduces progress checks without assignment administration",()=>{
  for(const unit of configuredUnits)for(const topic of unit.topics){
   const cards=teachingSequenceFor(unit,topic,"Core");
   expect(cards[0].points[0].explanation).toContain("where you need support");
   expect(JSON.stringify([cards[0],cards.at(-1)])).not.toMatch(/assignment brief|assignment evidence|upload|submission deadline/i);
   expect(cards.at(-1)?.title).toBe("Explain what you have learned");
  }
 });
 it("keeps new unit concept cards to one idea at a time",()=>{
  for(const unit of configuredUnits.filter(unit=>["5","11","16"].includes(unit.code)))for(const topic of unit.topics){
   const cards=teachingSequenceFor(unit,topic,"Support").filter(card=>card.id.startsWith("concept-"));
   expect(cards).toHaveLength(topic.content.length);
   expect(cards.every(card=>card.points.length===1)).toBe(true);
  }
 });
 it("explicitly teaches every Pearson content point in every topic",()=>{let concepts=0;for(const unit of configuredUnits)for(const topic of unit.topics){const cards=teachingSequenceFor(unit,topic,"Core"),points=cards.flatMap(card=>card.points.map(point=>point.concept));for(const concept of topic.content){expect(points).toContain(concept);concepts++}expect(cards.length).toBeGreaterThanOrEqual(4);expect(cards.every(card=>card.purpose&&card.misconception&&card.checkQuestion&&card.checkAnswer),`complete cards for ${unit.code} ${topic.code}`).toBe(true);for(const point of cards.flatMap(card=>card.points))expect(point.explanation.length>100&&point.example.length>40,`${unit.code} ${topic.code}: ${point.concept} (${point.explanation.length}/${point.example.length})`).toBe(true)}expect(concepts).toBeGreaterThan(180)});
 it("uses domain-specific explanations for representative units",()=>{const text=(unit:string,topic:string)=>teachingSequenceFor(configuredUnits.find(item=>item.code===unit)!,configuredUnits.find(item=>item.code===unit)!.topics.find(item=>item.code===topic)!,"Core").flatMap(card=>card.points.map(point=>`${point.explanation} ${point.example}`)).join(" ").toLowerCase();expect(text("2","A3")).toContain("anomal");expect(text("4","A4")).toContain("program");expect(text("6","B2")).toContain("semantic");expect(text("8",configuredUnits.find(item=>item.code==="8")!.topics[0].code)).toContain("player");expect(text("9",configuredUnits.find(item=>item.code==="9")!.topics[0].code)).toContain("project");expect(text("19","B2")).toContain("sensor")});
});

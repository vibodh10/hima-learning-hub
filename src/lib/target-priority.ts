export type TargetCandidate={
  id:string;unit_id:string|null;skill_id:string|null;status:string;
  target_date:string;reason:string;evidence:unknown;approved_by:string|null;
};

export function selectNextTarget<T extends TargetCandidate>(
  targets:T[],assignedUnitIds:Set<string>,activeUnitId:string|undefined,
  now=new Date(),
):T|undefined{
  const assigned=targets.filter(target=>Boolean(target.unit_id&&assignedUnitIds.has(target.unit_id)));
  const live=(target:T)=>["approved","active","extended"].includes(target.status);
  return assigned.find(target=>target.unit_id===activeUnitId&&Boolean(target.skill_id)&&live(target))
    ??assigned.find(target=>target.status==="approved"&&new Date(target.target_date)<now)
    ??assigned.find(target=>live(target)&&isRetrievalTarget(target.evidence,target.reason))
    ??assigned.find(target=>live(target)&&Boolean(target.approved_by))
    ??assigned.find(target=>target.unit_id!==activeUnitId&&live(target)&&isDeliberatelyScheduled(target.evidence));
}

function asRecord(value:unknown):Record<string,unknown>{
  return value&&typeof value==="object"&&!Array.isArray(value)?value as Record<string,unknown>:{};
}
function isRetrievalTarget(value:unknown,reason:string){
  const record=asRecord(value);
  return `${record.source??""} ${record.assessment_kind??""} ${reason}`.toLowerCase().includes("retrieval");
}
function isDeliberatelyScheduled(value:unknown){
  return asRecord(value).deliberately_scheduled===true;
}

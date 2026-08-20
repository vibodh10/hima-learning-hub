export type CountableActivity={
  id:string;
  published:boolean;
  archived:boolean;
  lockedFuture:boolean;
  inAssignedScope:boolean;
  testMode:boolean;
  required:boolean;
  completed:boolean;
};

export type ActivityProgressSummary={
  assigned:number;completed:number;required:number;optional:number;percentage:number;
};

export function summariseActivityProgress(rows:CountableActivity[]):ActivityProgressSummary{
  const unique=new Map<string,CountableActivity>();
  for(const row of rows){
    if(!row.published||row.archived||row.lockedFuture||!row.inAssignedScope||row.testMode)continue;
    const existing=unique.get(row.id);
    unique.set(row.id,existing?{...existing,completed:existing.completed||row.completed}:row);
  }
  const activities=[...unique.values()];
  const assigned=activities.length;
  const completed=activities.filter(activity=>activity.completed).length;
  return{
    assigned,completed,
    required:activities.filter(activity=>activity.required).length,
    optional:activities.filter(activity=>!activity.required).length,
    percentage:assigned?Math.round(completed/assigned*100):0,
  };
}

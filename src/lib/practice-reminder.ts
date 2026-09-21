export function practiceDueSince(today:string,days:number[],starts:string|null,ends:string|null,enrolled:string,lastCompleted:string|null):string|null {
 if(ends&&today>ends)return null;
 const joined=enrolled.slice(0,10);
 for(let offset=1;offset<=7;offset++){
  const date=new Date(`${today}T12:00:00Z`);date.setUTCDate(date.getUTCDate()-offset);
  const day=date.toISOString().slice(0,10);const weekday=date.getUTCDay()||7;
  if(days.includes(weekday)&&(!starts||day>=starts)&&day>joined)return !lastCompleted||lastCompleted.slice(0,10)<day?day:null;
 }
 return null;
}

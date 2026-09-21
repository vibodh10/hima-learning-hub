export type StudentPracticeBadge={id:string;missed_on:string};

export function StudentPracticeBadges({misses}:{misses:StudentPracticeBadge[]}){
  if(!misses.length)return null;
  return <section className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4" aria-label="Missed practice badges">
    <p className="font-semibold">Missed practice this week</p>
    <div className="mt-2 flex flex-wrap gap-2">{misses.map(miss=><span key={miss.id} className="rounded-full bg-red-700 px-3 py-1 text-sm font-bold text-white" title={miss.missed_on}>Red badge · {miss.missed_on}</span>)}</div>
    <p className="mt-2 text-sm">Each red badge records one required practice day that was not completed by the daily check. It is not a grade.</p>
    {misses.length>=3&&<p className="mt-2 font-semibold">Your tutor has been asked to review the pattern and check whether you need any support.</p>}
  </section>;
}

export function StudentPracticeBadgeExample(){
  return <section className="rounded-xl border border-red-200 bg-red-50 p-4" aria-label="Example missed practice badge">
    <p className="font-semibold">Missed practice this week</p>
    <div className="mt-2 flex flex-wrap gap-2"><span className="rounded-full bg-red-700 px-3 py-1 text-sm font-bold text-white">Red badge · example date</span></div>
    <p className="mt-2 text-sm">Example only. This is the same visual treatment a learner sees when a real missed-practice badge exists.</p>
  </section>;
}

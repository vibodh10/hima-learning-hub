"use client";
import {useState} from "react";
import {task3ModelSources,unit14Task3Models} from "@/lib/unit14-task3-models";
import {unit14Task3ScenarioDrills} from "@/lib/unit14-task3";
import {ModelNetworkDiagram,ModelDataFlowDiagram} from "./unit14-model-diagrams";

export function Unit14Task3ModelAnswers(){
  const [selected,setSelected]=useState(unit14Task3Models[0].id);
  const model=unit14Task3Models.find(item=>item.id===selected)!;
  return <section className="mini-study-panel" aria-labelledby="task3-model-title">
    <h2 id="task3-model-title" className="text-2xl font-bold">Full model answers · Activity 3 (20 marks)</h2>
    <p className="mt-3">Choose a sample scenario, then read the complete design and the teaching notes. These are original worked examples, not official Pearson answers or guaranteed 20/20 scripts. Marks depend on the actual task and the quality of the whole response—not one mark for each item below.</p>
    <label className="mt-4 grid gap-2"><strong>Model-answer scenario</strong><select className="input w-full" value={selected} onChange={event=>setSelected(event.target.value)}>{unit14Task3Models.map(item=><option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
    <p className="mt-4 rounded-xl bg-slate-50 p-4"><strong>Practice brief: </strong>{unit14Task3ScenarioDrills[model.drillIndex]}</p>
    <details className="mini-study-help mt-4" key={model.id}>
      <summary>Read the full model answer: {model.title}</summary>
      <article className="mt-5 grid min-w-0 gap-6 leading-7">
        <section><h3 className="text-xl font-bold">1. Proposed solution and assumptions</h3><p className="mt-2">{model.opening}</p><p className="mt-3"><strong>Assumptions: </strong>{model.assumptions}</p></section>
        <section><h3 className="text-xl font-bold">2. Where the IT goes and why</h3><p className="mt-2">Use these named areas as boundaries on a building/site plan. Exact positions and quantities must follow the real brief.</p><div className="mt-3 grid gap-3">{model.rooms.map(room=><div className="rounded-xl border border-slate-300 p-4" key={room.place}><h4 className="font-bold">{room.place}</h4><p>{room.provision}</p><p className="mt-2"><strong>Why this fits: </strong>{room.reason}</p></div>)}</div></section>
        <section><h3 className="text-xl font-bold">3. Annotated network/service diagram</h3><ModelNetworkDiagram model={model}/><p className="mt-3">{model.networkExplanation}</p></section>
        <section><h3 className="text-xl font-bold">4. Data stored and information produced</h3><div className="mt-3 max-w-full overflow-x-auto" tabIndex={0} role="region" aria-label={`${model.title}: data requirements table`}><table className="w-full min-w-[36rem] border-collapse text-left"><caption className="mb-2 text-left">Records, example fields and their business purpose</caption><thead><tr>{["Record","Data fields","How the records are used"].map(title=><th className="border border-slate-300 bg-slate-50 p-3" scope="col" key={title}>{title}</th>)}</tr></thead><tbody>{model.data.map(item=><tr key={item.record}><th className="border border-slate-300 p-3 align-top" scope="row">{item.record}</th><td className="border border-slate-300 p-3 align-top">{item.fields}</td><td className="border border-slate-300 p-3 align-top">{item.use}</td></tr>)}</tbody></table></div></section>
        <section><h3 className="text-xl font-bold">5. Data flow diagram and explanation</h3><ModelDataFlowDiagram model={model}/><p className="mt-3">{model.flowExplanation}</p></section>
        <section><h3 className="text-xl font-bold">6. Manage users, infrastructure and service continuity</h3>{model.operation.map(text=><p className="mt-3" key={text}>{text}</p>)}</section>
        <section><h3 className="text-xl font-bold">7. Trace two complete user journeys</h3><ol className="mt-3 list-decimal space-y-3 pl-6">{model.journeys.map(text=><li key={text}>{text}</li>)}</ol></section>
        <section><h3 className="text-xl font-bold">8. Future needs and checks before use</h3><p className="mt-2">{model.future}</p></section>
        <aside className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-slate-950"><h3 className="text-xl font-bold">Teacher explanation: why this is a strong response</h3><ul className="mt-3 list-disc space-y-2 pl-6">{model.commentary.map(text=><li key={text}>{text}</li>)}</ul><p className="mt-3">The evidence works together: locations → users → hardware/software → data → processing → useful information. Adapt that reasoning to the actual task. Do not copy these assumptions into a different scenario. A long comparison/evaluation report belongs in Activity 4 when that paper asks for it; Activity 3 needs a designed, explained solution.</p></aside>
      </article>
    </details>
    <details className="mini-study-help mt-4"><summary>How to use these examples and the Pearson guidance</summary><p className="mt-3">First attempt the matching scenario yourself. Compare your design with the example and explain two improvements. Then close the model and try a different scenario. There is no compulsory set of three diagrams: use the written, tabular and annotated diagram evidence requested by the selected task.</p><ul className="mt-3 space-y-2">{task3ModelSources.map(source=><li key={source.url}><a className="link" href={source.url} target="_blank" rel="noreferrer">{source.title}</a></li>)}</ul></details>
  </section>;
}

"use client";

import {useMemo,useState} from "react";

type DiagramKind="network"|"context"|"dfd";
type NodeKind="location"|"device"|"external"|"process"|"store";
type Node={id:number;kind:NodeKind;label:string};
type Link={id:number;from:number;to:number;label:string};

const scenarios=[
  {
    title:"Vehicle repair business",
    text:"Reception books customers. The workshop manager allocates jobs. Mechanics update repair progress. Parts staff update stock. Customers receive booking and completion information.",
    suggested:["network","context","dfd"] as DiagramKind[]
  },
  {
    title:"Two-site dental practice",
    text:"Reception staff at two sites share appointments. Dentists view their own schedules. Patient contact information is stored centrally. Both sites need secure internet access.",
    suggested:["network","context","dfd"] as DiagramKind[]
  },
  {
    title:"Leisure centre",
    text:"Customers book classes. Reception checks places and payments. Instructors view class lists. Managers need occupancy reports. A second site shares the same service.",
    suggested:["network","context","dfd"] as DiagramKind[]
  },
  {
    title:"School IT support",
    text:"Teachers report faults. The support team records tickets, assigns technicians and updates status. Staff receive progress messages. Classrooms connect to shared services through the college network.",
    suggested:["network","context","dfd"] as DiagramKind[]
  }
];

const diagramGuidance:Record<DiagramKind,{title:string;purpose:string;useWhen:string;allowed:NodeKind[];checks:string[];starter:string[]}> = {
  network:{
    title:"Network / infrastructure diagram",
    purpose:"Shows where equipment and services are located and how they connect.",
    useWhen:"Use it when the scenario asks how devices, rooms, sites or shared services are connected.",
    allowed:["location","device"],
    checks:[
      "Named rooms or sites are shown.",
      "Devices and services are placed in sensible locations.",
      "Connections have meaningful labels such as Ethernet, Wi-Fi, internet or VPN.",
      "A user can trace a complete route from their device to the service they need."
    ],
    starter:["Internet","Router / firewall","Core switch","Server / shared service","Reception","Workshop"]
  },
  context:{
    title:"Context diagram",
    purpose:"Shows the whole IT system as one process, with external entities and the information entering or leaving it.",
    useWhen:"Use it first when you need to define the system boundary and who exchanges information with the system.",
    allowed:["external","process"],
    checks:[
      "There is one central system process.",
      "External people or systems are outside the system boundary.",
      "Every arrow is labelled with information, not with a cable or device.",
      "Important inputs and outputs from the scenario are represented."
    ],
    starter:["Customer","IT service","Staff","Supplier"]
  },
  dfd:{
    title:"Data flow diagram",
    purpose:"Shows how information moves, is processed and is stored inside the service.",
    useWhen:"Use it when you need to explain what happens to information after it enters the system.",
    allowed:["external","process","store"],
    checks:[
      "Processes are actions, usually named with verb phrases.",
      "Data stores are saved information, usually named with noun phrases.",
      "External entities are people, departments or outside systems.",
      "Every data flow arrow is labelled.",
      "The diagram shows information movement, not physical network connections."
    ],
    starter:["Customer","Process booking","Booking records","Send confirmation"]
  }
};

const nodeLabels:Record<NodeKind,string>={
  location:"Room / site",
  device:"Device / service",
  external:"External entity",
  process:"Process",
  store:"Data store"
};

export function Unit14DiagramMasteryLab(){
  const [scenarioIndex,setScenarioIndex]=useState(0);
  const [kind,setKind]=useState<DiagramKind>("network");
  const [nodes,setNodes]=useState<Node[]>([]);
  const [links,setLinks]=useState<Link[]>([]);
  const [nodeKind,setNodeKind]=useState<NodeKind>("location");
  const [nodeLabel,setNodeLabel]=useState("");
  const [from,setFrom]=useState("");
  const [to,setTo]=useState("");
  const [linkLabel,setLinkLabel]=useState("");
  const [checked,setChecked]=useState(false);
  const scenario=scenarios[scenarioIndex];
  const guide=diagramGuidance[kind];

  const allowedNodeKind=guide.allowed.includes(nodeKind)?nodeKind:guide.allowed[0];
  const summary=useMemo(()=>{
    const labelledLinks=links.filter(link=>link.label.trim()).length;
    return {nodes:nodes.length,links:links.length,labelledLinks};
  },[nodes,links]);

  function reset(nextKind:DiagramKind=kind){
    setKind(nextKind);
    setNodes([]);
    setLinks([]);
    setNodeKind(diagramGuidance[nextKind].allowed[0]);
    setNodeLabel("");
    setFrom("");
    setTo("");
    setLinkLabel("");
    setChecked(false);
  }

  function addNode(){
    const label=nodeLabel.trim();
    if(!label)return;
    const resolvedKind=guide.allowed.includes(allowedNodeKind)?allowedNodeKind:guide.allowed[0];
    setNodes(current=>[...current,{id:Date.now()+current.length,kind:resolvedKind,label}]);
    setNodeLabel("");
    setChecked(false);
  }

  function addLink(){
    const fromId=Number(from),toId=Number(to),label=linkLabel.trim();
    if(!fromId||!toId||fromId===toId||!label)return;
    setLinks(current=>[...current,{id:Date.now()+current.length,from:fromId,to:toId,label}]);
    setFrom("");
    setTo("");
    setLinkLabel("");
    setChecked(false);
  }

  function removeNode(id:number){
    setNodes(current=>current.filter(node=>node.id!==id));
    setLinks(current=>current.filter(link=>link.from!==id&&link.to!==id));
    setChecked(false);
  }

  function anotherScenario(){
    setScenarioIndex(value=>(value+1)%scenarios.length);
    reset(kind);
  }

  const contextProcessCount=nodes.filter(node=>node.kind==="process").length;
  const dfdProcessCount=nodes.filter(node=>node.kind==="process").length;
  const dfdStoreCount=nodes.filter(node=>node.kind==="store").length;
  const externalCount=nodes.filter(node=>node.kind==="external").length;
  const networkDeviceCount=nodes.filter(node=>node.kind==="device").length;

  const autoChecks = kind==="network"
    ? [
        {ok:nodes.length>=4,text:"At least four useful locations/devices added"},
        {ok:networkDeviceCount>=2,text:"More than one network device/service included"},
        {ok:links.length>=3,text:"Connections show how the solution works"},
        {ok:summary.labelledLinks===links.length&&links.length>0,text:"Every connection is labelled"}
      ]
    : kind==="context"
      ? [
          {ok:contextProcessCount===1,text:"Exactly one whole-system process"},
          {ok:externalCount>=2,text:"At least two relevant external entities"},
          {ok:links.length>=2,text:"Inputs/outputs are represented"},
          {ok:summary.labelledLinks===links.length&&links.length>0,text:"Every information flow is labelled"}
        ]
      : [
          {ok:dfdProcessCount>=1,text:"At least one process"},
          {ok:dfdStoreCount>=1,text:"At least one data store"},
          {ok:externalCount>=1,text:"At least one external entity"},
          {ok:links.length>=3,text:"Information moves between several parts"},
          {ok:summary.labelledLinks===links.length&&links.length>0,text:"Every data flow is labelled"}
        ];

  return <section className="mini-study-panel">
    <p className="mini-study-kicker">Diagram mastery lab</p>
    <h2 className="text-2xl font-bold">Learn it, build it, check it, then do another scenario</h2>
    <p className="mt-2">Do not memorise one finished picture. First decide what the diagram is meant to explain, then build the correct type from the scenario.</p>

    <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><strong>{scenario.title}</strong><p className="mt-1">{scenario.text}</p></div>
        <button className="button-secondary" type="button" onClick={anotherScenario}>Another scenario</button>
      </div>
    </div>

    <div className="mt-5 grid gap-3 md:grid-cols-3">
      {(Object.keys(diagramGuidance) as DiagramKind[]).map(item=><button key={item} type="button" className={kind===item?"button text-left":"button-secondary text-left"} onClick={()=>reset(item)}>
        <strong>{diagramGuidance[item].title}</strong><span className="mt-1 block text-sm">{diagramGuidance[item].purpose}</span>
      </button>)}
    </div>

    <div className="mt-5 rounded-xl border border-slate-200 p-4">
      <h3 className="font-bold">{guide.title}</h3>
      <p className="mt-2"><strong>What it is for:</strong> {guide.purpose}</p>
      <p className="mt-1"><strong>When to use it:</strong> {guide.useWhen}</p>
      <details className="mt-3"><summary className="cursor-pointer font-semibold">Show a few starter ideas</summary><p className="mt-2 text-sm">{guide.starter.join(" · ")}</p></details>
    </div>

    <div className="mt-5 grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
      <div className="rounded-xl border border-slate-200 p-4">
        <h3 className="font-bold">1. Add parts to your diagram</h3>
        <label className="mt-3 grid gap-1"><span className="font-semibold">Type</span><select className="input" value={allowedNodeKind} onChange={event=>{setNodeKind(event.target.value as NodeKind);setChecked(false);}}>
          {guide.allowed.map(item=><option key={item} value={item}>{nodeLabels[item]}</option>)}
        </select></label>
        <label className="mt-3 grid gap-1"><span className="font-semibold">Label</span><input className="input" value={nodeLabel} onChange={event=>setNodeLabel(event.target.value)} placeholder={kind==="network"?"e.g. Reception switch":kind==="context"?"e.g. Customer":"e.g. Process booking"}/></label>
        <button className="mini-study-primary mt-3" type="button" disabled={!nodeLabel.trim()} onClick={addNode}>Add to diagram</button>

        <h3 className="mt-6 font-bold">2. Connect the parts</h3>
        <label className="mt-3 grid gap-1"><span className="font-semibold">From</span><select className="input" value={from} onChange={event=>setFrom(event.target.value)}><option value="">Choose</option>{nodes.map(node=><option key={node.id} value={node.id}>{node.label}</option>)}</select></label>
        <label className="mt-3 grid gap-1"><span className="font-semibold">To</span><select className="input" value={to} onChange={event=>setTo(event.target.value)}><option value="">Choose</option>{nodes.map(node=><option key={node.id} value={node.id}>{node.label}</option>)}</select></label>
        <label className="mt-3 grid gap-1"><span className="font-semibold">{kind==="network"?"Connection":"Information flow"} label</span><input className="input" value={linkLabel} onChange={event=>setLinkLabel(event.target.value)} placeholder={kind==="network"?"Ethernet / Wi-Fi / VPN":"booking request / confirmation / stock update"}/></label>
        <button className="mini-study-primary mt-3" type="button" disabled={!from||!to||from===to||!linkLabel.trim()} onClick={addLink}>Add connection</button>
      </div>

      <div className="rounded-xl border border-slate-300 bg-white p-4">
        <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-bold">My {guide.title.toLowerCase()}</h3><span className="text-sm text-slate-600">{summary.nodes} parts · {summary.links} connections</span></div>
        {!nodes.length?<p className="mt-6 rounded-lg bg-slate-50 p-6 text-center">Your diagram will appear here as you add parts.</p>:<div className="mt-4 grid gap-3">
          {nodes.map(node=><div key={node.id} className={`rounded-xl border-2 p-3 ${node.kind==="process"?"rounded-full":node.kind==="store"?"border-x-4":""}`}>
            <div className="flex items-center justify-between gap-2"><span><strong>{node.label}</strong><small className="ml-2 text-slate-500">{nodeLabels[node.kind]}</small></span><button type="button" className="text-sm underline" onClick={()=>removeNode(node.id)}>remove</button></div>
          </div>)}
          {links.length>0&&<div className="mt-2 border-t border-slate-200 pt-3"><strong>Connections / flows</strong><ul className="mt-2 space-y-2">{links.map(link=>{const a=nodes.find(node=>node.id===link.from),b=nodes.find(node=>node.id===link.to);return <li key={link.id} className="rounded-lg bg-slate-50 p-2">{a?.label} → <strong>{link.label}</strong> → {b?.label}</li>})}</ul></div>}
        </div>}
      </div>
    </div>

    <div className="mt-5 flex flex-wrap gap-3"><button className="mini-study-primary" type="button" onClick={()=>setChecked(true)} disabled={!nodes.length}>Check my diagram</button><button className="button-secondary" type="button" onClick={()=>reset(kind)}>Clear and try again</button></div>
    {checked&&<div className="mt-5 grid gap-3 md:grid-cols-2">
      <div className="rounded-xl bg-slate-50 p-4"><h3 className="font-bold">Automatic checks</h3><ul className="mt-2 space-y-2">{autoChecks.map(item=><li key={item.text}>{item.ok?"✓":"○"} {item.text}</li>)}</ul></div>
      <div className="rounded-xl bg-slate-50 p-4"><h3 className="font-bold">Examiner-style self-check</h3><ul className="mt-2 list-disc space-y-2 pl-5">{guide.checks.map(item=><li key={item}>{item}</li>)}</ul></div>
    </div>}

    <details className="mini-study-help mt-5"><summary>Why are these diagrams different?</summary>
      <p><strong>Network / infrastructure:</strong> where equipment is and how it connects.</p>
      <p><strong>Context diagram:</strong> the whole system as one process and the people/systems exchanging information with it.</p>
      <p><strong>DFD:</strong> what happens to the information inside the system, including processes and stores.</p>
      <p className="mt-2">A context diagram is part of the data-flow modelling family. It is not a completely unrelated diagram type. A data model/ERD can still be useful when record relationships need explaining, but it should not be taught as a compulsory third Unit 14 diagram.</p>
    </details>
  </section>;
}

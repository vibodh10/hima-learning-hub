"use client";

import {useState} from "react";

type PearsonDiagram="functional"|"dfd"|"floor"|"network";

const scenarios=[
  {
    title:"Vehicle repair business",
    text:"Reception books customers. A workshop manager allocates jobs. Mechanics update repair progress. Parts staff update stock. Customers receive booking and completion information."
  },
  {
    title:"Two-site dental practice",
    text:"Reception staff share appointments across two sites. Dentists view their schedules. Patient contact information is stored centrally. Both sites need secure access to shared services."
  },
  {
    title:"Leisure centre",
    text:"Customers book classes. Reception checks places and payments. Instructors view class lists. Managers need occupancy reports. A second site uses the same service."
  },
  {
    title:"School IT support",
    text:"Teachers report faults. The support team records tickets, assigns technicians and updates status. Staff receive progress information. Classrooms connect to shared college services."
  }
];

const pearsonNames:Record<PearsonDiagram,{title:string;purpose:string;question:string}> = {
  functional:{
    title:"Functional chart",
    purpose:"Represents the functions or areas of the organisation so IT service requirements can be identified.",
    question:"Which organisational functions need IT support, and what does each function need to do?"
  },
  dfd:{
    title:"Data flow diagram (DFD)",
    purpose:"Represents how data and information move between external entities, processes and data stores.",
    question:"What data enters the system, what happens to it, where is it stored, and what information leaves?"
  },
  floor:{
    title:"Building / floor plan",
    purpose:"Represents the physical locations in the organisation and where IT provision is required.",
    question:"Where are staff located, and what hardware, software and access are needed in each location?"
  },
  network:{
    title:"Network diagram",
    purpose:"Represents the network components and connections needed to deliver the IT service.",
    question:"How are devices, network components, sites and shared services connected?"
  }
};

function FunctionalChartExample(){
  return <figure className="rounded-2xl border border-slate-300 bg-white p-5">
    <figcaption className="text-lg font-bold">Worked example · Functional chart</figcaption>
    <p className="mt-1 text-sm text-slate-600">Vehicle repair business. This is a Pearson-aligned worked example, not a prescribed Pearson template.</p>
    <div className="mt-5 flex flex-col items-center gap-4 text-center">
      <div className="rounded-xl border-2 border-slate-800 px-8 py-3 font-bold">Vehicle repair business</div>
      <div aria-hidden="true">↓</div>
      <div className="grid w-full gap-4 md:grid-cols-4">
        <div className="rounded-xl border-2 border-slate-700 p-4"><strong>Reception</strong><p className="mt-2 text-sm">Bookings · customer details · payments · communication</p></div>
        <div className="rounded-xl border-2 border-slate-700 p-4"><strong>Workshop</strong><p className="mt-2 text-sm">Repair jobs · diagnostics · job progress</p></div>
        <div className="rounded-xl border-2 border-slate-700 p-4"><strong>Parts / stock</strong><p className="mt-2 text-sm">Stock levels · parts ordering · availability</p></div>
        <div className="rounded-xl border-2 border-slate-700 p-4"><strong>Management</strong><p className="mt-2 text-sm">Reports · staffing · performance · planning</p></div>
      </div>
    </div>
  </figure>;
}

function DfdExample(){
  return <figure className="rounded-2xl border border-slate-300 bg-white p-5">
    <figcaption className="text-lg font-bold">Worked example · Data flow diagram (DFD)</figcaption>
    <p className="mt-1 text-sm text-slate-600">The arrows are labelled with data or information, not with network cables.</p>
    <div className="mt-5 grid gap-4 md:grid-cols-[1fr_auto_1.2fr_auto_1fr] md:items-center text-center">
      <div className="border-2 border-slate-800 p-4"><strong>Customer</strong><p className="text-sm">external entity</p></div>
      <div className="font-semibold">booking details →</div>
      <div className="rounded-full border-2 border-slate-800 p-5"><strong>1.0 Process booking</strong><p className="text-sm">process</p></div>
      <div className="font-semibold">booking record →</div>
      <div className="border-x-4 border-slate-800 p-4"><strong>Booking records</strong><p className="text-sm">data store</p></div>
    </div>
    <div className="mt-4 text-center font-semibold">Process booking → booking confirmation → Customer</div>
    <div className="mt-5 rounded-xl bg-slate-50 p-4 text-sm">
      <strong>Context-level DFD note:</strong> a context-level view can show the whole system as one process with its external entities and flows. It is a way of presenting a DFD at a high level; it is not listed by Pearson as a separate fifth diagram category in Unit 14.
    </div>
  </figure>;
}

function FloorPlanExample(){
  return <figure className="rounded-2xl border border-slate-300 bg-white p-5">
    <figcaption className="text-lg font-bold">Worked example · Building / floor plan</figcaption>
    <p className="mt-1 text-sm text-slate-600">This is the large room-style diagram. It shows physical areas first, then annotates the IT provision required in each area.</p>
    <div className="mt-5 grid gap-5 xl:grid-cols-[1.3fr_0.7fr]">
      <div className="grid min-h-[520px] grid-cols-2 grid-rows-2 border-4 border-slate-900">
        <div className="border-b-2 border-r-2 border-slate-900 p-5">
          <h4 className="text-lg font-bold">Reception</h4>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border p-3"><strong>Hardware</strong><p className="mt-2 text-sm">2 × PCs<br/>network printer<br/>VoIP phone</p></div>
            <div className="rounded-lg border p-3"><strong>Software / data</strong><p className="mt-2 text-sm">booking system<br/>payment software<br/>customer details</p></div>
          </div>
        </div>
        <div className="border-b-2 border-slate-900 p-5">
          <h4 className="text-lg font-bold">Manager office</h4>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border p-3"><strong>Hardware</strong><p className="mt-2 text-sm">laptop / desktop<br/>network printer access</p></div>
            <div className="rounded-lg border p-3"><strong>Software / data</strong><p className="mt-2 text-sm">reporting tools<br/>staff information<br/>management reports</p></div>
          </div>
        </div>
        <div className="border-r-2 border-slate-900 p-5">
          <h4 className="text-lg font-bold">Workshop</h4>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border p-3"><strong>Hardware</strong><p className="mt-2 text-sm">workstation<br/>tablets<br/>wireless access point</p></div>
            <div className="rounded-lg border p-3"><strong>Software / data</strong><p className="mt-2 text-sm">repair jobs<br/>diagnostic software<br/>job progress</p></div>
          </div>
        </div>
        <div className="p-5">
          <h4 className="text-lg font-bold">Parts / secure IT area</h4>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-lg border p-3"><strong>Hardware</strong><p className="mt-2 text-sm">stock workstation<br/>switch<br/>server / shared storage</p></div>
            <div className="rounded-lg border p-3"><strong>Software / data</strong><p className="mt-2 text-sm">stock system<br/>parts records<br/>shared service data</p></div>
          </div>
        </div>
      </div>
      <aside className="rounded-xl bg-slate-50 p-5">
        <h4 className="font-bold">What the student should show</h4>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-sm">
          <li>Named rooms or physical areas from the scenario.</li>
          <li>Where staff work and where IT provision is required.</li>
          <li>Appropriate hardware in each location.</li>
          <li>Relevant software and data/information needs as annotations.</li>
          <li>Enough detail for the proposed IT service to be understood.</li>
        </ul>
      </aside>
    </div>
  </figure>;
}

function NetworkExample(){
  return <figure className="rounded-2xl border border-slate-300 bg-white p-5">
    <figcaption className="text-lg font-bold">Worked example · Network diagram</figcaption>
    <p className="mt-1 text-sm text-slate-600">This diagram focuses on the network components and their connections.</p>
    <div className="mt-5 flex flex-col items-center gap-3 text-center">
      <div className="rounded-lg border-2 border-slate-800 px-8 py-3 font-bold">Internet</div>
      <div aria-hidden="true">↓</div>
      <div className="rounded-lg border-2 border-slate-800 px-8 py-3 font-bold">Router / firewall</div>
      <div aria-hidden="true">↓</div>
      <div className="rounded-lg border-2 border-slate-800 px-8 py-3 font-bold">Network switch</div>
      <div className="grid w-full gap-4 md:grid-cols-4">
        <div className="rounded-xl border-2 border-slate-700 p-4"><strong>Reception</strong><p className="mt-2 text-sm">PCs + printer<br/>Ethernet</p></div>
        <div className="rounded-xl border-2 border-slate-700 p-4"><strong>Manager office</strong><p className="mt-2 text-sm">PC / laptop<br/>Ethernet or Wi-Fi</p></div>
        <div className="rounded-xl border-2 border-slate-700 p-4"><strong>Workshop</strong><p className="mt-2 text-sm">WAP → tablets<br/>Wi-Fi</p></div>
        <div className="rounded-xl border-2 border-slate-700 p-4"><strong>Shared service</strong><p className="mt-2 text-sm">server / storage<br/>Ethernet</p></div>
      </div>
    </div>
  </figure>;
}

export function Unit14DiagramMasteryLab(){
  const [selected,setSelected]=useState<PearsonDiagram>("floor");
  const [scenarioIndex,setScenarioIndex]=useState(0);
  const [notes,setNotes]=useState("");
  const scenario=scenarios[scenarioIndex];
  const item=pearsonNames[selected];

  return <section className="mini-study-panel">
    <p className="mini-study-kicker">Pearson Unit 14 · A3 Service identification</p>
    <h2 className="text-2xl font-bold">The diagram types Pearson names</h2>
    <p className="mt-2">Pearson names four diagram types for identifying and representing IT service and related data/information requirements. The worked examples below use those exact category names.</p>

    <div className="mt-5 grid gap-3 md:grid-cols-4">
      {(Object.keys(pearsonNames) as PearsonDiagram[]).map(key=><button key={key} type="button" className={selected===key?"button text-left":"button-secondary text-left"} onClick={()=>{setSelected(key);setNotes("");}}>
        <strong>{pearsonNames[key].title}</strong>
      </button>)}
    </div>

    <div className="mt-5 rounded-xl bg-slate-50 p-4">
      <h3 className="font-bold">{item.title}</h3>
      <p className="mt-2"><strong>Purpose:</strong> {item.purpose}</p>
      <p className="mt-1"><strong>Ask yourself:</strong> {item.question}</p>
    </div>

    <div className="mt-5">
      {selected==="functional"&&<FunctionalChartExample/>}
      {selected==="dfd"&&<DfdExample/>}
      {selected==="floor"&&<FloorPlanExample/>}
      {selected==="network"&&<NetworkExample/>}
    </div>

    <section className="mt-6 rounded-2xl border border-slate-300 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mini-study-kicker">Practice from a new scenario</p>
          <h3 className="text-xl font-bold">{scenario.title}</h3>
          <p className="mt-2">{scenario.text}</p>
        </div>
        <button className="button-secondary" type="button" onClick={()=>{setScenarioIndex(value=>(value+1)%scenarios.length);setNotes("");}}>Another scenario</button>
      </div>

      <div className="mt-5 rounded-xl bg-slate-50 p-4">
        <strong>Your task:</strong> Create a {item.title.toLowerCase()} for this organisation. Use the worked example to understand the type, but use only information justified by this scenario.
      </div>

      <label className="mt-4 grid gap-2">
        <strong>Plan before drawing</strong>
        <textarea className="input min-h-40 w-full" value={notes} onChange={event=>setNotes(event.target.value)} placeholder={
          selected==="functional"?"List the organisation functions and what each function needs from IT."
          :selected==="dfd"?"List external entities, processes, data stores and labelled data flows."
          :selected==="floor"?"List the rooms/areas, staff, hardware, software and data needs."
          :"List devices, network components, sites and connection types."
        }/>
      </label>

      <details className="mini-study-help mt-5">
        <summary>Check before you draw</summary>
        {selected==="functional"&&<ul className="mt-3 list-disc space-y-2 pl-6"><li>Functions come from the organisation, not from invented departments.</li><li>Each function has a clear purpose or activity.</li><li>The chart helps identify IT service requirements.</li></ul>}
        {selected==="dfd"&&<ul className="mt-3 list-disc space-y-2 pl-6"><li>External entities, processes and data stores are clearly distinguished.</li><li>Every arrow is labelled with data or information.</li><li>The DFD shows data movement, not physical network connections.</li></ul>}
        {selected==="floor"&&<ul className="mt-3 list-disc space-y-2 pl-6"><li>Rooms/areas match the scenario.</li><li>Hardware is placed where it is needed.</li><li>Software and data/information needs are annotated clearly.</li><li>The physical plan helps explain the proposed IT service.</li></ul>}
        {selected==="network"&&<ul className="mt-3 list-disc space-y-2 pl-6"><li>Network components are connected logically.</li><li>Sites and user devices can reach required services.</li><li>Important connection types are labelled where useful.</li><li>The diagram represents the network, not the data-processing flow.</li></ul>}
      </details>
    </section>

    <aside className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm">
      <strong>Terminology note:</strong> these four names come from the Pearson Unit 14 specification. The visual layouts above are worked teaching examples created to illustrate the specification. Pearson does not prescribe one fixed drawing layout for every scenario.
    </aside>
  </section>;
}

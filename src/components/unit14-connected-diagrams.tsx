"use client";
import {useId,type ReactNode} from "react";

type Box={id:string;x:number;y:number;width:number;height:number;lines:string[];kind?:"process"|"store"};
function Node({id,x,y,width,height,lines,kind}:Box){
  return <g data-node={id} data-bounds={`${x},${y},${width},${height}`}>
    {kind==="store"?<path d={`M${x+width},${y} H${x} V${y+height} H${x+width} M${x+12},${y} V${y+height}`} fill="#f0fdfa" stroke="#134e4a" strokeWidth="2.5"/>:<rect x={x} y={y} width={width} height={height} rx={kind==="process"?28:10} fill={kind==="process"?"#eef2ff":"white"} stroke="#23334b" strokeWidth="2.5"/>}
    <text x={x+width/2} y={y+height/2-(lines.length-1)*11+6} textAnchor="middle" fill="#15263e" fontSize="17">{lines.map((line,index)=><tspan x={x+width/2} dy={index?22:0} fontWeight={index===0?700:400} key={line}>{line}</tspan>)}</text>
  </g>;
}
function Wire({from,to,points,dashed=false,arrow}:{from:string;to:string;points:string;dashed?:boolean;arrow?:string}){
  return <polyline data-from={from} data-to={to} points={points} fill="none" stroke={dashed?"#6d28d9":"#334155"} strokeWidth="3" strokeLinejoin="round" strokeDasharray={dashed?"8 6":undefined} markerEnd={arrow?`url(#${arrow})`:undefined}/>;
}
function Frame({title,description,height,children,note}:{title:string;description:string;height:number;children:ReactNode;note:string}){
  const id=useId();
  return <figure className="min-w-0 rounded-2xl border border-slate-300 bg-white p-5">
    <figcaption className="text-lg font-bold">Worked example · {title}</figcaption>
    <p className="mt-1 text-sm text-slate-600">{description}</p>
    <div className="mt-5 max-w-full overflow-x-auto rounded-xl border border-slate-200" tabIndex={0} role="region" aria-label={`${title}: scrollable diagram`}>
      <svg viewBox={`0 0 960 ${height}`} fontFamily="Arial, sans-serif" style={{display:"block",width:"100%",minWidth:720,height:"auto",background:"white"}} role="img" aria-labelledby={`${id}-title ${id}-description`}>
        <title id={`${id}-title`}>{title}</title><desc id={`${id}-description`}>{note}</desc>{children}
      </svg>
    </div>
    <p className="mt-3 text-sm text-slate-600">{note}</p>
    <p className="text-sm text-slate-600">On a small screen, swipe inside the diagram to see every label.</p>
  </figure>;
}

export function NetworkExample(){
  const branches:Box[]=[
    {id:"reception",x:25,y:435,width:170,height:90,lines:["Reception","PCs + printer"]},
    {id:"manager",x:210,y:435,width:170,height:90,lines:["Manager office","PC / laptop"]},
    {id:"wap",x:395,y:435,width:170,height:90,lines:["Workshop","Access point"]},
    {id:"parts",x:580,y:435,width:170,height:90,lines:["Parts storage","Stock workstation"]},
    {id:"server",x:765,y:435,width:170,height:90,lines:["Shared service","Server / storage"]},
  ];
  return <Frame title="Network diagram" height={680} description="A complete connection path from the internet to each department and the shared service." note="Solid lines are wired links. Each branch represents a separate Ethernet cable to the switch, not a shared coaxial bus. The dashed link is Wi-Fi: workshop tablets connect through the access point, not directly to the switch. This example uses a local shared server.">
    <Wire from="internet" to="router" points="480,90 480,145"/>
    <Wire from="router" to="switch" points="480,215 480,265"/>
    {branches.map((node,index)=><Wire key={node.id} from="switch" to={node.id} points={`${380+index*50},335 ${node.x+85},410 ${node.x+85},435`}/>)}
    <Wire from="wap" to="tablets" points="480,525 480,585" dashed/>
    <text x="500" y="123" fontSize="16" fill="#334155">ISP / internet link</text>
    <text x="500" y="246" fontSize="16" fill="#334155">Ethernet</text>
    <text x="500" y="561" fontSize="16" fill="#6d28d9">Staff Wi-Fi</text>
    <Node id="internet" x={370} y={20} width={220} height={70} lines={["Internet"]}/>
    <Node id="router" x={340} y={145} width={280} height={70} lines={["Router / firewall"]}/>
    <Node id="switch" x={360} y={265} width={240} height={70} lines={["Network switch"]}/>
    {branches.map(node=><Node key={node.id} {...node}/>)}
    <Node id="tablets" x={395} y={585} width={170} height={70} lines={["Mechanics' tablets"]}/>
  </Frame>;
}

export function FunctionalChartExample(){
  const departments:Box[]=[
    {id:"reception",x:20,y:210,width:215,height:150,lines:["Reception","Bookings · payments","Customer contact"]},
    {id:"workshop",x:255,y:210,width:215,height:150,lines:["Workshop","Repair jobs","Diagnostics · progress"]},
    {id:"parts",x:490,y:210,width:215,height:150,lines:["Parts / stock","Stock levels","Ordering · availability"]},
    {id:"management",x:725,y:210,width:215,height:150,lines:["Management","Staffing · reports","Performance · planning"]},
  ];
  return <Frame title="Functional chart" height={400} description="Vehicle repair business: every business function is linked to the organisation." note="The connecting branches group business functions. They represent organisational relationships—not network cables or data flows. This is a teaching example, not a prescribed Pearson layout.">
    {departments.map(node=><Wire key={node.id} from="business" to={node.id} points={`480,110 480,165 ${node.x+node.width/2},165 ${node.x+node.width/2},210`}/>)}
    <Node id="business" x={315} y={30} width={330} height={80} lines={["Vehicle repair business"]}/>
    {departments.map(node=><Node {...node} key={node.id}/>)}
  </Frame>;
}

export function DfdExample(){
  const arrow=useId().replaceAll(":","")+"-data-arrow";
  return <Frame title="Data flow diagram (DFD)" height={450} description="Booking details, saved records and the confirmation each have a labelled, continuous arrow." note="Follow the arrows: Customer sends booking details to Process booking; the process reads existing bookings, saves the booking record and sends confirmation back to Customer. Rectangles are external entities, rounded boxes are processes, and the open-ended store holds records. A context DFD would instead show the whole system as one process with external flows.">
    <defs><marker id={arrow} viewBox="0 0 10 10" refX="10" refY="5" markerWidth="9" markerHeight="9" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 Z" fill="#334155"/></marker></defs>
    <Wire from="customer" to="process" points="230,190 365,190" arrow={arrow}/>
    <Wire from="process" to="bookings" points="595,190 750,190" arrow={arrow}/>
    <Wire from="bookings" to="process" points="820,150 820,70 480,70 480,150" arrow={arrow}/>
    <Wire from="process" to="customer" points="480,250 480,365 140,365 140,250" arrow={arrow}/>
    <text x="298" y="174" textAnchor="middle" fontSize="16" fill="#334155">Booking details</text>
    <text x="672" y="174" textAnchor="middle" fontSize="16" fill="#334155">Booking record</text>
    <text x="650" y="54" textAnchor="middle" fontSize="16" fill="#334155">Existing bookings / availability</text>
    <text x="310" y="348" textAnchor="middle" fontSize="16" fill="#334155">Booking confirmation</text>
    <Node id="customer" x={50} y={150} width={180} height={100} lines={["Customer","External entity"]}/>
    <Node id="process" x={365} y={150} width={230} height={100} lines={["1.0 Process booking","Process"]} kind="process"/>
    <Node id="bookings" x={750} y={150} width={185} height={100} lines={["Booking records","Data store"]} kind="store"/>
  </Frame>;
}

export function FloorPlanExample(){
  return <Frame title="Building / floor plan" height={650} description="Illustrative room arrangement, not a measured plan. Equipment is placed inside named rooms; cable routes run through the central corridor." note="Solid blue lines show proposed Ethernet routes to the secure switch. The workshop access point provides the dashed Wi-Fi connection to tablets. These connection annotations supplement the room layout; use the separate network diagram to trace the full internet and server path. Change rooms, counts and positions to match the actual scenario.">
    <rect x="20" y="20" width="920" height="610" rx="12" fill="#f8fafc" stroke="#23334b" strokeWidth="4"/>
    {[[40,45,410,235],[510,45,410,235],[40,370,410,235],[510,370,410,235]].map(([x,y,width,height])=><rect key={x+":"+y} x={x} y={y} width={width} height={height} rx="8" fill="white" stroke="#64748b" strokeWidth="2"/>)}
    <text x="245" y="82" textAnchor="middle" fontSize="21" fontWeight="700" fill="#15263e">Reception</text>
    <text x="715" y="82" textAnchor="middle" fontSize="21" fontWeight="700" fill="#15263e">Manager office</text>
    <text x="245" y="407" textAnchor="middle" fontSize="21" fontWeight="700" fill="#15263e">Workshop</text>
    <text x="715" y="407" textAnchor="middle" fontSize="21" fontWeight="700" fill="#15263e">Parts / secure IT area</text>
    <g fill="none" stroke="#2563eb" strokeWidth="3" strokeLinejoin="round">
      <polyline data-from="switch" data-to="reception" points="540,487 525,487 525,325 430,325 430,145 350,145"/>
      <polyline data-from="switch" data-to="manager" points="540,487 525,487 525,325 540,325 540,145 610,145"/>
      <polyline data-from="switch" data-to="wap" points="540,487 525,487 525,325 150,325 150,450"/>
      <polyline data-from="switch" data-to="server" points="700,487 750,487"/>
      <polyline data-from="switch" data-to="stock" points="620,525 620,555"/>
    </g>
    <Wire from="wap" to="tablets" points="230,487 280,487" dashed/>
    <text x="750" y="325" textAnchor="middle" fontSize="15" fill="#1d4ed8">Corridor · Ethernet cable routes</text>
    <Node id="reception" x={140} y={110} width={210} height={70} lines={["PCs + printer"]}/>
    <Node id="manager" x={610} y={110} width={210} height={70} lines={["PC / laptop"]}/>
    <text x="245" y="223" textAnchor="middle" fontSize="16" fill="#334155"><tspan x="245">Booking and payment software</tspan><tspan x="245" dy="23">Customer and booking details</tspan></text>
    <text x="715" y="223" textAnchor="middle" fontSize="16" fill="#334155"><tspan x="715">Reporting and management tools</tspan><tspan x="715" dy="23">Staff and performance information</tspan></text>
    <Node id="wap" x={70} y={450} width={160} height={75} lines={["Access point"]}/>
    <Node id="tablets" x={280} y={450} width={145} height={75} lines={["Tablets"]}/>
    <text x="245" y="559" textAnchor="middle" fontSize="16" fill="#334155"><tspan x="245">Repair jobs · diagnostics · progress</tspan><tspan x="245" dy="23">Staff wireless access</tspan></text>
    <Node id="switch" x={540} y={450} width={160} height={75} lines={["Secure switch"]}/>
    <Node id="server" x={750} y={450} width={145} height={75} lines={["Server /","storage"]}/>
    <Node id="stock" x={540} y={555} width={355} height={40} lines={["Stock workstation · parts records"]}/>
  </Frame>;
}

"use client";

import {useId, type ReactNode} from "react";
import type {Task3Model} from "@/lib/unit14-task3-models";

function wrap(text:string, limit=28) {
  return text.split(/\s+/).reduce<string[]>((lines,word)=>{
    if(!lines.length || lines[lines.length-1].length+word.length+1>limit) lines.push(word);
    else lines[lines.length-1]+=" "+word;
    return lines;
  },[]);
}
function Label({x,y,text,width=28,size=16}:{x:number;y:number;text:string;width?:number;size?:number}) {
  const lines=wrap(text,width);
  return <text x={x} y={y-(lines.length-1)*10} textAnchor="middle" fontSize={size} fill="#172b46">{lines.map((line,i)=><tspan key={i} x={x} dy={i?20:0}>{line}</tspan>)}</text>;
}
function Box({id,x,y,w=180,h=80,text,kind="device"}:{id:string;x:number;y:number;w?:number;h?:number;text:string;kind?:"device"|"process"|"store"}) {
  return <g data-node={id} data-bounds={`${x},${y},${w},${h}`}>
    {kind==="store"?<path d={`M${x+w},${y} H${x} V${y+h} H${x+w} M${x+12},${y} V${y+h}`} fill="#ecfdf5" stroke="#166534" strokeWidth="2"/>:<rect x={x} y={y} width={w} height={h} rx={kind==="process"?24:3} fill={kind==="process"?"#eef2ff":"#ffffff"} stroke="#334155" strokeWidth="2"/>}
    <Label x={x+w/2} y={y+h/2+5} text={text} width={Math.floor((w-(kind==="store"?35:15))/8.5)}/>
  </g>;
}
function Line({from,to,points,kind="wired",arrow}:{from:string;to:string;points:string;kind?:"wired"|"wifi"|"service";arrow?:string}) {
  return <polyline data-from={from} data-to={to} points={points} fill="none" stroke={kind==="wifi"?"#7c3aed":kind==="service"?"#0f766e":"#334155"} strokeWidth="2.5" strokeDasharray={kind==="wifi"?"7 5":kind==="service"?"3 5":undefined} markerEnd={arrow?`url(#${arrow})`:undefined}/>;
}
function Canvas({title,description,height,children}:{title:string;description:string;height:number;children:ReactNode}) {
  const id=useId();
  return <figure className="mt-4 min-w-0 rounded-xl border border-slate-300 bg-white p-3 text-slate-950">
    <figcaption className="font-bold">{title}</figcaption>
    <div className="mt-3 max-w-full overflow-x-auto" role="region" tabIndex={0} aria-label={`${title}: scrollable drawing`}>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 1000 ${height}`} style={{width:"100%",minWidth:800,height:"auto",display:"block"}} fontFamily="Arial, sans-serif" role="img" aria-labelledby={`${id}-title ${id}-desc`}>
        <title id={`${id}-title`}>{title}</title><desc id={`${id}-desc`}>{description}</desc><rect width="1000" height={height} fill="white"/>{children}
      </svg>
    </div>
    <p className="mt-2 text-sm">{description}</p>
  </figure>;
}

export function ModelNetworkDiagram({model}:{model:Task3Model}) {
  const dental=model.id==="dental";
  const hotel=model.id==="hotel";
  const app=dental?"Hosted appointment application":hotel?"Hosted property-management application":"Hosted garage application";
  const db=dental?"Private appointment / contact database":hotel?"Private shared hotel database":"Private garage database";
  return <div aria-label={`${model.title}: network diagram`}>
    <Canvas title={`${model.title} · network and hosted service`} height={1030} description="Solid lines: wired network links. Purple dashed lines: staff Wi-Fi. Green dotted lines: logical application/data-service access, not extra physical cables. Each site reaches the hosted application; only that application accesses its private database. Swipe within the drawing on a small screen.">
      {dental?[0,1].map(i=>{const dx=i*500;return <g key={i}>
        <rect x={20+dx} y={20} width="460" height="465" rx="14" fill="#f8fafc" stroke="#94a3b8"/>
        <Label x={250+dx} y={50} text={`Site ${i===0?"A":"B"} · staff network`}/>
        <Line from={`pc${i}`} to={`switch${i}`} points={`${130+dx},160 ${130+dx},250`}/>
        <Line from={`tablet${i}`} to={`ap${i}`} points={`${370+dx},160 ${370+dx},250`} kind="wifi"/>
        <Line from={`ap${i}`} to={`switch${i}`} points={`${280+dx},290 ${220+dx},290`}/>
        <Line from={`switch${i}`} to={`router${i}`} points={`${130+dx},330 ${130+dx},390`}/>
        <Line from={`router${i}`} to="internet" points={`${130+dx},470 ${130+dx},530 ${440+i*120},530 ${440+i*120},570`}/>
        <Label x={170+dx} y={210} text="Ethernet" size={14}/>
        <Label x={420+dx} y={210} text="Staff Wi-Fi" width={8} size={14}/>
        <Label x={250+dx} y={277} text="Ethernet" size={13}/>
        <Label x={177+dx} y={366} text="Ethernet" size={14}/>
        <Label x={250+dx} y={518} text="Site broadband / ISP" size={14}/>
        <Box id={`pc${i}`} x={40+dx} y={80} text="Reception PCs"/>
        <Box id={`tablet${i}`} x={280+dx} y={80} text="Dentist tablets"/>
        <Box id={`switch${i}`} x={40+dx} y={250} text={`Switch ${i===0?"A":"B"}`}/>
        <Box id={`ap${i}`} x={280+dx} y={250} text={`Staff access point ${i===0?"A":"B"}`}/>
        <Box id={`router${i}`} x={40+dx} y={390} text={`Router / firewall ${i===0?"A":"B"}`}/>
      </g>;}):<>
        <rect x="20" y="20" width="960" height="490" rx="14" fill="#f8fafc" stroke="#94a3b8"/>
        <Label x={500} y={50} text="Premises · authorised staff network" width={50}/>
        {[hotel?"Reception PCs":"Reception PC / printer",hotel?"Manager PC":"Workshop manager PC",hotel?"Events PC":"Parts workstation","Staff access point"].map((text,i)=><g key={text}>
          <Line from={`endpoint${i}`} to="switch" points={`${140+i*240},300 ${425+i*50},365`} />
          <Box id={`endpoint${i}`} x={40+i*240} y={220} w={200} text={text}/>
        </g>)}
        <Box id="mobile" x={760} y={70} w={200} text={hotel?"Housekeeping devices":"Mechanics' devices"}/>
        <Line from="mobile" to="endpoint3" points="860,150 860,220" kind="wifi"/>
        <Label x={915} y={187} text="Staff Wi-Fi" size={14} width={10}/>
        <Label x={185} y={390} text="Separate Ethernet links" size={14}/>
        <Box id="switch" x={380} y={365} w={240} h={60} text="Managed switch"/>
        <Line from="switch" to="router" points="500,425 500,445"/>
        <Box id="router" x={380} y={445} w={240} h={60} text="Router / firewall"/>
        <Line from="router" to="internet" points="500,505 500,570"/>
        <Label x={640} y={545} text="Broadband / ISP" size={14}/>
      </>}
      <Box id="internet" x={380} y={570} w={240} h={70} text="Internet"/>
      <rect x="120" y="710" width="760" height="290" rx="16" fill="#f0fdfa" stroke="#0f766e" strokeDasharray="8 5"/>
      <Line from="internet" to="app" points="500,640 500,735" kind="service"/>
      <Label x={700} y={683} text="HTTPS · named staff accounts" width={33} size={15}/>
      <Label x={245} y={743} text="Hosted provider" size={15}/>
      <Box id="app" x={350} y={735} w={300} text={app} kind="process"/>
      <Line from="app" to="database" points="430,815 430,853 310,853 310,890" kind="service"/>
      <Label x={270} y={844} text="Private database access" width={27} size={14}/>
      <Box id="database" x={170} y={890} w={280} text={db} kind="store"/>
      <Line from="database" to="backup" points="450,930 560,930" kind="service"/>
      <Label x={505} y={905} text="Backup copy" width={10} size={13}/>
      <Box id="backup" x={560} y={890} w={280} text="Encrypted, access-controlled backup" kind="store"/>
    </Canvas>
    {hotel&&<p className="mt-2 text-sm">If guest Wi-Fi is provided, place it on an isolated guest network with internet-only access; it must not reach the staff LAN. It is not a staff connection in this drawing.</p>}
  </div>;
}

type SymbolNode={name:string;kind:"entity"|"process"|"store"};
type Flow={from:SymbolNode;to:SymbolNode;label:string};
function symbol(text:string):SymbolNode {
  const value=text.trim();
  if(value.startsWith("||")&&value.endsWith("||"))return {name:value.slice(2,-2),kind:"store"};
  if(value.startsWith("(")&&value.endsWith(")"))return {name:value.slice(1,-1),kind:"process"};
  if(value.startsWith("[")&&value.endsWith("]"))return {name:value.slice(1,-1),kind:"entity"};
  throw new Error(`Unrecognised DFD symbol: ${value}`);
}
export function modelFlows(source:string):Flow[] {
  return source.split("\n").filter(line=>line.includes(" --> ")).map(line=>{
    const match=line.match(/^(.*?) -- (.*?) --> (.*?)$/);
    if(!match)throw new Error("Invalid model data flow");
    return {from:symbol(match[1]),label:match[2],to:symbol(match[3])};
  });
}
function ProcessDiagram({process,flows,index,context}:{process:string;flows:Flow[];index:number;context:boolean}) {
  const arrow=useId().replaceAll(":","")+"-flow";
  const peers=Array.from(new Map(flows.map(flow=>{const peer=flow.from.name===process?flow.to:flow.from;return [peer.name,peer];})).values());
  const height=peers.length*160+50;
  return <Canvas title={context?"Context DFD · appointment service":`Process view ${index+1} · ${process}`} height={height} description={context?"One rounded process represents the entire service. Rectangles are external entities. Each arrow names the data carried and shows its direction. Internal stores are deliberately omitted at this context level.":"Part of the same main-process DFD, separated for readability. Rectangles are external entities; open-ended green symbols are shared data stores. A repeated store name in another view means the same store, not a separate database."}>
    <defs><marker id={arrow} viewBox="0 0 10 10" refX="10" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0 L10 5 L0 10 Z" fill="#334155"/></marker></defs>
    <Box id="process" x={735} y={25} w={245} h={height-50} text={process} kind="process"/>
    {peers.map((peer,i)=>{
      const y=35+i*160;
      const related=flows.filter(flow=>flow.from.name===peer.name||flow.to.name===peer.name);
      return <g key={peer.name}>
        <Box id={`peer${i}`} x={20} y={y} w={225} h={110} text={peer.name} kind={peer.kind==="store"?"store":"device"}/>
        {related.map((flow,j)=>{
          const toward=flow.to.name===process;
          const fy=y+30+j*60;
          return <g key={flow.label} data-flow-label={flow.label}>
            <Line from={toward?`peer${i}`:"process"} to={toward?"process":`peer${i}`} points={toward?`245,${fy} 735,${fy}`:`735,${fy} 245,${fy}`} arrow={arrow}/>
            <Label x={490} y={fy-11} text={flow.label} width={53} size={15}/>
          </g>;
        })}
      </g>;
    })}
  </Canvas>;
}
export function ModelDataFlowDiagram({model}:{model:Task3Model}) {
  const flows=modelFlows(model.dfd);
  const processes=Array.from(new Set(flows.flatMap(flow=>[flow.from,flow.to]).filter(node=>node.kind==="process").map(node=>node.name)));
  return <div aria-label={`${model.title}: data flow diagram`}>
    <p className="mt-2">Arrows show named data—not network cables. {processes.length>1?"Read the process views in order. Matching store names connect the views into one solution; process numbers identify functions, not a compulsory time sequence.":"This is a context view of the whole appointment service."}</p>
    {processes.map((process,index)=><ProcessDiagram key={process} process={process} flows={flows.filter(flow=>flow.from.name===process||flow.to.name===process)} index={index} context={processes.length===1}/>)}
  </div>;
}

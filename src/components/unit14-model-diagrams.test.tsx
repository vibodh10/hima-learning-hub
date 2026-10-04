import {afterEach,describe,expect,it} from "vitest";
import {cleanup,render} from "@testing-library/react";
import {renderToStaticMarkup} from "react-dom/server";
import {mkdirSync,writeFileSync} from "node:fs";
import {ModelNetworkDiagram,ModelDataFlowDiagram,modelFlows} from "./unit14-model-diagrams";
import {unit14Task3Models} from "@/lib/unit14-task3-models";
afterEach(cleanup);

describe("model-answer drawings",()=>{
  for(const model of unit14Task3Models)it(`${model.id}: connected devices and every original data flow are drawn`,()=>{
    const {container}=render(<><ModelNetworkDiagram model={model}/><ModelDataFlowDiagram model={model}/></>);
    expect(container.querySelector("pre")).toBeNull();
    expect(container.querySelectorAll("[data-flow-label]")).toHaveLength(modelFlows(model.dfd).length);
    for(const svg of container.querySelectorAll("svg")){
      const nodes=new Map([...svg.querySelectorAll("[data-node]")].map(node=>[node.getAttribute("data-node"),node.getAttribute("data-bounds")!.split(",").map(Number)]));
      expect(nodes.size).toBe(svg.querySelectorAll("[data-node]").length);
      const touched=new Set();
      const boundary=([px,py]:number[],[x,y,w,h]:number[])=>((px===x||px===x+w)&&py>=y&&py<=y+h)||((py===y||py===y+h)&&px>=x&&px<=x+w);
      for(const edge of svg.querySelectorAll("polyline")){
        const from=edge.getAttribute("data-from")!;const to=edge.getAttribute("data-to")!;
        const points=edge.getAttribute("points")!.split(" ").map(p=>p.split(",").map(Number));
        expect(boundary(points[0],nodes.get(from)!)).toBe(true);
        expect(boundary(points.at(-1)!,nodes.get(to)!)).toBe(true);
        touched.add(from);touched.add(to);
      }
      expect([...nodes.keys()].every(id=>touched.has(id))).toBe(true);
    }
    if(process.env.RENDER_UNIT14_MODELS){
      mkdirSync("output/unit14-models",{recursive:true});
      const markup=renderToStaticMarkup(<><ModelNetworkDiagram model={model}/><ModelDataFlowDiagram model={model}/></>);
      [...markup.matchAll(/<svg[\s\S]*?<\/svg>/g)].forEach((match,i)=>writeFileSync(`output/unit14-models/${model.id}-${i}.svg`,match[0].replace(/style="[^"]*"/,"")));
    }
  });
});

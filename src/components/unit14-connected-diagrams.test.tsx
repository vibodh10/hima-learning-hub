import {afterEach,describe,expect,it} from "vitest";
import {cleanup,render,screen} from "@testing-library/react";
import {renderToStaticMarkup} from "react-dom/server";
import {mkdirSync,writeFileSync} from "node:fs";
import {FunctionalChartExample,DfdExample,FloorPlanExample,NetworkExample} from "./unit14-connected-diagrams";
afterEach(cleanup);

describe("connected Unit 14 teaching diagrams",()=>{
  for(const [name,Component] of [["network",NetworkExample],["functional",FunctionalChartExample],["dfd",DfdExample],["floor",FloorPlanExample]] as const){
    it(`${name}: every connector reaches both named boxes and no box is isolated`,()=>{
      const {container}=render(<Component/>);
      const nodes=new Map([...container.querySelectorAll("[data-node]")].map(node=>[node.getAttribute("data-node"),node.getAttribute("data-bounds")!.split(",").map(Number)]));
      const connected=new Set<string>();
      const onBoundary=([px,py]:number[],[x,y,w,h]:number[])=>((px===x||px===x+w)&&py>=y&&py<=y+h)||((py===y||py===y+h)&&px>=x&&px<=x+w);
      for(const edge of container.querySelectorAll("polyline[data-from]")){
        const from=edge.getAttribute("data-from")!;const to=edge.getAttribute("data-to")!;
        const points=edge.getAttribute("points")!.split(" ").map(point=>point.split(",").map(Number));
        expect(nodes.has(from)).toBe(true);expect(nodes.has(to)).toBe(true);
        expect(onBoundary(points[0],nodes.get(from)!)).toBe(true);
        expect(onBoundary(points.at(-1)!,nodes.get(to)!)).toBe(true);
        connected.add(from);connected.add(to);
      }
      expect([...nodes.keys()].every(id=>connected.has(id!))).toBe(true);
      expect(screen.getByRole("img")).toHaveAttribute("viewBox");
      expect(screen.getByRole("region")).toHaveAttribute("tabindex","0");
      if(process.env.RENDER_UNIT14_DIAGRAMS){
        const markup=renderToStaticMarkup(<Component/>);
        const svg=markup.match(/<svg[\s\S]*?<\/svg>/)![0].replace(/style="[^"]*"/,"");
        mkdirSync("output/unit14-diagrams",{recursive:true});
        writeFileSync(`output/unit14-diagrams/${name}.svg`,svg);
      }
    });
  }
  it("uses arrows for DFD information and a dashed link for Wi-Fi",()=>{
    const {container,unmount}=render(<DfdExample/>);
    expect(container.querySelectorAll("polyline[marker-end]")).toHaveLength(4);
    expect(container.querySelector('[data-from="process"][data-to="customer"]')).toHaveAttribute("marker-end");
    unmount();
    const network=render(<NetworkExample/>);
    expect(network.container.querySelector('[data-from="wap"][data-to="tablets"]')).toHaveAttribute("stroke-dasharray","8 6");
    expect(network.container.querySelectorAll('[data-from="switch"]')).toHaveLength(5);
  });
});

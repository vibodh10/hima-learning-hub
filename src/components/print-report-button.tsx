"use client";

export function PrintReportButton(){
  return <button type="button" className="button print:hidden" onClick={()=>window.print()}>Print or save as PDF</button>;
}

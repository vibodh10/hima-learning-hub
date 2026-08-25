"use client";

export function PrintEvidenceButton() {
  return <button className="button no-print" type="button" onClick={() => window.print()}>Print / save as PDF</button>;
}

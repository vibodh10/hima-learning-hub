import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const actionFiles = [
  "atom-learning.ts",
  "curriculum.ts",
  "invitations.ts",
  "learning.ts",
  "staff-accounts.ts",
  "worksheets.ts",
];

function source(file: string) {
  return readFileSync(resolve(process.cwd(), "src", "app", "actions", file), "utf8");
}

function exportedActionBodies(contents: string) {
  const matches = [...contents.matchAll(/^export async function\s+(\w+)/gm)];
  return matches.map((match, index) => ({
    name: match[1],
    body: contents.slice(match.index, matches[index + 1]?.index ?? contents.length),
  }));
}

describe("Server Action identity boundaries", () => {
  it.each(actionFiles)("keeps %s on the server", (file) => {
    expect(source(file).trimStart()).toMatch(/^"use server";/);
  });

  it.each(actionFiles)("establishes an actor in every exported mutation from %s", (file) => {
    const actions = exportedActionBodies(source(file));
    expect(actions.length).toBeGreaterThan(0);

    for (const action of actions) {
      expect(
        action.body,
        `${file}:${action.name} must establish the current profile or require an explicit role`,
      ).toMatch(/await (?:getSessionProfile|requireRole)\(/);
    }
  });

  it("reserves staff account creation for administrators", () => {
    expect(source("staff-accounts.ts")).toMatch(/await requireRole\("administrator"\)/);
  });

  it("limits student invitation management to teaching staff", () => {
    const invitations = source("invitations.ts");
    expect(invitations.match(/await requireRole\("teacher",\s*"administrator"\)/g))
      .toHaveLength(2);
  });
});

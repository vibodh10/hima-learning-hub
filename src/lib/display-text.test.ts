import { describe, expect, it } from "vitest";
import { capitaliseFirst } from "./display-text";

describe("capitaliseFirst", () => {
  it("gives displayed topic details a consistent capital letter", () => {
    expect(capitaliseFirst("data-informed planning")).toBe("Data-informed planning");
    expect(capitaliseFirst("IT service delivery")).toBe("IT service delivery");
  });
});

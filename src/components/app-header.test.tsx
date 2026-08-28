import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppHeader } from "./app-header";

vi.mock("@/app/actions/auth", () => ({ logout: vi.fn() }));

describe("role-specific application navigation", () => {
  afterEach(cleanup);

  it("shows student identity and only student destinations", () => {
    render(<AppHeader name="Student One" role="student" />);
    expect(screen.getByText("Student mode")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "My learning" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "My progress" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "My work" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Help" })).toHaveAttribute("href", "/help");
    expect(screen.queryByRole("link", { name: "My groups" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Administration" })).not.toBeInTheDocument();
  });

  it("shows teacher identity and no student-only destinations", () => {
    render(<AppHeader name="Teacher One" role="teacher" />);
    expect(screen.getByText("Teacher mode")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "My groups" })).toHaveAttribute("href", "/dashboard#groups");
    expect(screen.getByRole("link", { name: "Help" })).toHaveAttribute("href", "/help");
    expect(screen.queryByRole("link", { name: "My progress" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "My work" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Administration" })).not.toBeInTheDocument();
  });

  it("shows administrator identity and administration navigation", () => {
    render(<AppHeader name="Admin One" role="administrator" />);
    expect(screen.getByText("Administrator mode")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Groups" })).toHaveAttribute("href", "/dashboard");
    expect(screen.getByRole("link", { name: "Administration" })).toHaveAttribute("href", "/admin");
    expect(screen.getByRole("link", { name: "Help" })).toHaveAttribute("href", "/help");
    expect(screen.queryByRole("link", { name: "My portfolio" })).not.toBeInTheDocument();
  });
});

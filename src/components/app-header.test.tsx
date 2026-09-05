import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/app/actions/auth", () => ({ logout: vi.fn() }));

import { AppHeader } from "./app-header";

describe("role-specific application navigation", () => {
  afterEach(cleanup);

  it("shows student identity and only student destinations", () => {
    render(<AppHeader name="Student One" role="student" />);
    expect(screen.getByText("Student mode")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Student mode navigation" })).toBeVisible();
    expect(screen.getByRole("link", { name: "My learning" })).toHaveAttribute("href", "/curriculum");
    expect(screen.getByRole("link", { name: "My progress" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "My work" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Help" })).toHaveAttribute("href", "/help");
    expect(screen.queryByRole("link", { name: "My groups" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Administration" })).not.toBeInTheDocument();
  });

  it("shows teacher identity and only teacher destinations", () => {
    render(<AppHeader name="Teacher One" role="teacher" />);
    expect(screen.getByText("Teacher mode")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Teacher mode navigation" })).toBeVisible();
    expect(screen.getByRole("link", { name: "My groups" })).toHaveAttribute("href", "/dashboard#groups");
    expect(screen.getByRole("link", { name: "Help" })).toHaveAttribute("href", "/help");
    expect(screen.queryByRole("link", { name: "My learning" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "My progress" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "My work" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Administration" })).not.toBeInTheDocument();
  });

  it("shows organisation controls only in administrator navigation", () => {
    render(<AppHeader name="Admin One" role="administrator" />);
    expect(screen.getByText("Administrator mode")).toBeInTheDocument();
    expect(screen.getByRole("navigation", { name: "Administrator mode navigation" })).toBeVisible();
    expect(screen.getByRole("link", { name: "Groups" })).toHaveAttribute("href", "/dashboard");
    expect(screen.getByRole("link", { name: "Administration" })).toHaveAttribute("href", "/admin");
    expect(screen.getByRole("link", { name: "Help" })).toHaveAttribute("href", "/help");
    expect(screen.queryByRole("link", { name: "My groups" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "My learning" })).not.toBeInTheDocument();
  });
});

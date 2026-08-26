import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AuthForm } from "./auth-form";

vi.mock("@/app/actions/auth", () => ({
  login: vi.fn(async () => ({})),
}));

describe("sign-in form", () => {
  afterEach(cleanup);

  it("does not offer a fake client-side role switch", () => {
    render(<AuthForm />);
    expect(screen.getByLabelText("Email address")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.queryByText(/student demo/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/teacher demo/i)).not.toBeInTheDocument();
  });
});

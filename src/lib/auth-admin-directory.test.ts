import { describe, expect, it, vi } from "vitest";
import { findAuthUserByEmail } from "./auth-admin-directory";

function directoryPage(users: Array<{ id: string; email?: string }>) {
  return { data: { users }, error: null };
}

describe("administrator Auth directory lookup", () => {
  it("normalises email and continues beyond the first full page", async () => {
    const firstPage = Array.from({ length: 1000 }, (_, index) => ({
      id: `user-${index}`,
      email: `user-${index}@example.ac.uk`,
    }));
    const listUsers = vi.fn()
      .mockResolvedValueOnce(directoryPage(firstPage))
      .mockResolvedValueOnce(directoryPage([{
        id: "hima-user",
        email: "Himabindu.Gunde@SCCB.AC.UK",
      }]));
    const admin = { auth: { admin: { listUsers } } };

    const result = await findAuthUserByEmail(
      admin as never,
      "  himabindu.gunde@sccb.ac.uk ",
    );

    expect(result.error).toBeNull();
    expect(result.user?.id).toBe("hima-user");
    expect(listUsers).toHaveBeenNthCalledWith(1, { page: 1, perPage: 1000 });
    expect(listUsers).toHaveBeenNthCalledWith(2, { page: 2, perPage: 1000 });
  });

  it("returns no match only after reaching the final directory page", async () => {
    const listUsers = vi.fn().mockResolvedValue(directoryPage([]));
    const admin = { auth: { admin: { listUsers } } };

    await expect(findAuthUserByEmail(admin as never, "missing@example.ac.uk"))
      .resolves.toEqual({ user: null, error: null });
    expect(listUsers).toHaveBeenCalledOnce();
  });

  it("fails closed when the directory cannot be read", async () => {
    const directoryError = new Error("directory unavailable");
    const listUsers = vi.fn().mockResolvedValue({ data: { users: [] }, error: directoryError });
    const admin = { auth: { admin: { listUsers } } };

    await expect(findAuthUserByEmail(admin as never, "hima@example.ac.uk"))
      .resolves.toEqual({ user: null, error: directoryError });
  });
});

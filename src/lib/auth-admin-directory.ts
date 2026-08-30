import "server-only";
import type { User } from "@supabase/supabase-js";
import type { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

const USERS_PER_PAGE = 1000;
const MAX_DIRECTORY_PAGES = 100;

/**
 * Supabase does not expose an administrator get-user-by-email call. Scan the
 * complete paginated directory and fail closed if it cannot be checked.
 */
export async function findAuthUserByEmail(
  admin: AdminClient,
  email: string,
): Promise<{ user: User | null; error: Error | null }> {
  const normalizedEmail = email.trim().toLowerCase();

  for (let page = 1; page <= MAX_DIRECTORY_PAGES; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: USERS_PER_PAGE,
    });
    if (error) return { user: null, error };

    const user = data.users.find(
      item => item.email?.trim().toLowerCase() === normalizedEmail,
    );
    if (user) return { user, error: null };
    if (data.users.length < USERS_PER_PAGE) return { user: null, error: null };
  }

  return {
    user: null,
    error: new Error("The account directory is too large to verify safely."),
  };
}

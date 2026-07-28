import "server-only";

import { InvalidCredentialsError } from "@/lib/auth/errors";
import type { AuthenticatedUser } from "@/lib/auth/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { userService } from "@/services/user-service";

interface LoginInput {
  email: string;
  password: string;
}

export const authService = {
  async login(input: LoginInput): Promise<AuthenticatedUser> {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signInWithPassword(input);

    if (error || !data.user) {
      throw new InvalidCredentialsError();
    }

    const user = await userService.findActiveByAuthProviderId(data.user.id);

    if (!user) {
      await supabase.auth.signOut();
      throw new InvalidCredentialsError();
    }

    return user;
  },

  async logout(): Promise<void> {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw new Error("Unable to end the authentication session");
    }
  },
};

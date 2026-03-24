import type { AuthUser } from "@workspace/api-zod";

export interface SessionUser extends AuthUser {
  accountId: string;
  role: string;
}

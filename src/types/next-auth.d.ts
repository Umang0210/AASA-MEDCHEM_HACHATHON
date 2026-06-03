/**
 * next-auth.d.ts
 * Augments NextAuth session/JWT types to include our custom fields.
 */
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
    } & DefaultSession["user"];
  }
}

declare module "@auth/core/jwt" {
  interface JWT {
    id?: string;
    role?: string;
  }
}

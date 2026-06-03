import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: {
    strategy: "jwt",
  },

  pages: {
    signIn: "/login",
  },

  providers: [
    Credentials({
      name: "credentials",

      credentials: {
        email: {
          label: "Email",
          type: "email",
        },
        password: {
          label: "Password",
          type: "password",
        },
      },

      async authorize(credentials) {
        try {
          console.log("LOGIN ATTEMPT:", credentials?.email);

          if (!credentials?.email || !credentials?.password) {
            console.log("Missing credentials");
            return null;
          }

          const [user] = await db
            .select()
            .from(users)
            .where(eq(users.email, credentials.email as string))
            .limit(1);

          console.log("User found:", !!user);

          if (!user) {
            console.log("User not found");
            return null;
          }

          console.log("User email:", user.email);
          console.log("Has password hash:", !!user.passwordHash);

          const valid = await bcrypt.compare(
            credentials.password as string,
            user.passwordHash
          );

          console.log("Password valid:", valid);

          if (!valid) {
            console.log("Invalid password");
            return null;
          }

          console.log("Login successful");

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
          };
        } catch (error) {
          console.error("AUTHORIZE ERROR:", error);
          throw error;
        }
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      try {
        if (user) {
          token.id = user.id;
          token.role = (user as { role?: string }).role;
        }

        return token;
      } catch (error) {
        console.error("JWT CALLBACK ERROR:", error);
        throw error;
      }
    },

    async session({ session, token }) {
      try {
        console.log("SESSION CALLBACK");

        if (session.user) {
          (session.user as any).id = token.id;
          (session.user as any).role = token.role;
        }

        return session;
      } catch (error) {
        console.error("SESSION CALLBACK ERROR:", error);
        throw error;
      }
    },
  },

  debug: true,
});
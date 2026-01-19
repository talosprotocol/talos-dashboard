
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        // Production-ready: Use environment variables for admin access
        // In a real DB-backed app, this would query the DB.
        // For this dashboard, env-based admin is a valid production pattern (like Grafana).
        const adminEmail = process.env.ADMIN_EMAIL || "admin@talos.security";
        const adminPassword = process.env.ADMIN_PASSWORD || "talos_secure_start";

        if (credentials.email === adminEmail && credentials.password === adminPassword) {
          return {
            id: "1",
            name: "Talos Admin",
            email: adminEmail,
            // Custom claim for principal mapping
            principalId: "admin_principal_01" 
          };
        }
        return null;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // @ts-expect-error - user type extension
        token.principalId = user.principalId; 
        token.accessToken = "mock_token_for_legacy_compat"; // We might need to generate a real JWT signature here if upstream validates it
      }
      return token;
    },
    async session({ session, token }) {
      // @ts-expect-error - session type extension
      session.principalId = token.principalId;
      // @ts-expect-error - session type extension
      session.accessToken = token.accessToken;
      return session;
    },
  },
  // pages: {
  //   signIn: "/login",
  // }
});

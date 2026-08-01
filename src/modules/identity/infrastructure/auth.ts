import { prismaAdapter } from "@better-auth/prisma-adapter";
import { betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import { twoFactor } from "better-auth/plugins";

import { readAuthEnv } from "@/infrastructure/config/env";
import { getPrisma } from "@/infrastructure/database/prisma";
import { createSmtpMailDelivery } from "@/infrastructure/mail/smtp-mail-delivery";
import {
  passwordResetEmail,
  verificationEmail,
} from "@/modules/identity/application/identity-mail-templates";
import { validateInvitationToken } from "@/modules/identity/application/invitations";

function createAuth() {
  const config = readAuthEnv();
  const prisma = getPrisma();

  return betterAuth({
    appName: "proyectoxyz",
    baseURL: config.BETTER_AUTH_URL,
    secret: config.BETTER_AUTH_SECRET,
    database: prismaAdapter(prisma, {
      provider: "postgresql",
      transaction: true,
    }),
    user: { modelName: "User" },
    session: {
      modelName: "Session",
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
      freshAge: 60 * 15,
    },
    account: { modelName: "Account" },
    verification: {
      modelName: "Verification",
      storeIdentifier: "hashed",
    },
    emailAndPassword: {
      enabled: true,
      disableSignUp: false,
      requireEmailVerification: true,
      minPasswordLength: 12,
      maxPasswordLength: 128,
      resetPasswordTokenExpiresIn: 60 * 60,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, url }) => {
        await createSmtpMailDelivery().send(
          passwordResetEmail({
            to: user.email,
            name: user.name,
            url,
          }),
        );
      },
    },
    emailVerification: {
      sendOnSignUp: false,
      sendOnSignIn: true,
      autoSignInAfterVerification: false,
      expiresIn: 60 * 60,
      sendVerificationEmail: async ({ user, url }) => {
        await createSmtpMailDelivery().send(
          verificationEmail({
            to: user.email,
            name: user.name,
            url,
          }),
        );
      },
    },
    rateLimit: {
      enabled: true,
      window: 60,
      max: 100,
      customRules: {
        "/sign-in/email": { window: 60, max: 5 },
        "/request-password-reset": { window: 60 * 15, max: 3 },
        "/send-verification-email": { window: 60 * 15, max: 3 },
      },
    },
    databaseHooks: {
      user: {
        create: {
          before: async (user, context) => {
            const token = context?.headers?.get("x-proyectoxyz-invitation") ?? "";
            const invitation = await validateInvitationToken(token, user.email);
            if (!invitation) {
              throw new APIError("BAD_REQUEST", {
                code: "INVALID_INVITATION",
                message: "La invitación no es válida o venció.",
              });
            }

            return { data: { ...user, emailVerified: true } };
          },
        },
      },
    },
    advanced: {
      database: { generateId: false },
      cookiePrefix: "proyectoxyz",
      useSecureCookies: process.env.NODE_ENV === "production",
    },
    plugins: [
      twoFactor({
        issuer: "proyectoxyz",
        twoFactorTable: "TwoFactor",
        accountLockout: {
          enabled: true,
          maxFailedAttempts: 5,
          durationSeconds: 60 * 15,
        },
      }),
    ],
  });
}

export type ProjectAuth = ReturnType<typeof createAuth>;

let authInstance: ProjectAuth | undefined;

export function getAuth(): ProjectAuth {
  authInstance ??= createAuth();
  return authInstance;
}

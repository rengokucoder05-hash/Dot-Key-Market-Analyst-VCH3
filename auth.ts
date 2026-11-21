import { createClerkClient, verifyToken } from "@clerk/backend";
import { Header, Cookie, APIError, Gateway } from "encore.dev/api";
import { authHandler } from "encore.dev/auth";
import { secret } from "encore.dev/config";

const clerkSecretKey = secret("ClerkSecretKey");

function getClerkClient() {
  return createClerkClient({ secretKey: clerkSecretKey() });
}

interface AuthParams {
  authorization?: Header<"Authorization">;
  session?: Cookie<"session">;
}

export interface AuthData {
  userID: string;
  imageUrl: string;
  email: string | null;
  name: string | null;
}

export const auth = authHandler<AuthParams, AuthData>(async (data) => {
  const token = data.authorization?.replace("Bearer ", "") ?? data.session?.value;
  if (!token) {
    throw APIError.unauthenticated("missing token");
  }

  try {
    const verifiedToken = await verifyToken(token, {
      secretKey: clerkSecretKey(),
    });

    const clerkClient = getClerkClient();
    const user = await clerkClient.users.getUser(verifiedToken.sub);
    return {
      userID: user.id,
      imageUrl: user.imageUrl,
      email: user.emailAddresses[0]?.emailAddress ?? null,
      name: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || null,
    };
  } catch (err) {
    throw APIError.unauthenticated("invalid token", err as Error);
  }
});

export const gw = new Gateway({ authHandler: auth });

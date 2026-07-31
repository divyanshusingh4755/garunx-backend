import {
  cert,
  getApp,
  getApps,
  initializeApp,
  type ServiceAccount,
} from "firebase-admin/app";

import {
  getAuth,
} from "firebase-admin/auth";

import serviceAccount from "../../serviceAccountKey.json" with {
  type: "json",
};

const isServiceAccount = (
  value: unknown,
): value is ServiceAccount => {
  if (
    typeof value !== "object" ||
    value === null
  ) {
    return false;
  }

  const candidate =
    value as Record<
      string,
      unknown
    >;

  return (
    typeof candidate.projectId ===
      "string" &&
    typeof candidate.clientEmail ===
      "string" &&
    typeof candidate.privateKey ===
      "string"
  );
};

if (
  !isServiceAccount(
    serviceAccount,
  )
) {
  throw new Error(
    "Invalid Firebase service account configuration",
  );
}

const app =
  getApps().length === 0
    ? initializeApp({
        credential:
          cert(serviceAccount),
      })
    : getApp();

export const auth =
  getAuth(app);
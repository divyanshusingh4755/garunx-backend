import { cert, getApp, getApps, initializeApp, } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import serviceAccount from "../../serviceAccountKey.json" with { type: "json" };
const isServiceAccount = (value) => {
    if (typeof value !== "object" || value === null) {
        return false;
    }
    const candidate = value;
    return (typeof candidate.projectId === "string" &&
        typeof candidate.clientEmail === "string" &&
        typeof candidate.privateKey === "string");
};
if (!isServiceAccount(serviceAccount)) {
    throw new Error("Invalid Firebase service account configuration");
}
const app = getApps().length === 0
    ? initializeApp({
        credential: cert(serviceAccount),
    })
    : getApp();
export const auth = getAuth(app);
//# sourceMappingURL=firebase.js.map
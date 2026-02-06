import { getApps, initializeApp, getApp, cert, type ServiceAccount, } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import serviceAccount from '../../serviceAccountKey.json' with { type: 'json' };

const app = getApps().length === 0
    ? initializeApp({
        credential: cert(serviceAccount as ServiceAccount),
    })
    : getApp();

export const auth = getAuth(app);

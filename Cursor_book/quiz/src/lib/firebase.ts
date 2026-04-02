import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";

type FirebaseClientConfig = {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  storageBucket?: string;
  messagingSenderId?: string;
  appId?: string;
};

function parseJsonConfig(input: string | undefined): FirebaseClientConfig | null {
  if (!input) return null;

  // Normalize input first so we can reuse the same `s` in fallbacks.
  let s = input.trim();
  // Remove wrapping single/double quotes (common in .env snippets).
  if (
    (s.startsWith("'") && s.endsWith("'")) ||
    (s.startsWith('"') && s.endsWith('"'))
  ) {
    s = s.slice(1, -1).trim();
  }

  // Normalize smart quotes (copy/paste from some editors).
  s = s.replace(/[\u201C\u201D\u2018\u2019]/g, '"'); // “ ” and ‘ ’
  // Normalize non-breaking spaces and other variants.
  s = s.replace(/\u00A0/g, " ");
  s = s.replace(/\u202F/g, " ");
  s = s.replace(/\u2009/g, " ");

  // Remove trailing semicolon (common when pasted from JS snippet).
  if (s.endsWith(";")) s = s.slice(0, -1).trim();

  // Regex extraction fallback (works even if quotes/JSON formatting is off).
  const keys: Array<keyof FirebaseClientConfig> = [
    "apiKey",
    "authDomain",
    "projectId",
    "storageBucket",
    "messagingSenderId",
    "appId",
  ];
  const extract = () => {
    const out: FirebaseClientConfig = {};
    for (const key of keys) {
      // Accept:
      // - apiKey: "value"
      // - "apiKey": "value"
      // - ‘apiKey’: ‘value’
      const re = new RegExp(
        `(?:["'\\u201C\\u201D\\u2018\\u2019])?${key}(?:["'\\u201C\\u201D\\u2018\\u2019])?\\s*:\\s*["'\\u201C\\u201D\\u2018\\u2019]([^"']+)["'\\u201C\\u201D\\u2018\\u2019]`,
        "m"
      );
      const match = s.match(re);
      if (match && match[1]) out[key] = match[1].trim();
    }
    return out;
  };

  // Try strict JSON parse first.
  try {
    const v = JSON.parse(s) as FirebaseClientConfig;
    if (v && typeof v === "object") {
      // Fill any missing fields from regex extraction.
      const extracted = extract();
      const merged: FirebaseClientConfig = { ...extracted, ...v };
      return merged;
    }
  } catch {
    // ignore and try more permissive parsing below
  }

  // Try "object-literal-ish" -> JSON by quoting unquoted keys.
  const sQuotedKeys = s.replace(
    /([{,]\s*)([A-Za-z0-9_]+)\s*:/g,
    '$1"$2":'
  );

  try {
    const v2 = JSON.parse(sQuotedKeys) as FirebaseClientConfig;
    if (v2 && typeof v2 === "object") {
      const extracted = extract();
      const merged: FirebaseClientConfig = { ...extracted, ...v2 };
      return merged;
    }
  } catch {
    // ignore and try regex fallback below
  }

  // Final fallback: extract fields via regex.
  const out = extract();
  const ok = keys.every(
    (k) => typeof out[k] === "string" && out[k]!.trim().length > 0
  );
  return ok ? out : null;
}

// Client-side Firebase initialization.
// NOTE:
// - 기본: `NEXT_PUBLIC_FIREBASE_*` 환경변수로 각 필드를 제공합니다.
// - 대안: `NEXT_PUBLIC_FIREBASE_CONFIG_JSON`(또는 `FIREBASE_CONFIG_JSON`)에
//   firebaseConfig 객체(JSON 문자열)를 통째로 넣을 수 있습니다.
const jsonConfig =
  parseJsonConfig(process.env.NEXT_PUBLIC_FIREBASE_CONFIG_JSON) ??
  parseJsonConfig(process.env.FIREBASE_CONFIG_JSON);

const firebaseConfig: FirebaseClientConfig = {
  apiKey:
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY ??
    jsonConfig?.apiKey,
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ??
    jsonConfig?.authDomain,
  projectId:
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ??
    jsonConfig?.projectId,
  storageBucket:
    process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ??
    jsonConfig?.storageBucket,
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ??
    jsonConfig?.messagingSenderId,
  appId:
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID ??
    jsonConfig?.appId,
};

const normalizedConfig = {
  apiKey: firebaseConfig.apiKey?.trim(),
  authDomain: firebaseConfig.authDomain?.trim(),
  projectId: firebaseConfig.projectId?.trim(),
  storageBucket: firebaseConfig.storageBucket?.trim(),
  messagingSenderId: firebaseConfig.messagingSenderId?.trim(),
  appId: firebaseConfig.appId?.trim(),
};

const hasConfig = Boolean(
  normalizedConfig.apiKey &&
    normalizedConfig.authDomain &&
    normalizedConfig.projectId &&
    normalizedConfig.storageBucket &&
    normalizedConfig.messagingSenderId &&
    normalizedConfig.appId
);

// Important:
// Next.js build/pre-render 단계(서버)에서는 env가 없을 수 있으므로,
// 여기서는 throw 하지 않고 "클라이언트 런타임에서만" 초기화합니다.
let app: ReturnType<typeof initializeApp> | null = null;

if (typeof window !== "undefined" && hasConfig) {
  const cfg = normalizedConfig as Required<FirebaseClientConfig>;
  const matchingApp = getApps().find((existing) => {
    const opts = existing.options as Partial<FirebaseClientConfig>;
    return (
      opts.projectId === cfg.projectId && opts.authDomain === cfg.authDomain
    );
  });

  // If the previously initialized Firebase app was created with different (or missing)
  // config values, reusing `getApps()[0]` will keep throwing configuration-not-found.
  // Create a new app instance when no matching one exists.
  app = matchingApp ?? initializeApp(cfg, `quiz_${Date.now()}`);
}

let dbInstance: ReturnType<typeof getFirestore> | null = null;

if (app) {
  try {
    dbInstance = getFirestore(app);
  } catch {
    dbInstance = null;
  }
}

export const db = dbInstance;

export function getFirebaseConfigStatus() {
  const requiredKeys: Array<keyof typeof normalizedConfig> = [
    "apiKey",
    "authDomain",
    "projectId",
    "storageBucket",
    "messagingSenderId",
    "appId",
  ];

  const missing = requiredKeys.filter((k) => !normalizedConfig[k]);
  return {
    hasConfig,
    missingFields: missing,
    // Do not leak secrets: only lengths.
    projectId: normalizedConfig.projectId ?? null,
    authDomain: normalizedConfig.authDomain ?? null,
    providedLengths: {
      apiKey: normalizedConfig.apiKey ? normalizedConfig.apiKey.length : 0,
      authDomain: normalizedConfig.authDomain
        ? normalizedConfig.authDomain.length
        : 0,
      projectId: normalizedConfig.projectId ? normalizedConfig.projectId.length : 0,
      storageBucket: normalizedConfig.storageBucket
        ? normalizedConfig.storageBucket.length
        : 0,
      messagingSenderId: normalizedConfig.messagingSenderId
        ? normalizedConfig.messagingSenderId.length
        : 0,
      appId: normalizedConfig.appId ? normalizedConfig.appId.length : 0,
    },
  };
}


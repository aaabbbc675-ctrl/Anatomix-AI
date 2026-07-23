// Single data-access facade (معماری سند بخش ۲.۱). Picks the backing adapter
// at runtime via feature-detection — never a build-time or version check —
// so it doesn't care which Electron version (if any) is running.
import { electronAdapter } from "./electronAdapter";
import { browserAdapter } from "./browserAdapter";

const isElectron = typeof window !== "undefined" && typeof window.anatomixDB !== "undefined";

if (!isElectron && typeof window !== "undefined") {
  console.warn(
    "[store/db] Electron bridge not found — falling back to the localStorage dev adapter. " +
      "This path is for `npm run dev` only and must never be used in the shipped app."
  );
}

export const db = isElectron ? electronAdapter : browserAdapter;

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Safely get hostname from a URL. Returns empty string if invalid. */
export function safeHostname(url: string | undefined | null): string {
  try {
    if (url == null || url === "") return "";
    return new URL(url).hostname ?? "";
  } catch {
    return "";
  }
}

/** Removes undefined values from an object. Firestore rejects undefined. */
export function sanitizeForFirestore<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined)
  ) as Record<string, unknown>;
}

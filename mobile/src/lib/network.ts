import * as Network from "expo-network";

/** Best-effort connectivity check. Any failure of the check itself counts as "online". */
export const isOnline = async (): Promise<boolean> => {
  try {
    const state = await Network.getNetworkStateAsync();
    if (state.isConnected === false) return false;
    if (state.isInternetReachable === false) return false;
    return true;
  } catch {
    return true;
  }
};

/** Heuristic: does this error look like a lost connection rather than a server/validation error? */
export const isNetworkError = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : String(error ?? "");
  return /network request failed|failed to fetch|network error|networkerror|load failed|internet|timed? ?out|econnrefused|enotfound|socket|соединен/i.test(
    message
  );
};

const API_URL = import.meta.env.VITE_API_URL || "";

export async function trpcCall<TResult = any>(
  path: string,
  type: "query" | "mutation",
  input?: any,
  token?: string | null
): Promise<TResult> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let url = `${API_URL}/trpc/${path}`;
  let init: RequestInit = {
    method: "POST",
    headers,
    credentials: "include",
  };

  if (type === "query") {
    init.method = "GET";
    if (input !== undefined) {
      url += `?input=${encodeURIComponent(JSON.stringify(input))}`;
    }
  } else {
    init.body = JSON.stringify(input ?? {});
  }

  const res = await fetch(url, init);
  const data = await res.json();

  if (!res.ok || data.error) {
    const message = data.error?.json?.message || data.error?.message || "An error occurred";
    throw new Error(message);
  }

  return data.result?.data;
}

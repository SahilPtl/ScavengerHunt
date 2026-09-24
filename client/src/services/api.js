const base = import.meta.env.VITE_API_URL || "/api";
export async function api(path, { method = "GET", body, signal } = {}) {
  let response;
  try {
    response = await fetch(base + path, {
      method,
      signal,
      headers: {
        "Content-Type": "application/json",
        ...(sessionStorage.getItem("hunt-token")
          ? { Authorization: "Bearer " + sessionStorage.getItem("hunt-token") }
          : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  } catch (e) {
    if (e.name === "AbortError") throw e;
    throw Error("Cannot reach the server. Check your connection and retry.");
  }
  const result = await response
    .json()
    .catch(() => ({ message: "Server returned an unreadable response" }));
  if (!response.ok) {
    if (response.status === 401 && sessionStorage.getItem("hunt-token")) {
      sessionStorage.removeItem("hunt-token");
      window.dispatchEvent(new Event("hunt-logout"));
    }
    throw Error(result.message || "Request failed");
  }
  return result.data;
}

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname !== "/callback" || request.method !== "GET") {
      return new Response("Not Found", { status: 404 });
    }

    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    if (!code || !state) {
      return new Response("Missing code or state parameter", { status: 400 });
    }

    // State format: {port}.{original_state}
    // A dotless state means the original state was empty: some providers strip the
    // trailing dot from "{port}." before echoing it back. Treat the whole value as
    // the port with an empty original state (the port range check below still
    // rejects genuinely malformed states).
    const dotIndex = state.indexOf(".");
    const port = Number(dotIndex === -1 ? state : state.substring(0, dotIndex));
    const originalState = dotIndex === -1 ? "" : state.substring(dotIndex + 1);

    if (!Number.isInteger(port) || port < 1024 || port > 65535) {
      return new Response("Invalid port", { status: 400 });
    }

    const target = new URL(`http://127.0.0.1:${port}/oauth/callback`);

    // Pass through all query params — providers may add extras beyond code/state
    for (const [key, value] of url.searchParams) {
      if (key === "state") {
        target.searchParams.set("state", originalState);
      } else {
        target.searchParams.set(key, value);
      }
    }

    return Response.redirect(target.toString(), 302);
  },
} satisfies ExportedHandler;

export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname !== "/callback" || request.method !== "GET") {
      return new Response("Not Found", { status: 404 });
    }

    const code = url.searchParams.get("code");
    const error = url.searchParams.get("error");
    const state = url.searchParams.get("state");

    if (!state) {
      return new Response("Missing state parameter", { status: 400 });
    }

    // A callback carries either an authorization code (success) or an error
    // (e.g. the user denied consent). Forward both so Airlock's local callback
    // server can react — dropping errors here would leave Airlock hanging.
    if (!code && !error) {
      return new Response("Missing code or error parameter", { status: 400 });
    }

    // State format: {port}.{original_state}
    // When the original state is empty, Airlock still sends "{port}." but some
    // providers (e.g. Linear) strip the trailing separator, so a bare "{port}"
    // arrives with no dot. Treat that as port-only with an empty original state.
    const dotIndex = state.indexOf(".");
    const portStr = dotIndex === -1 ? state : state.substring(0, dotIndex);
    const originalState = dotIndex === -1 ? "" : state.substring(dotIndex + 1);

    // Decimal digits only — reject hex/scientific/signed/whitespace forms that
    // Number() would otherwise accept. Airlock always sends a plain decimal port.
    const port = Number(portStr);
    if (!/^\d+$/.test(portStr) || port < 1024 || port > 65535) {
      return new Response("Invalid state format", { status: 400 });
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

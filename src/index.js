export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Handle API sync requests at /api/sync
    if (url.pathname === "/api/sync") {
      const corsHeaders = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      };

      if (request.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
      }

      if (request.method === "GET") {
        const data = await env.SSLG_KV.get("portalState");
        return new Response(data || "{}", {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (request.method === "POST") {
        const auth = request.headers.get("Authorization");
        if (auth !== "Bearer NNCHS_SSLG_SECRET_2026") {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        const body = await request.text();
        await env.SSLG_KV.put("portalState", body);
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Serve your static website for all other routes
    return env.ASSETS.fetch(request);
  },
};

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const method = request.method;

  // CORS 헤더 설정
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };

  if (method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (method === "GET") {
      const action = url.searchParams.get("action");
      
      if (action === "get_ranking") {
        const { results } = await env.DB.prepare(
          "SELECT nickname, score FROM ranking ORDER BY score DESC LIMIT 10"
        ).all();
        
        const notice = { nickname: "[공지]", score: "[영구 서버로 정상화 완료! 기존 기록은 유지됩니다]" };
        return new Response(JSON.stringify([notice, ...results]), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      if (action === "get_score") {
        const nickname = url.searchParams.get("nickname");
        const result = await env.DB.prepare(
          "SELECT score FROM ranking WHERE nickname = ?"
        ).bind(nickname).first();
        
        return new Response(JSON.stringify({ score: result ? result.score : 0 }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    if (method === "POST") {
      const { nickname, score } = await request.json();
      
      if (nickname === "[공지]") {
        return new Response(JSON.stringify({ status: "ignored" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await env.DB.prepare(
        "INSERT OR REPLACE INTO ranking (nickname, score) VALUES (?, MAX(COALESCE((SELECT score FROM ranking WHERE nickname = ?), 0), ?))"
      ).bind(nickname, nickname, score).run();

      return new Response(JSON.stringify({ status: "success" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response("Not Found", { status: 404 });
}

/* Link curto da ficha (barackprime.com/f/<token>).
   Entrega a mesma ficha.html, mas já com a foto, o título e o valor do imóvel nas tags de prévia,
   para o WhatsApp, Instagram e Facebook mostrarem a foto do imóvel em vez do logo. */
const API = "https://fspqwjrmjjykjpkjxwvb.supabase.co/functions/v1/atendimento";
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const brl = (v) => "R$ " + Math.round(Number(v) || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");

module.exports = async (req, res) => {
  const host = req.headers["x-forwarded-host"] || req.headers.host || "barackprime.com";
  const origin = `https://${host}`;
  const t = String((req.query && req.query.t) || "").replace(/[^a-z0-9]/gi, "").slice(0, 40);
  let html = "";
  try { const r = await fetch(`${origin}/ficha.html`, { redirect: "follow" }); html = await r.text(); } catch (e) {}
  if (!html) { res.statusCode = 302; res.setHeader("Location", `/ficha.html?t=${t}`); return res.end(); }

  let meta = "";
  if (t.length >= 12) {
    try {
      const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), 6000);
      const r = await fetch(API, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "ficha", t, preview: true }), signal: ctl.signal });
      clearTimeout(tm);
      const j = await r.json();
      if (j && j.ok && j.p) {
        const p = j.p; const rent = p.purpose === "aluguel";
        const own = (p.photos || []).find((u) => /supabase\.co\//.test(u) && !/\.webp(\?|$)/i.test(u));
        const img = own || (p.ref ? `${origin}/media/og/${String(p.ref).toLowerCase()}.jpg` : `${origin}/media/og.jpg`);
        const title = `${p.ref ? p.ref + " · " : ""}${p.title}`;
        const specs = [[p.beds, "quarto", "quartos"], [p.suites, "suíte", "suítes"], [p.area, "m² construídos", "m² construídos"], [p.lot, "m² de terreno", "m² de terreno"]].filter((x) => x[0]).map((x) => `${x[0]} ${Number(x[0]) === 1 ? x[1] : x[2]}`).join(" · ");
        const desc = [p.price ? brl(p.price) + (rent ? "/mês" : "") : "", p.hood ? `${p.hood}, Foz do Iguaçu` : "Foz do Iguaçu", specs].filter(Boolean).join(" · ");
        meta = `<meta property="og:type" content="website"><meta property="og:site_name" content="Barack Prime"><meta property="og:title" content="${esc(title)}"><meta property="og:description" content="${esc(desc)}"><meta property="og:image" content="${esc(img)}"><meta property="og:image:alt" content="${esc(p.title)}"><meta property="og:url" content="${esc(origin + "/f/" + t)}"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${esc(title)}"><meta name="twitter:description" content="${esc(desc)}"><meta name="twitter:image" content="${esc(img)}">`;
        html = html.replace(/<title>[^<]*<\/title>/, `<title>${esc(title)} · Barack Prime</title>`);
      }
    } catch (e) {}
  }
  html = html.replace(/<meta property="og:[^>]*>|<meta name="twitter:[^>]*>/g, "").replace("</head>", `${meta}</head>`);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "public, max-age=0, s-maxage=600");
  res.setHeader("X-Robots-Tag", "noindex");
  res.statusCode = 200; res.end(html);
};

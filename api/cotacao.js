/* Cotação do dia para o conversor de moeda do site (barackprime.com/api/cotacao).
   Base: 1 real (BRL). Fonte pública e gratuita, sem chave: open.er-api.com (ExchangeRate-API).
   A Vercel guarda a resposta por 6 horas, então a fonte é consultada no máximo ~4 vezes por dia. */
const WANT = ["USD", "PYG", "ARS", "EUR"];

module.exports = async (req, res) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  try {
    const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), 6000);
    const r = await fetch("https://open.er-api.com/v6/latest/BRL", { signal: ctl.signal });
    clearTimeout(tm);
    const j = await r.json();
    if (!j || j.result !== "success" || !j.rates) throw new Error("sem cotação");
    const rates = { BRL: 1 };
    for (const c of WANT) if (Number(j.rates[c]) > 0) rates[c] = Number(j.rates[c]);
    if (!rates.USD) throw new Error("sem dólar");
    const date = j.time_last_update_unix ? new Date(j.time_last_update_unix * 1000).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
    res.setHeader("Cache-Control", "public, s-maxage=21600, stale-while-revalidate=86400");
    res.statusCode = 200;
    return res.end(JSON.stringify({ base: "BRL", rates, date, source: "ExchangeRate-API (open.er-api.com)" }));
  } catch (e) {
    res.setHeader("Cache-Control", "no-store");
    res.statusCode = 502;
    return res.end(JSON.stringify({ error: "cotação indisponível" }));
  }
};

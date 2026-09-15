/**
 * Атлас · сервер семейного обмена
 *
 * Хранит только зашифрованные пакеты. Ключ группы сюда не попадает,
 * поэтому содержимое поездок серверу неизвестно.
 *
 * Как поднять (бесплатно, 10 минут):
 *   1. dash.cloudflare.com → Workers & Pages → Create → Worker
 *   2. вставить этот файл, Deploy
 *   3. Settings → Variables → KV Namespace Bindings:
 *      создать хранилище и привязать его под именем ATLAS
 *   4. адрес вида https://имя.ваш-домен.workers.dev вписать
 *      в приложении: Профиль → Семья → Сервер
 */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const [, action, group] = url.pathname.split("/");

    if (request.method === "OPTIONS")
      return new Response(null, { headers: CORS });

    // проверка доступности — приложение спрашивает её сама
    if (action === "ping") return json({ ok: true, v: 1 });

    if (!group || !/^[a-f0-9]{8,32}$/.test(group))
      return json({ error: "bad group" }, 400);

    // положить свой пакет
    if (action === "put" && request.method === "POST") {
      const body = await request.json();
      if (!body?.data || !body?.iv) return json({ error: "bad packet" }, 400);
      const who = String(body.who || "anon").slice(0, 40);
      // у каждого участника свой слот: перезаписывается только он
      await env.ATLAS.put(
        `${group}:${who}`,
        JSON.stringify({ iv: body.iv, data: body.data, at: Date.now() }),
        { expirationTtl: 60 * 60 * 24 * 180 } // полгода без обновлений — и слот исчезнет
      );
      return json({ ok: true });
    }

    // забрать пакеты группы
    if (action === "get") {
      const list = await env.ATLAS.list({ prefix: `${group}:` });
      const out = [];
      for (const k of list.keys) {
        const v = await env.ATLAS.get(k.name);
        if (v) out.push(JSON.parse(v));
      }
      return json(out);
    }

    return json({ error: "not found" }, 404);
  },
};

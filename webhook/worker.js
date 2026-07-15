/* ============================================================
   DESPEGA — Cloudflare Worker: webhook de MercadoPago
   Flujo: pago aprobado → verificar con MP API → sacar código
   del KV pool → enviar email con Resend → marcar como procesado
   ============================================================ */

const PLAN_LABEL = { pro: "PRO ($19.900 COP)", elite: "Elite ($39.900 COP)" };
const APP_URL = "https://despega.aprendeamonetizar.com";

// Umbrales de precio en COP para detectar el plan
// (úsalos si no puedes diferenciar por external_reference)
const PRICE_PRO   = 15000;   // >= 15K → PRO
const PRICE_ELITE = 35000;   // >= 35K → Elite

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // ── Health check ──────────────────────────────────────────
    if (request.method === "GET" && url.pathname === "/") {
      return ok("Despega webhook activo ✅");
    }

    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    // ── Parsear body ──────────────────────────────────────────
    let body;
    try {
      body = await request.json();
    } catch {
      return new Response("Bad Request", { status: 400 });
    }

    // MercadoPago envía: { type: "payment", data: { id: "123" } }
    if (body.type !== "payment") {
      return ok("Ignorado: tipo " + body.type);
    }

    const paymentId = String(body.data?.id ?? "");
    if (!paymentId) return new Response("Sin payment ID", { status: 400 });

    try {
      // ── Verificar pago con la API de MercadoPago ─────────────
      const mpRes = await fetch(
        `https://api.mercadopago.com/v1/payments/${paymentId}`,
        { headers: { Authorization: `Bearer ${env.MP_ACCESS_TOKEN}` } }
      );

      if (!mpRes.ok) {
        console.error("MP API error:", mpRes.status, await mpRes.text());
        return new Response("MP error", { status: 502 });
      }

      const payment = await mpRes.json();

      // Solo procesar pagos aprobados
      if (payment.status !== "approved") {
        return ok(`Ignorado: estado ${payment.status}`);
      }

      // ── Idempotencia: evitar doble-procesamiento ──────────────
      const done = await env.CODES_KV.get(`done:${paymentId}`);
      if (done) return ok("Ya procesado");

      // ── Determinar plan ───────────────────────────────────────
      // Opción A: external_reference definida en el link de MP ("pro" o "elite")
      // Opción B: por monto (fallback)
      let plan = (payment.external_reference || "").toLowerCase();
      if (plan !== "pro" && plan !== "elite") {
        const amount = payment.transaction_amount || 0;
        plan = amount >= PRICE_ELITE ? "elite" : amount >= PRICE_PRO ? "pro" : "";
      }

      if (!plan) {
        console.warn("Plan desconocido para pago", paymentId, payment.transaction_amount);
        await alertOwner(env, `Plan desconocido. Pago ${paymentId} | monto: ${payment.transaction_amount} | email: ${payment.payer?.email}`);
        return ok("Plan no reconocido");
      }

      // ── Info del comprador ────────────────────────────────────
      const email = payment.payer?.email;
      const name  = payment.payer?.first_name || "amigo/a";

      if (!email) {
        await alertOwner(env, `Sin email. Pago ${paymentId} (${plan}) — entrégalo manualmente`);
        return ok("Sin email del comprador");
      }

      // ── Tomar el siguiente código disponible del pool ─────────
      const poolKey  = `pool:${plan}`;
      const poolRaw  = await env.CODES_KV.get(poolKey);
      const pool     = poolRaw ? JSON.parse(poolRaw) : [];

      if (!pool.length) {
        await alertOwner(
          env,
          `⚠️ CÓDIGOS ${plan.toUpperCase()} AGOTADOS.\nPago ${paymentId} de ${email} — entrega el código manualmente.`
        );
        return new Response("Sin códigos disponibles", { status: 500 });
      }

      const code = pool.shift();
      await env.CODES_KV.put(poolKey, JSON.stringify(pool));

      // ── Registrar como procesado (TTL 1 año) ─────────────────
      await env.CODES_KV.put(
        `done:${paymentId}`,
        JSON.stringify({ plan, code, email, name, ts: Date.now() }),
        { expirationTtl: 365 * 24 * 3600 }
      );

      // ── Enviar email con el código ────────────────────────────
      await sendActivationEmail(env, { email, name, code, plan });

      console.log(`✅ ${plan.toUpperCase()} | ${email} | ${code} | pago ${paymentId}`);
      return ok("Código enviado a " + email);

    } catch (err) {
      console.error("Worker error:", err);
      return new Response("Internal Error", { status: 500 });
    }
  },
};

/* ── Email de activación ─────────────────────────────────────── */
async function sendActivationEmail(env, { email, name, code, plan }) {
  const label   = PLAN_LABEL[plan];
  const isPro   = plan === "pro";
  const subject = `🚀 Tu código de activación Despega ${isPro ? "PRO" : "Elite"}`;

  const html = /* html */`
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>${subject}</title></head>
<body style="margin:0;padding:0;background:#0b0e14;font-family:sans-serif">
  <div style="max-width:480px;margin:32px auto;background:#141821;border-radius:16px;overflow:hidden">

    <div style="background:linear-gradient(135deg,#ff8a2a,#ff4d68);padding:28px 32px">
      <div style="font-size:2rem">🚀</div>
      <h1 style="margin:8px 0 4px;color:#fff;font-size:1.3rem">
        ¡Tu plan Despega <strong>${isPro ? "PRO" : "Elite"}</strong> está listo!
      </h1>
      <p style="margin:0;color:rgba(255,255,255,0.85);font-size:0.9rem">${label}</p>
    </div>

    <div style="padding:28px 32px;color:#e0e6ef">
      <p style="margin:0 0 18px">Hola <strong>${name}</strong>, gracias por tu compra. 🎉</p>

      <p style="margin:0 0 8px;font-size:0.85rem;color:#888;text-transform:uppercase;letter-spacing:0.06em">
        Tu código de activación
      </p>
      <div style="background:#0b0e14;border:2px solid #ff8a2a;border-radius:10px;
                  padding:18px 24px;font-family:monospace;font-size:1.4rem;
                  font-weight:700;color:#ff8a2a;letter-spacing:0.12em;text-align:center;
                  margin-bottom:24px">
        ${code}
      </div>

      <p style="margin:0 0 6px;font-weight:600">Cómo activarlo:</p>
      <ol style="margin:0 0 24px;padding-left:20px;color:#b0bec5;line-height:1.8">
        <li>Abre <a href="${APP_URL}" style="color:#ff8a2a">${APP_URL}</a></li>
        <li>Ve a la sección <strong style="color:#e0e6ef">PRO ⚡</strong></li>
        <li>Haz clic en <em>"Ya tengo un código"</em></li>
        <li>Ingresa el código de arriba y toca <strong style="color:#e0e6ef">Activar</strong></li>
      </ol>

      <div style="background:#0b0e14;border-radius:10px;padding:14px 18px;font-size:0.85rem;color:#888">
        ⚠️ Este código es <strong style="color:#e0e6ef">personal e intransferible</strong>. Actívalo en el
        dispositivo que más uses. Si tienes dudas, escríbenos por
        WhatsApp: <a href="https://wa.me/${env.WHATSAPP}" style="color:#ff8a2a">wa.me/${env.WHATSAPP}</a>
      </div>
    </div>

    <div style="padding:16px 32px;border-top:1px solid #1e2535;text-align:center;
                font-size:0.78rem;color:#555">
      Despega · aprendeamonetizar.com
    </div>
  </div>
</body>
</html>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `Despega <noreply@${env.EMAIL_DOMAIN}>`,
      to: [email],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Resend ${res.status}: ${err}`);
  }
}

/* ── Alerta al dueño ─────────────────────────────────────────── */
async function alertOwner(env, message) {
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: `Despega Webhook <noreply@${env.EMAIL_DOMAIN}>`,
      to: [env.OWNER_EMAIL],
      subject: "⚠️ Despega webhook: acción requerida",
      html: `<pre style="font-family:monospace">${message}</pre>`,
    }),
  });
}

function ok(msg) {
  return new Response(msg, { status: 200, headers: { "Content-Type": "text/plain" } });
}

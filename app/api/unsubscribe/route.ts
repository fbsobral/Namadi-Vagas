import { disableNotify } from "@/lib/db";
import { verifyUnsub } from "@/lib/unsub";

export const dynamic = "force-dynamic";

const page = (title: string, body: string, status = 200) =>
  new Response(
    `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
<body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#f6f3ec;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#17140f">
<div style="max-width:420px;padding:32px;text-align:center"><div style="font-family:Georgia,serif;font-size:30px;margin-bottom:10px">${title}</div><p style="color:#5a544a;line-height:1.6">${body}</p></div></body></html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );

async function handle(req: Request) {
  const u = new URL(req.url);
  const s = u.searchParams.get("s") ?? "";
  const t = u.searchParams.get("t") ?? "";
  if (!s || !t || !verifyUnsub(s, t)) return page("Link inválido", "Este link para parar de receber e-mails não é válido ou expirou.", 400);
  await disableNotify(s);
  return page("Pronto, sem mais e-mails", "Você não receberá mais o resumo desta busca. Dá para ligar de novo quando quiser, editando a busca no painel.");
}

export const GET = handle;
export const POST = handle; // "List-Unsubscribe-Post": cancelamento de um clique feito pelo provedor de e-mail

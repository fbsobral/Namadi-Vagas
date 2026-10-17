import type { DigestJob } from "./db";
import { sourceLabel } from "./sources";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const MAX = 15;

export function renderDigest(o: {
  searchName: string;
  color: string;
  jobs: DigestJob[];
  appUrl: string;
  searchUrl: string;
  unsubscribeUrl: string;
  test?: boolean;
}) {
  const n = o.jobs.length;
  const shown = o.jobs.slice(0, MAX);
  const more = n - shown.length;
  const subject = `${o.test ? "[Teste] " : ""}${n} ${n === 1 ? "vaga nova" : "vagas novas"} · ${o.searchName}`;

  const rows = shown
    .map(
      (j) => `
      <tr><td style="padding:0 0 10px 0">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#ffffff;border:1px solid #e5dfd1;border-radius:16px">
          <tr><td style="padding:16px 18px">
            <a href="${esc(j.url)}" style="font-size:16px;line-height:1.35;font-weight:700;color:#17140f;text-decoration:none">${esc(j.title)}</a>
            <div style="margin-top:4px;font-size:14px;color:#5a544a">${esc(j.company)}${j.location ? ` · ${esc(j.location)}` : ""}</div>
            <div style="margin-top:10px">
              <span style="display:inline-block;background:#efebe2;color:#5a544a;font-size:12px;font-weight:600;padding:3px 10px;border-radius:999px">${esc(sourceLabel(j.source))}</span>
              <a href="${esc(j.url)}" style="float:right;font-size:13px;font-weight:600;color:#e8501f;text-decoration:none">Ver vaga →</a>
            </div>
          </td></tr>
        </table>
      </td></tr>`,
    )
    .join("");

  const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#f6f3ec;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6f3ec"><tr><td align="center" style="padding:28px 14px">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px">
      <tr><td style="padding:0 4px 18px 4px;font-size:20px;color:#17140f;font-family:Georgia,'Times New Roman',serif">
        <span style="color:#e8501f">●</span>&nbsp;Namadi <em style="color:#5a544a">vagas</em>
      </td></tr>
      <tr><td style="padding:0 4px 18px 4px">
        <div style="font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#8e8779;font-weight:600">${o.test ? "E-mail de teste · " : ""}Resumo do robô</div>
        <div style="margin-top:6px;font-family:Georgia,'Times New Roman',serif;font-size:32px;line-height:1.1;color:#17140f">${n} ${n === 1 ? "vaga nova" : "vagas novas"}</div>
        <div style="margin-top:6px;font-size:15px;color:#5a544a"><span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${esc(o.color)};margin-right:6px"></span>${esc(o.searchName)}</div>
      </td></tr>
      ${rows}
      ${more > 0 ? `<tr><td style="padding:2px 4px 10px 4px;font-size:14px;color:#5a544a">+ ${more} ${more === 1 ? "vaga" : "vagas"} no painel</td></tr>` : ""}
      <tr><td align="left" style="padding:10px 4px 26px 4px">
        <a href="${esc(o.searchUrl)}" style="display:inline-block;background:#e8501f;color:#ffffff;font-weight:700;font-size:15px;text-decoration:none;padding:13px 26px;border-radius:999px">Abrir no painel</a>
      </td></tr>
      <tr><td style="padding:16px 4px 0 4px;border-top:1px solid #e5dfd1;font-size:12px;line-height:1.6;color:#8e8779">
        Você recebe este resumo porque ligou o e-mail da busca <strong>${esc(o.searchName)}</strong>.<br>
        <a href="${esc(o.unsubscribeUrl)}" style="color:#8e8779">Parar de receber este e-mail</a> · <a href="${esc(o.appUrl)}" style="color:#8e8779">Namadi Vagas</a>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;

  const text = [
    `${n} ${n === 1 ? "vaga nova" : "vagas novas"} · ${o.searchName}`,
    "",
    ...shown.map((j) => `• ${j.title}\n  ${j.company}${j.location ? ` · ${j.location}` : ""} (${sourceLabel(j.source)})\n  ${j.url}`),
    more > 0 ? `\n+ ${more} no painel` : "",
    "",
    `Abrir no painel: ${o.searchUrl}`,
    `Parar de receber: ${o.unsubscribeUrl}`,
  ].join("\n");

  return { subject, html, text };
}

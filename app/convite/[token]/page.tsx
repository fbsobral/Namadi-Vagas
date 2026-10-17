import Link from "next/link";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/auth";
import { inviteByToken } from "@/lib/db";
import { Logo } from "@/components/logo";
import { AcceptInvite } from "@/components/accept-invite";

export const dynamic = "force-dynamic";

const mask = (email: string) => email.replace(/^(.).*(@.*)$/, "$1•••$2");

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const viewer = await getViewer();
  if (!viewer) redirect(`/sign-in?redirect_url=${encodeURIComponent(`/convite/${token}`)}`);

  const inv = await inviteByToken(token);
  let card: React.ReactNode;

  if (!inv) {
    card = <Msg title="Convite não encontrado" body="Este link não é válido ou o convite foi cancelado por quem o enviou." />;
  } else if (inv.status === "accepted" && inv.user_id === viewer.userId) {
    redirect(`/dashboard?s=${inv.search_id}`);
  } else if (inv.status === "accepted") {
    card = <Msg title="Convite já utilizado" body="Este convite já foi aceito por outra conta." />;
  } else if (!viewer.emails.includes(inv.email)) {
    card = <Msg title="Este convite é para outro e-mail" body={`Ele foi enviado para ${mask(inv.email)}. Entre com esse e-mail para aceitar (você está logado como ${viewer.email ?? "outra conta"}).`} />;
  } else {
    card = (
      <>
        <p className="text-xs font-medium tracking-wider text-accent uppercase">Convite</p>
        <h1 className="font-display mt-2 text-4xl leading-[1.05]"><em className="text-accent not-italic">{inv.inviter_name ?? "Alguém"}</em> compartilhou uma busca com você</h1>
        <p className="mt-4 flex items-center gap-2 text-lg"><span className="size-3 rounded-full" style={{ background: inv.search_color }} />{inv.search_name}</p>
        <p className="mt-3 text-sm text-ink-2">Ao aceitar, você vê as vagas que o robô encontrar. Seus favoritos e seu Kanban continuam só seus.</p>
        <AcceptInvite token={token} memberId={inv.id} />
      </>
    );
  }

  return (
    <main className="relative z-10 grid min-h-dvh place-items-center px-4 py-10">
      <div className="anim-rise w-full max-w-md">
        <Link href="/" className="mb-7 inline-block"><Logo /></Link>
        <div className="rounded-[28px] border border-line bg-surface p-7 shadow-pop sm:p-9">{card}</div>
      </div>
    </main>
  );
}

function Msg({ title, body }: { title: string; body: string }) {
  return (
    <>
      <h1 className="font-display text-4xl leading-[1.05]">{title}</h1>
      <p className="mt-3 text-ink-2">{body}</p>
      <Link href="/dashboard" className="mt-6 inline-block rounded-full bg-ink px-6 py-3 font-medium text-bg transition hover:opacity-85">Ir para o painel</Link>
    </>
  );
}

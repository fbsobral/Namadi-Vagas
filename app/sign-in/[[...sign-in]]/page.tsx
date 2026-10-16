import { SignIn } from "@clerk/nextjs";
import { AuthShell } from "@/components/auth-shell";

export default function Page() {
  return <AuthShell title="Bem-vindo de volta." sub="Seu radar continuou trabalhando enquanto você esteve fora."><SignIn /></AuthShell>;
}

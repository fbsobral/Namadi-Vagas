import { SignUp } from "@clerk/nextjs";
import { AuthShell } from "@/components/auth-shell";

export default function Page() {
  return <AuthShell title="Comece seu radar." sub="Crie sua conta e deixe o robô procurar por você."><SignUp /></AuthShell>;
}

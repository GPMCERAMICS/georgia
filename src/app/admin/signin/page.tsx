import { Logo } from "@/components/site/logo";
import { SignIn } from "@/components/admin/sign-in";

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-3">
          <Logo className="h-10 w-auto text-primary" />
          <span className="font-display text-xl leading-none">
            Georgia Perkins
            <span className="block text-[0.65rem] font-sans uppercase tracking-[0.28em] text-muted-foreground">
              Dashboard
            </span>
          </span>
        </div>
        <SignIn />
      </div>
    </div>
  );
}

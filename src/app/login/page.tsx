import { LoginForm } from "./login-form";
import { ThemeToggle } from "@/components/theme-toggle";
import { LoginHero, BrandMark } from "@/components/login-hero";


export const metadata = { title: "Sign in · Cellutech HRMS" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;

  return (
    <main className="relative grid min-h-screen bg-background lg:grid-cols-[1.1fr_1fr]">
      <LoginHero />
      <section className="relative flex flex-col px-6 py-8 sm:px-12">
        <ThemeToggle className="absolute right-4 top-4" />
        <div className="auth-enter m-auto w-full max-w-sm">
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <BrandMark className="h-9 w-9 text-indigo-500" />
            <p className="text-lg font-semibold tracking-tight">Cellutech HRMS</p>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Sign in to your account</h1>
          <p className="mt-2 text-sm text-muted-foreground">Use your work email and password to continue.</p>
          <div className="auth-form mt-8">
            <LoginForm from={from ?? ""} />
          </div>
          <p className="mt-8 text-center text-xs text-muted-foreground">
            Trouble signing in? Contact your HR administrator.
          </p>
        </div>
        <p className="text-center text-xs text-muted-foreground">&copy; {new Date().getFullYear()} Cellutech. All rights reserved.</p>
      </section>
    </main>
  );
}
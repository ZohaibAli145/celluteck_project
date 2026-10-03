"use client";

import { useActionState, useState } from "react";
import { Loader2 } from "lucide-react";
import { loginAction, type LoginState } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Quick-fill buttons for reviewers (same accounts as the README). Remove for production.
const DEMO_ACCOUNTS = [
  { label: "Super Admin", email: "admin@cellutech.com" },
  { label: "HR Manager", email: "hr.dubai@cellutech.com" },
  { label: "Dept Head", email: "head.eng.dubai@cellutech.com" },
  { label: "Team Lead", email: "lead.eng.dubai@cellutech.com" },
  { label: "Employee", email: "emp1.eng.dubai@cellutech.com" },
];

export function LoginForm({ from }: { from: string }) {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(loginAction, {});
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-2xl">Cellutech HRMS</CardTitle>
        <CardDescription>Sign in with your work email.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <form action={formAction} className="space-y-4" noValidate>
          <input type="hidden" name="from" value={from} />

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              aria-invalid={!!state.fieldErrors?.email}
            />
            {state.fieldErrors?.email && (
              <p className="text-sm text-red-600 dark:text-red-400">{state.fieldErrors.email[0]}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={!!state.fieldErrors?.password}
            />
            {state.fieldErrors?.password && (
              <p className="text-sm text-red-600 dark:text-red-400">{state.fieldErrors.password[0]}</p>
            )}
          </div>

          {state.error && (
            <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-300">
              {state.error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={pending}>
            {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Sign in
          </Button>
        </form>

        <div className="space-y-2 border-t pt-4">
          <p className="text-xs text-muted-foreground">
            Demo accounts — click to fill (password: Password@123)
          </p>
          <div className="flex flex-wrap gap-2">
            {DEMO_ACCOUNTS.map((a) => (
              <Button
                key={a.email}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setEmail(a.email);
                  setPassword("Password@123");
                }}
              >
                {a.label}
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
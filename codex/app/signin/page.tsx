"use client";

import { useAuthActions } from "@convex-dev/auth/react";
import type { FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useState } from "react";

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }
  return "Unable to sign in.";
}

export default function SignIn() {
  const { signIn } = useAuthActions();
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    formData.set("flow", flow);
    try {
      setError(null);
      await signIn("password", formData);
      router.push("/");
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-lg dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold">Slack Clone</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            {flow === "signIn"
              ? "Welcome back! Enter your details to rejoin your workspace."
              : "Create an account to start chatting with your team."}
          </p>
        </div>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="flex flex-col gap-2">
            <label
              htmlFor="email"
              className="text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              placeholder="you@example.com"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label
              htmlFor="password"
              className="text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete={flow === "signIn" ? "current-password" : "new-password"}
              minLength={8}
              required
              className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              placeholder="Enter your password"
            />
          </div>
          <button
            type="submit"
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
          >
            {flow === "signIn" ? "Sign in" : "Create account"}
          </button>
        </form>
        <div className="mt-4 flex items-center justify-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <span>
            {flow === "signIn"
              ? "Need an account?"
              : "Already have an account?"}
          </span>
          <button
            type="button"
            onClick={() => setFlow(flow === "signIn" ? "signUp" : "signIn")}
            className="font-semibold text-slate-900 underline transition-colors hover:text-slate-600 dark:text-slate-100 dark:hover:text-slate-300"
          >
            {flow === "signIn" ? "Create one" : "Sign in"}
          </button>
        </div>
        {error && (
          <div className="mt-4 rounded-md border border-red-400 bg-red-50 p-3 text-sm text-red-600 dark:border-red-500/60 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

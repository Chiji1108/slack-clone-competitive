"use client";

import SlackApp from "@/components/SlackApp";
import { useConvexAuth } from "convex/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const router = useRouter();

  useEffect(() => {
    if (!(isLoading || isAuthenticated)) {
      router.push("/signin");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="h-32 w-32 animate-spin rounded-full border-indigo-600 border-b-2" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <SlackApp />;
}

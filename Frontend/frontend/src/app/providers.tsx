"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { GoogleOAuthProvider } from "@react-oauth/google";
import { useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {

  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // Optional: Config
        retry: 1,
      },
    },
  }));

  return (
    <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!}>
        <QueryClientProvider client={queryClient}>
          {children}
        </QueryClientProvider>
    </GoogleOAuthProvider>
  );
}
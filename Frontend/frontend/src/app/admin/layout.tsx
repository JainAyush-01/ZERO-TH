"use client";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
        // ALLOWED ROLES: Admin, Creator, Tester
        const allowedRoles = ['admin', 'creator', 'tester'];
        
        if (!user || !allowedRoles.includes(user.role)) {
            router.push("/"); // Kick out normal users
        }
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) return null;

  return <div className="bg-[#050505] min-h-screen text-white">{children}</div>;
}
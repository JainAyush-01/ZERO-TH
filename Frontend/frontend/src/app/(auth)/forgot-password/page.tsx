"use client";
import { useState, Suspense } from "react"; // <-- ADDED Suspense HERE
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import api from "@/lib/api";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Loader2, Mail, Lock, KeyRound, ArrowLeft } from "lucide-react";

const step1Schema = z.object({
  emailId: z.string().email("Invalid email format"),
});

const step2Schema = z.object({
  emailId: z.string().email(), 
  otp: z.string().length(6, "Must be exactly 6 digits"),
  newPassword: z.string().min(8, "Password must be 8+ characters"),
});

type ForgotPasswordForm = {
  emailId: string;
  otp?: string;
  newPassword?: string;
};

// 1. Rename the main function to Content
function ForgotPasswordFormContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentStep = (parseInt(searchParams.get("step") || "1")) === 2 ? 2 : 1;
  const savedEmail = searchParams.get("email") || "";

  const [loading, setLoading] = useState(false);

  const currentSchema = currentStep === 1 ? step1Schema : step2Schema;

  const { register, handleSubmit, formState: { errors } } = useForm<ForgotPasswordForm>({
    resolver: zodResolver(currentSchema),
    defaultValues: {
      emailId: savedEmail 
    }
  });

  const onSubmit = async (data: ForgotPasswordForm) => {
    setLoading(true);
    try {
      if (currentStep === 1) {
        await api.post("/user/forgot-password", { emailId: data.emailId });
        toast.success("OTP sent to your email");
        
        const params = new URLSearchParams(searchParams);
        params.set("step", "2");
        params.set("email", data.emailId);
        router.push(`${pathname}?${params.toString()}`);
        
      } else {
        await api.post("/user/reset-password", { 
            emailId: savedEmail,
            otp: data.otp,
            newPassword: data.newPassword
        });
        
        toast.success("Password reset successfully. Please login.");
        router.push("/login");
      }
    } catch (err: any) {
        const msg = err.response?.data || "Operation failed";
        toast.error(typeof msg === 'string' ? msg : "System Error");
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#050505]">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-900/10 rounded-full blur-[120px] -z-10" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md p-8 bg-[#0A0A0A] border border-white/10 rounded-2xl shadow-2xl relative z-10"
      >
        <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white mb-2">Account Recovery</h1>
            <p className="text-neutral-400 text-sm">
                {currentStep === 1 ? "Enter your email to receive a recovery code." : "Set a new security key."}
            </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          
          {currentStep === 1 && (
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-neutral-500 uppercase flex items-center gap-2">
                    <Mail size={12} /> Email Protocol
                </label>
                <input 
                  {...register("emailId")}
                  className="w-full bg-[#111] border border-white/10 rounded-lg px-4 py-3 text-white focus:border-accent focus:outline-none transition-all placeholder-neutral-700"
                  placeholder="user@zeroth.io"
                />
                {errors.emailId && <p className="text-red-400 text-xs">{errors.emailId?.message?.toString()}</p>}
              </div>
          )}

          {currentStep === 2 && (
              <>
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-neutral-500 uppercase flex items-center gap-2 text-accent">
                        <KeyRound size={12} /> Verification Code
                    </label>
                    <input 
                        {...register("otp")}
                        className="w-full bg-[#111] border border-accent/30 rounded-lg px-4 py-3 text-white focus:border-accent focus:ring-1 focus:ring-accent/20 outline-none transition-all placeholder-neutral-700 tracking-widest font-mono"
                        placeholder="123456"
                        maxLength={6}
                    />
                    {errors.otp && <p className="text-red-400 text-xs">{errors.otp?.message?.toString()}</p>}
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-neutral-500 uppercase flex items-center gap-2">
                        <Lock size={12} /> New Security Key
                    </label>
                    <input 
                        type="password"
                        {...register("newPassword")}
                        className="w-full bg-[#111] border border-white/10 rounded-lg px-4 py-3 text-white focus:border-accent focus:outline-none transition-all placeholder-neutral-700"
                        placeholder="••••••••"
                    />
                    {errors.newPassword && <p className="text-red-400 text-xs">{errors.newPassword?.message?.toString()}</p>}
                  </div>
              </>
          )}

          <Button 
            disabled={loading}
            className="w-full mt-6 h-12 text-base font-bold tracking-wide"
          >
            {loading ? <Loader2 className="animate-spin" /> : currentStep === 1 ? "Send Recovery Code" : "Reset Password"}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-neutral-500">
            <Link href="/login" className="text-neutral-400 hover:text-white flex items-center justify-center gap-2 transition-colors">
                <ArrowLeft size={14} /> Back to Login
            </Link>
        </div>
      </motion.div>
    </div>
  );
}

// 2. Wrap the component in Suspense so Vercel doesn't crash during build!
export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#050505]"><Loader2 className="animate-spin text-white" /></div>}>
      <ForgotPasswordFormContent />
    </Suspense>
  );
}
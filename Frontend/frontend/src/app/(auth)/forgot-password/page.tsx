"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import api from "@/lib/api";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Loader2, Mail, Lock, KeyRound, ArrowLeft } from "lucide-react";

// Unified Schema (Handles both steps)
const forgotPasswordSchema = z.object({
  emailId: z.string().email("Invalid email"),
  // OTP and NewPassword are optional initially, but we validate them manually in Step 2
  otp: z.string().optional(),
  newPassword: z.string().optional(),
});

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors }, setError } = useForm<ForgotPasswordForm>({
    resolver: zodResolver(forgotPasswordSchema),
  });

  const onSubmit = async (data: ForgotPasswordForm) => {
    setLoading(true);
    try {
      if (step === 1) {
        // Step 1: Send OTP
        await api.post("/user/forgot-password", { emailId: data.emailId });
        setEmail(data.emailId);
        setStep(2);
        toast.success("OTP sent to your email");
      } else {
        // Step 2: Reset Password
        if (!data.otp || data.otp.length < 6) {
             setError("otp", { message: "Enter valid 6-digit OTP" });
             setLoading(false);
             return;
        }
        if (!data.newPassword || data.newPassword.length < 6) {
             setError("newPassword", { message: "Password must be 6+ chars" });
             setLoading(false);
             return;
        }

        await api.post("/user/reset-password", { 
            emailId: email,
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
                {step === 1 ? "Enter your email to receive a recovery code." : "Set a new security key."}
            </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          
          {step === 1 && (
              <div className="space-y-1">
                <label className="text-[10px] font-mono text-neutral-500 uppercase flex items-center gap-2">
                    <Mail size={12} /> Email Protocol
                </label>
                <input 
                  {...register("emailId")}
                  className="w-full bg-[#111] border border-white/10 rounded-lg px-4 py-3 text-white focus:border-accent focus:outline-none transition-all placeholder-neutral-700"
                  placeholder="user@zeroth.io"
                />
                {errors.emailId && <p className="text-red-400 text-xs">{errors.emailId.message}</p>}
              </div>
          )}

          {step === 2 && (
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
                    {errors.otp && <p className="text-red-400 text-xs">{errors.otp.message}</p>}
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
                    {errors.newPassword && <p className="text-red-400 text-xs">{errors.newPassword.message}</p>}
                  </div>
              </>
          )}

          <Button 
            disabled={loading}
            className="w-full mt-6 h-12 text-base font-bold tracking-wide"
          >
            {loading ? <Loader2 className="animate-spin" /> : step === 1 ? "Send Recovery Code" : "Reset Password"}
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
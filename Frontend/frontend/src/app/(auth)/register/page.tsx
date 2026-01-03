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
import { Loader2, Mail, Lock, User, KeyRound } from "lucide-react";

// 1. Validation Schema
const registerSchema = z.object({
  firstName: z.string().min(2, "Name too short"),
  emailId: z.string().email("Invalid email"),
  password: z.string().min(6, "Password must be 6+ chars"),
  otp: z.string().min(6, "Enter the 6-digit OTP"),
});

type RegisterForm = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);

  const { register, handleSubmit, getValues, formState: { errors, isSubmitting } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  });

  // 2. Action: Send OTP
  const handleSendOtp = async () => {
    const email = getValues("emailId");
    // Manual validation for email before sending OTP
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return toast.error("Please enter a valid email first");
    }

    setOtpLoading(true);
    try {
        await api.post("/user/send-otp", { emailId: email });
        setOtpSent(true);
        toast.success(`OTP sent to ${email}`);
    } catch (err: any) {
        toast.error(err.response?.data || "Failed to send OTP");
    } finally {
        setOtpLoading(false);
    }
  };

  // 3. Action: Final Registration
  const onSubmit = async (data: RegisterForm) => {
    try {
        // Sends: firstName, emailId, password, otp
        await api.post("/user/register", data);
        toast.success("Account initialized successfully.");
        router.push("/login");
    } catch (err: any) {
        const errorMsg = err.response?.data?.message || "Registration failed";
        toast.error(errorMsg);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#050505]">
      {/* Background Decor */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-accent/10 rounded-full blur-[120px] -z-10" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md p-8 bg-[#0A0A0A] border border-white/10 rounded-2xl shadow-2xl relative z-10"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Initialize ID</h1>
          <p className="text-neutral-400 text-sm">Join the algorithmic elite.</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          
          {/* Name Field */}
          <div className="space-y-1">
            <label className="text-[10px] font-mono text-neutral-500 uppercase flex items-center gap-2">
                <User size={12} /> Identity Name
            </label>
            <input 
              {...register("firstName")}
              className="w-full bg-[#111] border border-white/10 rounded-lg px-4 py-3 text-white focus:border-accent focus:outline-none transition-all placeholder-neutral-700"
              placeholder="e.g. Neo"
            />
            {errors.firstName && <p className="text-red-400 text-xs">{errors.firstName.message}</p>}
          </div>

          {/* Email Field + OTP Button */}
          <div className="space-y-1">
            <label className="text-[10px] font-mono text-neutral-500 uppercase flex items-center gap-2">
                <Mail size={12} /> Email Protocol
            </label>
            <div className="flex gap-2">
                <input 
                    {...register("emailId")}
                    className="flex-1 bg-[#111] border border-white/10 rounded-lg px-4 py-3 text-white focus:border-accent focus:outline-none transition-all placeholder-neutral-700"
                    placeholder="neo@matrix.com"
                    disabled={otpSent} // Lock email after OTP sent to prevent mismatch
                />
                <Button 
                    type="button" 
                    onClick={handleSendOtp} 
                    disabled={otpLoading || otpSent}
                    className="whitespace-nowrap px-4 bg-white/5 hover:bg-white/10 text-white border border-white/10"
                >
                    {otpLoading ? <Loader2 size={14} className="animate-spin" /> : otpSent ? "Sent" : "Get OTP"}
                </Button>
            </div>
            {errors.emailId && <p className="text-red-400 text-xs">{errors.emailId.message}</p>}
          </div>

          {/* OTP Input (Conditional) */}
          {otpSent && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }} 
                animate={{ opacity: 1, height: "auto" }} 
                className="space-y-1"
              >
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
              </motion.div>
          )}

          {/* Password Field */}
          <div className="space-y-1">
            <label className="text-[10px] font-mono text-neutral-500 uppercase flex items-center gap-2">
                <Lock size={12} /> Security Key
            </label>
            <input 
              type="password"
              {...register("password")}
              className="w-full bg-[#111] border border-white/10 rounded-lg px-4 py-3 text-white focus:border-accent focus:outline-none transition-all placeholder-neutral-700"
              placeholder="••••••••"
            />
            {errors.password && <p className="text-red-400 text-xs">{errors.password.message}</p>}
          </div>

          <Button 
            disabled={isSubmitting || !otpSent} // Force OTP before submit
            className="w-full mt-6 h-12 text-base font-bold tracking-wide"
          >
            {isSubmitting ? "Processing..." : "Create Account"}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-neutral-500">
          Already have an ID? <Link href="/login" className="text-accent hover:underline">Login here</Link>
        </div>
      </motion.div>
    </div>
  );
}
"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import api from "@/lib/api";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { GoogleLogin } from '@react-oauth/google'; 

// Validation Schema
const loginSchema = z.object({
  emailId: z.string().email("Invalid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  // 1. Handle Standard Email Login
  const onSubmit = async (data: LoginForm) => {
    try {
        await api.post("/user/login", data);
        
        // Refresh Auth State
        await queryClient.invalidateQueries({ queryKey: ["auth-user"] });
        
        toast.success("Access Granted.");
        router.push("/problems"); 
    } catch (err: any) {
        // FIX: Safely extract error message string
        const msg = err.response?.data?.message || err.response?.data || "Invalid Credentials";
        toast.error(typeof msg === 'string' ? msg : "System Error");
    }
  };

  // 2. Handle Google Login Success
  const handleGoogleSuccess = async (credentialResponse: any) => {
      try {
          // Send the Google ID Token to your Backend
          await api.post('/user/google', { 
              idToken: credentialResponse.credential 
          });

          // Refresh Auth State
          await queryClient.invalidateQueries({ queryKey: ["auth-user"] });
          
          toast.success("Identity Verified via Google");
          router.push("/problems");
      } catch (err: any) {
          console.error(err);
          // FIX: Safely extract error message
          const msg = err.response?.data?.message || "Google Login Failed";
          toast.error(typeof msg === 'string' ? msg : "System Error");
      }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-[#050505]">
        {/* Background Decor */}
        <div className="absolute bottom-0 right-1/2 translate-x-1/2 w-[600px] h-[400px] bg-purple-900/20 rounded-full blur-[100px] -z-10" />

        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md p-8 bg-[#0A0A0A] border border-white/10 rounded-2xl shadow-2xl relative z-10"
        >
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-white mb-2">System Login</h1>
                <p className="text-neutral-400 text-sm">Enter your credentials to access the kernel.</p>
            </div>

            {/* --- GOOGLE LOGIN SECTION --- */}
            <div className="flex justify-center mb-6">
                <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={() => toast.error("Google Login Failed")}
                    theme="filled_black"
                    shape="pill"
                    width="100%"
                    text="continue_with"
                />
            </div>

            {/* Divider */}
            <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-white/10"></span>
                </div>
                <div className="relative flex justify-center text-[10px] uppercase font-mono tracking-wider">
                    <span className="bg-[#0A0A0A] px-2 text-neutral-500">Or continue with email</span>
                </div>
            </div>

            {/* --- STANDARD FORM --- */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-1">
                    <label className="text-xs font-mono text-neutral-500 uppercase">Email Protocol</label>
                    <input 
                        {...register("emailId")}
                        className="w-full bg-[#111] border border-white/10 rounded-lg px-4 py-3 text-white focus:border-accent focus:outline-none transition-all placeholder-neutral-700"
                        placeholder="user@zeroth.io"
                    />
                    {errors.emailId && <p className="text-red-400 text-xs">{errors.emailId.message}</p>}
                </div>

                <div className="space-y-1">
                    <label className="text-xs font-mono text-neutral-500 uppercase">Security Key</label>
                    <input 
                        type="password"
                        {...register("password")}
                        className="w-full bg-[#111] border border-white/10 rounded-lg px-4 py-3 text-white focus:border-accent focus:outline-none transition-all placeholder-neutral-700"
                        placeholder="••••••••"
                    />
                    {errors.password && <p className="text-red-400 text-xs">{errors.password.message}</p>}
                </div>

                <Button 
                    disabled={isSubmitting}
                    className="w-full mt-6 h-12 text-base font-bold tracking-wide"
                >
                    {isSubmitting ? "Authenticating..." : "Access System"}
                </Button>
            </form>

            <div className="mt-6 text-center text-sm text-neutral-500">
                New user? <Link href="/register" className="text-accent hover:underline">Initialize ID</Link>
            </div>
        </motion.div>
    </div>
  );
}
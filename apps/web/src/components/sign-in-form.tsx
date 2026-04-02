"use client";

import { useForm } from "@tanstack/react-form";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import z from "zod";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { AuthShell } from "./epl/auth-shell";
import { IconMail, IconLock, IconLogin, IconGlobe } from "@tabler/icons-react";

export default function SignInForm({ onSwitchToSignUp }: { onSwitchToSignUp: () => void }) {
  const router = useRouter();

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
    },
    onSubmit: async ({ value }) => {
      await authClient.signIn.email(
        {
          email: value.email,
          password: value.password,
        },
        {
          onSuccess: () => {
            router.push("/dashboard");
            toast.success("Sign in successful");
          },
          onError: (error) => {
            toast.error(error.error.message || error.error.statusText);
          },
        },
      );
    },
    validators: {
      onSubmit: z.object({
        email: z.string().email("Invalid email address"),
        password: z.string().min(8, "Password must be at least 8 characters"),
      }),
    },
  });

  return (
    <AuthShell>
      <div className="gc" style={{ padding: "40px", display: "flex", flexDirection: "column", gap: 32 }}>
        
        {/* Logo/Header */}
        <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
           <div style={{
              width: 52, height: 52, borderRadius: 14, 
              background: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 8px 16px rgba(46,194,126,0.3)",
              overflow: "hidden"
           }}>
              <img src="/EPL_logo_square-block.webp" alt="Logo" style={{ width: "80%", height: "80%", objectFit: "contain" }} />
           </div>
           <div>
              <h1 style={{ fontSize: 28, fontWeight: 900, color: "var(--ewhite)", margin: 0, fontFamily: "var(--font)" }}>
                 Welcome Back
              </h1>
              <p style={{ fontSize: 13, color: "var(--emuted)", fontWeight: 600, marginTop: 4, letterSpacing: "0.5px" }}>
                 GLOBAL FELLOWS PLATFORM
              </p>
           </div>
        </div>

        {/* Inputs */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
          style={{ display: "flex", flexDirection: "column", gap: 18 }}
        >
          <form.Field name="email">
            {(field) => (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                 <div style={{ position: "relative" }}>
                   <IconMail size={18} style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: "var(--emuted)" }} />
                   <input
                     id={field.name}
                     placeholder="Email Address"
                     type="email"
                     value={field.state.value}
                     onBlur={field.handleBlur}
                     onChange={(e) => field.handleChange(e.target.value)}
                     className="gc"
                     style={{
                        padding: "14px 16px 14px 48px", width: "100%", borderRadius: 12,
                        background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
                        color: "var(--ewhite)", fontSize: 14, outline: "none", transition: "all 0.3s"
                     }}
                   />
                 </div>
                 {field.state.meta.errors.map((error) => (
                   <p key={error?.message} style={{ fontSize: 11, color: "#E05C5C", margin: "4px 0 0 4px", fontWeight: 700 }}>
                     {error?.message}
                   </p>
                 ))}
              </div>
            )}
          </form.Field>

          <form.Field name="password">
            {(field) => (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                 <div style={{ position: "relative" }}>
                   <IconLock size={18} style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: "var(--emuted)" }} />
                   <input
                     id={field.name}
                     placeholder="Password"
                     type="password"
                     value={field.state.value}
                     onBlur={field.handleBlur}
                     onChange={(e) => field.handleChange(e.target.value)}
                     className="gc"
                     style={{
                        padding: "14px 16px 14px 48px", width: "100%", borderRadius: 12,
                        background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
                        color: "var(--ewhite)", fontSize: 14, outline: "none", transition: "all 0.3s"
                     }}
                   />
                 </div>
                 {field.state.meta.errors.map((error) => (
                   <p key={error?.message} style={{ fontSize: 11, color: "#E05C5C", margin: "4px 0 0 4px", fontWeight: 700 }}>
                     {error?.message}
                   </p>
                 ))}
              </div>
            )}
          </form.Field>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <Link
                 href="/forgot-password"
                 style={{ fontSize: 12, color: "var(--emuted)", fontWeight: 700, textDecoration: "none", transition: "color 0.2s" }}
                 onMouseOver={(e) => e.currentTarget.style.color = "var(--ewhite)"}
                 onMouseOut={(e) => e.currentTarget.style.color = "var(--emuted)"}
              >
                Forgot Password?
              </Link>
          </div>

          <form.Subscribe>
            {(state) => (
              <button
                type="submit"
                disabled={!state.canSubmit || state.isSubmitting}
                className="hover-lift"
                style={{
                   padding: "14px", borderRadius: 12, border: "none", 
                   background: "linear-gradient(135deg, #3B8BEB 0%, #1A5FB4 100%)",
                   color: "#fff", fontWeight: 800, fontSize: 15, cursor: "pointer",
                   marginTop: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                   boxShadow: "0 10px 20px -8px rgba(59,139,235,0.5)"
                }}
              >
                {state.isSubmitting ? "Authenticating..." : (
                   <>
                     <span>Sign In</span>
                     <IconLogin size={18} />
                   </>
                )}
              </button>
            )}
          </form.Subscribe>
        </form>

        <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: 6, marginTop: 10 }}>
           <div style={{ fontSize: 13, color: "var(--emuted)", fontWeight: 600 }}>Don't have an account yet?</div>
           <button
              onClick={onSwitchToSignUp}
              style={{
                 background: "none", border: "none", color: "#3B8BEB", fontWeight: 800, cursor: "pointer", fontSize: 13
              }}
           >
              Create New Account Hub
           </button>
        </div>
      </div>
    </AuthShell>
  );
}

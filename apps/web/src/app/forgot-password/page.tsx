"use client";

import { useForm } from "@tanstack/react-form";
import { toast } from "sonner";
import z from "zod";
import Link from "next/link";
import { AuthShell } from "@/components/epl/auth-shell";
import { IconMail, IconKey, IconArrowLeft, IconGlobe } from "@tabler/icons-react";
import { useState } from "react";

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);

  const form = useForm({
    defaultValues: {
      email: "",
    },
    onSubmit: async ({ value }) => {
      // Logic for forgot password would go here
      // For now we mock the success
      setSubmitted(true);
      toast.success("Reset link dispatched");
    },
    validators: {
      onSubmit: z.object({
        email: z.string().email("Invalid email address"),
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
              background: "linear-gradient(135deg, #E8A020 0%, #B47814 100%)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 8px 16px rgba(232,160,32,0.3)"
           }}>
              <IconKey size={26} color="#fff" />
           </div>
           <div>
              <h1 style={{ fontSize: 28, fontWeight: 900, color: "var(--ewhite)", margin: 0, fontFamily: "var(--font)" }}>
                 {submitted ? "Check Email" : "Reset Access"}
              </h1>
              <p style={{ fontSize: 13, color: "var(--emuted)", fontWeight: 600, marginTop: 4, letterSpacing: "0.5px" }}>
                 {submitted ? "WE'VE DISPATCHED SECURE INSTRUCTIONS" : "RESTORE YOUR NETWORK CREDENTIALS"}
              </p>
           </div>
        </div>

        {!submitted ? (
           <form
             onSubmit={(e) => {
               e.preventDefault();
               e.stopPropagation();
               form.handleSubmit();
             }}
             style={{ display: "flex", flexDirection: "column", gap: 24 }}
           >
             <div style={{ fontSize: 13, color: "var(--emuted)", textAlign: "center", lineHeight: 1.6 }}>
                Enter the administration email associated with your fellow profile to receive a cryptorecoverable reset link.
             </div>

             <form.Field name="email">
               {(field) => (
                 <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ position: "relative" }}>
                      <IconMail size={18} style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: "var(--emuted)" }} />
                      <input
                        id={field.name}
                        placeholder="Fellow Email Address"
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

             <form.Subscribe>
               {(state) => (
                 <button
                   type="submit"
                   disabled={!state.canSubmit || state.isSubmitting}
                   className="hover-lift"
                   style={{
                      padding: "14px", borderRadius: 12, border: "none", 
                      background: "linear-gradient(135deg, #E8A020 0%, #B47814 100%)",
                      color: "#fff", fontWeight: 800, fontSize: 15, cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
                      boxShadow: "0 10px 20px -8px rgba(232,160,32,0.4)"
                   }}
                 >
                   {state.isSubmitting ? "Dispatching..." : "Send Reset Instructions"}
                 </button>
               )}
             </form.Subscribe>
           </form>
        ) : (
           <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ fontSize: 14, color: "var(--emuted)", lineHeight: 1.6 }}>
                 We've sent an encrypted recovery link to your inbox. Please check your spam folder if you don't receive it within 5 minutes.
              </div>
              <button
                 onClick={() => setSubmitted(false)}
                 style={{
                    background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", 
                    padding: "12px", borderRadius: 12, color: "var(--ewhite)", fontWeight: 700, cursor: "pointer"
                 }}
              >
                 Resend Instructions
              </button>
           </div>
        )}

        <div style={{ textAlign: "center", borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: 20 }}>
           <Link
              href="/login"
              style={{
                 display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                 color: "var(--emuted)", fontSize: 13, fontWeight: 700, textDecoration: "none"
              }}
           >
              <IconArrowLeft size={16} />
              Return to Login Hub
           </Link>
        </div>
      </div>
    </AuthShell>
  );
}

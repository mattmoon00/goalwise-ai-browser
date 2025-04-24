// src/pages/Auth.tsx
import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignup, setIsSignup] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
  
    if (isSignup) {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) return setError(error.message);
      navigate("/onboarding");
    } else {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return setError(error.message);
  
      // Fetch profile to check onboarding status
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_complete")
        .eq("id", data.user.id)
        .single();
  
      if (!profile?.onboarding_complete) {
        navigate("/onboarding");
      } else {
        navigate("/");
      }
    }
  };
  

  return (
    <div className="max-w-md mx-auto py-16 px-6">
      <h2 className="text-3xl font-bold mb-8 text-center">
        {isSignup ? "Sign Up" : "Log In"}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-5">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="w-full p-3 border border-gray-300 rounded-lg"
          required
        />

        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full p-3 border border-gray-300 rounded-lg"
          required
        />

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button
          className="w-full bg-green-600 text-white font-semibold py-3 rounded-lg hover:bg-primary/90 transition"
          type="submit"
        >
          {isSignup ? "Sign Up" : "Log In"}
        </button>
      </form>

      <button
        onClick={() => setIsSignup(!isSignup)}
        className="block w-full text-sm text-center mt-6 text-primary hover:underline"
      >
        {isSignup
          ? "Already have an account? Log In"
          : "Don't have an account? Sign Up"}
      </button>
    </div>
  );
}

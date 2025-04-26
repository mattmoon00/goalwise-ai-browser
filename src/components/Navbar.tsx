// src/components/Navbar.tsx
import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabaseClient";
import toast from "react-hot-toast";

const Navbar = () => {
  const navItemClass =
    "text-sm font-medium px-4 py-2 rounded hover:bg-muted transition";
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Failed to sign out");
    } else {
      toast.success("Signed out");
      navigate("/auth");
    }
  };

  return (
    <nav className="bg-white border-b border-muted px-6 py-4 mb-8 shadow-sm">
      <div className="max-w-5xl mx-auto flex gap-4 items-center">
        <span className="text-xl font-bold text-primary">Goalwise</span>
        <div className="ml-auto flex gap-2 items-center">
          <NavLink to="/" className={navItemClass}>
            Dashboard
          </NavLink>
          <NavLink to="/goals" className={navItemClass}>
            Goals
          </NavLink>
          <NavLink to="/budget" className={navItemClass}>
            Budget
          </NavLink>
          <NavLink to="/transactions" className={navItemClass}>
            Transactions
          </NavLink>
          <NavLink to="/upgrade" className={navItemClass}>
  Upgrade
</NavLink>

          <NavLink to="/connect-bank" className={navItemClass}>
            Connect Bank
          </NavLink>
          {user && (
            <button
              onClick={handleLogout}
              className="text-sm px-4 py-2 bg-red-100 text-red-800 rounded hover:bg-red-200 transition"
            >
              Sign Out
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;

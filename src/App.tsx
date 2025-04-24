import { Routes, Route, Navigate } from "react-router-dom";
import Navbar from "./components/Navbar";
import Dashboard from "./pages/Dashboard";
import Budget from "./pages/Budget";
import Goals from "./pages/Goals";
import ConnectBank from "./pages/ConnectBank";
import AuthPage from "./pages/Auth";
import { useAuth } from "./contexts/AuthContext";
import Transactions from "./pages/Transactions";
import Onboarding from "./pages/Onboarding"; // add this import


import "./index.css"; // this line is essential

// Wrapper to protect routes
function PrivateRoute({ children }: { children: JSX.Element }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/auth" />;
}

function App() {
  return (
    <div className="min-h-screen bg-background text-foreground font-sans">
      <Navbar />
      <main className="p-6 max-w-5xl mx-auto">
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/budget"
            element={
              <PrivateRoute>
                <Budget />
              </PrivateRoute>
            }
          />
          <Route
            path="/goals"
            element={
              <PrivateRoute>
                <Goals />
              </PrivateRoute>
            }
          />
          <Route
  path="/onboarding"
  element={
    <PrivateRoute>
      <Onboarding />
    </PrivateRoute>
  }
/>
          <Route
  path="/transactions"
  element={
    <PrivateRoute>
      <Transactions />
    </PrivateRoute>
  }
/>

          <Route
            path="/connect-bank"
            element={
              <PrivateRoute>
                <ConnectBank />
              </PrivateRoute>
            }
          />
        </Routes>
      </main>
    </div>
  );
}

export default App;

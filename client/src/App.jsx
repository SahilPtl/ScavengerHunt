import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import Layout from "./components/Layout";
import AuthPage from "./pages/AuthPage";
import DashboardPage from "./pages/DashboardPage";
import GamePage from "./pages/GamePage";
import LeaderboardPage from "./pages/LeaderboardPage";
function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <main className="page">Loading your adventure…</main>;
  return user ? children : <Navigate to="/login" replace />;
}
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Layout>
          <Routes>
            <Route path="/login" element={<AuthPage />} />
            <Route path="/register" element={<AuthPage register />} />
            <Route
              path="/"
              element={
                <Protected>
                  <DashboardPage />
                </Protected>
              }
            />
            <Route
              path="/hunt/:id"
              element={
                <Protected>
                  <GamePage />
                </Protected>
              }
            />
            <Route
              path="/leaderboard"
              element={
                <Protected>
                  <LeaderboardPage />
                </Protected>
              }
            />
            <Route
              path="*"
              element={
                <main className="page">
                  <h1>This trail ends here.</h1>
                  <a href="/">Return to campus</a>
                </main>
              }
            />
          </Routes>
        </Layout>
      </AuthProvider>
    </BrowserRouter>
  );
}

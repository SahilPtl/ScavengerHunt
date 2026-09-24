import { Link, NavLink } from "react-router-dom";
import { Compass, LogOut, ArrowUpRight } from "lucide-react";
import { useAuth } from "../hooks/useAuth";
export default function Layout({ children }) {
  const { user, logout, demo } = useAuth();
  return (
    <>
      <header className="nav">
        <Link to="/" className="brand">
          <span className="brand-icon">
            <Compass size={23} />
          </span>
          <span>
            CAMPUS<span className="brand-light"> / HUNT</span>
            <small>MNNIT ALLAHABAD</small>
          </span>
        </Link>
        {user && (
          <nav>
            <NavLink to="/">Explore</NavLink>
            <NavLink to="/leaderboard">Leaderboard</NavLink>
          </nav>
        )}
        <div className="nav-right">
          {demo && <span className="local-tag">LOCAL EDITION</span>}
          {user ? (
            <>
              <span className="avatar">{user.name[0]}</span>
              <button
                className="icon-btn"
                onClick={logout}
                aria-label="Log out"
              >
                <LogOut size={18} />
              </button>
            </>
          ) : (
            <span className="muted">
              Find your next adventure <ArrowUpRight size={16} />
            </span>
          )}
        </div>
      </header>
      {children}
      <footer>
        <span>
          MNNIT Campus Hunt <span className="muted">/ Explore together.</span>
        </span>
        <span>Illustrative campus experience · Built for discovery</span>
      </footer>
    </>
  );
}

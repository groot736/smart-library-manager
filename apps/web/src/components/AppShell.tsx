import { Bell, BookOpen, LayoutDashboard, Search, Sparkles } from "lucide-react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { ThemeToggle } from "./ThemeToggle";
import { useAuthStore } from "../store/auth";
import { FloatingOrbs } from "./FloatingOrbs";

export const AppShell = () => {
  const { user, logout } = useAuthStore();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_20%_20%,_rgba(41,155,255,0.28),_transparent_35%),radial-gradient(circle_at_80%_0%,_rgba(255,132,64,0.22),_transparent_30%),linear-gradient(180deg,_var(--bg-a),_var(--bg-b))] text-[var(--text)]">
      <FloatingOrbs />
      <header className="sticky top-0 z-20 border-b border-white/10 bg-black/10 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between p-4">
          <Link to="/" className="flex items-center gap-2 text-lg font-bold tracking-wide">
            <BookOpen className="text-cyan-300" /> UniLib AI
          </Link>

          <nav className="hidden gap-2 md:flex">
            <NavLink to="/" className="nav-pill"><LayoutDashboard size={16} /> Home</NavLink>
            <NavLink to="/search" className="nav-pill"><Search size={16} /> Search</NavLink>
            <NavLink to="/dashboard" className="nav-pill"><BookOpen size={16} /> My Library</NavLink>
            {user ? <NavLink to="/innovation" className="nav-pill"><Sparkles size={16} /> AI Lab</NavLink> : null}
            {user?.role === "ADMIN" ? (
              <NavLink to="/admin" className="nav-pill"><Bell size={16} /> Admin</NavLink>
            ) : null}
          </nav>

          <div className="flex items-center gap-3 text-sm">
            <ThemeToggle />
            {user ? <span className="hidden sm:block">{user.name} ({user.role})</span> : null}
            {user ? (
              <button onClick={logout} className="rounded-xl border border-white/20 px-3 py-1.5 hover:bg-white/10">
                Logout
              </button>
            ) : (
              <Link to="/login" className="rounded-xl bg-white/15 px-3 py-1.5 hover:bg-white/20">Login</Link>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-4 md:p-6">
        <Outlet />
      </main>

      <nav className="fixed bottom-4 left-1/2 z-30 flex -translate-x-1/2 items-center gap-1 rounded-full border border-white/20 bg-black/30 p-1.5 backdrop-blur-xl md:hidden">
        <NavLink to="/" className="nav-pill"><LayoutDashboard size={16} /></NavLink>
        <NavLink to="/search" className="nav-pill"><Search size={16} /></NavLink>
        <NavLink to="/dashboard" className="nav-pill"><BookOpen size={16} /></NavLink>
        {user ? <NavLink to="/innovation" className="nav-pill"><Sparkles size={16} /></NavLink> : null}
        {user?.role === "ADMIN" ? <NavLink to="/admin" className="nav-pill"><Bell size={16} /></NavLink> : null}
      </nav>
    </div>
  );
};

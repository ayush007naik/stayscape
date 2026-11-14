import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="navbar">
      <div className="navbar-inner container">
        <Link to="/" className="brand">
          <span className="brand-mark">◈</span>
          <span className="brand-name">StayScape</span>
        </Link>

        <nav className="nav-links">
          <NavLink to="/" end className="nav-link">
            Explore
          </NavLink>
          {user && (
            <NavLink to="/trips" className="nav-link">
              My trips
            </NavLink>
          )}
          {user?.role === 'host' && (
            <NavLink to="/host" className="nav-link">
              Host dashboard
            </NavLink>
          )}
        </nav>

        <div className="nav-actions">
          {user ? (
            <>
              <span className="nav-user">
                <span className="avatar">{user.name.slice(0, 1).toUpperCase()}</span>
                <span className="nav-user-meta">
                  <span className="nav-user-name">{user.name}</span>
                  <span className={`role-badge role-${user.role}`}>{user.role}</span>
                </span>
              </span>
              <button type="button" className="btn btn-ghost" onClick={handleLogout}>
                Log out
              </button>
            </>
          ) : (
            <>
              <Link to="/register" className="btn btn-ghost">
                Sign up
              </Link>
              <Link to="/login" className="btn btn-primary">
                Log in
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

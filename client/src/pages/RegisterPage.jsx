import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'guest' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    setSubmitting(true);
    try {
      const user = await register({ ...form, email: form.email.trim() });
      navigate(user.role === 'host' ? '/host' : '/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h1>Create your account</h1>
        <p className="auth-sub">Book unique stays or start hosting your own place.</p>

        <form onSubmit={submit} className="auth-form">
          <label className="field">
            <span>Full name</span>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              autoComplete="name"
              required
            />
          </label>
          <label className="field">
            <span>Email</span>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              autoComplete="email"
              required
            />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              autoComplete="new-password"
              minLength={6}
              required
            />
          </label>

          <div className="field">
            <span>I want to</span>
            <div className="role-toggle">
              <button
                type="button"
                className={`role-option ${form.role === 'guest' ? 'is-active' : ''}`}
                onClick={() => setForm((f) => ({ ...f, role: 'guest' }))}
              >
                <strong>Book stays</strong>
                <small>Guest account</small>
              </button>
              <button
                type="button"
                className={`role-option ${form.role === 'host' ? 'is-active' : ''}`}
                onClick={() => setForm((f) => ({ ...f, role: 'host' }))}
              >
                <strong>Host a place</strong>
                <small>Host account</small>
              </button>
            </div>
          </div>

          {error && <p className="form-error">{error}</p>}

          <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
            {submitting ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { setToken, setActiveChatId } from '../utils/auth';

/**
 * AuthModal
 *
 * Rendered as an overlay over the ChatInterface when the user is not
 * authenticated.  Supports both Login and Register modes.
 *
 * Props:
 *   onSuccess(user) — called after a successful login / registration
 *                     with { user_id, email } from the API response.
 */
export function AuthModal({ onSuccess }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password;

    if (!trimmedEmail || !trimmedPassword) {
      setError('Fyll inn e-post og passord.');
      return;
    }

    if (mode === 'register' && trimmedPassword.length < 8) {
      setError('Passordet må være minst 8 tegn.');
      return;
    }

    setIsLoading(true);

    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail, password: trimmedPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'En feil oppstod. Prøv igjen.');
        return;
      }

      // Store token; clear any stale active chat on fresh login.
      setToken(data.token);
      setActiveChatId(null);

      onSuccess({ user_id: data.user_id, email: data.email });
    } catch {
      setError('Kunne ikke koble til serveren. Prøv igjen.');
    } finally {
      setIsLoading(false);
    }
  }

  function toggleMode() {
    setMode(m => (m === 'login' ? 'register' : 'login'));
    setError('');
    setPassword('');
  }

  return (
    <div className="auth-modal-overlay">
      <div className="auth-modal" role="dialog" aria-modal="true" aria-label="Autentisering">
        <h2 className="auth-modal-title">
          {mode === 'login' ? 'Logg inn' : 'Opprett konto'}
        </h2>

        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <label className="auth-label" htmlFor="auth-email">E-post</label>
          <input
            id="auth-email"
            className="auth-input"
            type="email"
            autoComplete="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="din@epost.no"
            required
            disabled={isLoading}
          />

          <label className="auth-label" htmlFor="auth-password">Passord</label>
          <input
            id="auth-password"
            className="auth-input"
            type="password"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder={mode === 'register' ? 'Minst 8 tegn' : ''}
            required
            disabled={isLoading}
          />

          <button
            className="auth-modal-submit"
            type="submit"
            disabled={isLoading}
          >
            {isLoading
              ? 'Venter…'
              : mode === 'login'
                ? 'Logg inn'
                : 'Registrer'}
          </button>
        </form>

        <button className="auth-modal-toggle" type="button" onClick={toggleMode} disabled={isLoading}>
          {mode === 'login'
            ? 'Har du ikke konto? Registrer deg'
            : 'Har du allerede konto? Logg inn'}
        </button>
      </div>
    </div>
  );
}

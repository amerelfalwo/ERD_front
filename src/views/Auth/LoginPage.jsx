import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react';
import api from '../../services/api';
import myLogo from '../../assets/logo.webp';

export default function LoginView() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!username || !password) {
      setError('Please fill in all fields.');
      return;
    }
    setLoading(true);
    try {
      const data = await api.login({ username, password });
      if (data.access_token) {
        localStorage.setItem('access_token', data.access_token);
        try {
          const profile = await api.getMe();
          localStorage.setItem('erp_user', JSON.stringify(profile));
        } catch (_) {
          void 0;
        }
        navigate('/dashboard');
      } else {
        setError('Invalid credentials. Please try again.');
      }
    } catch (err) {
      setError(err?.message || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: 'radial-gradient(circle at 1px 1px, var(--color-outline-variant) 0.5px, transparent 0)',
        backgroundSize: '40px 40px',
        opacity: 0.15,
      }} />

      <div className="w-full max-w-md relative z-10 animate-fade-in-up">
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/60 shadow-whisper-lg p-8 space-y-8">

          {/* Logo + Welcome */}
          <div className="flex flex-col items-center gap-3 pt-2 pb-1">
            <img
              src={myLogo}
              alt="Logo"
              className="w-16 h-16 object-contain"
            />
            <div className="text-center space-y-1">
              <h1 className="text-2xl font-bold text-charcoal-ink tracking-tight">
                Hello
              </h1>
              <p className="text-sm text-muted-steel">
                Login to access the dashboard
              </p>
            </div>
          </div>

          {error && (
            <div className="animate-scale-in bg-error-container/20 border border-error/20 text-error text-body-sm px-4 py-2.5 rounded-xl flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-error animate-pulse-soft flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label htmlFor="login-username" className="text-label-sm text-muted-steel block uppercase tracking-wider">
                Username
              </label>
              <input
                id="login-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/60 bg-surface-container-lowest text-sm text-charcoal-ink placeholder:text-outline focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition-all duration-200"
                autoComplete="username"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="login-password" className="text-label-sm text-muted-steel block uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-4 py-2.5 pr-11 rounded-xl border border-outline-variant/60 bg-surface-container-lowest text-sm text-charcoal-ink placeholder:text-outline focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition-all duration-200"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-steel hover:text-accent transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !username || !password}
              className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent-hover text-on-primary font-medium py-2.5 rounded-xl transition-all duration-200 shadow-sm focus:ring-2 focus:ring-offset-2 focus:ring-accent/40 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer btn-tactile mt-2"
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  Sign In
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <div className="pt-4 border-t border-outline-variant/30 text-center">
            <p className="text-sm text-muted-steel">
              Don't have an account?{' '}
              <Link to="/register" className="text-accent font-semibold hover:underline transition-all">
                Create Account
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-col items-center gap-3">
          <p className="text-body-sm text-muted-steel/50">Multi-Tenant ERP System</p>
          <a
            href="https://amir-elrifai.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 group"
          >
            <span className="text-[11px] text-muted-steel/40 group-hover:text-muted-steel/70 transition-colors">Built by</span>
            <img src={myLogo} alt="Amir El-Rifai" className="h-5 w-5 object-contain opacity-40 group-hover:opacity-80 transition-opacity" />
            <span className="text-[11px] font-semibold text-muted-steel/50 group-hover:text-accent transition-colors tracking-wide">Amir El-Rifai</span>
          </a>
        </div>
      </div>
    </div>
  );
}

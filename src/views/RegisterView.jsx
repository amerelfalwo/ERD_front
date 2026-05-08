import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, ArrowRight } from 'lucide-react';
import api from '../services/api';
import myLogo from '../assets/my.png';

export default function RegisterView() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!fullName || !companyName || !username || !password || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      await api.register({
        username,
        password,
        full_name: fullName,
        company_name: companyName,
      });
      navigate('/login');
    } catch (err) {
      setError(err?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-slate-50 p-4 relative overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(148,163,184,0.35) 0.5px, transparent 0)',
          backgroundSize: '40px 40px',
          opacity: 0.2,
        }}
      />

      <div className="w-full max-w-md relative z-10">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 space-y-8">
          <div className="text-center h-28 overflow-hidden flex items-center justify-center">
            <img src={myLogo} alt="Logo" className="w-full h-full object-contain scale-[1.6]" />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-2.5 rounded-lg flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <label htmlFor="reg-full-name" className="text-xs text-slate-500 block uppercase tracking-wider">
                Full Name
              </label>
              <input
                id="reg-full-name"
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Enter your full name"
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200"
                autoComplete="name"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="reg-company-name" className="text-xs text-slate-500 block uppercase tracking-wider">
                Company Name
              </label>
              <input
                id="reg-company-name"
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Enter your company name"
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200"
                autoComplete="organization"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="reg-username" className="text-xs text-slate-500 block uppercase tracking-wider">
                Email / Username
              </label>
              <input
                id="reg-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your email or username"
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200"
                autoComplete="username"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="reg-password" className="text-xs text-slate-500 block uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <input
                  id="reg-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a password"
                  className="w-full px-4 py-2.5 pr-11 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-indigo-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="reg-confirm" className="text-xs text-slate-500 block uppercase tracking-wider">
                Confirm Password
              </label>
              <input
                id="reg-confirm"
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your password"
                className="w-full px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all duration-200"
                autoComplete="new-password"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !fullName || !companyName || !username || !password || !confirmPassword}
              className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-2.5 rounded-lg transition-all duration-200 shadow-sm focus:ring-2 focus:ring-offset-2 focus:ring-indigo-300 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Creating account
                </>
              ) : (
                <>
                  Create Account
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          <div className="text-center">
            <p className="text-sm text-slate-500">
              Already have an account?{' '}
              <Link to="/login" className="text-indigo-600 font-medium hover:underline">
                Log in
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">
          Doctor-M Dental Store • ERP System
        </p>
      </div>
    </div>
  );
}

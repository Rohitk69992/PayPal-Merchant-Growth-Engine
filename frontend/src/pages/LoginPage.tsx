import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, ArrowRight, AlertCircle, Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { Button } from '../components/common/Button';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [forgotPasswordNotice, setForgotPasswordNotice] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickDemoFill = () => {
    setEmail('merchant@paypal-hackathon.demo');
    setPassword('PayPalAI2026!');
  };

  return (
    <div className="min-h-screen bg-[#F1F5F9] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 selection:bg-[#DCEAF5] selection:text-[#1E3A5F]">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Brand Header */}
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#1E3A5F] text-white font-black text-xl shadow-xs mb-3 border border-[#162C48]">
          <span className="text-[#DCEAF5]">P</span>
          <span className="-ml-1 text-white">P</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#172B45]">
          PayPal Merchant Growth Engine
        </h2>
        <p className="mt-1 text-xs text-[#64748B]">
          Sign in to your financial intelligence & growth workspace
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm rounded-xl sm:px-8 border border-[#D9E2EC]">
          {error && (
            <div className="mb-5 p-3.5 rounded-lg bg-[#FADBD8] border border-[#F5B7B1] flex items-start gap-2.5 text-[#C45B61] text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Authentication Failed</p>
                <p className="mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {forgotPasswordNotice && (
            <div className="mb-5 p-3.5 rounded-lg bg-[#DCEAF5] border border-[#CBD5E1] text-[#1E3A5F] text-xs">
              <p className="font-bold">Password Reset Assistance</p>
              <p className="mt-0.5 text-[#334155]">
                Please contact your merchant workspace administrator or use the demo credentials below to access sandbox mode.
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#172B45] mb-1">
                Merchant Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="merchant@example.com"
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-[#D9E2EC] focus:outline-none focus:border-[#4779A8] text-xs text-[#172B45] placeholder-[#94A3B8]"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold uppercase tracking-wider text-[#172B45]">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setForgotPasswordNotice(!forgotPasswordNotice)}
                  className="text-[11px] font-semibold text-[#4779A8] hover:text-[#1E3A5F]"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-10 py-2.5 rounded-lg border border-[#D9E2EC] focus:outline-none focus:border-[#4779A8] text-xs text-[#172B45] placeholder-[#94A3B8]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1 text-[#94A3B8] hover:text-[#172B45] absolute right-2.5 top-1/2 -translate-y-1/2 cursor-pointer"
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="navy"
              size="lg"
              isLoading={isSubmitting}
              className="w-full py-2.5 text-xs font-bold mt-2"
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Sign In to Merchant Console
            </Button>
          </form>

          {/* Google Auth Presentation */}
          <div className="mt-4">
            <button
              type="button"
              onClick={() => {
                alert('Google SSO is configured at the backend proxy layer. In development mode, sign in with your email or demo credentials.');
              }}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg border border-[#D9E2EC] hover:bg-[#F1F5F9] text-[#172B45] text-xs font-semibold transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>
          </div>

          <div className="mt-5 border-t border-[#D9E2EC] pt-4">
            <div className="flex items-center justify-between text-xs text-[#64748B]">
              <span>Don't have an account yet?</span>
              <Link to="/register" className="font-bold text-[#4779A8] hover:text-[#1E3A5F]">
                Create Account →
              </Link>
            </div>

            {/* Quick Demo Helper */}
            <div className="mt-4 p-3 rounded-lg bg-[#F8FAFC] border border-[#D9E2EC] flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-[#334155]">
                <ShieldCheck className="w-4 h-4 text-[#4779A8]" />
                <span className="font-medium">Sandbox evaluation?</span>
              </div>
              <button
                type="button"
                onClick={handleQuickDemoFill}
                className="text-xs font-bold text-[#1E3A5F] hover:underline cursor-pointer"
              >
                Auto-fill Demo
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

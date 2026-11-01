import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArrowRight, AlertCircle, Eye, EyeOff, Lock, Mail, User } from 'lucide-react';
import { Button } from '../components/common/Button';

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setIsSubmitting(true);
    try {
      await register(email, password, fullName);
      navigate('/onboarding');
    } catch (err: any) {
      setError(err.message || 'Registration failed. Email may already be registered.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F1F5F9] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 selection:bg-[#DCEAF5] selection:text-[#1E3A5F]">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#1E3A5F] text-white font-black text-xl shadow-xs mb-3 border border-[#162C48]">
          <span className="text-[#DCEAF5]">P</span>
          <span className="-ml-1 text-white">P</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-[#172B45]">
          Create Merchant Account
        </h2>
        <p className="mt-1 text-xs text-[#64748B]">
          Establish your clean multi-tenant financial intelligence workspace
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm rounded-xl sm:px-8 border border-[#D9E2EC]">
          {error && (
            <div className="mb-5 p-3.5 rounded-lg bg-[#FADBD8] border border-[#F5B7B1] flex items-start gap-2.5 text-[#C45B61] text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Registration Issue</p>
                <p className="mt-0.5">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#172B45] mb-1">
                Full Name / Business Owner
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Alex Morgan"
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-[#D9E2EC] focus:outline-none focus:border-[#4779A8] text-xs text-[#172B45] placeholder-[#94A3B8]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#172B45] mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex@business.com"
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-[#D9E2EC] focus:outline-none focus:border-[#4779A8] text-xs text-[#172B45] placeholder-[#94A3B8]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#172B45] mb-1">
                Password (min 8 characters)
              </label>
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

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#172B45] mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-[#D9E2EC] focus:outline-none focus:border-[#4779A8] text-xs text-[#172B45] placeholder-[#94A3B8]"
                />
              </div>
            </div>

            <p className="text-[11px] text-[#64748B] leading-snug">
              By registering, you agree to merchant security standards and multi-tenant isolation protocols.
            </p>

            <Button
              type="submit"
              variant="navy"
              size="lg"
              isLoading={isSubmitting}
              className="w-full py-2.5 text-xs font-bold mt-2"
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Create Merchant Account
            </Button>
          </form>

          <div className="mt-5 border-t border-[#D9E2EC] pt-4 text-center text-xs text-[#64748B]">
            <span>Already registered? </span>
            <Link to="/login" className="font-bold text-[#4779A8] hover:text-[#1E3A5F]">
              Sign In Instead →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

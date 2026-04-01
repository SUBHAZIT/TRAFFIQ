import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Lock, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.includes('type=recovery')) {
      navigate('/auth');
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('PASSWORDS DO NOT MATCH');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setSuccess(true);
      setTimeout(() => navigate('/auth'), 2000);
    } catch (err: any) {
      setError(err.message?.toUpperCase() || 'FAILED TO RESET PASSWORD');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="absolute inset-0 grid-bg" />
      <div className="relative z-10 w-full max-w-md px-4">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded bg-primary">
            <Shield className="h-6 w-6 text-primary-foreground" />
          </div>
          <h1 className="font-heading text-2xl font-bold tracking-wider text-foreground">RESET PASSWORD</h1>
        </div>
        <div className="rounded border border-border bg-card p-6">
          {success ? (
            <div className="text-center">
              <p className="font-heading text-xs tracking-wider text-primary">PASSWORD RESET SUCCESSFUL. REDIRECTING...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded bg-destructive/10 px-3 py-2">
                  <span className="font-heading text-[10px] tracking-wider text-destructive">{error}</span>
                </div>
              )}
              <div>
                <label className="mb-1.5 block font-heading text-[9px] tracking-widest text-muted-foreground">NEW PASSWORD</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full rounded border border-border bg-secondary pl-9 pr-10 py-2.5 font-body text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    required
                    minLength={6}
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block font-heading text-[9px] tracking-widest text-muted-foreground">CONFIRM PASSWORD</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    className="w-full rounded border border-border bg-secondary pl-9 pr-3 py-2.5 font-body text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    required
                    minLength={6}
                  />
                </div>
              </div>
              <button type="submit" disabled={loading} className="w-full rounded bg-primary py-2.5 font-heading text-xs font-bold tracking-wider text-primary-foreground disabled:opacity-50">
                {loading ? 'UPDATING...' : 'UPDATE PASSWORD'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

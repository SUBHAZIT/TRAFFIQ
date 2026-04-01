import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Shield, Mail, Lock, User, Phone, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import traffiqLogo from '@/assets/TRAFFIQ LOGO.png';
import { useEffect } from 'react';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showForgot, setShowForgot] = useState(false);
  const [userType, setUserType] = useState<'citizen' | 'driver'>('citizen');
  const [vehicleRegId, setVehicleRegId] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [vehicleType, setVehicleType] = useState('ambulance');
  const navigate = useNavigate();
  const { session, role } = useAuth();

  useEffect(() => {
    if (session && role) {
      if (role === 'admin') navigate('/dashboard');
      else if (role === 'driver') navigate('/driver');
      else navigate('/citizen');
    }
  }, [session, role, navigate]);

  if (session && !role) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white uppercase">
        <div className="flex flex-col items-center gap-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="font-black text-xs tracking-widest text-primary">INITIALIZING TERMINAL...</p>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      if (showForgot) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setMessage('PASSWORD RESET EMAIL SENT. CHECK YOUR INBOX.');
        setLoading(false);
        return;
      }

      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { 
              full_name: fullName, 
              phone,
              role: userType,
              vehicle_reg_id: userType === 'driver' ? vehicleRegId : null,
              license_number: userType === 'driver' ? licenseNumber : null,
              vehicle_type: userType === 'driver' ? vehicleType : null,
              is_approved: false
            },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) throw error;
        setMessage('ACCOUNT CREATED. CHECK YOUR EMAIL TO VERIFY.');
      }
    } catch (err: any) {
      setError(err.message?.toUpperCase() || 'AN ERROR OCCURRED');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin
        }
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message?.toUpperCase() || 'GOOGLE SIGN-IN FAILED');
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-white uppercase tracking-wider">
      <div className="absolute inset-0 grid-bg opacity-30" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md px-4"
      >
        <div className="mb-8 text-center flex flex-col items-center">
          <img src={traffiqLogo} alt="Logo" className="mx-auto mb-4 h-16 w-auto object-contain" />
          <h1 className="text-3xl font-black tracking-tighter text-primary leading-none">TRAFFIQ</h1>
          <p className="mt-2 text-[10px] font-black tracking-[0.3em] text-primary/40">
            INTELLIGENT TRAFFIC & EMERGENCY COORDINATION
          </p>
        </div>

        <div className="rounded-none border-4 border-primary bg-white p-8 shadow-2xl">
          <h2 className="mb-6 text-center text-sm font-black tracking-widest text-primary">
            {showForgot ? 'RESET PASSWORD' : isLogin ? 'SECURE LOGIN' : 'CREATE ACCOUNT'}
          </h2>

          {error && (
            <div className="mb-4 flex items-center gap-2 rounded bg-destructive/10 px-3 py-2">
              <AlertCircle className="h-3.5 w-3.5 shrink-0 text-destructive" />
              <span className="font-heading text-[10px] tracking-wider text-destructive">{error}</span>
            </div>
          )}

          {message && (
            <div className="mb-4 flex items-center gap-2 rounded bg-primary/10 px-3 py-2">
              <span className="font-heading text-[10px] tracking-wider text-primary">{message}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && !showForgot && (
              <>
                <div className="flex gap-2 p-1 bg-slate-100 rounded-lg mb-4">
                  <button
                    type="button"
                    onClick={() => setUserType('citizen')}
                    className={`flex-1 py-2 text-[10px] font-black transition-all ${userType === 'citizen' ? 'bg-white shadow-sm text-primary' : 'text-primary/40'}`}
                  >
                    CITIZEN
                  </button>
                  <button
                    type="button"
                    onClick={() => setUserType('driver')}
                    className={`flex-1 py-2 text-[10px] font-black transition-all ${userType === 'driver' ? 'bg-white shadow-sm text-primary' : 'text-primary/40'}`}
                  >
                    EMERGENCY DRIVER
                  </button>
                </div>

                <div>
                  <label className="mb-1.5 block font-heading text-[9px] tracking-widest text-muted-foreground">FULL NAME</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={e => setFullName(e.target.value)}
                      className="w-full rounded border border-border bg-secondary pl-9 pr-3 py-2.5 font-body text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="ENTER YOUR NAME"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block font-heading text-[9px] tracking-widest text-muted-foreground">PHONE</label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      className="w-full rounded border border-border bg-secondary pl-9 pr-3 py-2.5 font-body text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      placeholder="+91 XXXXXXXXXX"
                    />
                  </div>
                </div>

                {userType === 'driver' && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-4 pt-2"
                  >
                    <div>
                      <label className="mb-1.5 block font-heading text-[9px] tracking-widest text-muted-foreground">VEHICLE ID (REG. NO)</label>
                      <input
                        type="text"
                        value={vehicleRegId}
                        onChange={e => setVehicleRegId(e.target.value.toUpperCase())}
                        className="w-full rounded border border-border bg-secondary px-3 py-2.5 font-body text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        placeholder="DL 01 AB 1234"
                        required
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block font-heading text-[9px] tracking-widest text-muted-foreground">DRIVING LICENSE NO.</label>
                      <input
                        type="text"
                        value={licenseNumber}
                        onChange={e => setLicenseNumber(e.target.value.toUpperCase())}
                        className="w-full rounded border border-border bg-secondary px-3 py-2.5 font-body text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                        placeholder="LIC-XXXXXX"
                        required
                      />
                    </div>
                    <div>
                      <label className="mb-1.5 block font-heading text-[9px] tracking-widest text-muted-foreground">VEHICLE TYPE</label>
                      <select
                        value={vehicleType}
                        onChange={e => setVehicleType(e.target.value)}
                        className="w-full rounded border border-border bg-secondary px-3 py-2.5 font-body text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        <option value="ambulance">AMBULANCE</option>
                        <option value="fire">FIRE ENGINE</option>
                        <option value="police">POLICE CRUISER</option>
                      </select>
                    </div>
                  </motion.div>
                )}
              </>
            )}

            <div>
              <label className="mb-1.5 block font-heading text-[9px] tracking-widest text-muted-foreground">EMAIL</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full rounded border border-border bg-secondary pl-9 pr-3 py-2.5 font-body text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="ENTER YOUR EMAIL"
                  required
                />
              </div>
            </div>

            {!showForgot && (
              <div>
                <label className="mb-1.5 block font-heading text-[9px] tracking-widest text-muted-foreground">PASSWORD</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="w-full rounded border border-border bg-secondary pl-9 pr-10 py-2.5 font-body text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="••••••••"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>
            )}

            {isLogin && !showForgot && (
              <button
                type="button"
                onClick={() => setShowForgot(true)}
                className="font-heading text-[9px] tracking-wider text-primary hover:underline"
              >
                FORGOT PASSWORD?
              </button>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded bg-primary py-2.5 font-heading text-xs font-bold tracking-wider text-primary-foreground transition-all hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? 'PROCESSING...' : showForgot ? 'SEND RESET LINK' : isLogin ? 'LOGIN' : 'CREATE ACCOUNT'}
            </button>
          </form>

          {!showForgot && (
            <>
              <div className="my-4 flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="font-heading text-[9px] tracking-widest text-muted-foreground">OR</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded border border-border py-2.5 font-heading text-xs tracking-wider text-foreground transition-all hover:bg-secondary disabled:opacity-50"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                SIGN IN WITH GOOGLE
              </button>
            </>
          )}

          <div className="mt-4 text-center">
            {showForgot ? (
              <button
                onClick={() => setShowForgot(false)}
                className="font-heading text-[9px] tracking-wider text-primary hover:underline"
              >
                BACK TO LOGIN
              </button>
            ) : (
              <button
                onClick={() => { setIsLogin(!isLogin); setError(''); setMessage(''); }}
                className="font-heading text-[9px] tracking-wider text-muted-foreground hover:text-foreground"
              >
                {isLogin ? "DON'T HAVE AN ACCOUNT? REGISTER" : 'ALREADY HAVE AN ACCOUNT? LOGIN'}
              </button>
            )}
          </div>
        </div>

        <p className="mt-6 text-center font-heading text-[8px] tracking-widest text-muted-foreground">
          AUTHORIZED ACCESS ONLY · GOVERNMENT OF INDIA · SMART CITY INITIATIVE
        </p>
      </motion.div>
    </div>
  );
}

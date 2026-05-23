import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { UtensilsCrossed, Eye, EyeOff, LogIn, Mail, Lock, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { UserRole } from '@/types/auth';

const roleHomeMap: Record<UserRole, string> = {
  superadmin: '/superadmin',
  kitchen: '/kitchen',
  menu: '/',
};

const getFriendlyError = (error: any): string => {
  const code = error?.code ?? '';
  if (code === 'auth/invalid-credential')   return "Email yoki parol noto'g'ri.";
  if (code === 'auth/too-many-requests')    return "Juda ko'p urinishlar — Firebase vaqtincha blokladi. 5 daqiqa kuting yoki brauzerni yangilang.";
  if (code === 'auth/user-not-found')       return "Bu email bilan foydalanuvchi topilmadi.";
  if (code === 'auth/wrong-password')       return "Parol noto'g'ri.";
  if (code === 'auth/invalid-email')        return "Email formati noto'g'ri.";
  if (code === 'auth/network-request-failed') return "Tarmoq xatosi. Internet aloqasini tekshiring.";
  const msg = error instanceof Error ? error.message : String(error ?? "Noma'lum xato");
  return msg;
};

const Login = () => {
  const { login, logout, userProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const [email, setEmail]          = useState('');
  const [password, setPassword]    = useState('');
  const [showPassword, setShowPwd] = useState(false);
  const [loading, setLoading]      = useState(false);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname;

  const getRedirectPath = (role: UserRole) => {
    if (!from || from === '/login') return roleHomeMap[role];
    if (role === 'superadmin' && (from === '/' || from === '/kitchen')) return '/superadmin';
    return from;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast({ title: "Ma'lumotlarni kiriting", description: 'Email va parol majburiy.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const profile = await login(email.trim(), password);
      navigate(getRedirectPath(profile.role), { replace: true });
    } catch (err: any) {
      toast({
        title: 'Kirish amalga oshmadi',
        description: getFriendlyError(err),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
            <UtensilsCrossed className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground tracking-tight">AResto</h1>
          <p className="text-muted-foreground mt-1 text-sm">Boshqaruv tizimiga kirish</p>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-2xl p-8 shadow-lg">
          {userProfile && (
            <div className="mb-5 rounded-xl border border-border bg-secondary/30 p-3 text-sm text-muted-foreground">
              <p>
                Hozir tizimdasiz: <span className="font-medium text-foreground">{userProfile.email}</span>
              </p>
              <div className="mt-3 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-lg"
                  onClick={() => navigate(roleHomeMap[userProfile.role], { replace: true })}
                >
                  Davom etish
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="rounded-lg"
                  onClick={async () => {
                    await logout();
                    setEmail('');
                    setPassword('');
                  }}
                >
                  Chiqish
                </Button>
              </div>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div className="space-y-2">
              <label htmlFor="login-email" className="text-sm font-medium text-foreground">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="login-email"
                  type="email"
                  required
                  placeholder="misol@aresto.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="email"
                  className="pl-10 bg-background border-border rounded-xl h-11"
                  disabled={loading}
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label htmlFor="login-password" className="text-sm font-medium text-foreground">
                Parol
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="pl-10 bg-background border-border rounded-xl h-11 pr-12"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              id="login-submit"
              type="submit"
              className="w-full h-11 rounded-xl gap-2 bg-primary hover:bg-primary/90"
              disabled={loading}
            >
              {loading
                ? <div className="h-4 w-4 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
                : <LogIn className="h-4 w-4" />}
              {loading ? 'Kirilmoqda...' : 'Kirish'}
            </Button>
          </form>
        </div>

        {/* Setup link
        <div className="mt-4 flex flex-col items-center gap-2">
          <button
            onClick={() => navigate('/setup')}
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            Birinchi marta? SuperAdmin akkauntini yarating
          </button>
        </div> */}
      </motion.div>
    </div>
  );
};

export default Login;

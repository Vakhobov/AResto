import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Building2,
  ChefHat,
  UtensilsCrossed,
  LogOut,
  Check,
  X,
  Loader2,
  Eye,
  EyeOff,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import { Branch } from '@/types/auth';
import { getBranches, createBranch, updateBranch, deleteBranch } from '@/services/branchService';
import { createFirebaseUser, updateFirebaseUserCredentials } from '@/services/userProfileService';
import { useToast } from '@/hooks/use-toast';

// ─── Modal ────────────────────────────────────────────────────────────────────

interface ModalProps { title: string; onClose: () => void; children: React.ReactNode; }
const Modal: React.FC<ModalProps> = ({ title, onClose, children }) => (
  <motion.div
    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
    onClick={onClose}
  >
    <motion.div
      initial={{ scale: 0.95, opacity: 0, y: 16 }} animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.95, opacity: 0 }} transition={{ type: 'spring', duration: 0.35 }}
      className="w-full max-w-[95vw] sm:max-w-lg md:max-w-2xl xl:max-w-3xl max-h-[95vh] bg-card border border-border rounded-2xl shadow-2xl overflow-hidden"
      onClick={e => e.stopPropagation()}
    >
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <h2 className="text-lg font-bold text-foreground">{title}</h2>
        <Button variant="ghost" size="icon" className="rounded-xl" onClick={onClose}><X className="h-4 w-4" /></Button>
      </div>
      <div className="p-6 overflow-y-auto max-h-[calc(95vh-80px)]">{children}</div>
    </motion.div>
  </motion.div>
);

// ─── Branch card ──────────────────────────────────────────────────────────────

interface BranchCardProps { branch: Branch; onAddKitchen: () => void; onAddMenu: () => void; onToggle: () => void; onViewDetails: () => void; }
const BranchCard: React.FC<BranchCardProps> = ({ branch, onAddKitchen, onAddMenu, onToggle, onViewDetails }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
    className="bg-card border border-border rounded-2xl p-5 space-y-4"
  >
    <div className="flex items-start justify-between">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <Building2 className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-foreground">{branch.name}</h3>
          <p className="text-xs text-muted-foreground">ID: {branch.id.slice(0, 8)}...</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" className="rounded-xl text-xs" onClick={onViewDetails}>Batafsil</Button>
        <button
          onClick={onToggle}
          className={`text-xs px-3 py-1 rounded-full font-medium transition-colors ${
            branch.active ? 'bg-green-500/15 text-green-400 hover:bg-green-500/25' : 'bg-red-500/15 text-red-400 hover:bg-red-500/25'
          }`}
        >
          {branch.active ? 'Faol' : 'Nofaol'}
        </button>
      </div>
    </div>

    <div className="grid grid-cols-2 gap-3">
      <div className={`rounded-xl p-3 border ${branch.kitchenUserId ? 'bg-blue-500/10 border-blue-500/20' : 'bg-secondary/30 border-border'}`}>
        <div className="flex items-center gap-2 mb-1">
          <ChefHat className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">Kitchen</span>
        </div>
        {branch.kitchenUserId ? (
          <p className="text-xs text-blue-400 flex items-center gap-1"><Check className="h-3 w-3" />Ulangan</p>
        ) : (
          <Button variant="outline" size="sm" className="w-full text-xs h-7 mt-1 rounded-lg" onClick={onAddKitchen}>
            <Plus className="h-3 w-3 mr-1" />Qo'shish
          </Button>
        )}
      </div>
      <div className={`rounded-xl p-3 border ${branch.menuUserId ? 'bg-orange-500/10 border-orange-500/20' : 'bg-secondary/30 border-border'}`}>
        <div className="flex items-center gap-2 mb-1">
          <UtensilsCrossed className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs font-medium text-muted-foreground">Menu</span>
        </div>
        {branch.menuUserId ? (
          <p className="text-xs text-orange-400 flex items-center gap-1"><Check className="h-3 w-3" />Ulangan</p>
        ) : (
          <Button variant="outline" size="sm" className="w-full text-xs h-7 mt-1 rounded-lg" onClick={onAddMenu}>
            <Plus className="h-3 w-3 mr-1" />Qo'shish
          </Button>
        )}
      </div>
    </div>
  </motion.div>
);

// ─── Main page ────────────────────────────────────────────────────────────────

type ModalType = 'branch' | 'kitchen' | 'menu' | null;

const SuperAdmin = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [branches, setBranches]         = useState<Branch[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(true);
  const [modalType, setModalType]       = useState<ModalType>(null);
  const [targetBranch, setTargetBranch] = useState<Branch | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [submitting, setSubmitting]     = useState(false);
  const [showPwd, setShowPwd]           = useState(false);
  const [showKitchenPwd, setShowKitchenPwd] = useState(false);
  const [showMenuPwd, setShowMenuPwd] = useState(false);

  // Form state
  const [branchName, setBranchName]     = useState('');
  const [userEmail, setUserEmail]       = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [kitchenLogin, setKitchenLogin] = useState('');
  const [kitchenPassword, setKitchenPassword] = useState('');
  const [menuLogin, setMenuLogin] = useState('');
  const [menuPassword, setMenuPassword] = useState('');

  useEffect(() => {
    getBranches().then(b => { setBranches(b); setLoadingBranches(false); }).catch(() => setLoadingBranches(false));
  }, []);

  const refreshBranches = async () => {
    const b = await getBranches();
    setBranches(b);
  };

  const closeModal = () => {
    setModalType(null);
    setTargetBranch(null);
    setBranchName('');
    setUserEmail('');
    setUserPassword('');
    setShowPwd(false);
  };

  const closeBranchDetails = () => {
    setSelectedBranch(null);
    setKitchenLogin('');
    setKitchenPassword('');
    setMenuLogin('');
    setMenuPassword('');
    setShowKitchenPwd(false);
    setShowMenuPwd(false);
  };

  const openBranchDetails = (branch: Branch) => {
    setSelectedBranch(branch);
    setKitchenLogin(branch.kitchenCredentials?.email ?? '');
    setKitchenPassword(branch.kitchenCredentials?.password ?? '');
    setMenuLogin(branch.menuCredentials?.email ?? '');
    setMenuPassword(branch.menuCredentials?.password ?? '');
    setShowKitchenPwd(false);
    setShowMenuPwd(false);
  };

  // ── Create branch ──────────────────────────────────────────────────────────

  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchName.trim()) return;
    setSubmitting(true);
    try {
      const branch = await createBranch({ name: branchName.trim(), active: true, kitchenUserId: null, menuUserId: null });
      setBranches(prev => [...prev, branch]);
      toast({ title: "Filial yaratildi ✅", description: `"${branch.name}" muvaffaqiyatli qo'shildi.` });
      closeModal();
    } catch (err) {
      toast({ title: 'Xato', description: String(err), variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  // ── Create kitchen / menu user ─────────────────────────────────────────────

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetBranch || !userEmail.trim() || !userPassword.trim()) return;
    if (!userEmail.includes('@')) {
      toast({ title: 'Email', description: "Email manzilida '@' belgisi bo'lishi shart.", variant: 'destructive' });
      return;
    }
    if (userPassword.length < 6) {
      toast({ title: 'Parol', description: 'Parol kamida 6 ta belgidan iborat bo\'lishi kerak.', variant: 'destructive' });
      return;
    }
    const role = modalType === 'kitchen' ? 'kitchen' : 'menu';
    setSubmitting(true);
    try {
      const uid = await createFirebaseUser(userEmail.trim(), userPassword, role, targetBranch.id, targetBranch.name);
      // Link user to branch and store current credentials
      const update = role === 'kitchen'
        ? { kitchenUserId: uid, kitchenCredentials: { email: userEmail.trim(), password: userPassword } }
        : { menuUserId: uid, menuCredentials: { email: userEmail.trim(), password: userPassword } };
      await updateBranch(targetBranch.id, update);
      await refreshBranches();
      toast({
        title: `${role === 'kitchen' ? 'Kitchen' : 'Menu'} foydalanuvchi yaratildi ✅`,
        description: userEmail.trim(),
      });
      closeModal();
    } catch (err) {
      toast({ title: 'Xato', description: String(err), variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleBranch = async (branch: Branch) => {
    try {
      await updateBranch(branch.id, { active: !branch.active });
      await refreshBranches();
    } catch (err) {
      toast({ title: 'Xato', description: String(err), variant: 'destructive' });
    }
  };

  const handleUpdateBranchCredentials = async (type: 'kitchen' | 'menu') => {
    if (!selectedBranch) return;

    const currentCredentials = type === 'kitchen' ? selectedBranch.kitchenCredentials : selectedBranch.menuCredentials;
    if (!currentCredentials?.email || !currentCredentials?.password) {
      toast({
        title: 'Foydalanuvchi mavjud emas',
        description: 'Avval filial uchun kitchen yoki menu foydalanuvchisini yarating.',
        variant: 'destructive',
      });
      return;
    }

    const newEmail = type === 'kitchen' ? kitchenLogin.trim() : menuLogin.trim();
    const newPassword = type === 'kitchen' ? kitchenPassword.trim() : menuPassword.trim();

    if (!newEmail || !newPassword) {
      toast({ title: 'Ma\'lumot', description: 'Email va parol majburiy.', variant: 'destructive' });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: 'Parol', description: 'Parol kamida 6 ta belgidan iborat bo\'lishi kerak.', variant: 'destructive' });
      return;
    }

    setSubmitting(true);
    try {
      await updateFirebaseUserCredentials(currentCredentials.email, currentCredentials.password, newEmail, newPassword);
      await updateBranch(selectedBranch.id, type === 'kitchen'
        ? { kitchenCredentials: { email: newEmail, password: newPassword } }
        : { menuCredentials: { email: newEmail, password: newPassword } }
      );
      await refreshBranches();
      toast({ title: 'Saqlash muvaffaqiyatli', description: 'Login va parol yangilandi.' });
      setSelectedBranch({
        ...selectedBranch,
        ...(type === 'kitchen' ? { kitchenCredentials: { email: newEmail, password: newPassword } } : {}),
        ...(type === 'menu' ? { menuCredentials: { email: newEmail, password: newPassword } } : {}),
      });
    } catch (err) {
      toast({ title: 'Xato', description: String(err), variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteBranch = async () => {
    if (!selectedBranch) return;
    const ok = window.confirm(`Are you sure you want to delete this branch: ${selectedBranch.name}? This action cannot be undone.`);
    if (!ok) return;
    setSubmitting(true);
    try {
      await deleteBranch(selectedBranch.id);
      await refreshBranches();
      toast({ title: 'Filial o\'chirildi', description: `${selectedBranch.name} muvaffaqiyatli o'chirildi.` });
      closeBranchDetails();
    } catch (err) {
      toast({ title: 'Xato', description: String(err), variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => { await logout(); navigate('/login', { replace: true }); };

  const openUserModal = (type: 'kitchen' | 'menu', branch: Branch) => {
    setTargetBranch(branch);
    setModalType(type);
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-4xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground">SuperAdmin</h1>
              <p className="text-muted-foreground text-sm">Filiallar va foydalanuvchilarni boshqaring</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              className="gap-2 rounded-xl bg-primary hover:bg-primary/90"
              onClick={() => setModalType('branch')}
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Filial qo'shish</span>
            </Button>
            <Button variant="ghost" size="icon" className="rounded-xl text-muted-foreground hover:text-foreground" onClick={handleLogout}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="bg-card border border-border rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{branches.length}</p>
            <p className="text-xs text-muted-foreground mt-1">Jami filiallar</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-green-500">{branches.filter(b => b.active).length}</p>
            <p className="text-xs text-muted-foreground mt-1">Faol</p>
          </div>
          <div className="bg-card border border-border rounded-2xl p-4 text-center">
            <p className="text-2xl font-bold text-primary">{branches.filter(b => b.kitchenUserId && b.menuUserId).length}</p>
            <p className="text-xs text-muted-foreground mt-1">To'liq sozlangan</p>
          </div>
        </div>

        {/* Branch list */}
        {loadingBranches ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground gap-3">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Filiallar yuklanmoqda...</span>
          </div>
        ) : branches.length === 0 ? (
          <div className="text-center py-20">
            <Building2 className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">Hozircha filiallar yo'q</p>
            <Button onClick={() => setModalType('branch')} className="rounded-xl gap-2">
              <Plus className="h-4 w-4" />Birinchi filialni yarating
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {branches.map(branch => (
              <BranchCard
                key={branch.id}
                branch={branch}
                onAddKitchen={() => openUserModal('kitchen', branch)}
                onAddMenu={() => openUserModal('menu', branch)}
                onToggle={() => handleToggleBranch(branch)}
                onViewDetails={() => openBranchDetails(branch)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {/* Create branch modal */}
        {modalType === 'branch' && (
          <Modal title="Yangi filial yaratish" onClose={closeModal}>
            <form onSubmit={handleCreateBranch} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Filial nomi</label>
                <Input placeholder="Masalan: Chilonzor filiali" value={branchName} onChange={e => setBranchName(e.target.value)} className="bg-background border-border rounded-xl h-11" autoFocus />
              </div>
              <Button type="submit" className="w-full h-11 rounded-xl gap-2" disabled={submitting || !branchName.trim()}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Building2 className="h-4 w-4" />}
                Filial yaratish
              </Button>
            </form>
          </Modal>
        )}

        {/* Create kitchen/menu user modal */}
        {(modalType === 'kitchen' || modalType === 'menu') && targetBranch && (
          <Modal
            title={`${modalType === 'kitchen' ? '🍳 Kitchen' : '📱 Menu'} foydalanuvchi — ${targetBranch.name}`}
            onClose={closeModal}
          >
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Email</label>
                <Input
                  type="email"
                  required
                  placeholder={modalType === 'kitchen' ? 'kitchen@aresto.com' : 'menu@aresto.com'}
                  value={userEmail}
                  onChange={e => setUserEmail(e.target.value)}
                  className="bg-background border-border rounded-xl h-11"
                  autoFocus
                />
                <p className="text-xs text-muted-foreground mt-1">Faqat email manzil qabul qilinadi (masalan: ism@aresto.com)</p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Parol</label>
                <div className="relative">
                  <Input
                    type={showPwd ? 'text' : 'password'}
                    placeholder="Kamida 6 ta belgi"
                    value={userPassword}
                    onChange={e => setUserPassword(e.target.value)}
                    className="bg-background border-border rounded-xl h-11 pr-11"
                  />
                  <button type="button" onClick={() => setShowPwd(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className={`p-3 rounded-xl text-xs ${modalType === 'kitchen' ? 'bg-blue-500/10 text-blue-400' : 'bg-orange-500/10 text-orange-400'}`}>
                {modalType === 'kitchen'
                  ? '🍳 Kitchen foydalanuvchi /kitchen va /admin sahifalariga kirishi mumkin'
                  : '📱 Menu foydalanuvchi faqat / (buyurtma) sahifasiga kirishi mumkin'}
              </div>
              <Button
                type="submit"
                className={`w-full h-11 rounded-xl gap-2 ${modalType === 'kitchen' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-primary hover:bg-primary/90'}`}
                disabled={submitting || !userEmail.trim() || !userPassword.trim()}
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : (modalType === 'kitchen' ? <ChefHat className="h-4 w-4" /> : <UtensilsCrossed className="h-4 w-4" />)}
                Foydalanuvchi yaratish
              </Button>
            </form>
          </Modal>
        )}
        {selectedBranch && (
          <Modal title={`Filial tafsilotlari — ${selectedBranch.name}`} onClose={closeBranchDetails}>
            <div className="space-y-6">
              <div className="rounded-2xl border border-border bg-secondary/30 p-4">
                <p className="text-sm font-medium text-foreground mb-2">Filial ma'lumotlari</p>
                <div className="grid gap-3 text-sm text-muted-foreground">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <span>Filial nomi</span>
                    <span className="font-medium text-foreground">{selectedBranch.name}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <span>Filial ID</span>
                    <span className="font-mono text-xs text-foreground break-all">{selectedBranch.id}</span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <span>Status</span>
                    <span className={`rounded-full px-2 py-1 text-xs ${selectedBranch.active ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                      {selectedBranch.active ? 'Faol' : 'Nofaol'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Kitchen foydalanuvchi</p>
                      <p className="text-xs text-muted-foreground">UID: {selectedBranch.kitchenUserId ?? "Noma'lum"}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => openUserModal('kitchen', selectedBranch)}>
                      yaratish
                    </Button>
                  </div>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-foreground">Login (email)</label>
                      <Input
                        type="email"
                        value={kitchenLogin}
                        onChange={e => setKitchenLogin(e.target.value)}
                        placeholder="kitchen@aresto.com"
                        className="bg-background border-border rounded-xl h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-foreground">Parol</label>
                      <div className="relative">
                        <Input
                          type={showKitchenPwd ? 'text' : 'password'}
                          value={kitchenPassword}
                          onChange={e => setKitchenPassword(e.target.value)}
                          placeholder="Kamida 6 ta belgi"
                          className="bg-background border-border rounded-xl h-11 pr-11"
                        />
                        <button type="button" onClick={() => setShowKitchenPwd(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                          {showKitchenPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <Button
                      type="button"
                      className="w-full h-11 rounded-xl gap-2 bg-blue-600 hover:bg-blue-700"
                      onClick={() => handleUpdateBranchCredentials('kitchen')}
                      disabled={submitting}
                    >
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChefHat className="h-4 w-4" />}
                      Yangilash
                    </Button>
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm font-semibold text-foreground">Menu foydalanuvchi</p>
                      <p className="text-xs text-muted-foreground">UID: {selectedBranch.menuUserId ?? "Noma'lum"}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => openUserModal('menu', selectedBranch)}>
                      yaratish
                    </Button>
                  </div>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-foreground">Login (email)</label>
                      <Input
                        type="email"
                        value={menuLogin}
                        onChange={e => setMenuLogin(e.target.value)}
                        placeholder="menu@aresto.com"
                        className="bg-background border-border rounded-xl h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-foreground">Parol</label>
                      <div className="relative">
                        <Input
                          type={showMenuPwd ? 'text' : 'password'}
                          value={menuPassword}
                          onChange={e => setMenuPassword(e.target.value)}
                          placeholder="Kamida 6 ta belgi"
                          className="bg-background border-border rounded-xl h-11 pr-11"
                        />
                        <button type="button" onClick={() => setShowMenuPwd(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                          {showMenuPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <Button
                      type="button"
                      className="w-full h-11 rounded-xl gap-2 bg-blue-600 hover:bg-blue-700"
                      onClick={() => handleUpdateBranchCredentials('menu')}
                      disabled={submitting}
                    >
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UtensilsCrossed className="h-4 w-4" />}
                      Yangilash
                    </Button>
                  </div>
                </div>
                <div className="lg:col-span-2 pt-4">
                  <Button
                    type="button"
                    className="w-full h-11 rounded-xl gap-2 bg-red-600 hover:bg-red-700"
                    onClick={handleDeleteBranch}
                    disabled={submitting}
                  >
                    {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Filialni o\'chirish'}
                  </Button>
                </div>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SuperAdmin;

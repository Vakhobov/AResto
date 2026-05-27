import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Plus,
  Search,
  UtensilsCrossed,
  ClipboardList,
  ChefHat,
  Menu,
  X,
  LogOut,
  Clock,
  Tag,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { MenuItem } from '@/types/kiosk';
import { menuItems as fallbackMenuItems } from '@/data/menuData';
import { categories as fallbackCategories } from '@/data/menuData';
import { subscribeToFoods, createFood, updateFood, deleteFood } from '@/services/foodService';
import { subscribeToCategories, createCategory, deleteCategory, Category as FSCategory } from '@/services/categoryService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AdminMenuItemCard } from '@/components/admin/AdminMenuItemCard';
import { MenuItemForm } from '@/components/admin/MenuItemForm';
import { OrderHistoryTable } from '@/components/admin/OrderHistoryTable';
import { ShiftPanel } from '@/components/admin/ShiftPanel';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/context/AuthContext';
import { ShiftProvider } from '@/context/ShiftContext';
import { DiagnosticConsole } from '@/components/admin/DiagnosticConsole';


const Admin = () => {
  const { userProfile, logout } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // branchId from auth — null for superadmin
  const branchId = userProfile?.role === 'superadmin' ? null : (userProfile?.branchId ?? null);

  const [menuItems, setMenuItems]           = useState<MenuItem[]>([]);
  const [fsCategories, setFsCategories]     = useState<FSCategory[]>([]);
  const [searchQuery, setSearchQuery]       = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isFormOpen, setIsFormOpen]         = useState(false);
  const [editingItem, setEditingItem]       = useState<MenuItem | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading]               = useState(true);

  // ── Subscribe to Firestore foods & categories ────────────────────────────────
  useEffect(() => {
    if (!branchId) {
      setMenuItems(fallbackMenuItems);
      setFsCategories([]);
      setLoading(false);
      return;
    }

    const unsubFoods = subscribeToFoods(
      branchId,
      foods => {
        setMenuItems(foods.length > 0 ? foods : fallbackMenuItems);
        setLoading(false);
      },
      err => {
        console.error('Admin food subscription:', err);
        setMenuItems(fallbackMenuItems);
        setLoading(false);
      },
    );

    const unsubCats = subscribeToCategories(
      branchId,
      cats => setFsCategories(cats),
      err => console.error('Admin category subscription:', err),
    );

    return () => { unsubFoods(); unsubCats(); };
  }, [branchId]);

  // Merged category list for the filter bar: prefer Firestore, fall back to local
  const categoryList = fsCategories.length > 0
    ? fsCategories.map(c => ({ id: c.id, name: c.name, icon: c.icon }))
    : fallbackCategories;

  const filteredItems = menuItems.filter(item => {
    const matchesSearch   = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // ── Food CRUD ────────────────────────────────────────────────────────────────

  const handleAddItem = useCallback(async (item: Omit<MenuItem, 'id'>) => {
    if (!branchId) { toast({ title: 'Xato', description: 'Filial ID topilmadi', variant: 'destructive' }); return; }
    try {
      await createFood(branchId, item);
      setIsFormOpen(false);
      toast({ title: "✅ Mahsulot qo'shildi", description: item.name });
    } catch (err) {
      console.error(err);
      toast({ title: "Mahsulot qo'shilmadi", description: String(err), variant: 'destructive' });
    }
  }, [branchId, toast]);

  const handleEditItem = useCallback(async (item: Omit<MenuItem, 'id'>) => {
    if (!editingItem || !branchId) return;
    try {
      await updateFood(branchId, editingItem.id, item);
      setEditingItem(null);
      toast({ title: '✅ Mahsulot yangilandi', description: item.name });
    } catch (err) {
      console.error(err);
      toast({ title: 'Mahsulot yangilanmadi', description: String(err), variant: 'destructive' });
    }
  }, [editingItem, branchId, toast]);

  const handleDeleteItem = useCallback(async (id: string) => {
    if (!branchId) return;
    const item = menuItems.find(i => i.id === id);
    try {
      await deleteFood(branchId, id);
      toast({ title: "✅ Mahsulot o'chirildi", description: item?.name });
    } catch (err) {
      console.error(err);
      toast({ title: "Mahsulot o'chirilmadi", description: String(err), variant: 'destructive' });
    }
  }, [branchId, menuItems, toast]);

  const handleToggleAvailability = useCallback(async (id: string) => {
    if (!branchId) return;
    const item = menuItems.find(i => i.id === id);
    if (!item) return;
    try {
      await updateFood(branchId, id, { available: !item.available });
      toast({ title: item.available ? '🔴 Mavjud emas' : '🟢 Mavjud', description: item.name });
    } catch (err) {
      console.error(err);
      toast({ title: "Holat o'zgartirilmadi", description: String(err), variant: 'destructive' });
    }
  }, [branchId, menuItems, toast]);

  // ── Category quick-add ───────────────────────────────────────────────────────

  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('🍽️');

  const handleAddCategory = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!branchId || !newCatName.trim()) return;
    try {
      await createCategory(branchId, {
        name: newCatName.trim(),
        icon: newCatIcon,
        active: true,
        sortOrder: fsCategories.length,
      });
      setNewCatName('');
      toast({ title: "✅ Kategoriya qo'shildi", description: newCatName.trim() });
    } catch (err) {
      toast({ title: "Kategoriya qo'shilmadi", description: String(err), variant: 'destructive' });
    }
  }, [branchId, newCatName, newCatIcon, fsCategories.length, toast]);

  const handleDeleteCategory = useCallback(async (id: string) => {
    if (!branchId) return;
    try {
      await deleteCategory(branchId, id);
      toast({ title: "✅ Kategoriya o'chirildi" });
    } catch (err) {
      toast({ title: "Kategoriya o'chirilmadi", description: String(err), variant: 'destructive' });
    }
  }, [branchId, toast]);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <ShiftProvider branchId={branchId}>
      <div className="min-h-screen bg-background p-4 md:p-6">
        <div className="max-w-7xl mx-auto">

          {/* Header */}
          <div className="flex items-center justify-between mb-6 md:mb-8">
            <div className="flex items-center gap-3 md:gap-4">
              <Link to="/kitchen">
                <Button variant="ghost" size="icon" className="rounded-xl">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-foreground">Admin Panel</h1>
                <p className="text-muted-foreground text-sm md:text-base">
                  {userProfile?.branchName ? `${userProfile.branchName} · ` : ''}Menyu va buyurtmalarni boshqaring
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button asChild className="hidden sm:flex gap-2 rounded-xl">
                <Link to="/kitchen"><ChefHat className="w-5 h-5" />Oshxona</Link>
              </Button>
              <Button
                variant="ghost" size="icon"
                className="rounded-xl text-muted-foreground hover:text-foreground"
                onClick={handleLogout}
                title="Chiqish"
              >
                <LogOut className="w-5 h-5" />
              </Button>
              <Button
                variant="ghost" size="icon"
                className="sm:hidden rounded-xl"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </Button>
            </div>
          </div>

          {mobileMenuOpen && (
            <div className="sm:hidden mb-4 p-4 bg-card border border-border rounded-xl space-y-2">
              <Button asChild className="w-full gap-2 rounded-xl">
                <Link to="/kitchen"><ChefHat className="w-5 h-5" />Oshxona ko'rinishi</Link>
              </Button>
              <Button variant="outline" className="w-full gap-2 rounded-xl" onClick={handleLogout}>
                <LogOut className="w-5 h-5" />Chiqish
              </Button>
            </div>
          )}

          <Tabs defaultValue="shift" className="space-y-4 md:space-y-6">
            <TabsList className="bg-card border border-border rounded-xl p-1 w-full sm:w-auto flex">
              <TabsTrigger value="shift" className="flex-1 sm:flex-none rounded-lg gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Clock className="w-4 h-4" /><span className="hidden sm:inline">Smena</span>
              </TabsTrigger>
              <TabsTrigger value="menu" className="flex-1 sm:flex-none rounded-lg gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <UtensilsCrossed className="w-4 h-4" /><span className="hidden sm:inline">Menyu</span>
              </TabsTrigger>
              <TabsTrigger value="categories" className="flex-1 sm:flex-none rounded-lg gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Tag className="w-4 h-4" /><span className="hidden sm:inline">Kategoriyalar</span>
              </TabsTrigger>
              <TabsTrigger value="orders" className="flex-1 sm:flex-none rounded-lg gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <ClipboardList className="w-4 h-4" /><span className="hidden sm:inline">Buyurtmalar</span>
              </TabsTrigger>
            </TabsList>

            {/* ── SHIFT TAB ─────────────────────────────────────────────────────── */}
            <TabsContent value="shift" className="space-y-4">
              <div className="max-w-lg">
                <h2 className="text-lg font-semibold text-foreground mb-4">Smena boshqaruvi</h2>
                {branchId
                  ? <ShiftPanel branchId={branchId} />
                  : <p className="text-muted-foreground text-sm">SuperAdmin uchun smena filtrlash mavjud emas.</p>
                }
              </div>
            </TabsContent>

            {/* ── MENU TAB ──────────────────────────────────────────────────────── */}
            <TabsContent value="menu" className="space-y-4 md:space-y-6">
              <div className="flex justify-end">
                <Button
                  onClick={() => setIsFormOpen(true)}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl gap-2"
                >
                  <Plus className="w-5 h-5" />
                  <span className="hidden sm:inline">Mahsulot qo'shish</span>
                  <span className="sm:hidden">Qo'shish</span>
                </Button>
              </div>

              {/* Search + category filter */}
              <div className="flex flex-col gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    placeholder="Qidirish..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="pl-10 bg-card border-border rounded-xl"
                  />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                  <Button
                    variant={selectedCategory === 'all' ? 'default' : 'outline'}
                    onClick={() => setSelectedCategory('all')}
                    className="rounded-xl whitespace-nowrap shrink-0"
                    size="sm"
                  >
                    Hammasi ({menuItems.length})
                  </Button>
                  {categoryList.map(cat => (
                    <Button
                      key={cat.id}
                      variant={selectedCategory === cat.id ? 'default' : 'outline'}
                      onClick={() => setSelectedCategory(cat.id)}
                      className="rounded-xl whitespace-nowrap gap-1.5 shrink-0"
                      size="sm"
                    >
                      <span>{cat.icon}</span>{cat.name}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
                <div className="bg-card border border-border rounded-2xl p-3 md:p-4">
                  <p className="text-muted-foreground text-xs md:text-sm">Jami mahsulotlar</p>
                  <p className="text-xl md:text-2xl font-bold text-foreground">{menuItems.length}</p>
                </div>
                <div className="bg-card border border-border rounded-2xl p-3 md:p-4">
                  <p className="text-muted-foreground text-xs md:text-sm">Mavjud</p>
                  <p className="text-xl md:text-2xl font-bold text-green-500">{menuItems.filter(i => i.available).length}</p>
                </div>
                <div className="bg-card border border-border rounded-2xl p-3 md:p-4">
                  <p className="text-muted-foreground text-xs md:text-sm">Mavjud emas</p>
                  <p className="text-xl md:text-2xl font-bold text-red-500">{menuItems.filter(i => !i.available).length}</p>
                </div>
                <div className="bg-card border border-border rounded-2xl p-3 md:p-4">
                  <p className="text-muted-foreground text-xs md:text-sm">Kategoriyalar</p>
                  <p className="text-xl md:text-2xl font-bold text-foreground">{categoryList.length}</p>
                </div>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-16 text-muted-foreground">
                  <UtensilsCrossed className="h-10 w-10 animate-pulse mr-3" />
                  Yuklanmoqda...
                </div>
              ) : (
                <>
                  <motion.div
                    layout
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4"
                  >
                    <AnimatePresence mode="popLayout">
                      {filteredItems.map(item => (
                        <AdminMenuItemCard
                          key={item.id}
                          item={item}
                          onEdit={() => setEditingItem(item)}
                          onDelete={() => handleDeleteItem(item.id)}
                          onToggleAvailability={() => handleToggleAvailability(item.id)}
                        />
                      ))}
                    </AnimatePresence>
                  </motion.div>

                  {filteredItems.length === 0 && (
                    <div className="text-center py-12">
                      <UtensilsCrossed className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="text-muted-foreground">Mahsulotlar topilmadi</p>
                    </div>
                  )}
                </>
              )}
            </TabsContent>

            {/* ── CATEGORIES TAB ────────────────────────────────────────────────── */}
            <TabsContent value="categories" className="space-y-4">
              <h2 className="text-lg font-semibold text-foreground">Kategoriyalar</h2>

              {/* Add category form */}
              {branchId && (
                <form onSubmit={handleAddCategory} className="flex gap-2 items-end bg-card border border-border rounded-2xl p-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-muted-foreground">Emoji</label>
                    <Input
                      value={newCatIcon}
                      onChange={e => setNewCatIcon(e.target.value)}
                      className="w-16 text-center rounded-xl bg-background"
                      maxLength={4}
                    />
                  </div>
                  <div className="flex-1 flex flex-col gap-1">
                    <label className="text-xs text-muted-foreground">Kategoriya nomi</label>
                    <Input
                      placeholder="Masalan: Burger, Pizza..."
                      value={newCatName}
                      onChange={e => setNewCatName(e.target.value)}
                      className="rounded-xl bg-background"
                      required
                    />
                  </div>
                  <Button type="submit" className="rounded-xl gap-2 shrink-0" disabled={!newCatName.trim()}>
                    <Plus className="w-4 h-4" />
                    Qo'shish
                  </Button>
                </form>
              )}

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {(fsCategories.length > 0 ? fsCategories : fallbackCategories.map(c => ({
                  ...c, active: true, createdAt: new Date(), updatedAt: new Date()
                }))).map(cat => (
                  <div
                    key={cat.id}
                    className="bg-card border border-border rounded-2xl p-4 flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{cat.icon}</span>
                      <div>
                        <p className="text-sm font-medium text-foreground">{cat.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {menuItems.filter(m => m.category === cat.id).length} ta
                        </p>
                      </div>
                    </div>
                    {branchId && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="shrink-0 rounded-xl text-muted-foreground hover:text-destructive"
                        onClick={() => handleDeleteCategory(cat.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* ── ORDERS TAB ────────────────────────────────────────────────────── */}
            <TabsContent value="orders">
              <OrderHistoryTable branchId={branchId} />
            </TabsContent>
          </Tabs>

          {/* Menu item form modal */}
          <AnimatePresence>
            {(isFormOpen || editingItem) && (
              <MenuItemForm
                item={editingItem}
                categories={categoryList}
                onSubmit={editingItem ? handleEditItem : handleAddItem}
                onClose={() => { setIsFormOpen(false); setEditingItem(null); }}
              />
            )}
          </AnimatePresence>

          <DiagnosticConsole />
        </div>
      </div>
    </ShiftProvider>
  );
};

export default Admin;

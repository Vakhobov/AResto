import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, Search, UtensilsCrossed, ClipboardList } from 'lucide-react';
import { Link } from 'react-router-dom';
import { MenuItem } from '@/types/kiosk';
import { menuItems as initialMenuItems, categories } from '@/data/menuData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AdminMenuItemCard } from '@/components/admin/AdminMenuItemCard';
import { MenuItemForm } from '@/components/admin/MenuItemForm';
import { OrderHistoryTable } from '@/components/admin/OrderHistoryTable';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const Admin = () => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>(initialMenuItems);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const { toast } = useToast();

  const filteredItems = menuItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleAddItem = (item: Omit<MenuItem, 'id'>) => {
    const newItem: MenuItem = {
      ...item,
      id: `item-${Date.now()}`,
    };
    setMenuItems(prev => [...prev, newItem]);
    setIsFormOpen(false);
    toast({
      title: 'Item Added',
      description: `${item.name} has been added to the menu.`,
    });
  };

  const handleEditItem = (item: Omit<MenuItem, 'id'>) => {
    if (!editingItem) return;
    setMenuItems(prev =>
      prev.map(i => (i.id === editingItem.id ? { ...item, id: editingItem.id } : i))
    );
    setEditingItem(null);
    toast({
      title: 'Item Updated',
      description: `${item.name} has been updated.`,
    });
  };

  const handleDeleteItem = (id: string) => {
    const item = menuItems.find(i => i.id === id);
    setMenuItems(prev => prev.filter(i => i.id !== id));
    toast({
      title: 'Item Deleted',
      description: `${item?.name} has been removed from the menu.`,
    });
  };

  const handleToggleAvailability = (id: string) => {
    setMenuItems(prev =>
      prev.map(item =>
        item.id === id ? { ...item, available: !item.available } : item
      )
    );
    const item = menuItems.find(i => i.id === id);
    toast({
      title: item?.available ? 'Item Unavailable' : 'Item Available',
      description: `${item?.name} is now ${item?.available ? 'unavailable' : 'available'}.`,
    });
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link to="/">
              <Button variant="ghost" size="icon" className="rounded-xl">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
              <p className="text-muted-foreground">Manage your menu and orders</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="menu" className="space-y-6">
          <TabsList className="bg-card border border-border rounded-xl p-1">
            <TabsTrigger value="menu" className="rounded-lg gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <UtensilsCrossed className="w-4 h-4" />
              Menu Items
            </TabsTrigger>
            <TabsTrigger value="orders" className="rounded-lg gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <ClipboardList className="w-4 h-4" />
              Order History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="menu" className="space-y-6">
            {/* Add Item Button */}
            <div className="flex justify-end">
              <Button
                onClick={() => setIsFormOpen(true)}
                className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl gap-2"
              >
                <Plus className="w-5 h-5" />
                Add Item
              </Button>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  placeholder="Search items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-card border-border rounded-xl"
                />
              </div>
              <div className="flex gap-2 overflow-x-auto pb-2">
                <Button
                  variant={selectedCategory === 'all' ? 'default' : 'outline'}
                  onClick={() => setSelectedCategory('all')}
                  className="rounded-xl whitespace-nowrap"
                >
                  All Items
                </Button>
                {categories.map(cat => (
                  <Button
                    key={cat.id}
                    variant={selectedCategory === cat.id ? 'default' : 'outline'}
                    onClick={() => setSelectedCategory(cat.id)}
                    className="rounded-xl whitespace-nowrap gap-2"
                  >
                    <span>{cat.icon}</span>
                    {cat.name}
                  </Button>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-card border border-border rounded-2xl p-4">
                <p className="text-muted-foreground text-sm">Total Items</p>
                <p className="text-2xl font-bold text-foreground">{menuItems.length}</p>
              </div>
              <div className="bg-card border border-border rounded-2xl p-4">
                <p className="text-muted-foreground text-sm">Available</p>
                <p className="text-2xl font-bold text-green-500">
                  {menuItems.filter(i => i.available).length}
                </p>
              </div>
              <div className="bg-card border border-border rounded-2xl p-4">
                <p className="text-muted-foreground text-sm">Unavailable</p>
                <p className="text-2xl font-bold text-red-500">
                  {menuItems.filter(i => !i.available).length}
                </p>
              </div>
              <div className="bg-card border border-border rounded-2xl p-4">
                <p className="text-muted-foreground text-sm">Categories</p>
                <p className="text-2xl font-bold text-foreground">{categories.length}</p>
              </div>
            </div>

            {/* Items Grid */}
            <motion.div
              layout
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
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
                <p className="text-muted-foreground">No items found</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="orders">
            <OrderHistoryTable />
          </TabsContent>
        </Tabs>

        {/* Add/Edit Form Modal */}
        <AnimatePresence>
          {(isFormOpen || editingItem) && (
            <MenuItemForm
              item={editingItem}
              onSubmit={editingItem ? handleEditItem : handleAddItem}
              onClose={() => {
                setIsFormOpen(false);
                setEditingItem(null);
              }}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Admin;

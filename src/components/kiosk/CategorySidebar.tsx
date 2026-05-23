import { Category } from '@/types/kiosk';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface CategoryItem {
  id: string;
  name: string;
  icon: string;
}

interface CategorySidebarProps {
  activeCategory: Category;
  onCategoryChange: (category: Category) => void;
  categories?: ReadonlyArray<CategoryItem>;
}

export function CategorySidebar({ activeCategory, onCategoryChange, categories: propCategories }: CategorySidebarProps) {
  const displayCategories = propCategories || [
    { id: 'tacos', name: 'Tacos', icon: '🌮' },
    { id: 'burgers', name: 'Burgers', icon: '🍔' },
    { id: 'crepes', name: 'Crepes', icon: '🥞' },
    { id: 'drinks', name: 'Drinks', icon: '🥤' },
    { id: 'desserts', name: 'Desserts', icon: '🍰' },
    { id: 'chicken', name: 'Chicken', icon: '🍗' },
  ];
  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-28 min-h-screen bg-secondary/50 backdrop-blur-sm border-r border-border flex-col py-6">
        <div className="flex flex-col gap-2 px-2">
          {displayCategories.map((category, index) => {
            const isActive = activeCategory === category.id;
            
            return (
              <motion.button
                key={category.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => onCategoryChange(category.id as Category)}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-2 p-4 rounded-2xl transition-all duration-300 touch-manipulation",
                  "hover:bg-kiosk-card-hover active:scale-95",
                  isActive && "bg-primary shadow-glow"
                )}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeCategory"
                    className="absolute inset-0 bg-primary rounded-2xl shadow-glow"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                <span className="relative z-10 text-3xl">{category.icon}</span>
                <span className={cn(
                  "relative z-10 text-xs font-medium transition-colors",
                  isActive ? "text-primary-foreground" : "text-muted-foreground"
                )}>
                  {category.name}
                </span>
              </motion.button>
            );
          })}
        </div>
      </aside>

      {/* Mobile Horizontal Scroll */}
      <div className="lg:hidden sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex gap-2 p-3 overflow-x-auto scrollbar-hide">
          {displayCategories.map((category) => {
            const isActive = activeCategory === category.id;
            
            return (
              <button
                key={category.id}
                onClick={() => onCategoryChange(category.id as Category)}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 rounded-xl whitespace-nowrap transition-all duration-200 touch-manipulation",
                  isActive 
                    ? "bg-primary text-primary-foreground shadow-glow" 
                    : "bg-card border border-border text-muted-foreground"
                )}
              >
                <span className="text-xl">{category.icon}</span>
                <span className="text-sm font-medium">{category.name}</span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

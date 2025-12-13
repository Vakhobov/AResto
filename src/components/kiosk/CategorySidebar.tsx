import { Category } from '@/types/kiosk';
import { categories } from '@/data/menuData';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface CategorySidebarProps {
  activeCategory: Category;
  onCategoryChange: (category: Category) => void;
}

export function CategorySidebar({ activeCategory, onCategoryChange }: CategorySidebarProps) {
  return (
    <aside className="w-28 min-h-screen bg-secondary/50 backdrop-blur-sm border-r border-border flex flex-col py-6">
      <div className="flex flex-col gap-2 px-2">
        {categories.map((category, index) => {
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
  );
}

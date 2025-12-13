import { MenuItem } from '@/types/kiosk';
import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';

interface FoodItemCardProps {
  item: MenuItem;
  onAddToCart: (item: MenuItem) => void;
  index: number;
}

export function FoodItemCard({ item, onAddToCart, index }: FoodItemCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      whileTap={{ scale: 0.97 }}
      onClick={() => item.available && onAddToCart(item)}
      className={`
        relative overflow-hidden rounded-3xl bg-card border border-border
        cursor-pointer transition-all duration-300 touch-manipulation
        hover:border-primary/50 hover:shadow-card
        ${!item.available && 'opacity-50 cursor-not-allowed'}
      `}
    >
      {/* Image */}
      <div className="relative aspect-[4/3] overflow-hidden">
        <img
          src={item.image}
          alt={item.name}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />
        
        {/* Add Button */}
        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          className="absolute bottom-3 right-3 w-12 h-12 rounded-full bg-primary flex items-center justify-center shadow-button"
        >
          <Plus className="w-6 h-6 text-primary-foreground" />
        </motion.button>

        {!item.available && (
          <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
            <span className="text-sm font-medium text-muted-foreground bg-secondary px-3 py-1 rounded-full">
              Unavailable
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <h3 className="font-semibold text-lg text-foreground mb-1 line-clamp-1">
          {item.name}
        </h3>
        {item.description && (
          <p className="text-sm text-muted-foreground mb-2 line-clamp-1">
            {item.description}
          </p>
        )}
        <p className="text-xl font-bold text-primary">
          ${item.price.toFixed(2)}
        </p>
      </div>
    </motion.div>
  );
}

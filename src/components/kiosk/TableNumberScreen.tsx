import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Delete, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Language } from '@/types/kiosk';
import { subscribeToTables, getTables } from '@/services/tableService';
import { RestaurantTable } from '@/services/tableService';

interface TableNumberScreenProps {
  language: Language;
  branchId: string;
  onConfirm: (tableNumber: number) => void;
  onBack: () => void;
}

export function TableNumberScreen({ language, branchId, onConfirm, onBack }: TableNumberScreenProps) {
  const [input, setInput] = useState('');
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribeToTables(
      branchId,
      nextTables => {
        setTables(nextTables);
        setLoading(false);
      },
      error => {
        console.error('Table subscription failed:', error);
        setTables([]);
        setLoading(false);
      },
    );

    return unsubscribe;
  }, [branchId]);

  const availableTables = tables.length > 0 ? tables.filter(t => t.active && t.status === 'available') : [];
  const maxTableNumber = tables.length > 0 ? Math.max(...tables.map(t => t.number)) : 50;
  const minTableNumber = tables.length > 0 ? Math.min(...tables.map(t => t.number)) : 1;

  const translations = {
    title: {
      uz: "Stol raqamini kiriting",
      en: "Enter Table Number",
      ru: "Введите номер стола",
    },
    subtitle: {
      uz: `Stol raqamingizni tanlang (${minTableNumber}–${maxTableNumber})`,
      en: `Select your table number (${minTableNumber}–${maxTableNumber})`,
      ru: `Выберите номер вашего стола (${minTableNumber}–${maxTableNumber})`,
    },
    table: {
      uz: "Stol",
      en: "Table",
      ru: "Стол",
    },
    confirm: {
      uz: "Davom etish",
      en: "Continue",
      ru: "Продолжить",
    },
    back: {
      uz: "Orqaga",
      en: "Back",
      ru: "Назад",
    },
  };

  const tableNumber = parseInt(input, 10);
  const isValidTable = tables.length > 0
    ? availableTables.some(t => t.number === tableNumber)
    : !isNaN(tableNumber) && tableNumber >= minTableNumber && tableNumber <= maxTableNumber;

  const handleDigit = (digit: string) => {
    if (input.length < 2) {
      setInput(prev => prev + digit);
    }
  };

  const handleDelete = () => {
    setInput(prev => prev.slice(0, -1));
  };

  const handleConfirm = () => {
    if (isValidTable) {
      localStorage.setItem('aresto-table-number', tableNumber.toString());
      onConfirm(tableNumber);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-gradient-to-br from-primary/10 via-background to-secondary/20 flex flex-col items-center justify-center p-4 md:p-8 z-50"
    >
      {/* Back Button */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="absolute top-6 left-6"
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="rounded-full w-12 h-12 bg-card border border-border"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
      </motion.div>

      {/* Title */}
      <motion.div
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="text-center mb-6 md:mb-8"
      >
        <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 md:mb-6">
          <MapPin className="w-10 h-10 md:w-12 md:h-12 text-primary" />
        </div>
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-foreground mb-2 md:mb-3">
          {translations.title[language]}
        </h1>
        <p className="text-lg sm:text-xl text-muted-foreground">
          {translations.subtitle[language]}
        </p>
      </motion.div>

      {/* Display */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="mb-6 md:mb-8"
      >
        <div className="bg-card border-2 border-border rounded-3xl px-10 py-6 md:px-14 md:py-8 min-w-[200px] md:min-w-[260px] text-center">
          {input ? (
            <div>
              <p className="text-sm text-muted-foreground mb-1">{translations.table[language]}</p>
              <p className="text-6xl md:text-7xl font-bold text-primary">{input}</p>
            </div>
          ) : (
            <p className="text-5xl md:text-6xl font-bold text-muted-foreground/30">--</p>
          )}
        </div>
      </motion.div>

      {/* Numpad */}
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-3 gap-3 md:gap-4 w-full max-w-xs md:max-w-sm mb-6 md:mb-8"
      >
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
          <motion.button
            key={digit}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handleDigit(digit)}
            className="h-16 md:h-20 rounded-2xl bg-card border-2 border-border hover:border-primary/50 text-2xl md:text-3xl font-bold text-foreground transition-all duration-200 touch-manipulation active:bg-primary/10"
          >
            {digit}
          </motion.button>
        ))}

        {/* Empty cell */}
        <div />

        {/* Zero */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => handleDigit('0')}
          className="h-16 md:h-20 rounded-2xl bg-card border-2 border-border hover:border-primary/50 text-2xl md:text-3xl font-bold text-foreground transition-all duration-200 touch-manipulation active:bg-primary/10"
        >
          0
        </motion.button>

        {/* Delete */}
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleDelete}
          className="h-16 md:h-20 rounded-2xl bg-secondary border-2 border-border hover:border-destructive/50 flex items-center justify-center transition-all duration-200 touch-manipulation"
        >
          <Delete className="w-6 h-6 md:w-7 md:h-7 text-muted-foreground" />
        </motion.button>
      </motion.div>

      {/* Confirm Button */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.25 }}
        className="w-full max-w-xs md:max-w-sm"
      >
        <Button
          onClick={handleConfirm}
          disabled={!isValidTable}
          className="w-full h-16 md:h-18 text-xl md:text-2xl font-bold rounded-2xl bg-primary hover:bg-primary/90 shadow-button disabled:opacity-40 disabled:shadow-none transition-all"
        >
          {translations.confirm[language]}
        </Button>
      </motion.div>
    </motion.div>
  );
}

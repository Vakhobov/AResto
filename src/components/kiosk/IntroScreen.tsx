import { motion } from 'framer-motion';
import { Language, OrderType } from '@/types/kiosk';
import { UtensilsCrossed, ShoppingBag } from 'lucide-react';

interface IntroScreenProps {
  language: Language;
  onLanguageChange: (lang: Language) => void;
  onSelectOrderType: (type: OrderType) => void;
}

const translations = {
  welcome: {
    uz: "Xush kelibsiz!",
    en: "Welcome!",
    ru: "Добро пожаловать!",
  },
  subtitle: {
    uz: "Buyurtmangizni qanday olishni xohlaysiz?",
    en: "How would you like your order?",
    ru: "Как вы хотите получить заказ?",
  },
  dineIn: {
    uz: "Bu yerda yeyish",
    en: "Dine In",
    ru: "Здесь",
  },
  takeOut: {
    uz: "Olib ketish",
    en: "Take Out",
    ru: "С собой",
  },
  dineInSub: {
    uz: "Restoranda yeyish",
    en: "Eat at restaurant",
    ru: "Есть в ресторане",
  },
  takeOutSub: {
    uz: "O'zingiz bilan olib keting",
    en: "Take it with you",
    ru: "Забрать с собой",
  },
};

const languages: { code: Language; flag: string }[] = [
  { code: 'uz', flag: '🇺🇿' },
  { code: 'en', flag: '🇬🇧' },
  { code: 'ru', flag: '🇷🇺' },
];

export function IntroScreen({ language, onLanguageChange, onSelectOrderType }: IntroScreenProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-gradient-to-br from-primary/10 via-background to-secondary/20 flex flex-col items-center justify-center p-4 md:p-8"
    >
      {/* Logo/Branding */}
      <motion.div
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="text-center mb-8 md:mb-12"
      >
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-primary mb-3 md:mb-4">
          🍔 Tasty Kiosk
        </h1>
        <p className="text-2xl sm:text-3xl md:text-4xl font-semibold text-foreground">
          {translations.welcome[language]}
        </p>
        <p className="text-lg sm:text-xl md:text-2xl text-muted-foreground mt-2">
          {translations.subtitle[language]}
        </p>
      </motion.div>

      {/* Order Type Selection */}
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="flex flex-col sm:flex-row gap-4 md:gap-6 lg:gap-10 w-full max-w-2xl px-4"
      >
        {/* Dine In Button */}
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onSelectOrderType('dine-in')}
          className="group flex-1 min-h-[180px] sm:min-h-[240px] md:min-h-[280px] lg:min-h-[320px] rounded-3xl bg-card border-2 border-border hover:border-primary shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col items-center justify-center gap-3 md:gap-4 p-4 md:p-6 touch-manipulation"
        >
          <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center transition-colors">
            <UtensilsCrossed className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-primary" />
          </div>
          <span className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground text-center">
            {translations.dineIn[language]}
          </span>
          <span className="text-sm sm:text-base md:text-lg text-muted-foreground text-center">
            {translations.dineInSub[language]}
          </span>
        </motion.button>

        {/* Take Out Button */}
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onSelectOrderType('take-out')}
          className="group flex-1 min-h-[180px] sm:min-h-[240px] md:min-h-[280px] lg:min-h-[320px] rounded-3xl bg-card border-2 border-border hover:border-primary shadow-lg hover:shadow-xl transition-all duration-300 flex flex-col items-center justify-center gap-3 md:gap-4 p-4 md:p-6 touch-manipulation"
        >
          <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center transition-colors">
            <ShoppingBag className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-primary" />
          </div>
          <span className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground text-center">
            {translations.takeOut[language]}
          </span>
          <span className="text-sm sm:text-base md:text-lg text-muted-foreground text-center">
            {translations.takeOutSub[language]}
          </span>
        </motion.button>
      </motion.div>

      {/* Language Selector */}
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mt-8 md:mt-12 flex gap-3 md:gap-4"
      >
        {languages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => onLanguageChange(lang.code)}
            className={`text-3xl md:text-4xl p-2 md:p-3 rounded-xl transition-all duration-200 touch-manipulation ${
              language === lang.code
                ? 'bg-primary/20 scale-110 ring-2 ring-primary'
                : 'bg-muted hover:bg-muted/80 hover:scale-105'
            }`}
          >
            {lang.flag}
          </button>
        ))}
      </motion.div>
    </motion.div>
  );
}

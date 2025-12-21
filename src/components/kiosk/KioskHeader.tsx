import { Language } from '@/types/kiosk';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Settings, ChefHat } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface KioskHeaderProps {
  language: Language;
  onLanguageChange: (language: Language) => void;
}

const languages: { code: Language; flag: string; name: string }[] = [
  { code: 'en', flag: '🇺🇸', name: 'English' },
  { code: 'es', flag: '🇪🇸', name: 'Español' },
  { code: 'fr', flag: '🇫🇷', name: 'Français' },
];

const headings: Record<Language, string> = {
  en: 'What will you be eating today?',
  es: '¿Qué comerás hoy?',
  fr: 'Que mangerez-vous aujourd\'hui?',
};

export function KioskHeader({ language, onLanguageChange }: KioskHeaderProps) {
  return (
    <header className="flex items-center justify-between px-8 py-6">
      <motion.h1
        key={language}
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-3xl font-bold text-foreground"
      >
        {headings[language]}
      </motion.h1>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 bg-secondary/50 rounded-full p-1">
          {languages.map((lang) => (
            <motion.button
              key={lang.code}
              whileTap={{ scale: 0.95 }}
              onClick={() => onLanguageChange(lang.code)}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-300 touch-manipulation
                ${language === lang.code 
                  ? 'bg-primary text-primary-foreground shadow-button' 
                  : 'hover:bg-muted text-muted-foreground'
                }
              `}
            >
              <span className="text-xl">{lang.flag}</span>
              <span className="text-sm font-medium hidden sm:inline">{lang.name}</span>
            </motion.button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild className="rounded-full">
            <Link to="/kitchen">
              <ChefHat className="h-5 w-5" />
            </Link>
          </Button>
          <Button variant="ghost" size="icon" asChild className="rounded-full">
            <Link to="/admin">
              <Settings className="h-5 w-5" />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}

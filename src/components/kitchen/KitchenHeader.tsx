import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChefHat, Settings, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface KitchenHeaderProps {
  newCount: number;
  preparingCount: number;
  readyCount: number;
  onLogout?: () => void;
}

const KitchenHeader = ({ newCount, preparingCount, readyCount, onLogout }: KitchenHeaderProps) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="bg-card border-b border-border px-4 py-4 md:px-6">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <ChefHat className="h-8 w-8 text-primary" />
          <h1 className="text-xl md:text-2xl font-bold text-foreground">Kitchen Display</h1>
        </div>

        <div className="flex items-center gap-4 md:gap-6">
          <div className="hidden sm:block text-2xl md:text-3xl font-mono font-bold text-foreground">
            {currentTime.toLocaleTimeString()}
          </div>

          <div className="hidden lg:flex items-center gap-3">
            <Badge variant="outline" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50 text-lg px-3 py-1">
              {newCount} New
            </Badge>
            <Badge variant="outline" className="bg-blue-500/20 text-blue-400 border-blue-500/50 text-lg px-3 py-1">
              {preparingCount} Preparing
            </Badge>
            <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/50 text-lg px-3 py-1">
              {readyCount} Ready
            </Badge>
          </div>

          <Button variant="outline" asChild>
            <Link to="/admin">
              <Settings className="h-4 w-4 mr-2" />
              Admin
            </Link>
          </Button>

          {onLogout && (
            <Button variant="ghost" size="icon" className="rounded-xl text-muted-foreground hover:text-foreground" onClick={onLogout} title="Chiqish">
              <LogOut className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};

export default KitchenHeader;

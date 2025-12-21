import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ChefHat, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface KitchenHeaderProps {
  pendingCount: number;
  preparingCount: number;
}

const KitchenHeader = ({ pendingCount, preparingCount }: KitchenHeaderProps) => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="bg-card border-b border-border px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ChefHat className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Kitchen Display</h1>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-3xl font-mono font-bold text-foreground">
            {currentTime.toLocaleTimeString()}
          </div>

          <div className="flex items-center gap-3">
            <Badge variant="outline" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/50 text-lg px-3 py-1">
              🟡 {pendingCount} Pending
            </Badge>
            <Badge variant="outline" className="bg-blue-500/20 text-blue-400 border-blue-500/50 text-lg px-3 py-1">
              🔵 {preparingCount} Preparing
            </Badge>
          </div>

          <Button variant="outline" asChild>
            <Link to="/admin">
              <Settings className="h-4 w-4 mr-2" />
              Admin
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
};

export default KitchenHeader;

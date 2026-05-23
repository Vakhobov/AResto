import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Monitor, ShieldCheck, UtensilsCrossed, Lock, CheckCircle2 } from 'lucide-react';
import { useDeviceMode } from '@/context/DeviceModeContext';
import { DeviceMode } from '@/lib/deviceMode';
import { Button } from '@/components/ui/button';

const DeviceSetup = () => {
  const { setMode, mode, resetMode } = useDeviceMode();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<DeviceMode | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const handleConfirm = () => {
    if (!selected) return;
    setMode(selected);
    setConfirmed(true);

    // Small delay for the success animation, then navigate
    setTimeout(() => {
      if (selected === 'customer') {
        navigate('/', { replace: true });
      } else {
        navigate('/login', { replace: true });
      }
    }, 800);
  };

  const handleReset = () => {
    resetMode();
    setSelected(null);
    setConfirmed(false);
  };

  const options: {
    mode: DeviceMode;
    icon: React.ReactNode;
    title: string;
    subtitle: string;
    features: string[];
    color: string;
    borderColor: string;
  }[] = [
    {
      mode: 'customer',
      icon: <UtensilsCrossed className="h-10 w-10" />,
      title: 'Customer Tablet',
      subtitle: 'Kiosk ordering terminal',
      features: [
        'Customer menu & ordering',
        'Order tracking',
        'Locked to kiosk mode',
        'No admin access',
      ],
      color: 'text-primary',
      borderColor: 'border-primary',
    },
    {
      mode: 'staff',
      icon: <ShieldCheck className="h-10 w-10" />,
      title: 'Staff Device',
      subtitle: 'Kitchen & admin terminal',
      features: [
        'Kitchen display',
        'Admin panel',
        'Menu management',
        'Staff login required',
      ],
      color: 'text-blue-400',
      borderColor: 'border-blue-400',
    },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-3xl"
      >
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 mb-4">
            <Monitor className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">Device Setup</h1>
          <p className="text-muted-foreground mt-2">
            Choose how this device will be used. This can only be changed by an administrator.
          </p>
          {mode && (
            <p className="mt-2 text-xs text-muted-foreground">
              Current mode:{' '}
              <span className="font-mono text-foreground bg-secondary/50 px-2 py-0.5 rounded-md">
                {mode}
              </span>
            </p>
          )}
        </div>

        {/* Mode cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-8">
          {options.map((opt) => {
            const isSelected = selected === opt.mode;
            return (
              <motion.button
                key={opt.mode}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setSelected(opt.mode)}
                className={`
                  relative text-left p-6 rounded-2xl border-2 transition-all duration-200
                  bg-card hover:bg-card/80
                  ${isSelected
                    ? `${opt.borderColor} shadow-lg`
                    : 'border-border'
                  }
                `}
              >
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute top-4 right-4"
                  >
                    <CheckCircle2 className={`h-5 w-5 ${opt.color}`} />
                  </motion.div>
                )}

                <div className={`mb-4 ${isSelected ? opt.color : 'text-muted-foreground'} transition-colors`}>
                  {opt.icon}
                </div>

                <h2 className="text-xl font-bold text-foreground mb-1">{opt.title}</h2>
                <p className="text-sm text-muted-foreground mb-4">{opt.subtitle}</p>

                <ul className="space-y-2">
                  {opt.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <div className={`h-1.5 w-1.5 rounded-full ${isSelected ? opt.color.replace('text-', 'bg-') : 'bg-muted-foreground/40'} transition-colors`} />
                      {f}
                    </li>
                  ))}
                </ul>

                {opt.mode === 'customer' && (
                  <div className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Lock className="h-3 w-3" />
                    Locked-down kiosk mode
                  </div>
                )}
              </motion.button>
            );
          })}
        </div>

        {/* Confirm button */}
        <div className="flex flex-col items-center gap-3">
          <Button
            id="setup-confirm"
            size="lg"
            className="w-full sm:w-auto min-w-[200px] rounded-xl gap-2 h-12 text-base"
            onClick={handleConfirm}
            disabled={!selected || confirmed}
          >
            {confirmed ? (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-2"
              >
                <CheckCircle2 className="h-5 w-5" />
                Configured!
              </motion.span>
            ) : (
              'Confirm Setup'
            )}
          </Button>

          {mode && (
            <button
              onClick={handleReset}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-4"
            >
              Reset device mode
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default DeviceSetup;

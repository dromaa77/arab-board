import { useEffect, useState } from 'react';

// PWA install prompts are disabled
export function usePWA() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    // Prevent default install prompt from appearing
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
    };

    // Online/offline status only
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return {
    isInstallable: false,
    isInstalled: false,
    isOnline,
    isIOS: false,
    install: async () => false,
  };
}

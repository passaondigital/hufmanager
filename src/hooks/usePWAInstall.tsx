import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

export type DeviceType = 'mobile' | 'tablet' | 'desktop';
export type PlatformType = 'ios' | 'android' | 'windows' | 'mac' | 'linux' | 'chromeos' | 'unknown';

interface PWAInstallState {
  canInstall: boolean;
  isInstalled: boolean;
  isIOS: boolean;
  isMacSafari: boolean;
  deviceType: DeviceType;
  platform: PlatformType;
  promptInstall: () => Promise<void>;
}

function getDeviceType(): DeviceType {
  const width = window.innerWidth;
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

function getPlatform(): PlatformType {
  const userAgent = navigator.userAgent.toLowerCase();
  const platform = navigator.platform?.toLowerCase() || '';
  
  if (/iphone|ipad|ipod/.test(userAgent)) return 'ios';
  if (/android/.test(userAgent)) return 'android';
  if (/cros/.test(userAgent)) return 'chromeos';
  if (/win/.test(platform)) return 'windows';
  if (/mac/.test(platform)) return 'mac';
  if (/linux/.test(platform)) return 'linux';
  return 'unknown';
}

function isIOSDevice(): boolean {
  const userAgent = navigator.userAgent.toLowerCase();
  return /iphone|ipad|ipod/.test(userAgent);
}

function isMacSafari(): boolean {
  const userAgent = navigator.userAgent.toLowerCase();
  const isMac = /macintosh|mac os x/.test(userAgent);
  const isSafari = /safari/.test(userAgent) && !/chrome|chromium|crios/.test(userAgent);
  return isMac && isSafari;
}

function isStandalone(): boolean {
  // Check various standalone indicators
  const isStandaloneMedia = window.matchMedia('(display-mode: standalone)').matches;
  const isIOSStandalone = ('standalone' in window.navigator) && (window.navigator as any).standalone === true;
  const isFullscreen = window.matchMedia('(display-mode: fullscreen)').matches;
  
  return isStandaloneMedia || isIOSStandalone || isFullscreen;
}

export function usePWAInstall(): PWAInstallState {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [deviceType, setDeviceType] = useState<DeviceType>('desktop');
  const [platform, setPlatform] = useState<PlatformType>('unknown');

  useEffect(() => {
    // Set initial values
    setDeviceType(getDeviceType());
    setPlatform(getPlatform());
    setIsInstalled(isStandalone());

    // Handle beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: BeforeInstallPromptEvent) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    // Handle appinstalled event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    // Handle resize for device type
    const handleResize = () => {
      setDeviceType(getDeviceType());
    };

    // Handle display mode change
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = (e: MediaQueryListEvent) => {
      setIsInstalled(e.matches);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('resize', handleResize);
    mediaQuery.addEventListener('change', handleDisplayModeChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('resize', handleResize);
      mediaQuery.removeEventListener('change', handleDisplayModeChange);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      
      setDeferredPrompt(null);
    } catch (error) {
      console.error('Error prompting install:', error);
    }
  }, [deferredPrompt]);

  return {
    canInstall: !!deferredPrompt,
    isInstalled,
    isIOS: isIOSDevice(),
    isMacSafari: isMacSafari(),
    deviceType,
    platform,
    promptInstall,
  };
}

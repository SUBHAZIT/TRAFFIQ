import { useState, useEffect } from 'react';

export function useSensorData() {
  const [orientation, setOrientation] = useState({ alpha: 0, beta: 0, gamma: 0 });
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && 'DeviceOrientationEvent' in window) {
      setIsSupported(true);
      
      const handleOrientation = (event: DeviceOrientationEvent) => {
        setOrientation({
          alpha: event.alpha || 0, // Rotation around z-axis
          beta: event.beta || 0,   // Rotation around x-axis (tilt front/back)
          gamma: event.gamma || 0  // Rotation around y-axis (tilt left/right)
        });
      };

      // Request permission for iOS 13+
      if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
        (DeviceOrientationEvent as any).requestPermission()
          .then((permissionState: string) => {
            if (permissionState === 'granted') {
              window.addEventListener('deviceorientation', handleOrientation);
            }
          })
          .catch(console.error);
      } else {
        window.addEventListener('deviceorientation', handleOrientation);
      }

      return () => {
        window.removeEventListener('deviceorientation', handleOrientation);
      };
    }
  }, []);

  return { orientation, isSupported };
}

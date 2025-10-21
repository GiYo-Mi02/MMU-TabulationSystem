// Custom hook to show visual feedback when data updates in real-time
import { useEffect, useState } from "react";

export function useRealtimeFlash(data, duration = 1000) {
  const [isFlashing, setIsFlashing] = useState(false);

  useEffect(() => {
    if (data) {
      setIsFlashing(true);
      const timer = setTimeout(() => setIsFlashing(false), duration);
      return () => clearTimeout(timer);
    }
  }, [data, duration]);

  return isFlashing;
}

export default useRealtimeFlash;

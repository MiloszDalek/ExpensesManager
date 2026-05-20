import { useEffect, useState } from "react";

export function useHasCamera() {
  const [hasCamera, setHasCamera] = useState<boolean | null>(null);

  useEffect(() => {
    if (!navigator.mediaDevices?.enumerateDevices) {
      setHasCamera(false);
      return;
    }

    let cancelled = false;

    navigator.mediaDevices
      .enumerateDevices()
      .then((devices) => {
        if (cancelled) return;
        const videoInputs = devices.filter((d) => d.kind === "videoinput");
        setHasCamera(videoInputs.length > 0);
      })
      .catch(() => {
        if (cancelled) return;
        setHasCamera(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return hasCamera;
}

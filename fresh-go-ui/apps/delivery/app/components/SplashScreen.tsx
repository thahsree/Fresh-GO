"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

type SplashScreenProps = {
  onFinish?: () => void;
  minDurationMs?: number;
};

export function SplashScreen({ onFinish, minDurationMs = 2000 }: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    // Check if splash screen was already shown in this session
    const hasSeenSplash = typeof window !== "undefined" && sessionStorage.getItem("freshgo_delivery_splash_shown");
    if (hasSeenSplash) {
      setIsVisible(false);
      onFinish?.();
      return;
    }

    const timer = setTimeout(() => {
      setIsFadingOut(true);
      if (typeof window !== "undefined") {
        sessionStorage.setItem("freshgo_delivery_splash_shown", "true");
      }
      const exitTimer = setTimeout(() => {
        setIsVisible(false);
        onFinish?.();
      }, 500); // matches CSS fade-out transition
      return () => clearTimeout(exitTimer);
    }, minDurationMs);

    return () => clearTimeout(timer);
  }, [minDurationMs, onFinish]);

  if (!isVisible) return null;

  return (
    <div
      className={`delivery-splash-overlay ${isFadingOut ? "fade-out" : ""}`}
      aria-label="FreshGo Delivery Loading Screen"
      role="dialog"
      aria-modal="true"
      onClick={() => {
        setIsFadingOut(true);
        if (typeof window !== "undefined") {
          sessionStorage.setItem("freshgo_delivery_splash_shown", "true");
        }
        setTimeout(() => {
          setIsVisible(false);
          onFinish?.();
        }, 300);
      }}
    >
      <div className="splash-card">
        <div className="splash-logo-wrapper">
          <Image
            src="/FreshGologo.png"
            alt="FreshGo Delivery"
            width={180}
            height={180}
            priority
            className="splash-logo-img"
          />
        </div>
        <div className="splash-brand-text">
          <span className="splash-badge">Delivery Partner</span>
          <p className="splash-tagline">Fresh groceries delivered in minutes</p>
        </div>
        <div className="splash-loader">
          <div className="splash-loader-bar" />
        </div>
      </div>
    </div>
  );
}

export const isMobileDevice = (): boolean => {
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;

  // Check for mobile devices
  const mobileRegex = /Android|BlackBerry|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i;

  // Check for touch capability
  const isTouchDevice = "ontouchstart" in window || navigator.maxTouchPoints > 0;

  // Check screen width (typical mobile breakpoint)
  const isSmallScreen = window.innerWidth <= 768;

  return mobileRegex.test(userAgent) || (isTouchDevice && isSmallScreen);
};

export const getDeviceType = (): "mobile" | "tablet" | "desktop" => {
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;

  if (/iPad|Android(?=.*\bTablet\b)|(?=.*\bAndroid\b)(?=.*\b(?:large|xlarge)\b)/i.test(userAgent)) {
    return "tablet";
  }

  if (isMobileDevice()) {
    return "mobile";
  }

  return "desktop";
};

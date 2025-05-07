const isDevelopment = import.meta.env.DEV;

const logger = {
  debug: (message: string, ...meta: any[]) => {
    if (isDevelopment) {
      console.log(`[DEBUG] ${message}`, ...(meta.length ? meta : []));
    }
  },
  info: (message: string, ...meta: any[]) => {
    if (isDevelopment) {
      console.log(`[INFO] ${message}`, ...(meta.length ? meta : []));
    }
  },
  warn: (message: string, ...meta: any[]) => {
    if (isDevelopment) {
      console.warn(`[WARN] ${message}`, ...(meta.length ? meta : []));
    }
  },
  error: (message: string, error?: any) => {
    if (error) {
      console.error(`[ERROR] ${message}`, error.message || error);
    } else {
      console.error(`[ERROR] ${message}`);
    }
  }
};

export default logger;

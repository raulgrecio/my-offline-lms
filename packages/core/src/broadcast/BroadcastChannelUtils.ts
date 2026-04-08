
/**
 * Helper to get a BroadcastChannel safely in any environment (Node.js or Browser).
 * In Node.js environment, it automatically calls 'unref()' to prevent blocking process exit.
 */
export const getSafeBroadcastChannel = (name: string): BroadcastChannel | null => {
  if (typeof BroadcastChannel !== 'undefined') {
    const channel = new BroadcastChannel(name);
    
    // In Node.js environment, unref to not block process exit
    if ((channel as any).unref) {
      (channel as any).unref();
    }
    
    return channel;
  }
  return null;
};

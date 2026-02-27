import { Platform } from 'react-native';
import Constants from 'expo-constants';

export const generateAPIUrl = (relativePath: string) => {
  const path = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;

  // On web, dynamically resolve the host IP so it works from mobile browsers over Wi-Fi
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      const host = window.location.hostname;
      return `http://${host}:3000${path}`;
    }
    return `http://localhost:3000${path}`;
  }

  // On native, resolve using the Expo dev server host IP
  const debuggerHost =
    Constants.expoConfig?.hostUri ??
    Constants.manifest2?.extra?.expoGo?.debuggerHost;

  if (debuggerHost) {
    const hostIP = debuggerHost.split(':')[0];
    return `http://${hostIP}:3000${path}`;
  }

  // Fallback
  if (process.env.EXPO_PUBLIC_API_BASE_URL) {
    return process.env.EXPO_PUBLIC_API_BASE_URL.concat(path);
  }

  return `http://localhost:3000${path}`;
};

import { Platform } from 'react-native';
import Constants from 'expo-constants';

export const generateAPIUrl = (relativePath: string) => {
  const path = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;

  // On web, the API is on localhost:3000
  if (Platform.OS === 'web') {
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

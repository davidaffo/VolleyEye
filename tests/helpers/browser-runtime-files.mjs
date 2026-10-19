import { nativeAppSource } from './native-app.mjs';
import { readFileSync } from 'node:fs';

export const runtimeFiles = ['native-react-app'];
export function readRuntimeSource(path) {
  return path === 'native-react-app' ? nativeAppSource : readFileSync(path, 'utf8');
}

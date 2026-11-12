// Cho phép test node nạp engine/*.js (dùng 'three' và 'three/addons/' qua importmap trình duyệt) bằng vendor/three.
//   const THREE = await nap();   // gọi trước mọi import động của engine
import { register } from 'node:module';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const vendor = pathToFileURL(resolve(import.meta.dirname, '..', '..', 'vendor', 'three') + '/').href;
let done = false;
export async function nap() {
  if (!done) {
    done = true;
    const hook = `export async function resolve(s, c, n) {
      if (s === 'three') return { url: ${JSON.stringify(vendor + 'three.module.js')}, shortCircuit: true };
      if (s.startsWith('three/addons/')) return { url: ${JSON.stringify(vendor + 'addons/')} + s.slice(13), shortCircuit: true };
      return n(s, c);
    }`;
    register('data:text/javascript,' + encodeURIComponent(hook));
  }
  return import('three');
}
export const engine = (f) => import(pathToFileURL(resolve(import.meta.dirname, '..', '..', 'engine', f)).href);

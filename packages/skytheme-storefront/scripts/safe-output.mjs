import { existsSync, lstatSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Refuse to overwrite existing project work. Choose a fresh --out directory.
 * The check must run before mkdirSync/writeFileSync, for both generators.
 */
export function assertFreshOutput(output) {
  const target = resolve(output);
  if (!existsSync(target)) return target;
  const st = lstatSync(target);
  if (st.isSymbolicLink()) throw new Error('Output destination is a symlink; refusing: ' + target);
  if (!st.isDirectory()) throw new Error('Output destination is not a directory: ' + target);
  if (readdirSync(target).length) throw new Error('Output directory is non-empty; refusing to overwrite user work: ' + target + '. Choose a fresh --out.');
  return target;
}

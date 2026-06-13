import { copyFile, mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = path.join(root, 'public', 'tesseract');
const coreOutDir = path.join(publicDir, 'core');
const langOutDir = path.join(publicDir, 'lang');

const workerSource = require.resolve('tesseract.js/dist/worker.min.js');
const coreDir = path.dirname(require.resolve('tesseract.js-core/package.json'));
const langPackageDir = path.dirname(require.resolve('@tesseract.js-data/eng/package.json'));
const langSource = path.join(langPackageDir, '4.0.0_best_int', 'eng.traineddata.gz');

await mkdir(coreOutDir, { recursive: true });
await mkdir(langOutDir, { recursive: true });

await copyFile(workerSource, path.join(publicDir, 'worker.min.js'));
await copyFile(langSource, path.join(langOutDir, 'eng.traineddata.gz'));

const coreFiles = await readdir(coreDir);
await Promise.all(
  coreFiles
    .filter((file) => /^tesseract-core.*\.(js|wasm)$/.test(file))
    .map((file) => copyFile(path.join(coreDir, file), path.join(coreOutDir, file))),
);

console.log('Tesseract browser assets copied to public/tesseract');

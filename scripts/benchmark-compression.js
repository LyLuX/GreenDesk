import { performance } from 'node:perf_hooks';
import { gzipSync } from 'node:zlib';

import swaggerSpec from '../src/config/swagger.js';

const payload = Buffer.from(JSON.stringify(swaggerSpec));
const candidates = [
  { level: 6, memLevel: 8 },
  { level: 9, memLevel: 9 },
];
const iterations = 200;

for (const options of candidates) {
  for (let index = 0; index < 20; index += 1) gzipSync(payload, options);
  const samples = [];
  let compressed;
  for (let sample = 0; sample < 5; sample += 1) {
    const startedAt = performance.now();
    for (let index = 0; index < iterations; index += 1) {
      compressed = gzipSync(payload, options);
    }
    samples.push((performance.now() - startedAt) / iterations);
  }
  samples.sort((left, right) => left - right);
  process.stdout.write(
    `${JSON.stringify({
      ...options,
      inputBytes: payload.length,
      gzipBytes: compressed.length,
      medianMilliseconds: Number(samples[2].toFixed(3)),
    })}\n`,
  );
}

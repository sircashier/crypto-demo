importScripts('sha256.js');

const enc = new TextEncoder();

// Keep only the first `bits` bits of SHA-256 (bits <= 32): a deliberately weakened hash.
function weakHash(msg, bits) {
  const d = sha256(enc.encode(msg));
  const v = d[0] * 16777216 + d[1] * 65536 + d[2] * 256 + d[3];
  return Math.floor(v / 2 ** (32 - bits));
}

function randomMsg() {
  return 'msg-' + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

onmessage = (e) => {
  const { mode, bits, target } = e.data;
  const start = performance.now();
  let last = start;
  let attempts = 0;

  if (mode === 'collision') {
    const seen = new Map();
    for (;;) {
      const m = randomMsg();
      const h = weakHash(m, bits);
      attempts++;
      const prev = seen.get(h);
      if (prev !== undefined && prev !== m) {
        postMessage({ done: true, attempts, a: prev, b: m, hash: h, ms: performance.now() - start });
        return;
      }
      seen.set(h, m);
      if ((attempts & 1023) === 0) {
        const now = performance.now();
        if (now - last > 80) { postMessage({ attempts }); last = now; }
      }
    }
  } else {
    const goal = weakHash(target, bits);
    for (;;) {
      const m = randomMsg();
      attempts++;
      if (weakHash(m, bits) === goal) {
        postMessage({ done: true, attempts, a: target, b: m, hash: goal, ms: performance.now() - start });
        return;
      }
      if ((attempts & 4095) === 0) {
        const now = performance.now();
        if (now - last > 80) { postMessage({ attempts }); last = now; }
      }
    }
  }
};

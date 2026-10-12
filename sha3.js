// Synchronous SHA3-256 (Keccak-f[1600], FIPS 202). Small and readable, not fast.
const sha3_256 = (() => {
  const M = (1n << 64n) - 1n;
  const rotl = (x, n) => n === 0n ? x : ((x << n) | (x >> (64n - n))) & M;
  const RC = [];
  const ROT = [];
  let r = 1;
  for (let i = 0; i < 24; i++) {            // round constants from the LFSR
    let c = 0n;
    for (let j = 0; j < 7; j++) {
      if (r & 1) c |= 1n << BigInt((1 << j) - 1);
      r = (r & 0x80) ? ((r << 1) ^ 0x71) & 0xff : (r << 1) & 0xff;
    }
    RC.push(c);
  }
  let x = 1, y = 0;                          // rotation offsets
  const rot = Array.from({ length: 25 }, () => 0n);
  for (let t = 0; t < 24; t++) {
    rot[x + 5 * y] = BigInt((((t + 1) * (t + 2)) / 2) % 64);
    [x, y] = [y, (2 * x + 3 * y) % 5];
  }
  ROT.push(...rot);

  function keccakF(s) {
    for (let round = 0; round < 24; round++) {
      const C = [0, 1, 2, 3, 4].map((i) => s[i] ^ s[i + 5] ^ s[i + 10] ^ s[i + 15] ^ s[i + 20]);
      for (let i = 0; i < 5; i++) {
        const d = C[(i + 4) % 5] ^ rotl(C[(i + 1) % 5], 1n);
        for (let j = 0; j < 25; j += 5) s[i + j] ^= d;
      }
      const B = new Array(25);
      for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) {
        B[j + 5 * ((2 * i + 3 * j) % 5)] = rotl(s[i + 5 * j], ROT[i + 5 * j]);
      }
      for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) {
        s[i + 5 * j] = B[i + 5 * j] ^ (~B[(i + 1) % 5 + 5 * j] & M & B[(i + 2) % 5 + 5 * j]);
      }
      s[0] ^= RC[round];
    }
  }

  return function sha3_256(bytes) {
    const rate = 136;                         // 200 - 2*32
    const padded = new Uint8Array(Math.ceil((bytes.length + 1) / rate) * rate);
    padded.set(bytes);
    padded[bytes.length] ^= 0x06;
    padded[padded.length - 1] ^= 0x80;
    const s = new Array(25).fill(0n);
    for (let off = 0; off < padded.length; off += rate) {
      for (let i = 0; i < rate / 8; i++) {
        let lane = 0n;
        for (let b = 7; b >= 0; b--) lane = (lane << 8n) | BigInt(padded[off + i * 8 + b]);
        s[i] ^= lane;
      }
      keccakF(s);
    }
    const out = new Uint8Array(32);
    for (let i = 0; i < 32; i++) out[i] = Number((s[i >> 3] >> BigInt(8 * (i & 7))) & 0xffn);
    return out;
  };
})();

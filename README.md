# Hashes & Signatures Lab

Interactive demos for a class talk on cryptographic hash functions and digital signatures. Static site, everything runs in the browser.

1. **Hash playground**: SHA-256, avalanche effect, published-hash check
2. **Collision hunt**: birthday attack on a truncated SHA-256 (any collision vs. matching one message)
3. **Sign & verify**: ECDSA P-256 via Web Crypto, tampering and a forger

No build step. Open `index.html` through any static server (Web Crypto needs `localhost` or HTTPS).

'use strict';
const $ = (id) => document.getElementById(id);
const enc = new TextEncoder();
const hex = (bytes) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
const fmt = (n) => Math.round(n).toLocaleString('en-US');

/* ============ 1. Hash playground ============ */
function hashOf(s) { return hex(sha256(enc.encode(s))); }

function bitDiff(a, b) {
  let n = 0;
  for (let i = 0; i < a.length; i++) {
    let x = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    while (x) { n += x & 1; x >>= 1; }
  }
  return n;
}

function paintHex(el, str, other) {
  el.textContent = '';
  for (let i = 0; i < str.length; i++) {
    if (other && str[i] !== other[i]) {
      const m = document.createElement('mark');
      m.textContent = str[i];
      el.appendChild(m);
    } else {
      el.appendChild(document.createTextNode(str[i]));
    }
  }
}

function updateHash() {
  const a = hashOf($('msgA').value);
  const b = hashOf($('msgB').value);
  const same = a === b;
  paintHex($('hashA'), a, same ? null : b);
  paintHex($('hashB'), b, same ? null : a);
  const bytes = enc.encode($('msgA').value).length;
  $('lenA').textContent = `Input: ${bytes} byte${bytes === 1 ? '' : 's'} → output: 256 bits (${a.length} hex characters)`;
  const diff = bitDiff(a, b);
  $('diffFill').style.width = (diff / 256 * 100) + '%';
  $('diffText').textContent = same
    ? 'Identical messages give identical hashes (0 of 256 bits differ).'
    : `${diff} of 256 bits differ (${(diff / 256 * 100).toFixed(0)}%). Random-looking output flips about half.`;
  checkPublished();
}

function checkPublished() {
  const p = $('published').value.trim().toLowerCase();
  const out = $('checkResult');
  out.className = 'status';
  if (!p) { out.textContent = ''; return; }
  if (p === hashOf($('msgA').value)) {
    out.textContent = '✔ Match: this message is very likely the unchanged original.';
    out.classList.add('ok');
  } else {
    out.textContent = '✘ No match: the message has been changed (or the hash is wrong).';
    out.classList.add('no');
  }
}

$('msgA').addEventListener('input', updateHash);
$('msgB').addEventListener('input', updateHash);
$('published').addEventListener('input', checkPublished);
$('usePublished').addEventListener('click', () => {
  $('published').value = hashOf($('msgA').value);
  checkPublished();
});
updateHash();

/* ============ 2. Collision hunt ============ */
const TARGET = 'Pay Eunice ₱100';
const bitsEl = $('bits');
let worker = null;

const mode = () => document.querySelector('input[name="mode"]:checked').value;
const predicted = (m, bits) => (m === 'collision' ? 2 ** (bits / 2) : 2 ** bits);

function refreshCollisionUI() {
  const m = mode();
  const max = m === 'target' ? 22 : 32;
  bitsEl.max = max;
  if (+bitsEl.value > max) bitsEl.value = max;
  const bits = +bitsEl.value;
  $('bitsLabel').textContent = bits;
  $('bitsOutputs').textContent = `(${fmt(2 ** bits)} possible hashes)`;
  $('predicted').textContent = fmt(predicted(m, bits));
  $('targetBox').hidden = m !== 'target';
}

function stopWorker() {
  if (worker) { worker.terminate(); worker = null; }
  $('run').disabled = false;
  $('stop').disabled = true;
}

$('run').addEventListener('click', () => {
  stopWorker();
  const m = mode();
  const bits = +bitsEl.value;
  $('attempts').textContent = '0';
  $('found').hidden = true;
  $('run').disabled = true;
  $('stop').disabled = false;
  worker = new Worker('worker.js');
  worker.onmessage = (e) => {
    const r = e.data;
    $('attempts').textContent = fmt(r.attempts);
    if (!r.done) return;
    showFound(m, bits, r);
    addHistory(m, bits, r.attempts);
    stopWorker();
  };
  worker.postMessage({ mode: m, bits, target: TARGET });
});

$('stop').addEventListener('click', stopWorker);
bitsEl.addEventListener('input', refreshCollisionUI);
document.querySelectorAll('input[name="mode"]').forEach((r) => r.addEventListener('change', () => {
  stopWorker();
  $('attempts').textContent = '0';
  $('found').hidden = true;
  refreshCollisionUI();
}));

function showFound(m, bits, r) {
  const hashHex = r.hash.toString(16).padStart(Math.ceil(bits / 4), '0');
  const box = $('found');
  box.textContent = '';
  const add = (label, value) => {
    const p = document.createElement('p');
    p.className = 'row2';
    p.append(label + ' ');
    const c = document.createElement('code');
    c.textContent = value;
    p.appendChild(c);
    box.appendChild(p);
  };
  add(m === 'collision' ? 'Message 1:' : 'Target:', r.a);
  add(m === 'collision' ? 'Message 2:' : 'Match found:', r.b);
  add(`Shared ${bits}-bit hash:`, hashHex);
  const note = document.createElement('p');
  note.className = 'meta';
  note.textContent = `${fmt(r.attempts)} attempts in ${(r.ms / 1000).toFixed(2)} s. Predicted around ${fmt(predicted(m, bits))}.`;
  box.appendChild(note);
  box.hidden = false;
}

function addHistory(m, bits, attempts) {
  $('history').hidden = false;
  const tr = document.createElement('tr');
  [m === 'collision' ? 'Any collision' : 'Match one message', bits, fmt(attempts), '≈ ' + fmt(predicted(m, bits))]
    .forEach((v) => { const td = document.createElement('td'); td.textContent = v; tr.appendChild(td); });
  $('history').querySelector('tbody').prepend(tr);
}
refreshCollisionUI();

/* ============ 3. Sign, verify, tamper ============ */
const ALG = { name: 'ECDSA', namedCurve: 'P-256' };
const SIGN = { name: 'ECDSA', hash: 'SHA-256' };
let eunice = null;       // CryptoKeyPair
let signature = null;    // Uint8Array
let forger = null;       // { pair, sig }
let verifyToken = 0;

const subtle = window.crypto && window.crypto.subtle;
if (!subtle) {
  $('genKeys').disabled = true;
  $('genKeys').textContent = 'Needs HTTPS (Web Crypto unavailable)';
}

function setBadge(el, ok, text) {
  el.className = 'badge ' + (ok ? 'ok' : 'no');
  el.textContent = text;
}

$('genKeys').addEventListener('click', async () => {
  eunice = await subtle.generateKey(ALG, true, ['sign', 'verify']);
  const raw = new Uint8Array(await subtle.exportKey('raw', eunice.publicKey));
  $('pubKey').textContent = hex(raw);
  $('keyBox').hidden = false;
  $('signMsg').disabled = false;
  $('signBtn').disabled = false;
  $('genKeys').textContent = 'Generate new keys';
  resetSignature();
});

function resetSignature() {
  signature = null;
  forger = null;
  $('sigBox').hidden = true;
  $('forgeBox').hidden = true;
  $('forgeBtn').disabled = true;
  $('recvMsg').disabled = true;
  $('recvMsg').value = '';
  const v = $('verifyResult');
  v.className = 'badge idle';
  v.textContent = 'Waiting for a signature';
}

$('signBtn').addEventListener('click', async () => {
  const msg = $('signMsg').value;
  signature = new Uint8Array(await subtle.sign(SIGN, eunice.privateKey, enc.encode(msg)));
  $('sigOut').textContent = hex(signature);
  $('sigBox').hidden = false;
  $('recvMsg').disabled = false;
  $('recvMsg').value = msg;
  $('forgeBtn').disabled = false;
  $('forgeBox').hidden = true;
  forger = null;
  verifyReceived();
});

async function verifyReceived() {
  if (!signature) return;
  const token = ++verifyToken;
  const ok = await subtle.verify(SIGN, eunice.publicKey, signature, enc.encode($('recvMsg').value));
  if (token !== verifyToken) return;
  setBadge($('verifyResult'), ok, ok ? '✔ VALID: from Eunice, unchanged' : '✘ INVALID: altered, or not signed by Eunice');
  if (forger) forgeCheck();
}
$('recvMsg').addEventListener('input', verifyReceived);

$('forgeBtn').addEventListener('click', async () => {
  const pair = await subtle.generateKey(ALG, true, ['sign', 'verify']);
  forger = { pair };
  $('forgeBox').hidden = false;
  await forgeCheck(true);
});

async function forgeCheck(resign) {
  if (!forger) return;
  const data = enc.encode($('recvMsg').value);
  // The forger signs whatever message the receiver is looking at, with the forger's own key.
  if (resign || !forger.sig || forger.msg !== $('recvMsg').value) {
    forger.sig = new Uint8Array(await subtle.sign(SIGN, forger.pair.privateKey, data));
    forger.msg = $('recvMsg').value;
  }
  const vsEunice = await subtle.verify(SIGN, eunice.publicKey, forger.sig, data);
  const vsForger = await subtle.verify(SIGN, forger.pair.publicKey, forger.sig, data);
  setBadge($('forgeVsEunice'), vsEunice, vsEunice ? '✔ VALID' : '✘ INVALID');
  setBadge($('forgeVsForger'), vsForger, vsForger ? '✔ VALID' : '✘ INVALID');
}

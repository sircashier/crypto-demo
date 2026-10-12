# Demo Script: what to say and do

Total: about 10 minutes. Text in *italics* is what you say. **Do** lines are what you click. Say it in your own words; these are prompts, not a recital.

## Opening (30 sec)

*"Two questions run through this whole talk. First: has this data been changed? Second: who actually sent it? Hashes answer the first one. Signatures answer both. Everything here runs in your browser, nothing is sent anywhere."*

## Demo 1: Hash playground (3 min)

**Do:** Leave the algorithm on SHA-256. Point at the message "Hello, Cryptology!" and its hash.

*"A hash function takes any input and gives back a fixed-size fingerprint: 256 bits, shown as 64 hex characters. Same input, always the same hash."*

**Do:** Look at the "Compare with" box (differs by one letter, c vs C).

*"These two messages differ by a single letter. Look at the hashes. Nothing alike. The highlighted characters are the ones that differ."*

**Do:** Point at the bar.

*"About half the bits flipped, roughly 128 out of 256. That's the avalanche effect: a tiny change makes a completely different, random-looking output. You can't tell from the hash how close two messages were."*

**Do:** Paste a whole paragraph into the first box.

*"Any length in, same size out. A single word or a whole book gives 64 characters."*

**Do:** Switch the dropdown to SHA3-256.

*"SHA-256 is from the SHA-2 family. SHA-3 is a newer family built a different way. Different hash, same behavior: fixed size, same input gives same output, one letter changes everything."*

**Do:** Switch back to SHA-256. Click "Pretend the hash of the message above is the published one", then edit the message.

*"This is data integrity. Imagine a website publishes the hash next to a download. I compute the hash of my copy and compare. Match: unchanged. Now I change one character... and it fails. That's how a published checksum protects a download."*

**Transition:** *"But notice the catch: a hash can't tell me who published it. An attacker could swap the file and the hash together. Hold that thought for demo 3. First, how safe are hashes?"*

## Demo 2: Collision hunt (3-4 min)

*"A collision is two different inputs with the same hash. They must exist, since there are endless inputs and a limited number of hashes. The real question is whether anyone can find one. If they can, a signature on a harmless file would also vouch for a fake."*

*"We can't break real SHA-256, so we shrink it to the first n bits and attack that."*

**Do:** Mode "any two", slider at 16 bits, press Run.

*"At 16 bits there are about 65,000 possible hashes. The program hashes random messages and stops when two different ones match."*

**Do:** When it finishes, point at Attempts vs Predicted.

*"It took around 300 tries, not 65,000. That's the birthday paradox: in a room of 23 people there's better than a 50% chance two share a birthday. We're comparing everyone against everyone, not against one person. Hashes work the same way, so a collision appears after about 2 to the n over 2 tries."*

**Do:** Switch to "Match one specific message" at the same size. Run.

*"Now the attacker needs a match for one specific message, like 'Pay Eunice ₱100'. That's like finding someone with your birthday: far harder. About 2 to the n tries, in the tens of thousands here."*

**Do:** Check the "Your runs" table.

*"Same hash size, very different effort. Your numbers will differ from your neighbor's since the messages are random. 'Around' is the right word."*

**Do:** Drag the slider up a few bits and run again (stay at 24 or below for time).

*"Every extra bit makes it harder. Now scale up: real SHA-256 has n = 256. A collision needs about 2 to the 128 tries. No computer on Earth gets there. That's why we trust it."*

**Transition:** *"So hashes detect changes, and real ones can't be fooled. But we still don't know who sent it. That's what signatures add."*

## Demo 3: Sign, verify, tamper (3-4 min)

**Do:** Click "Generate Eunice's keys".

*"Eunice makes a key pair. The public key is shared with everyone. The private key never leaves her."*

**Do:** Click "Sign with private key" on "Pay Eunice ₱100".

*"She signs the message. Behind the scenes: hash the message, then sign that hash with her private key. The message isn't hidden. It travels together with the signature."*

**Do:** Point at the green "VALID" result.

*"The receiver hashes what they got and checks the signature against it with Eunice's public key. Match means valid: it's from Eunice and unchanged."*

**Do:** In the receiver box, change ₱100 to ₱999.

*"Now I'm the attacker, changing the amount in transit. Instantly invalid. One character changes the hash, so the check fails. That's integrity."*

**Do:** Click "Forge a signature".

*"Now I'm the forger. I sign the message with my own key instead. Checked against Eunice's public key: invalid. It only verifies under my key. Only Eunice's private key makes signatures her public key accepts. That's authentication."*

**Closing line:** *"A hash told us whether the data changed. A signature also tells us who signed it, and since only she holds the key, she can't easily deny it. That's non-repudiation."*

## Likely questions

- **"Why not just encrypt the hash?"** Textbooks describe it that way. This demo uses ECDSA on the P-256 curve, which is a sign/verify operation instead.
- **"Is SHA-256 broken?"** No known collisions. The demo only breaks a deliberately shrunk version.
- **"SHA-2 vs SHA-3?"** Both are secure standards. SHA-3 (Keccak) has a different internal design, so a break in one is unlikely to carry over.
- **"Is my input sent anywhere?"** No, all in the browser.

## Before you start

- Serve via `localhost` or HTTPS (Web Crypto won't work from `file://`).
- Do a dry run of demo 2 at 16 bits to check timing.

# Sarathi Learning Library - Resources to Verify & Excluded Candidates

This document tracks learning resource candidates that were reviewed during the Learning Library Expansion. In strict adherence to Sarathi's content verification policy, **no unverified or broken YouTube video/playlist IDs or URLs are allowed into the database seeds**.

Every item currently present in [`server/src/data/seeds/resourceCatalog.js`](file:///c:/Users/Nishant/Documents/SARATHI/server/src/data/seeds/resourceCatalog.js) has been verified via the automated validation suite (`npm run validate:resources`), which confirms:
1. HTTP 200/300 responses for all documentation, handbook, and interactive web platforms.
2. Official YouTube oEmbed (`https://www.youtube.com/oembed`) status 200 for all individual video IDs.
3. YouTube playlist page availability for all playlist IDs.

---

## 1. Verified Catalog Summary
- **Total Seeded Resources**: 81
- **Domain Coverage**:
  - Frontend & Web Development (`dom-frontend`): 19 resources
  - Backend & System Design (`dom-backend`): 16 resources
  - AI & Machine Learning (`dom-aiml`): 17 resources
  - Cloud & DevOps (`dom-clouddevops`): 14 resources
  - Cybersecurity (`dom-cybersecurity`): 15 resources
- **Format Breakdown**:
  - Videos (In-App YouTube Embeds): 42
  - Playlists (Multi-video YouTube Courses): 5
  - Interactive Laboratories: 9
  - Official Handbooks: 5
  - Official Documentation Guides: 20
- **Total Video / Playlist Items**: 47 (Exceeds the requirement of 36+)

---

## 2. Excluded Candidates (Failed oEmbed or Delisted)
The following YouTube IDs were evaluated as candidates during research but failed oEmbed checks (returned HTTP 404 or private/unembeddable) and were strictly excluded from the active seed:

| Candidate ID | Purported Topic | Channel | Failure Reason | Verified Replacement |
|---|---|---|---|---|
| `dGcsHMXbSOA` | CS50's Introduction to AI with Python | CS50 | 404 (Delisted/Removed from YouTube) | Replaced with Harvard CS50x Official Course (`w8671v-X12s` & CS50 edX/web links) |
| `fBNz54P4jbw` | Python for Beginners Full Course | freeCodeCamp.org | 404 (ID no longer active) | Replaced with Programming with Mosh Python (`_uQrJ0TkZlc`) |
| `iLWTnMzWJ5o` | Kubernetes Crash Course | freeCodeCamp.org | 404 (Delisted by channel) | Replaced with TechWorld with Nana Kubernetes Course (`X48VuDVv0do`) |
| `sWbGOq-8Nqw` | Linux Terminal & Command Line | freeCodeCamp.org | 404 (Old upload removed) | Replaced with freeCodeCamp.org 50 Linux Commands (`ZtqBQ68cfJc`) |

---

## 3. Backlog for Future Verification
The following topics and candidate creators are queued for future phases once direct channel API access or human inspection verifies embeddable IDs:

1. **Hussein Nasser - Database Internals & Connection Pooling**
   - *Topic*: Backend Engineering & Database Architecture
   - *Target Domain*: `dom-backend`
   - *Action Required*: Verify specific embed-permitted video IDs for PostgreSQL ACID and connection pool mechanics.

2. **Computerphile - Cryptographic Primitives & RSA**
   - *Topic*: Public Key Cryptography & Hashing Algorithms
   - *Target Domain*: `dom-cybersecurity`
   - *Action Required*: Extract verified embed-safe video IDs for AES, RSA, and SHA-256 explainers.

3. **Sentdex - Neural Networks from Scratch**
   - *Topic*: Pure Python Neural Network Forward/Backward Pass
   - *Target Domain*: `dom-aiml`
   - *Action Required*: Verify full playlist link availability without region locks.

4. **LiveOverflow - Web & Binary Exploitation Fundamentals**
   - *Topic*: Buffer Overflow & Memory Corruption Basics
   - *Target Domain*: `dom-cybersecurity`
   - *Action Required*: Verify playlist embeddability under YouTube education embed terms.

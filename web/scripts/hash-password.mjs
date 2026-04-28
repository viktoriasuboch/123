#!/usr/bin/env node
// Usage:
//   node scripts/hash-password.mjs '<plaintext password>'
//   echo '<plaintext>' | node scripts/hash-password.mjs
//
// Prints an argon2id hash suitable for SECTION_*_HASH env vars.

import argon2 from "argon2";
import { stdin } from "node:process";

async function readStdin() {
  let data = "";
  for await (const chunk of stdin) data += chunk;
  return data.trim();
}

const arg = process.argv[2];
const plain = arg ?? (await readStdin());

if (!plain) {
  console.error("Usage: node scripts/hash-password.mjs '<password>'");
  process.exit(1);
}

const hash = await argon2.hash(plain, {
  type: argon2.argon2id,
  memoryCost: 19456, // 19 MiB (OWASP 2024 baseline)
  timeCost: 2,
  parallelism: 1,
});

process.stdout.write(hash + "\n");

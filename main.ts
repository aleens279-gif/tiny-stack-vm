// tiny-stack-vm: interpreter for make.fun's tiny stack ISA v1. Reads every
// /input/<id>/program.bin + input.bin, writes /output/<id>/stdout.bin and
// exit.txt. 32-bit wrapping ints, 256-value data stack, 64-entry call stack,
// 256 words of memory, 1e6 steps, 64 KiB output. Traps keep prior output:
// 2 underflow, 3 overflow, 4 div by zero, 5 bad opcode, 6 bad memory, 7 call
// depth, 8 empty RET, 9 pc out of range / cut immediate, 10 steps, 11 output.
// Checks run in the ISA's order: steps, pc, opcode, immediate, underflow,
// overflow, then the instruction's own traps and effect.
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const SM = 256, CM = 64, MW = 256, SL = 1e6, OM = 65536;

// [byte, immediate bytes, pops, pushes] packed as (imm<<4)|(pops<<2)|pushes;
// -1 means no such opcode.
const OPS: Array<[number, number, number, number]> = [
[0,0,0,0],[1,1,0,1],[2,4,0,1],[3,0,1,0],[4,0,1,2],[5,0,2,2],[6,0,2,3],[7,0,3,3],
[16,0,2,1],[17,0,2,1],[18,0,2,1],[19,0,2,1],[20,0,2,1],[21,0,2,1],[22,0,2,1],[23,0,1,1],
[24,0,2,1],[25,0,2,1],[26,0,2,1],[27,0,1,1],[28,0,2,1],[29,0,2,1],[30,0,2,1],[32,0,2,1],
[33,0,2,1],[34,0,2,1],[48,2,0,0],[49,2,1,0],[50,2,1,0],[51,2,0,0],[52,0,0,0],[64,0,1,1],
[65,0,2,0],[80,0,1,0],[81,0,1,0],[82,0,0,1],[83,0,1,0]];
const META = new Int8Array(256).fill(-1);
for (const [op, imm, pops, pushes] of OPS) META[op] = (imm << 4) | (pops << 2) | pushes;

function run(prog: Uint8Array, input: Uint8Array): { out: Uint8Array; code: number } {
  const D = new Int32Array(SM), C = new Int32Array(CM), M = new Int32Array(MW);
  const out = new Uint8Array(OM);
  let sp = 0, cp = 0, olen = 0, ip = 0, pc = 0, steps = 0;
  const end = (code: number) => ({ out: out.subarray(0, olen), code });
  for (;;) {
    if (steps === SL) return end(10);
    if (pc < 0 || pc >= prog.length) return end(9);
    const op = prog[pc], meta = META[op];
    if (meta < 0) return end(5);
    const imm = meta >> 4;
    if (pc + imm >= prog.length) return end(9);
    steps++;
    const pops = (meta >> 2) & 3, pushes = meta & 3;
    if (sp < pops) return end(2);
    if (sp - pops + pushes > SM) return end(3);
    const next = pc + 1 + imm;
    pc = next;
    if (op === 23) { D[sp - 1] = -D[sp - 1] | 0; continue; } // NEG
    if (op === 27) { D[sp - 1] = ~D[sp - 1]; continue; } // NOT
    if (op >= 16 && op <= 34) { // two-operand arithmetic / compare / shift
      const b = D[sp - 1], a = D[sp - 2];
      let r = 0;
      if (op === 16) r = (a + b) | 0;
      else if (op === 17) r = (a - b) | 0;
      else if (op === 18) r = Math.imul(a, b);
      else if (op === 19) {
        if (b === 0) return end(4);
        r = a === -2147483648 && b === -1 ? a : (a / b) | 0;
      } else if (op === 20) {
        if (b === 0) return end(4);
        r = b === -1 ? 0 : (a % b) | 0;
      } else if (op === 21) {
        if (b === 0) return end(4);
        r = Math.floor((a >>> 0) / (b >>> 0)) | 0;
      } else if (op === 22) {
        if (b === 0) return end(4);
        r = ((a >>> 0) % (b >>> 0)) | 0;
      } else if (op === 24) r = a & b;
      else if (op === 25) r = a | b;
      else if (op === 26) r = a ^ b;
      else if (op === 28) r = a << (b & 31);
      else if (op === 29) r = a >> (b & 31);
      else if (op === 30) r = (a >>> (b & 31)) | 0;
      else if (op === 32) r = a === b ? 1 : 0;
      else if (op === 33) r = a < b ? 1 : 0;
      else if (op === 34) r = (a >>> 0) < (b >>> 0) ? 1 : 0;
      sp -= 2;
      D[sp++] = r;
      continue;
    }
    if (op === 48 || op === 49 || op === 50) { // JMP / JZ / JNZ
      const rel = ((prog[next - 2] | (prog[next - 1] << 8)) << 16) >> 16;
      let take = op === 48;
      if (!take) {
        const v = D[--sp];
        take = op === 49 ? v === 0 : v !== 0;
      }
      if (take) pc = next + rel;
      continue;
    }
    if (op === 51) { // CALL
      if (cp === CM) return end(7);
      C[cp++] = next;
      pc = prog[next - 2] | (prog[next - 1] << 8);
      continue;
    }
    if (op === 52) { // RET
      if (cp === 0) return end(8);
      pc = C[--cp];
      continue;
    }
    switch (op) {
      case 0: return end(0); // HALT
      case 1: D[sp++] = (prog[next - 1] << 24) >> 24; break; // PUSH8, sign-extended
      case 2: D[sp++] = prog[next - 4] | (prog[next - 3] << 8) | (prog[next - 2] << 16) | (prog[next - 1] << 24); break; // PUSH32
      case 3: sp--; break; // POP
      case 4: D[sp] = D[sp - 1]; sp++; break; // DUP
      case 5: { const t = D[sp - 1]; D[sp - 1] = D[sp - 2]; D[sp - 2] = t; break; } // SWAP
      case 6: D[sp] = D[sp - 2]; sp++; break; // OVER
      case 7: { const a = D[sp - 3]; D[sp - 3] = D[sp - 2]; D[sp - 2] = D[sp - 1]; D[sp - 1] = a; break; } // ROT
      case 64: { const addr = D[sp - 1]; if (addr < 0 || addr >= MW) return end(6); D[sp - 1] = M[addr]; break; } // LOAD
      case 65: { const addr = D[sp - 1], v = D[sp - 2]; if (addr < 0 || addr >= MW) return end(6); sp -= 2; M[addr] = v; break; } // STORE
      case 80: { const s = String(D[sp - 1]); if (olen + s.length > OM) return end(11); sp--; for (let i = 0; i < s.length; i++) out[olen++] = s.charCodeAt(i); break; } // PRINT
      case 81: if (olen + 1 > OM) return end(11); out[olen++] = D[--sp] & 255; break; // PUTC
      case 82: D[sp++] = ip < input.length ? input[ip++] : -1; break; // IN
      case 83: return end(D[--sp] & 255); // EXIT
    }
  }
}

const I = process.env.MAKEFUN_INPUT_DIR ?? "/input";
const O = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
const read = (p: string): Uint8Array => {
  try { return readFileSync(p); } catch { return new Uint8Array(0); }
};
for (const id of readdirSync(I).sort()) {
  const { out, code } = run(read(join(I, id, "program.bin")), read(join(I, id, "input.bin")));
  mkdirSync(join(O, id), { recursive: true });
  writeFileSync(join(O, id, "stdout.bin"), out);
  writeFileSync(join(O, id, "exit.txt"), `${code}\n`);
}

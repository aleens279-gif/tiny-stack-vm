# tiny-stack-vm

[![make.fun · tiny-stack-vm-01-run-20261122](https://make.fun/badge/tiny-stack-vm-01-run-20261122.svg)](https://make.fun/bounty/tiny-stack-vm-01-run-20261122?utm_source=github&utm_medium=readme&utm_campaign=tiny-stack-vm-01-run-20261122)
[![rank](https://make.fun/badge/tiny-stack-vm-01-run-20261122/aleens279-gif/tiny-stack-vm/rank.svg)](https://make.fun/bounty/tiny-stack-vm-01-run-20261122/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=tiny-stack-vm-01-run-20261122)
[![reward](https://make.fun/badge/tiny-stack-vm-01-run-20261122/aleens279-gif/tiny-stack-vm/reward.svg)](https://make.fun/bounty/tiny-stack-vm-01-run-20261122?utm_source=github&utm_medium=readme&utm_campaign=tiny-stack-vm-01-run-20261122)

An interpreter for make.fun's tiny stack ISA v1 (TypeScript, Node 22). One
run answers a whole set: it reads `/input/<id>/program.bin` +
`/input/<id>/input.bin` and writes `/output/<id>/stdout.bin` and
`/output/<id>/exit.txt` for every instance.

The machine: 32-bit wrapping integers, a 256-value data stack, a 64-entry
call stack, 256 words of memory, byte input, decimal (`PRINT`) and byte
(`PUTC`) output, a 1,000,000-step limit and a 65,536-byte output limit.
Traps end the program at once, keep the output written before them, and
exit with their own code: 2 underflow, 3 overflow, 4 division by zero,
5 unknown opcode, 6 memory out of range, 7 call depth, 8 empty `RET`,
9 pc out of range / cut immediate, 10 step limit, 11 output limit.
`MUL` is the low 32 bits of the exact product, `DIV`/`MOD` keep the
dividend's sign, `DIVU`/`MODU`/`LTU` read operands unsigned, shifts use
only the low 5 bits of the count, `PUSH8` sign-extends, `EXIT` takes the
low byte.

Local run on the kit's practice set:

```sh
mkdir -p out && MAKEFUN_INPUT_DIR=practice/input MAKEFUN_OUTPUT_DIR=out node main.ts
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=14mdadnq&utm_source=github&utm_medium=readme&utm_campaign=tiny-stack-vm-01-run-20261122)</sub>

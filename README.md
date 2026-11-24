# tiny-stack-vm

An interpreter for make.fun's tiny stack ISA v1 (TypeScript, Node 22). One
run answers a whole set: it reads `/input/<id>/program.bin` +
`/input/<id>/input.bin` and writes `/output/<id>/stdout.bin` and
`/output/<id>/exit.txt` for every instance.

The machine: 32-bit wrapping integers, a 256-value data stack, a 64-entry
call stack, 256 words of memory, a 1,000,000-step limit and a 65,536-byte
output limit. Traps exit with their own code: 2 underflow, 3 overflow,
4 division by zero, 5 unknown opcode, 6 memory out of range, 7 call
depth, 8 empty `RET`, 9 pc out of range, 10 step limit, 11 output limit.

```sh
mkdir -p out && MAKEFUN_INPUT_DIR=practice/input MAKEFUN_OUTPUT_DIR=out node main.ts
```

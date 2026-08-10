---
layout: post
title: "From Variables to Vulnerabilities: Understanding Stack Buffer Overflow Attacks"
date: 2026-08-07
author: "Nishant Patel"
excerpt: "Learn how stack buffer overflow vulnerabilities occur, why they happen, and how attackers exploit them. A beginner-friendly deep dive into one of the most famous software security vulnerabilities."
cover_image: /assets/images/blog/buffer-overflow/cover.png
series: "Memory Management & Buffer Overflow"
series_part: 2
tags:
  - Cybersecurity
  - Buffer Overflow
  - Memory Safety
  - Stack
  - C
  - Secure Programming
  - Exploit Development
---

> **Part 2 of a 2-part series on Memory Management and Buffer Overflow Vulnerabilities**

In the [previous article](/blog/2026/07/23/inside-your-computers-memory), we explored how a running C program organizes memory. We learned that every function call creates a **stack frame** containing local variables, function parameters, bookkeeping information, and the return address.

At first glance, this organization seems perfectly reasonable. But it also introduces one of the oldest—and most dangerous—software vulnerabilities ever discovered. A single programming mistake can allow an attacker to overwrite memory they were never supposed to access. In the worst case, they can redirect the program's execution and run their own malicious code.

This vulnerability is known as a **stack buffer overflow**.

In 1988, the **Morris Worm**—one of the first internet worms—exploited exactly this kind of vulnerability in the Unix `fingerd` service. The vulnerable function? `gets()`. The same function we'll examine in this article. Three decades later, buffer overflows remain in the [CWE Top 25](https://cwe.mitre.org/top25/archive/2025/2025_cwe_top25.html) most dangerous software weaknesses (CWE-787: Out-of-bounds Write).

In this article, we'll understand:

- What a buffer really is
- Why stack buffer overflows occur
- How an overflow reaches the return address
- How attackers find the exact offset and craft exploits
- What shellcode and NOP sleds are
- How modern defenses protect against these attacks
- Why languages like Python and Rust are naturally resistant
- How to write code that avoids buffer overflows entirely

---

## Table of Contents

1. [Recap: The Stack Frame](#recap-the-stack-frame)
2. [What Is a Buffer?](#what-is-a-buffer)
3. [The Vulnerable Program](#the-vulnerable-program)
4. [What Happens During the Overflow](#what-happens-during-the-overflow)
5. [Why the Return Address Matters](#why-the-return-address-matters)
6. [Finding the Overflow Offset](#finding-the-overflow-offset)
7. [Controlling the Return Address](#controlling-the-return-address)
8. [Shellcode and NOP Sleds](#shellcode-and-nop-sleds)
9. [Modern Defenses](#modern-defenses)
10. [Why Python Doesn't Have This Problem](#why-python-doesnt-have-this-problem)
11. [Writing Secure Code](#writing-secure-code)
12. [The Evolution of Buffer Overflow Exploits](#the-evolution-of-buffer-overflow-exploits)
13. [Key Takeaways](#key-takeaways)

---

## Recap: The Stack Frame

Before we can understand a buffer overflow, let's briefly revisit what happens during a function call. Consider the following program:

```c
#include <stdio.h>

int add(int a, int b)
{
    int sum = a + b;
    return sum;
}

int main()
{
    int result = add(3, 4);
    printf("%d\n", result);
}
```

When `main()` calls `add()`, the compiler-generated prologue instructions build a new stack frame. (Recall from Part 1 that the `call` instruction pushes the return address, then the prologue saves the base pointer and reserves space for locals.)

![Figure 1: Anatomy of a Stack Frame & Function Call](/assets/images/blog/buffer-overflow/figure-1.png)

Every local variable inside the function is stored together inside this stack frame. When the function returns, the entire frame disappears automatically. This design is simple, efficient, and extremely fast.

Unfortunately, it's also where the vulnerability begins.

---

## What Is a Buffer?

A buffer is simply a reserved block of memory used to temporarily store data. For example:

```c
char name[16];
```

creates a buffer capable of holding up to **15 characters plus a null terminator** (16 bytes total). Think of it like a row of 16 mailboxes—each mailbox holds exactly one byte. If someone tries to place a 17th byte, where should it go?

Ideally, nowhere. Unfortunately, nothing in the compiled C program records where the buffer ends—C emits no bounds check and keeps no size metadata at runtime.

---

### A Safe Example

Suppose we write:

```c
char name[8];
```

and the user enters `Alice`. Memory now holds the 5 characters followed by `\0`, leaving remaining bytes untouched.

---

### An Unsafe Example

Now suppose the user enters `Christopher`, which requires 12 bytes (11 characters + null terminator)—far more than our 8-byte buffer can hold.

![Figure 2: Safe String Storage vs. Buffer Overflow](/assets/images/blog/buffer-overflow/figure-2.png)

The extra bytes spill past the buffer's boundary. Those memory locations might contain another variable, the saved base pointer, or the function's return address. This is the beginning of a **buffer overflow**.

---

## The Vulnerable Program

Consider the following C program:

```c
#include <stdio.h>

void vulnerable()
{
    char buffer[16];

    printf("Enter some text: ");

    gets(buffer);
}

int main()
{
    vulnerable();

    printf("Program finished normally.\n");
}
```

At first glance, nothing looks suspicious—we simply ask the user to enter some text. The problem lies in one function call:

```c
gets(buffer);
```

Unlike safer input functions, `gets()` has **no idea how large the buffer is**. It keeps reading characters until it encounters a newline, performing **no bounds checking whatsoever**. If the user types 10 characters, everything is fine. If they type 100 characters, `gets()` will happily write all 100 bytes into memory, overwriting whatever comes after the buffer.

For this reason, `gets()` was officially removed from the C Standard Library in C11. It is considered fundamentally unsafe. This is the same function that the **1988 Morris Worm** exploited in Unix's `fingerd` daemon—the first major internet worm, which infected roughly 10% of all internet-connected computers.

---

## What Happens During the Overflow

When input exceeds 16 bytes, the extra bytes overwrite memory that belongs to the function's bookkeeping—first the saved base pointer, and then the return address:

![Figure 3: Stack Memory Overwritten During a Buffer Overflow](/assets/images/blog/buffer-overflow/figure-3.png)

The program no longer knows where to return. The original return address has been replaced with `0x41414141`—the hexadecimal representation of four `A` characters.

---

## Why the Return Address Matters

Recall what we learned in Part 1: whenever a function is called, the `call` instruction automatically pushes the address of the next instruction onto the stack. When the function finishes, the `ret` instruction pops this address and jumps to it—returning execution to the caller.

The `ret` instruction doesn't magically know where to go. It simply pops whatever value is on top of the stack and treats it as an address:

```
Pop address from stack → Jump there
```

Normally, this returns execution back to `main()`. But if a buffer overflow has replaced the return address with `0x41414141`, the CPU tries to fetch instructions from that address. Since `0x41414141` is almost certainly not mapped into the process's memory, the MMU (Memory Management Unit) raises a page fault and the operating system terminates the program with a **segmentation fault**:

```
Program received signal SIGSEGV
EIP = 0x41414141
```

This crash is one of the most recognizable signs of a successful buffer overflow. It means the attacker has reached the instruction pointer. The crash is no longer random—the attacker now controls **where the program tries to execute next.**

---

## Finding the Overflow Offset

Crashing the program proves that the return address can be overwritten, but to build a working exploit, the attacker needs to know the **exact number of bytes** between the start of the buffer and the return address.

The stack frame contains more than just the buffer—there's also the saved base pointer, possible compiler-inserted padding, and alignment bytes. So the offset is rarely just `sizeof(buffer)`.

### Trial and Error

The simplest approach: send increasingly long strings of `A`s until the program crashes. But this only tells you that *something* was overwritten—not precisely *which* bytes hit the return address.

### Cyclic Patterns

A much better technique is to send a **unique cyclic pattern** where every 4-byte (or 8-byte) subsequence is unique:

```
Aa0Aa1Aa2Aa3Ba0Ba1Ba2Ba3Ca0Ca1...
```

Suppose the program crashes with:

```
EIP = 0x35614134
```

Since x86 processors are **little-endian** (the least significant byte is stored at the lowest address), these bytes appear in memory as:

```
Memory:  34 41 61 35
ASCII:    4  A  a  5   →  "4Aa5"
```

By searching for `4Aa5` in the generated pattern, we determine the exact offset. Tools like **pwntools** (`cyclic` / `cyclic_find`) or **Metasploit** (`msf-pattern_create` / `msf-pattern_offset`) automate this process.

> **Little-endian recap:** On x86, the value `0x35614134` is stored in memory as bytes `34 41 61 35` (reversed). This matters every time you construct an address in a payload—you must write it backwards.

---

## Controlling the Return Address

Suppose we've determined that the return address begins after **44 bytes** of input. Our payload is now structured as:

```
[44 bytes of padding] + [4 bytes: new return address]
```

If we place `0x42424242` ("BBBB") at offset 44, the CPU will attempt to jump to that address when the function returns. We've progressed from *"the program crashes"* to *"the attacker controls where execution goes."* That is an enormous milestone.

### Where Should Execution Go?

Simply jumping to `0x42424242` isn't useful—the attacker wants the CPU to execute **their own instructions**. One classic approach: place those instructions inside the input buffer itself, then set the return address to point back into the buffer.

---

## Shellcode and NOP Sleds

### What Is Shellcode?

**Shellcode** is a small sequence of hand-crafted machine instructions. Historically, many exploits used it to spawn a command shell (hence the name). Modern shellcode can:

- Spawn a shell (`/bin/sh`)
- Download and execute malware
- Open a reverse TCP connection back to the attacker
- Read sensitive files

Shellcode is carefully written in assembly to remain as compact as possible—often just a few dozen bytes.

### The Problem With Exact Addresses

The attacker wants execution to land precisely at the start of their shellcode. But memory addresses aren't always perfectly predictable—missing by even a few bytes causes the CPU to interpret data as instructions, resulting in a crash.

### The NOP Sled

A **NOP** (No Operation) instruction tells the CPU: *"Do nothing, move to the next instruction."* Its machine code on x86 is `0x90`.

Instead of requiring a precise landing, the attacker fills memory with hundreds of NOP instructions *before* the shellcode. This creates a **NOP sled**—imagine sliding down a playground slide. It doesn't matter where you land on the slide; you'll always reach the bottom. The CPU behaves the same way: it executes NOP after NOP until it slides into the shellcode.

![Figure 4: Anatomy of a Classic Exploit Payload (NOP Sled & Shellcode)](/assets/images/blog/buffer-overflow/figure-4.png)

The attack unfolds:

1. Input exceeds the buffer, overwriting the return address.
2. The function executes `ret`, jumping to the overwritten address.
3. Execution lands somewhere in the NOP sled.
4. The CPU slides through NOPs into the shellcode.
5. The attacker gains control.

This is the classic stack buffer overflow exploit that dominated software security throughout the 1990s and early 2000s.

### Reproducing the Classic Exploit

To reproduce this on a modern system, you'd need to deliberately disable protections:

```bash
gcc -m32 -fno-stack-protector -z execstack -no-pie vuln.c -o vuln
setarch $(uname -m) -R ./vuln   # disable ASLR for this process
```

Each flag disables a specific defense we'll cover next. The fact that you need *all four flags* shows how many layers modern systems have added.

---

## Modern Defenses

If exploiting buffer overflows were still this straightforward, every C program would be vulnerable. Modern operating systems learned from decades of attacks and now include **multiple layers of defense**. Think of them like safety features in a modern car—seatbelts, airbags, and automatic braking don't prevent accidents, but together they dramatically reduce the damage.

![Figure 5: Modern Defenses Against Buffer Overflows](/assets/images/blog/buffer-overflow/figure-5.png)

### Stack Canaries

Imagine placing a fragile glass ornament in front of a safe. Anyone trying to reach the safe must first break the ornament—immediately revealing the intrusion.

A **stack canary** works the same way. During compilation, the compiler inserts a random value between local buffers and the saved base pointer. Before the function returns, the compiler checks whether the canary still matches its original value. If an overflow has corrupted it, the program immediately terminates:

```
*** Stack Smashing Detected ***
Aborted
```

The attacker never reaches the `ret` instruction. Enabled by default with GCC's `-fstack-protector` flag.

### Non-Executable Stack (NX / DEP)

Early operating systems allowed programs to execute code from almost anywhere in memory, making shellcode injection straightforward. Modern processors include the **NX (No eXecute) bit**—also called **DEP (Data Execution Prevention)** on Windows—which marks memory pages as either writable *or* executable, but not both.

The stack is marked as readable and writable, but **not executable**. Even if shellcode is successfully injected, the CPU refuses to execute it, raising an exception instead. This completely breaks the classic "jump back into the buffer" attack.

### Address Space Layout Randomization (ASLR)

Suppose an attacker knows their shellcode resides at `0xbffff240`. They overwrite the return address with that value—and the exploit works. Now imagine the operating system loads the program at a **different location every time it runs**:

```
First run:    Stack at 0xbffff240
Second run:   Stack at 0xbfed8710
Third run:    Stack at 0xbf9a43c0
```

ASLR randomizes the locations of the stack, heap, shared libraries, and (with PIE) the executable itself. The attacker no longer knows where anything is located, making traditional exploits unreliable.

> **Note:** ASLR re-randomizes on every program execution (`exec()`), not just on reboot. This is distinct from KASLR (kernel ASLR), which typically randomizes once per boot.

### Position Independent Executables (PIE)

ASLR works best when the executable itself can also move. Older programs were always loaded at the same fixed address (e.g., `0x08048000`). **PIE** allows the executable's code and data to be loaded at a random base address, extending ASLR's protection to the entire application rather than just its libraries.

### RELRO (Relocation Read-Only)

Attackers eventually realized: *"If we can't overwrite the return address, maybe we can overwrite function pointers instead."* One attractive target is the **Global Offset Table (GOT)**, which stores addresses of dynamically linked library functions like `printf()` and `system()`. If an attacker overwrites a GOT entry, the program might call `system()` when it intended to call `printf()`.

**RELRO** makes the GOT read-only:
- **Partial RELRO**: Some GOT entries become read-only. Some attack surface remains.
- **Full RELRO**: The entire GOT becomes read-only after startup. No more GOT overwrites.

### Shadow Stacks (Intel CET)

The newest hardware defense. Instead of trusting the program's normal stack, the processor maintains a **second, hidden copy** of every return address. When a function returns, the CPU compares the normal stack's return address against the shadow stack's copy. If they don't match, execution immediately stops. Even if an attacker corrupts the normal stack, they cannot modify the hardware-protected shadow stack.

Intel CET also includes **Indirect Branch Tracking (IBT)**, which defends against attacks that redirect indirect jumps and calls (JOP/COOP attacks)—complementing the shadow stack's protection of return addresses.

---

## Why Python Doesn't Have This Problem

One of the biggest takeaways from this series is that **language design matters**. In C, local variables live directly inside the hardware stack—buffer, saved base pointer, and return address all sit in one contiguous memory region. Overflowing one object can corrupt another.

Python works differently. When you write `name = input()`, Python creates a **string object on the heap**. The variable `name` is simply a reference to that object. Function calls are managed using heap-allocated **frame objects** (`PyFrameObject`), not raw stack frames exposed to user code. As a result, Python programs cannot accidentally overwrite return addresses the way C programs can.

![Figure 6: C vs Memory-Safe Languages — Why Memory Models Matter](/assets/images/blog/buffer-overflow/figure-6.png)

### Memory-Safe Languages

Many modern languages follow the same philosophy:

- **Rust** performs compile-time ownership and borrowing checks, eliminating most buffer overflows without a garbage collector. (Rust's `unsafe` blocks deliberately opt out of these guarantees for low-level operations—but they're explicit and auditable.)
- **Go** manages memory automatically and performs bounds checking on slices and arrays. Out-of-bounds access triggers a runtime panic, not silent corruption.
- **Java** arrays always perform bounds checking. Exceeding the array size throws an `ArrayIndexOutOfBoundsException`. (Java's JNI allows calling native C code, which reintroduces the risk.)

> **Important caveat:** CPython itself is written in C and has had memory-safety CVEs. Python's `ctypes` module also lets you manipulate raw memory. The safety guarantee applies to *pure Python code*, not the interpreter or native extensions.

---

## Writing Secure Code

This article is tagged "Secure Programming" — so let's actually show the fix. The vulnerable code used `gets()`, which performs no bounds checking. Here are the safe alternatives:

### Use `fgets()` Instead of `gets()`

```c
// DANGEROUS — never use this
gets(buffer);

// SAFE — limits input to buffer size
fgets(buffer, sizeof(buffer), stdin);
```

`fgets()` takes the buffer size as a parameter and will never write more than that many bytes. It also preserves the trailing newline, which you may want to strip:

```c
buffer[strcspn(buffer, "\n")] = '\0';  // remove trailing newline
```

### Use `snprintf()` Instead of `sprintf()`

```c
// DANGEROUS — no length limit
sprintf(dest, "Hello, %s!", name);

// SAFE — bounded output
snprintf(dest, sizeof(dest), "Hello, %s!", name);
```

### Beware of `strncpy()`

`strncpy()` is often suggested as a safe replacement for `strcpy()`, but it has a subtle trap: if the source string is longer than `n`, **it does not null-terminate the destination**. Prefer `snprintf()` or explicitly null-terminate:

```c
strncpy(dest, src, sizeof(dest) - 1);
dest[sizeof(dest) - 1] = '\0';  // ensure null termination
```

### Compile With Protections Enabled

```bash
gcc -Wall -Wextra -Werror \
    -fstack-protector-strong \
    -D_FORTIFY_SOURCE=2 \
    -pie -fPIE \
    -Wl,-z,relro,-z,now \
    program.c -o program
```

These flags enable stack canaries, format string hardening, PIE, and full RELRO—all the defenses we discussed.

---

## The Evolution of Buffer Overflow Exploits

The history of defenses mirrors the history of attacks—a constant back-and-forth:

| Era | Typical Attack | Typical Defense |
|------|----------------|-----------------|
| 1980s–1990s | Stack shellcode injection | None |
| Early 2000s | Return-to-libc (bypass NX) | NX / DEP |
| Mid 2000s | ROP (Return-Oriented Programming) | ASLR, PIE |
| 2010s | Advanced ROP, format string attacks | Stack canaries, RELRO, FORTIFY_SOURCE |
| Modern | JOP, COOP, blind ROP | CET Shadow Stacks, CFI (Control-Flow Integrity), IBT |

As defenders introduced new protections, attackers adapted. As attackers developed new techniques, operating systems evolved further. This constant arms race is one of the defining characteristics of cybersecurity.

---

## Key Takeaways

✅ A **buffer** is a fixed-size block of memory. C performs no automatic bounds checking.

✅ Functions like `gets()` read unlimited input, making buffer overflows trivial. Use `fgets()` instead.

✅ Overflowing a stack buffer can overwrite the **saved base pointer** and **return address**, giving an attacker control over program execution.

✅ Attackers use **cyclic patterns** and **little-endian byte ordering** to find the exact offset to the return address.

✅ **Shellcode** is attacker-supplied machine code; a **NOP sled** increases the chance of landing on it.

✅ **Stack Canaries** detect overwrites before the function returns.

✅ **NX/DEP** prevents execution of injected code on the stack.

✅ **ASLR** and **PIE** randomize memory layout, making addresses unpredictable.

✅ **RELRO** protects the Global Offset Table from modification.

✅ **Shadow Stacks (Intel CET)** maintain a hardware-protected copy of return addresses.

✅ **Memory-safe languages** (Python, Rust, Go, Java) eliminate traditional buffer overflows through managed memory.

---

## ⚠️ Ethics and Legal Notice

The techniques described in this article are for **educational purposes only**. Always practice exploitation techniques on systems you own or have explicit written authorization to test. Unauthorized access to computer systems is a crime under laws such as the CFAA (U.S.), the Computer Misuse Act (U.K.), and equivalent legislation worldwide.

---

## Further Reading

- Aleph One, *[Smashing the Stack for Fun and Profit](http://phrack.org/issues/49/14.html)* (Phrack, 1996)
- [MITRE CWE-121: Stack-based Buffer Overflow](https://cwe.mitre.org/data/definitions/121.html)
- [MITRE CWE-787: Out-of-bounds Write](https://cwe.mitre.org/data/definitions/787.html)
- [Intel® Control-flow Enforcement Technology (CET)](https://www.intel.com/content/www/us/en/developer/articles/technical/technical-look-control-flow-enforcement-technology.html)
- [OWASP Buffer Overflow Overview](https://owasp.org/www-community/vulnerabilities/Buffer_Overflow)
- [CERT C Secure Coding Standard](https://wiki.sei.cmu.edu/confluence/display/c)

---

## Series Summary

**Part 1:** *[Inside Your Computer's Memory: Where Do Variables Actually Live?](/blog/2026/07/23/inside-your-computers-memory)*
- Program memory layout, Stack vs Heap, function calls, stack frames, C vs Python memory model

**Part 2:** *From Variables to Vulnerabilities: Understanding Stack Buffer Overflow Attacks*
- Buffers and overflows, return address overwrites, shellcode and NOP sleds, modern mitigations, secure coding practices, memory-safe languages

---

Thank you for reading! If you found this series helpful, consider sharing it with fellow developers or students learning systems programming and cybersecurity.

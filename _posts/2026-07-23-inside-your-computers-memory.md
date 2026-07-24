---
layout: post
title: "Inside Your Computer's Memory: Where Do Variables Actually Live?"
date: 2026-07-23
author: "Nishant Patel"
excerpt: "A beginner-friendly guide to understanding program memory, the stack, the heap, and how function calls work in C."
cover_image: /assets/images/blog/memory-allocation/cover.png
series: "Memory Management & Buffer Overflow"
series_part: 1
tags:
  - C
  - Programming
  - Memory Management
  - Stack
  - Heap
  - Operating Systems
  - Computer Architecture
  - Assembly
  - Cybersecurity
---

> **Part 1 of a 2-part series on Memory Management and Buffer Overflow Vulnerabilities**

When you first start programming, variables seem almost magical.

```c
int age = 24;
```

A variable appears.

You give it a value.

You use it.

Then it disappears when the program ends.

Most beginner tutorials stop there.

But have you ever wondered:

- Where is `age` actually stored?
- How does the CPU know where to find it?
- What happens when you call another function?
- How can one variable accidentally overwrite another?

Understanding these questions changes the way you think about programming.

It explains why **C is incredibly fast**, why **Python is safer**, and lays the foundation for understanding famous security vulnerabilities like **stack buffer overflows**.

In this article, we'll explore how a running program is organized in memory, how functions create stack frames, and why compilers generate the assembly code they do.

Basic knowledge of C programming is required. Knowledge of assembly language is not required, but helpful.

---

## Table of Contents

1. [What Happens When You Press Run?](#what-happens-when-you-press-run)
2. [Program Memory Layout](#program-memory-layout)
3. [Understanding the Stack and Heap](#understanding-the-stack-and-heap)
4. [Following a Function Call](#following-a-function-call)
5. [Building a Stack Frame](#building-a-stack-frame)
6. [Why Compilers Use `sub` Instead of `push`](#why-compilers-use-sub-instead-of-push)
7. [Variables Inside `if` Statements](#variables-inside-if-statements)
8. [How Python Is Different](#how-python-is-different)
9. [Key Takeaways](#key-takeaways)

---

## What Happens When You Press Run?

Imagine you compile and execute this program.

```c
#include <stdio.h>

int main()
{
    int x = 10;
    printf("%d\n", x);
    return 0;
}
```

Most people picture the operating system simply loading the program into RAM.

That's true—but it isn't the whole story.

The operating system doesn't hand your program one giant chunk of memory.

Instead, it divides memory into several specialized regions, each designed for a specific purpose.

Think of memory like a city.

A city doesn't place schools, hospitals, factories, and houses randomly.

Each has its own dedicated area.

Your program follows the same principle.

![Figure 1: Memory Layout of a Typical Program](/assets/images/blog/memory-allocation/figure-1.png)

---

## Program Memory Layout

A running C program is generally divided into five major memory regions.

| Memory Region | Purpose |
|---------------|----------|
| **Text** | Executable machine instructions |
| **Data** | Initialized global and static variables |
| **BSS** | Uninitialized global and static variables |
| **Heap** | Dynamically allocated memory |
| **Stack** | Function calls, parameters, and local variables |

Let's look at each one.

---

### The Text Segment

The **Text Segment** contains the compiled machine instructions of your program.

Everything the CPU executes comes from here.

Think of it as the program's instruction manual.

---

### The Data Segment

Suppose you write:

```c
int counter = 100;
```

outside every function.

Since the variable already has a value, it's stored in the **Initialized Data Segment**.

---

### The BSS Segment

Now consider:

```c
int counter;
```

without assigning a value.

This variable lives in the **BSS (Block Started by Symbol)** segment.

Before your program begins execution, the operating system automatically initializes this memory to zero.

---

### The Heap

The heap is used whenever memory is allocated dynamically during runtime.

For example:

```c
int *numbers = malloc(100 * sizeof(int));
```

Unlike the stack, the compiler doesn't know beforehand how much heap memory your program will request.

Memory is allocated while the program is running and remains allocated until it is explicitly freed.

---

### The Stack

Finally, we arrive at the most important memory region for this article.

The **stack** stores:

- Function parameters
- Local variables
- Return addresses
- Bookkeeping information for function calls

Unlike the heap, the stack automatically grows and shrinks as functions are called and return.

---

## Understanding the Stack and Heap

Imagine a cafeteria with a stack of plates.

You always place a new plate on **top**.

You always remove the **top** plate first.

You never remove one from the middle.

This is exactly how the CPU manages function calls.

This behavior is called **Last In, First Out (LIFO).**

One interesting detail surprises many beginners:

On most processors, the stack grows **toward lower memory addresses**.

That means every new function call moves the stack pointer downward.

![Figure 2: How the Stack Grows Downward](/assets/images/blog/memory-allocation/figure-2.png)

---

## Following a Function Call

Consider the following program.

```c
int add(int x, int y)
{
    int sum = x + y;
    return sum;
}

int main()
{
    int result = add(3, 4);
}
```

Let's slow everything down and follow exactly what happens.

---

### Step 1 — Push the Arguments

Before calling `add()`, the caller places the arguments onto the stack.

```
push 4
push 3
```

Notice that the arguments are pushed **right-to-left**.

This is part of the **cdecl calling convention** used by many C compilers.

---

### Step 2 — Execute the `call` Instruction

Next, the CPU executes

```
call add
```

This single instruction performs two operations automatically:

1. Pushes the address of the next instruction (the **return address**) onto the stack.
2. Jumps to the first instruction of `add()`.

---

### Step 3 — Build the Stack Frame

When execution enters `add()`, the compiler generates a **function prologue**.

```
push ebp
mov ebp, esp
sub esp, 4
```

Although these instructions may look intimidating at first, each has a very specific purpose.

![Figure 3: Building a Stack Frame Step by Step](/assets/images/blog/memory-allocation/figure-3.png)

---

## Building a Stack Frame

After the function prologue completes, the stack looks something like this.

![Figure 4: Anatomy of a Stack Frame](/assets/images/blog/memory-allocation/figure-4.png)

| Offset | Contents |
|---------|----------|
| `EBP + 12` | Argument `y` |
| `EBP + 8` | Argument `x` |
| `EBP + 4` | Return Address |
| `EBP` | Previous Base Pointer |
| `EBP - 4` | Local Variable `sum` |

Notice something interesting.

The arguments were pushed **before** the `call` instruction.

The `call` instruction then pushed the return address.

Finally, the function saved the previous base pointer and reserved space for local variables.

Because every variable now has a fixed offset relative to `EBP`, the compiler always knows exactly where to find it.

---

## Why Compilers Use `sub` Instead of `push`

One of the most common beginner questions is:

> If `push` already allocates stack space, why don't compilers simply use `push` for local variables?

For example, why generate:

```
sub esp, 8

mov DWORD PTR [ebp-4], 0
mov DWORD PTR [ebp-8], 1
```

instead of

```
push 0
push 1
```

The answer is **predictability**.

The compiler first reserves **all required stack space at once**.

Then it initializes each variable individually.

After

```
sub esp, 8
```

the compiler already knows

```
a → EBP - 4
b → EBP - 8
```

These offsets never change.

If the compiler used repeated `push` instructions, the stack pointer would move after every variable, making variable locations dependent on the order of initialization.

Reserving the entire frame first creates a simple, stable memory layout that is easier to generate, optimize, and debug.

![Figure 5: sub vs push for Local Variables](/assets/images/blog/memory-allocation/figure-5.png)

---

## Variables Inside `if` Statements

Consider this code.

```c
if (condition)
{
    int a = 10;
}
else
{
    int b = 20;
}
```

A common misconception is that the compiler allocates memory separately inside each branch.

In reality, most compilers reserve enough stack space for **every local variable that could exist anywhere inside the function**.

Even though `a` and `b` never exist at the same time, giving each variable a fixed location simplifies code generation.

Modern optimizing compilers may reuse stack space when variable lifetimes don't overlap, but conceptually the stack frame remains fixed throughout the function.

---

## How Python Is Different

Python takes a completely different approach.

When you write

```python
x = 10
```

there isn't a raw integer stored directly on the hardware stack.

Instead:

- A Python integer object is created on the heap.
- The variable name `x` becomes a reference to that object.
- Local variables are stored inside interpreter-managed frame objects rather than raw stack memory.

This abstraction makes Python significantly safer because user code never manipulates raw stack memory directly.

We'll see why this design matters in the next article.

![Figure 6: C vs Python — Different Memory Models](/assets/images/blog/memory-allocation/figure-6.png)

---

## Key Takeaways

Programs don't use one giant block of memory.

Instead, they use specialized memory regions such as the Text segment, Data segment, Heap, and Stack.

---

Every function call creates a **stack frame**.

The stack frame stores:

- Parameters
- Return address
- Previous base pointer
- Local variables

---

The compiler reserves stack space using

```
sub esp, N
```

before initializing variables.

This keeps every local variable at a fixed offset from the base pointer.

---

Most local variables—even those inside loops or `if` statements—are allocated when the function begins.

---

Python uses heap-allocated objects and interpreter-managed frame objects instead of exposing raw hardware stack memory.

---

## What's Next?

Now that we understand how local variables are stored, we're ready to answer a much more interesting question:

> **What happens if we write more data than a stack variable can hold?**

In **Part 2** of this series, we'll explore one of the most famous vulnerabilities in computer security:

- What is a buffer overflow?
- How does it overwrite the return address?
- Why does `0x41414141` appear during crashes?
- What is a NOP sled?
- How do modern defenses like Stack Canaries, ASLR, NX, PIE, and RELRO protect programs?
- Why are languages like Python and Rust naturally resistant to these attacks?

Stay tuned!

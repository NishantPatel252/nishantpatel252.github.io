---
layout: post
title: "Welcome to My Blog"
date: 2026-02-12
tags: [meta, welcome]
excerpt: "First post on my new cybersecurity blog — CTF writeups, security research, and technical deep-dives coming soon."
---

Welcome to my cybersecurity blog! I'll be sharing writeups, research, and technical knowledge here.

## What to Expect

Here's what I plan to cover:

- **CTF Writeups** — Detailed walkthroughs of challenges from TryHackMe, HackTheBox, and competitions
- **Security Research** — Vulnerability analysis, threat intelligence findings, and OSINT techniques
- **Technical Deep-Dives** — Binary exploitation, reverse engineering, cloud security, and more
- **Career & Learning** — Insights from my M.S. Cybersecurity journey at Northeastern

## Why a Blog?

As a cybersecurity student, I believe in documenting and sharing knowledge. Writing forces me to deeply understand topics, and it helps others in the community learn from my experiences.

## Sample: Quick Nmap Cheatsheet

Here's a quick reference I use regularly:

```bash
# Quick host discovery
nmap -sn 192.168.1.0/24

# Full port scan with service detection
nmap -sV -sC -p- -oN full_scan.txt target.com

# Aggressive scan with OS detection
nmap -A -T4 target.com

# UDP scan
nmap -sU --top-ports 100 target.com
```

> **Tip:** Always get proper authorization before scanning any network or system.

## Stay Tuned

More posts coming soon. In the meantime, feel free to check out my [projects](/projects) or [get in touch](/contact)!

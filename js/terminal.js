/**
 * Terminal Typing Effects
 * Creates realistic typing animation for text elements
 */

class TerminalTyper {
    constructor(element, options = {}) {
        this.element = typeof element === 'string'
            ? document.querySelector(element)
            : element;

        if (!this.element) return;

        this.text = options.text || this.element.dataset.text || this.element.textContent;
        this.speed = options.speed || 50;
        this.delay = options.delay || 0;
        this.cursor = options.cursor !== false;
        this.cursorChar = options.cursorChar || '█';
        this.onComplete = options.onComplete || null;

        this.element.textContent = '';
        this.currentIndex = 0;

        setTimeout(() => this.type(), this.delay);
    }

    type() {
        if (this.currentIndex < this.text.length) {
            const char = this.text.charAt(this.currentIndex);
            this.element.textContent = this.text.substring(0, this.currentIndex + 1);

            if (this.cursor) {
                this.element.textContent += this.cursorChar;
            }

            this.currentIndex++;

            // Variable speed for more realistic typing
            const variance = Math.random() * 50 - 25;
            const nextSpeed = Math.max(20, this.speed + variance);

            // Pause slightly longer after punctuation
            const pauseChars = '.,!?;:';
            const delay = pauseChars.includes(char) ? nextSpeed * 3 : nextSpeed;

            setTimeout(() => this.type(), delay);
        } else {
            // Typing complete
            if (this.cursor) {
                this.element.innerHTML = this.text + '<span class="typing-cursor"></span>';
            }
            if (this.onComplete) {
                this.onComplete();
            }
        }
    }
}

/**
 * Sequential Typer
 * Types multiple elements in sequence
 */
class SequentialTyper {
    constructor(elements, options = {}) {
        this.elements = typeof elements === 'string'
            ? document.querySelectorAll(elements)
            : elements;

        this.options = options;
        this.currentIndex = 0;
        this.delayBetween = options.delayBetween || 500;

        this.typeNext();
    }

    typeNext() {
        if (this.currentIndex < this.elements.length) {
            const element = this.elements[this.currentIndex];

            new TerminalTyper(element, {
                ...this.options,
                cursor: this.currentIndex === this.elements.length - 1,
                onComplete: () => {
                    this.currentIndex++;
                    setTimeout(() => this.typeNext(), this.delayBetween);
                }
            });
        }
    }
}

/**
 * Command Line Effect
 * Simulates command line input with prompt
 */
class CommandLine {
    constructor(element, commands, options = {}) {
        this.element = typeof element === 'string'
            ? document.querySelector(element)
            : element;

        this.commands = commands;
        this.prompt = options.prompt || '$ ';
        this.typeSpeed = options.typeSpeed || 80;
        this.outputDelay = options.outputDelay || 300;
        this.commandDelay = options.commandDelay || 1000;
        this.currentCommand = 0;

        this.element.innerHTML = '';
        this.processCommands();
    }

    async processCommands() {
        for (const cmd of this.commands) {
            await this.typeCommand(cmd.input);
            await this.delay(this.outputDelay);
            if (cmd.output) {
                await this.showOutput(cmd.output);
            }
            await this.delay(this.commandDelay);
        }
    }

    typeCommand(text) {
        return new Promise((resolve) => {
            const line = document.createElement('div');
            line.className = 'command-line';
            line.innerHTML = `<span class="prompt">${this.prompt}</span><span class="command"></span>`;
            this.element.appendChild(line);

            const commandSpan = line.querySelector('.command');
            let i = 0;

            const type = () => {
                if (i < text.length) {
                    commandSpan.textContent += text.charAt(i);
                    i++;
                    setTimeout(type, this.typeSpeed + Math.random() * 30);
                } else {
                    resolve();
                }
            };

            type();
        });
    }

    showOutput(text) {
        return new Promise((resolve) => {
            const output = document.createElement('div');
            output.className = 'command-output';
            output.innerHTML = text;
            this.element.appendChild(output);
            resolve();
        });
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Auto-initialize typing elements
document.addEventListener('DOMContentLoaded', () => {
    // Auto-type elements with data-typing attribute
    document.querySelectorAll('[data-typing]').forEach((el, index) => {
        const delay = parseInt(el.dataset.typingDelay) || index * 1000;
        setTimeout(() => {
            new TerminalTyper(el, {
                speed: parseInt(el.dataset.typingSpeed) || 50
            });
        }, delay);
    });
});

// Export for use in other scripts
window.TerminalTyper = TerminalTyper;
window.SequentialTyper = SequentialTyper;
window.CommandLine = CommandLine;

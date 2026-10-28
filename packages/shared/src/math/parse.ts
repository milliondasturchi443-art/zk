/**
 * Minimal TeX-subset parser used to render SAT style notation with plain
 * React Native views (fractions, roots, exponents, subscripts, common symbols).
 *
 * Supported: \frac{}{}, \sqrt[]{}, ^{}, _{}, \text{}, \mathrm{}, \overline{},
 * \times \div \pm \mp \cdot \le \ge \neq \approx \infty \pi \theta \alpha \beta
 * \gamma \delta \omega \Delta, \{ \} \% \_ \, \; \! \left \right
 *
 * Unknown commands degrade to their literal text instead of throwing, so a
 * malformed question never breaks a screen.
 */

export type MathNode =
  | { type: 'text'; value: string }
  | { type: 'frac'; numerator: MathNode[]; denominator: MathNode[] }
  | { type: 'sqrt'; body: MathNode[]; index?: MathNode[] }
  | { type: 'sup'; base: MathNode[]; exponent: MathNode[] }
  | { type: 'sub'; base: MathNode[]; subscript: MathNode[] }
  | { type: 'group'; children: MathNode[] }
  | { type: 'overline'; children: MathNode[] };

const SYMBOLS: Record<string, string> = {
  times: '×',
  div: '÷',
  pm: '±',
  mp: '∓',
  cdot: '·',
  le: '≤',
  leq: '≤',
  ge: '≥',
  geq: '≥',
  neq: '≠',
  ne: '≠',
  approx: '≈',
  infty: '∞',
  pi: 'π',
  Pi: 'Π',
  theta: 'θ',
  Theta: 'Θ',
  alpha: 'α',
  beta: 'β',
  gamma: 'γ',
  delta: 'δ',
  Delta: 'Δ',
  omega: 'ω',
  Omega: 'Ω',
  lambda: 'λ',
  mu: 'μ',
  phi: 'φ',
  rightarrow: '→',
  leftarrow: '←',
  degree: '°',
  '%': '%',
  '{': '{',
  '}': '}',
  _: '_',
  '&': '&',
  '#': '#',
  '$': '$',
  ' ': ' ',
};

const SPACES: Record<string, string> = {
  ',': '\u2009',
  ';': '\u2005',
  '!': '',
  ' ': ' ',
};

class Parser {
  private index = 0;

  constructor(private readonly source: string) {}

  parse(): MathNode[] {
    return this.parseSequence(false);
  }

  private parseSequence(stopAtBrace: boolean): MathNode[] {
    const out: MathNode[] = [];
    while (this.index < this.source.length) {
      const char = this.source[this.index]!;

      if (char === '}' && stopAtBrace) {
        this.index += 1;
        return out;
      }
      if (char === '{') {
        this.index += 1;
        const children = this.parseSequence(true);
        out.push({ type: 'group', children });
        continue;
      }
      if (char === '}' || char === ']') {
        this.index += 1;
        out.push({ type: 'text', value: char });
        continue;
      }
      if (char === '^' || char === '_') {
        this.index += 1;
        const argument = this.parseArgument();
        const base = out.pop() ?? { type: 'text', value: '' } as MathNode;
        if (char === '^') {
          out.push({ type: 'sup', base: [base], exponent: argument });
        } else {
          out.push({ type: 'sub', base: [base], subscript: argument });
        }
        continue;
      }
      if (char === '\\') {
        const node = this.parseCommand(stopAtBrace);
        if (node) out.push(...node);
        continue;
      }
      out.push({ type: 'text', value: char });
      this.index += 1;
    }
    return out;
  }

  /** Parses `{...}` or a single token after a command / caret. */
  private parseArgument(): MathNode[] {
    this.skipWhitespace();
    if (this.source[this.index] === '{') {
      this.index += 1;
      return this.parseSequence(true);
    }
    const char = this.source[this.index];
    if (char === undefined) return [];
    if (char === '\\') {
      this.index += 1;
      const command = this.readCommandName();
      const symbol = SYMBOLS[command];
      this.index += 0;
      return [{ type: 'text', value: symbol ?? `\\${command}` }];
    }
    this.index += 1;
    return [{ type: 'text', value: char }];
  }

  private skipWhitespace(): void {
    while (this.index < this.source.length && /\s/.test(this.source[this.index]!)) {
      this.index += 1;
    }
  }

  private readCommandName(): string {
    const start = this.index;
    while (this.index < this.source.length && /[A-Za-z]/.test(this.source[this.index]!)) {
      this.index += 1;
    }
    if (start === this.index) {
      const char = this.source[this.index];
      this.index += 1;
      return char ?? '';
    }
    return this.source.slice(start, this.index);
  }

  private parseCommand(stopAtBrace: boolean): MathNode[] | null {
    this.index += 1; // consume backslash
    const command = this.readCommandName();

    if (command === 'frac' || command === 'dfrac' || command === 'tfrac') {
      const numerator = this.parseArgument();
      const denominator = this.parseArgument();
      return [{ type: 'frac', numerator, denominator }];
    }
    if (command === 'sqrt') {
      let index: MathNode[] | undefined;
      this.skipWhitespace();
      if (this.source[this.index] === '[') {
        this.index += 1;
        let depth = 1;
        const start = this.index;
        while (this.index < this.source.length && depth > 0) {
          if (this.source[this.index] === '[') depth += 1;
          if (this.source[this.index] === ']') depth -= 1;
          if (depth > 0) this.index += 1;
        }
        index = [{ type: 'text', value: this.source.slice(start, this.index) }];
        this.index += 1;
      }
      const body = this.parseArgument();
      return [{ type: 'sqrt', body, index }];
    }
    if (command === 'text' || command === 'mathrm' || command === 'operatorname' || command === 'mathbf') {
      const body = this.parseArgument();
      return [flattenToStringNode(body)];
    }
    if (command === 'overline') {
      const children = this.parseArgument();
      return [{ type: 'overline', children }];
    }
    if (command === 'left' || command === 'right') {
      // Delimiter size is purely cosmetic: consume the following character.
      const char = this.source[this.index];
      if (char !== undefined && char !== '{' && char !== '}') this.index += 1;
      return null;
    }
    if (command in SPACES) {
      return SPACES[command] ? [{ type: 'text', value: SPACES[command]! }] : null;
    }
    if (command in SYMBOLS) {
      return [{ type: 'text', value: SYMBOLS[command]! }];
    }
    if (command === '' && stopAtBrace) {
      return null;
    }
    // Unknown command: render literally so nothing is silently lost.
    return [{ type: 'text', value: command ? `\\${command}` : '\\' }];
  }
}

function flattenToStringNode(nodes: MathNode[]): MathNode {
  return { type: 'text', value: nodes.map((node) => mathToString([node])).join('') };
}

/** Parses `$...$` delimited or bare TeX into a renderable tree. */
export function parseMath(input: string): MathNode[] {
  const source = stripDelimiters(input ?? '');
  return new Parser(source).parse();
}

/** Removes surrounding `$...$` / `$$...$$` delimiters. */
export function stripDelimiters(input: string): string {
  let value = input.trim();
  if (value.startsWith('$$') && value.endsWith('$$') && value.length >= 4) {
    value = value.slice(2, -2);
  } else if (value.startsWith('$') && value.endsWith('$') && value.length >= 2) {
    value = value.slice(1, -1);
  }
  return value;
}

/** True when the text contains any TeX-ish construct worth parsing. */
export function containsMath(input: string): boolean {
  if (!input) return false;
  return /\\[A-Za-z]+|\^|_|\$/.test(input);
}

/** Plain-text projection of a tree (used by tests, search and alt text). */
export function mathToString(nodes: MathNode[]): string {
  return nodes
    .map((node) => {
      switch (node.type) {
        case 'text':
          return node.value;
        case 'group':
          return mathToString(node.children);
        case 'overline':
          return mathToString(node.children);
        case 'frac':
          return `${mathToString(node.numerator)}/${mathToString(node.denominator)}`;
        case 'sqrt':
          return `sqrt(${mathToString(node.index ?? [])}${mathToString(node.body)})`;
        case 'sup':
          return `${mathToString(node.base)}^(${mathToString(node.exponent)})`;
        case 'sub':
          return `${mathToString(node.base)}_(${mathToString(node.subscript)})`;
        default:
          return '';
      }
    })
    .join('');
}

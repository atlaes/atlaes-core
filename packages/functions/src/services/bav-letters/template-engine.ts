/**
 * Template engine for the CompanyPension bAV-Abfindung letter set
 * (client spec "Standardschreiben Template Set v1.0", section 2).
 *
 * Grammar implemented exactly as specified:
 *
 *   {{field}}                 insert value (formatting is the caller's job)
 *   {{g:maskulin|feminin}}    gender token resolved via `client_gender` (m|f)
 *   [[IF expr]] … [[ELSE]] … [[/IF]]
 *                             conditional block; expr = field | not field |
 *                             field == value | field in (a, b) joined with
 *                             and / or; blocks nest
 *   [[ANLAGEN]] … [[/ANLAGEN]]
 *                             every surviving non-empty line is numbered
 *
 * Whitespace rules:
 *   - a block tag ([[IF …]], [[ELSE]], [[/IF]], [[ANLAGEN]], [[/ANLAGEN]])
 *     standing alone on a line consumes that line break
 *   - a line consisting solely of a conditional that resolves to empty is
 *     removed, leaving no blank line behind
 *   - after resolving, runs of two or more empty lines collapse to one and
 *     trailing spaces are trimmed
 *
 * The engine is pure: no I/O, no formatting, no defaults. Values that are
 * `undefined` or `null` are reported in `missing` and rendered as "".
 */

export type TemplateValue = string | number | boolean | null | undefined;
export type TemplateContext = Record<string, TemplateValue>;

export interface RenderOptions {
  /** Throw a TemplateRenderError instead of returning `missing`. */
  strict?: boolean;
}

export interface RenderResult {
  text: string;
  /** Field names that were referenced but undefined/null in the context. */
  missing: string[];
}

export class TemplateSyntaxError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TemplateSyntaxError';
  }
}

export class TemplateRenderError extends Error {
  readonly missing: string[];
  constructor(missing: string[]) {
    super(`Template context is missing fields: ${missing.join(', ')}`);
    this.name = 'TemplateRenderError';
    this.missing = missing;
  }
}

// ---------------------------------------------------------------------------
// Expressions
// ---------------------------------------------------------------------------

type Expr =
  | { kind: 'truthy'; field: string }
  | { kind: 'eq'; field: string; value: string }
  | { kind: 'in'; field: string; values: string[] }
  | { kind: 'not'; expr: Expr }
  | { kind: 'and'; left: Expr; right: Expr }
  | { kind: 'or'; left: Expr; right: Expr };

const EXPR_TOKEN = /\s*(==|\(|\)|,|[^\s(),=]+)/y;

function tokenizeExpr(src: string): string[] {
  const tokens: string[] = [];
  let pos = 0;
  while (pos < src.length) {
    EXPR_TOKEN.lastIndex = pos;
    const m = EXPR_TOKEN.exec(src);
    if (!m) {
      if (src.slice(pos).trim() === '') break;
      throw new TemplateSyntaxError(`Cannot tokenize expression "${src}"`);
    }
    tokens.push(m[1]);
    pos = EXPR_TOKEN.lastIndex;
  }
  return tokens;
}

const FIELD_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;
const KEYWORDS = new Set(['and', 'or', 'not', 'in']);

function parseExpr(src: string): Expr {
  const tokens = tokenizeExpr(src);
  let i = 0;
  const peek = () => tokens[i];
  const next = () => tokens[i++];
  const fail = (why: string): never => {
    throw new TemplateSyntaxError(`Invalid expression "${src}": ${why}`);
  };

  const parsePrimary = (): Expr => {
    const t = next();
    if (t === undefined) return fail('unexpected end');
    if (t === '(') {
      const inner = parseOr();
      if (next() !== ')') fail('expected ")"');
      return inner;
    }
    if (!FIELD_NAME.test(t) || KEYWORDS.has(t)) {
      return fail(`expected field name, got "${t}"`);
    }
    const field = t;
    if (peek() === '==') {
      next();
      const value = next();
      if (value === undefined || value === '(' || value === ')') {
        return fail('expected value after "=="');
      }
      return { kind: 'eq', field, value };
    }
    if (peek() === 'in') {
      next();
      if (next() !== '(') fail('expected "(" after "in"');
      const values: string[] = [];
      for (;;) {
        const v = next();
        if (v === undefined) return fail('unterminated list');
        if (v === ')') break;
        if (v === ',') continue;
        values.push(v);
      }
      if (values.length === 0) fail('empty list');
      return { kind: 'in', field, values };
    }
    return { kind: 'truthy', field };
  };

  const parseUnary = (): Expr => {
    if (peek() === 'not') {
      next();
      return { kind: 'not', expr: parseUnary() };
    }
    return parsePrimary();
  };

  const parseAnd = (): Expr => {
    let left = parseUnary();
    while (peek() === 'and') {
      next();
      left = { kind: 'and', left, right: parseUnary() };
    }
    return left;
  };

  const parseOr = (): Expr => {
    let left = parseAnd();
    while (peek() === 'or') {
      next();
      left = { kind: 'or', left, right: parseAnd() };
    }
    return left;
  };

  const expr = parseOr();
  if (i !== tokens.length) fail(`unexpected token "${tokens[i]}"`);
  return expr;
}

function isTruthy(v: TemplateValue): boolean {
  if (v === undefined || v === null || v === false) return false;
  if (typeof v === 'string') return v.trim() !== '';
  if (typeof v === 'number') return v !== 0;
  return true;
}

function evalExpr(expr: Expr, ctx: TemplateContext): boolean {
  switch (expr.kind) {
    case 'truthy':
      return isTruthy(ctx[expr.field]);
    case 'eq':
      return String(ctx[expr.field] ?? '') === expr.value;
    case 'in':
      return expr.values.includes(String(ctx[expr.field] ?? ''));
    case 'not':
      return !evalExpr(expr.expr, ctx);
    case 'and':
      return evalExpr(expr.left, ctx) && evalExpr(expr.right, ctx);
    case 'or':
      return evalExpr(expr.left, ctx) || evalExpr(expr.right, ctx);
  }
}

// ---------------------------------------------------------------------------
// Template tokens and AST
// ---------------------------------------------------------------------------

type Token =
  | { type: 'text'; value: string }
  | { type: 'field'; name: string }
  | { type: 'gender'; m: string; f: string }
  | { type: 'if'; expr: string; lineOwner: boolean }
  | { type: 'else' }
  | { type: 'endif' }
  | { type: 'anlagen' }
  | { type: 'endanlagen' };

type Node =
  | { type: 'text'; value: string }
  | { type: 'field'; name: string }
  | { type: 'gender'; m: string; f: string }
  | {
      type: 'if';
      expr: Expr;
      exprSource: string;
      then: Node[];
      else: Node[];
      lineOwner: boolean;
    }
  | { type: 'anlagen'; children: Node[] };

const TAG = /\{\{([^}]*)\}\}|\[\[(IF [^\]]*|ELSE|\/IF|ANLAGEN|\/ANLAGEN)\]\]/g;

// A block tag alone on its line (optional surrounding spaces) consumes the
// line break that follows it.
const STANDALONE =
  /^[ \t]*(\[\[(?:IF [^\]]*|ELSE|\/IF|ANLAGEN|\/ANLAGEN)\]\])[ \t]*\n?/gm;

/**
 * True when the [[IF …]] at `start` (which sits at the start of a line) is
 * closed by a matching [[/IF]] on the same line that is immediately followed
 * by a line break or the end of the template. Such a conditional owns its
 * line: it is dropped entirely when it renders empty.
 */
function findLineOwner(source: string, start: number): number | null {
  const re = /\[\[(IF [^\]]*|\/IF)\]\]|\n/g;
  re.lastIndex = start;
  let depth = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(source)) !== null) {
    if (m[0] === '\n') return null;
    if (m[1].startsWith('IF ')) depth += 1;
    else depth -= 1;
    if (depth === 0) {
      const end = re.lastIndex;
      if (end === source.length) return end;
      if (source[end] === '\n') return end + 1;
      return null;
    }
  }
  return null;
}

function tokenize(rawSource: string): Token[] {
  const source = rawSource.replace(/\r\n?/g, '\n').replace(STANDALONE, '$1');
  const tokens: Token[] = [];
  const skipNewlineAt = new Set<number>();
  let last = 0;
  TAG.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = TAG.exec(source)) !== null) {
    if (m.index > last) {
      let text = source.slice(last, m.index);
      if (skipNewlineAt.has(last)) text = text.slice(1);
      if (text) tokens.push({ type: 'text', value: text });
    }
    last = TAG.lastIndex;

    if (m[1] !== undefined) {
      const inner = m[1].trim();
      if (inner.startsWith('g:')) {
        const body = inner.slice(2);
        const bar = body.indexOf('|');
        if (bar < 0) {
          throw new TemplateSyntaxError(
            `Gender token "{{${inner}}}" needs the form {{g:maskulin|feminin}}`
          );
        }
        tokens.push({
          type: 'gender',
          m: body.slice(0, bar),
          f: body.slice(bar + 1),
        });
      } else {
        if (!FIELD_NAME.test(inner)) {
          throw new TemplateSyntaxError(`Invalid placeholder "{{${inner}}}"`);
        }
        tokens.push({ type: 'field', name: inner });
      }
      continue;
    }

    const tag = m[2];
    if (tag.startsWith('IF ')) {
      const atLineStart = m.index === 0 || source[m.index - 1] === '\n';
      let lineOwner = false;
      if (atLineStart) {
        const endPos = findLineOwner(source, m.index);
        if (endPos !== null) {
          lineOwner = true;
          // The line break after the matching [[/IF]] belongs to this node.
          if (source[endPos - 1] === '\n') skipNewlineAt.add(endPos - 1);
        }
      }
      tokens.push({ type: 'if', expr: tag.slice(3).trim(), lineOwner });
    } else if (tag === 'ELSE') {
      tokens.push({ type: 'else' });
    } else if (tag === '/IF') {
      tokens.push({ type: 'endif' });
    } else if (tag === 'ANLAGEN') {
      tokens.push({ type: 'anlagen' });
    } else {
      tokens.push({ type: 'endanlagen' });
    }
  }
  if (last < source.length) {
    let text = source.slice(last);
    if (skipNewlineAt.has(last)) text = text.slice(1);
    if (text) tokens.push({ type: 'text', value: text });
  }
  return tokens;
}

function parse(tokens: Token[]): Node[] {
  let i = 0;

  const parseBlock = (terminators: Array<Token['type']>): Node[] => {
    const nodes: Node[] = [];
    while (i < tokens.length) {
      const t = tokens[i];
      if (terminators.includes(t.type)) return nodes;
      i += 1;
      switch (t.type) {
        case 'text':
        case 'field':
        case 'gender':
          nodes.push(t);
          break;
        case 'if': {
          const thenNodes = parseBlock(['else', 'endif']);
          let elseNodes: Node[] = [];
          if (tokens[i]?.type === 'else') {
            i += 1;
            elseNodes = parseBlock(['endif']);
          }
          if (tokens[i]?.type !== 'endif') {
            throw new TemplateSyntaxError(`Unclosed [[IF ${t.expr}]]`);
          }
          i += 1;
          nodes.push({
            type: 'if',
            expr: parseExpr(t.expr),
            exprSource: t.expr,
            then: thenNodes,
            else: elseNodes,
            lineOwner: t.lineOwner,
          });
          break;
        }
        case 'anlagen': {
          const children = parseBlock(['endanlagen']);
          if (tokens[i]?.type !== 'endanlagen') {
            throw new TemplateSyntaxError('Unclosed [[ANLAGEN]]');
          }
          i += 1;
          nodes.push({ type: 'anlagen', children });
          break;
        }
        case 'else':
          throw new TemplateSyntaxError('[[ELSE]] without matching [[IF]]');
        case 'endif':
          throw new TemplateSyntaxError('[[/IF]] without matching [[IF]]');
        case 'endanlagen':
          throw new TemplateSyntaxError(
            '[[/ANLAGEN]] without matching [[ANLAGEN]]'
          );
      }
    }
    return nodes;
  };

  const nodes = parseBlock([]);
  if (i < tokens.length) {
    const t = tokens[i];
    throw new TemplateSyntaxError(`Unexpected [[${t.type.toUpperCase()}]]`);
  }
  return nodes;
}

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

function renderNodes(
  nodes: Node[],
  ctx: TemplateContext,
  missing: Set<string>
): string {
  let out = '';
  for (const node of nodes) {
    switch (node.type) {
      case 'text':
        out += node.value;
        break;
      case 'field': {
        const v = ctx[node.name];
        if (v === undefined || v === null) {
          missing.add(node.name);
        } else {
          out += String(v);
        }
        break;
      }
      case 'gender': {
        const g = ctx.client_gender;
        if (g === 'm') out += node.m;
        else if (g === 'f') out += node.f;
        else missing.add('client_gender');
        break;
      }
      case 'if': {
        const branch = evalExpr(node.expr, ctx) ? node.then : node.else;
        const text = renderNodes(branch, ctx, missing);
        if (node.lineOwner) {
          if (text.trim() !== '') out += text + '\n';
        } else {
          out += text;
        }
        break;
      }
      case 'anlagen': {
        const lines = renderNodes(node.children, ctx, missing)
          .split('\n')
          .map((l) => l.trim())
          .filter((l) => l !== '');
        if (lines.length > 0) {
          out += lines.map((l, idx) => `${idx + 1}. ${l}`).join('\n') + '\n';
        }
        break;
      }
    }
  }
  return out;
}

function normalizeWhitespace(text: string): string {
  return text
    .split('\n')
    .map((l) => l.replace(/[ \t]+$/, ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/^\n+/, '')
    .replace(/\s+$/, '');
}

export interface CompiledTemplate {
  render(ctx: TemplateContext, options?: RenderOptions): RenderResult;
}

/** Parse once, render many times. Throws TemplateSyntaxError on bad input. */
export function compileTemplate(source: string): CompiledTemplate {
  const ast = parse(tokenize(source));
  return {
    render(ctx, options = {}) {
      const missing = new Set<string>();
      const text = normalizeWhitespace(renderNodes(ast, ctx, missing));
      const missingList = [...missing];
      if (options.strict && missingList.length > 0) {
        throw new TemplateRenderError(missingList);
      }
      return { text, missing: missingList };
    },
  };
}

export function renderTemplate(
  source: string,
  ctx: TemplateContext,
  options?: RenderOptions
): RenderResult {
  return compileTemplate(source).render(ctx, options);
}

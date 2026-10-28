import { Fragment, type CSSProperties, type ReactNode } from 'react';

import { containsMath, parseMath, type MathNode } from '@zk/shared';

import { cn } from '../lib/cn';

interface MathTextProps {
  text: string;
  className?: string;
  style?: CSSProperties;
  fontSize?: number;
}

/**
 * Renders text that may contain `$...$` maths: fractions, roots, exponents and
 * subscripts are laid out with HTML primitives so they stay crisp and work
 * offline (no maths engine, no third-party renderer).
 */
export function MathText({ text, className, style, fontSize = 16 }: MathTextProps) {
  if (!containsMath(text)) {
    return (
      <span className={className} style={style}>
        {text}
      </span>
    );
  }
  return (
    <span className={cn(className, 'zk-math')} style={{ ...style, fontSize }}>
      {renderRich(text, fontSize)}
    </span>
  );
}

/** Splits a string into plain and math segments and renders both. */
function renderRich(source: string, fontSize: number): ReactNode[] {
  const out: ReactNode[] = [];
  const pattern = /\$\$([^$]+)\$\$|\$([^$]+)\$/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = pattern.exec(source)) !== null) {
    if (match.index > lastIndex) {
      out.push(<Fragment key={`t${key++}`}>{source.slice(lastIndex, match.index)}</Fragment>);
    }
    const math = match[1] ?? match[2] ?? '';
    out.push(<Fragment key={`m${key++}`}>{renderNodes(parseMath(math), fontSize)}</Fragment>);
    lastIndex = pattern.lastIndex;
  }

  if (lastIndex < source.length) {
    out.push(<Fragment key={`t${key++}`}>{source.slice(lastIndex)}</Fragment>);
  }
  return out;
}

function renderNodes(nodes: MathNode[], size: number): ReactNode[] {
  return nodes.map((node, index) => renderNode(node, size, index));
}

function renderNode(node: MathNode, size: number, key: number): ReactNode {
  switch (node.type) {
    case 'text':
      return <Fragment key={key}>{node.value}</Fragment>;

    case 'group':
      return <Fragment key={key}>{renderNodes(node.children, size)}</Fragment>;

    case 'overline':
      return (
        <span key={key} className="zk-overline inline-block">
          {renderNodes(node.children, size)}
        </span>
      );

    case 'frac': {
      const childSize = Math.max(11, size * 0.92);
      return (
        <span key={key} className="zk-frac" style={{ fontSize: childSize }}>
          <span className="zk-frac-part">{renderNodes(node.numerator, childSize)}</span>
          <span className="zk-frac-bar" />
          <span className="zk-frac-part">{renderNodes(node.denominator, childSize)}</span>
        </span>
      );
    }

    case 'sqrt': {
      const childSize = Math.max(11, size * 0.95);
      return (
        <span key={key} className="zk-sqrt" style={{ fontSize: size * 1.05 }}>
          {node.index ? (
            <sup style={{ fontSize: size * 0.6 }}>{renderNodes(node.index, size * 0.6)}</sup>
          ) : null}
          <span>√</span>
          <span className="zk-sqrt-body" style={{ fontSize: childSize }}>
            {renderNodes(node.body, childSize)}
          </span>
        </span>
      );
    }

    case 'sup':
      return (
        <span key={key}>
          {renderNodes(node.base, size)}
          <sup style={{ fontSize: Math.max(9, size * 0.68) }}>
            {renderNodes(node.exponent, Math.max(9, size * 0.68))}
          </sup>
        </span>
      );

    case 'sub':
      return (
        <span key={key}>
          {renderNodes(node.base, size)}
          <sub style={{ fontSize: Math.max(9, size * 0.68) }}>
            {renderNodes(node.subscript, Math.max(9, size * 0.68))}
          </sub>
        </span>
      );

    default:
      return null;
  }
}

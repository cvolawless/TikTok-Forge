import { useCallback } from 'react';

// Define the calculateVisibleCharacters function
const calculateVisibleCharacters = (frame: number, length: number): number => {
  // Example implementation, adjust as needed
  return Math.min(frame, length);
};
import { useCurrentFrame } from 'remotion';
import { themes, Highlight, PrismTheme } from 'prism-react-renderer';

export type CodeBlockProps = {
  children: string;
  language?: string;
  isAnimated?: boolean;
  highlightLines?: number[];
};

export const CodeBlock = ({
  children,
  language = 'javascript',
  isAnimated = false,
  highlightLines = [],
}: CodeBlockProps) => {
  const frame = useCurrentFrame();
  const visibleCharacters = isAnimated
    ? calculateVisibleCharacters(frame, children.length)
    : children.length;

  const getLineContent = useCallback(
    (line: string, lineNumber: number) => {
      if (isAnimated) {
        const lineStart = children
          .split('\n')
          .slice(0, lineNumber)
          .join('\n')
          .length + (lineNumber > 0 ? 1 : 0);

        const lineContent = line.slice(
          0,
          Math.max(0, visibleCharacters - lineStart)
        );
        return lineContent;
      }
      return line;
    },
    [isAnimated, visibleCharacters, children]
  );

  const isLineHighlighted = useCallback(
    (lineNumber: number) => highlightLines.includes(lineNumber),
    [highlightLines]
  );

  return (
    <Highlight
      theme={themes.nightOwl as PrismTheme}
      code={children}
      language={language}
    >
      {({ className, style, tokens, getLineProps, getTokenProps }) => (
        <pre
          className={`${className} p-8 overflow-x-auto font-mono whitespace-pre-wrap break-all`}
          style={{
            ...style,
            fontSize: `24px`,
            background: 'rgb(1, 22, 39)',
            lineHeight: '2.1'
          }}
        >
          {tokens.map((line, lineIndex) => {
            // Skip the last empty line that prism adds
            if (
              lineIndex === tokens.length - 1 &&
              line.length === 1 &&
              line[0].empty
            ) {
              return null;
            }

            const lineNumber = lineIndex + 1;
            const highlighted = isLineHighlighted(lineNumber);

            return (
              <div
                key={lineIndex}
                {...getLineProps({ line })}
                className={`${highlighted ? 'bg-blue-900/30' : ''} -mx-4 px-4 relative`}
              >
                {/* Line number */}
                <span className="inline-block w-8 mr-4 text-gray-500 select-none">
                  {lineNumber}
                </span>

                {/* Actual code */}
                <span>
                  {line.map((token, tokenIndex) => {
                    const tokenContent = getLineContent(token.content, lineIndex);
                    if (!tokenContent) return null;

                    return (
                      <span
                        key={tokenIndex}
                        {...getTokenProps({
                          token: { ...token, content: tokenContent },
                        })}
                      />
                    );
                  })}
                </span>

                {/* Cursor effect for typing animation */}
                {isAnimated && (
                  <span
                    className="absolute h-4 w-0.5 bg-white animate-pulse"
                    style={{
                      left: `${4 +
                        getLineContent(
                          line.map((t) => t.content).join(''),
                          lineIndex
                        ).length * 0.6}rem`,
                      display:
                        lineIndex ===
                        Math.floor(
                          visibleCharacters / children.length * tokens.length
                        )
                          ? 'block'
                          : 'none',
                    }}
                  />
                )}
              </div>
            );
          })}
        </pre>
      )}
    </Highlight>
  );
};

/**
 * A code block component that renders a code block with optional typing animation and line highlighting.
 * @param {string} children The code to render.
 * @param {string} [language='javascript'] The language of the code.
 * @param {boolean} [animate=false] Whether to animate the code block like it is being typed.
 * @param {number[]} [highlightLines=[]] The line numbers to highlight.
 * @returns {React.ReactElement} The code block component.
 */


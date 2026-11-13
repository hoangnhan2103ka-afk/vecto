import React, { useMemo } from 'react';
import katex from 'katex';

interface MathFormulaProps {
  tex: string;
  displayMode?: boolean;
  className?: string;
}

export const MathFormula: React.FC<MathFormulaProps> = ({
  tex,
  displayMode = false,
  className = '',
}) => {
  const html = useMemo(() => {
    try {
      return katex.renderToString(tex, {
        displayMode,
        throwOnError: false,
        strict: false,
        trust: true,
      });
    } catch {
      return tex;
    }
  }, [tex, displayMode]);

  return (
    <span
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

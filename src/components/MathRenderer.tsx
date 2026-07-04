import React, { useEffect, useRef } from 'react';
import katex from 'katex';

interface MathRendererProps {
  math: string;
  block?: boolean;
  key?: React.Key;
}

export default function MathRenderer({ math, block = false }: MathRendererProps) {
  const containerRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (containerRef.current) {
      try {
        katex.render(math, containerRef.current, {
          displayMode: block,
          throwOnError: false,
          trust: true,
        });
      } catch (err) {
        console.error('KaTeX rendering error:', err);
        containerRef.current.textContent = math;
      }
    }
  }, [math, block]);

  return <span ref={containerRef} className={block ? "block my-2" : "inline-block"} />;
}

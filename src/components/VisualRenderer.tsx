import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';
import ReactMarkdown from 'react-markdown';
import ReactFlow, { Background, Controls } from 'reactflow';
import 'reactflow/dist/style.css';

interface VisualRendererProps {
  type: 'mermaid' | 'flowchart' | 'markdown' | 'react-flow';
  code: string;
  style?: Record<string, any>;
  className?: string;
}

const VisualRenderer: React.FC<VisualRendererProps> = ({ type, code, style, className }) => {
  const mermaidRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (type === 'mermaid' && mermaidRef.current) {
      mermaid.initialize({
        startOnLoad: true,
        theme: 'default',
        securityLevel: 'loose',
        fontFamily: 'inherit'
      });

      mermaid.render('mermaid-diagram', code).then(({ svg }) => {
        if (mermaidRef.current) {
          mermaidRef.current.innerHTML = svg;
        }
      });
    }
  }, [type, code]);

  if (type === 'mermaid') {
    return (
      <div 
        ref={mermaidRef} 
        className={`mermaid-container ${className || ''}`}
        style={{
          background: 'var(--background)',
          padding: '1rem',
          borderRadius: '0.5rem',
          ...style
        }}
      />
    );
  }

  if (type === 'markdown') {
    // Create a style element for the custom CSS
    const customStyles = Object.entries(style || {}).map(([selector, rules]) => {
      const cssRules = Object.entries(rules as Record<string, string>)
        .map(([property, value]) => `${property}: ${value};`)
        .join(' ');
      return `${selector} { ${cssRules} }`;
    }).join('\n');

    return (
      <>
        <style>{customStyles}</style>
        <div 
          className={`markdown-container ${className || ''}`}
          dangerouslySetInnerHTML={{ __html: code }}
        />
      </>
    );
  }

  if (type === 'react-flow') {
    try {
      const flowData = typeof code === 'string' ? JSON.parse(code) : code;
      return (
        <div 
          className={`react-flow-container ${className || ''}`}
          style={{ 
            height: '400px',
            background: 'var(--background)',
            borderRadius: '0.5rem',
            ...style 
          }}
        >
          <ReactFlow
            nodes={flowData.nodes}
            edges={flowData.edges}
            fitView
          >
            <Background />
            <Controls />
          </ReactFlow>
        </div>
      );
    } catch (error) {
      console.error('Failed to parse React Flow data:', error);
      return <div>Error: Invalid React Flow configuration</div>;
    }
  }

  return <div>Unsupported visualization type: {type}</div>;
};

export default VisualRenderer; 
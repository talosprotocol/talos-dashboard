"use client";

import Editor, { EditorProps } from "@monaco-editor/react";

interface MonacoEditorProps extends EditorProps {
  className?: string;
}

export function MonacoEditor({
  height = "100%",
  defaultLanguage = "yaml",
  theme = "vs-dark",
  options,
  className,
  ...props
}: MonacoEditorProps) {
  return (
    <div className={className} style={{ height }}>
      <Editor
        height={height}
        defaultLanguage={defaultLanguage}
        theme={theme}
        options={{
          minimap: { enabled: false },
          fontSize: 13,
          fontFamily: "JetBrains Mono, monospace",
          scrollBeyondLastLine: false,
          automaticLayout: true,
          padding: { top: 16, bottom: 16 },
          renderLineHighlight: "none",
          codeLens: false,
          ...options,
        }}
        {...props}
      />
    </div>
  );
}

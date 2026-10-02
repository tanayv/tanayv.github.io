import { useState } from "react";

/** Just enough TSX highlighting for prop snippets. */
function highlight(src: string) {
  const out: React.ReactNode[] = [];
  const re =
    /(\/\/[^\n]*)|("[^"]*"|'[^']*'|`[^`]*`)|(<\/?[A-Z][\w.]*|<\/?[a-z][\w-]*|\/?>)|\b(import|from|export|const|function|return|true|false|null)\b|\b(\d+(?:\.\d+)?)\b|([a-zA-Z-]+)(?==)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(src))) {
    if (m.index > last) out.push(src.slice(last, m.index));
    const cls = m[1] ? "tok-com" : m[2] ? "tok-str" : m[3] ? "tok-tag" : m[4] ? "tok-key" : m[5] ? "tok-num" : "tok-attr";
    out.push(
      <span key={k++} className={cls}>
        {m[0]}
      </span>,
    );
    last = m.index + m[0].length;
  }
  out.push(src.slice(last));
  return out;
}

export function CodeBlock({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="code">
      <pre>
        <code>{highlight(code)}</code>
      </pre>
      <button
        type="button"
        className="copy"
        onClick={() => {
          void navigator.clipboard?.writeText(code).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1400);
          });
        }}
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}

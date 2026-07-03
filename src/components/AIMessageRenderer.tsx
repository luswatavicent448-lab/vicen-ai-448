import React from "react";

/**
 * Structured renderer for Vicen AI assistant messages.
 *
 * Classifies each line of the AI response and maps it to a styled
 * sub-component so the output always renders as cards, lists, tables,
 * and call-out boxes — never as a collapsed wall of text.
 */

// ─── Inline formatter ───────────────────────────────────────────────────────
// Handles **bold**, *italic*, `code` inside any text run.
function renderInline(text: string, keyPrefix = "i"): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  const re = /(\*\*([^*]+)\*\*|\*([^*]+)\*|`([^`]+)`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    if (m[2] !== undefined) {
      nodes.push(<strong key={`${keyPrefix}-b-${i}`} className="font-semibold text-foreground">{m[2]}</strong>);
    } else if (m[3] !== undefined) {
      nodes.push(<em key={`${keyPrefix}-i-${i}`}>{m[3]}</em>);
    } else if (m[4] !== undefined) {
      nodes.push(<code key={`${keyPrefix}-c-${i}`} className="px-1 py-0.5 rounded bg-secondary text-[0.9em] font-mono">{m[4]}</code>);
    }
    last = m.index + m[0].length;
    i++;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

// ─── Pattern detectors ──────────────────────────────────────────────────────
const SECTION_EMOJI_RE = /^\s*([\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F100}-\u{1F1FF}\u{1F900}-\u{1F9FF}\u2705\u274C\u2753\u2757\u26A0])\s+\S/u;
const PART_RE = /^\s*\((i|ii|iii|iv|v|vi|vii|viii|ix|x|xi|xii|[a-z]|\d+)\)\s*(.*)$/i;
const BULLET_RE = /^\s*[•\-\*]\s+(.*)$/;
const NUM_LIST_RE = /^\s*(\d+)\.\s+(.*)$/;
const DIVIDER_RE = /^\s*(?:-{3,}|━{3,}|\*{3,}|_{3,})\s*$/;
const TABLE_ROW_RE = /^\s*\|.*\|\s*$/;
const FINAL_ANSWER_RE = /^\s*(?:✅\s*)?(?:\*\*)?\s*Final Answer\s*:?(.*)$/i;
const FORMULA_LABEL_RE = /^\s*(?:\*\*)?\s*(Formula|Substitution|Working|Calculation|Step|Solution|Given|Required|Concept|Note|Answer)\s*(?:\*\*)?\s*:\s*(.*)$/i;
const WOULD_YOU_LIKE_RE = /^\s*(?:\*\*)?\s*(Would you like|Want me to|Shall I|Do you want)/i;

// ─── Atomic styled pieces ───────────────────────────────────────────────────
function TopicTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="block text-[15px] font-bold text-foreground mb-3 pb-1.5 border-b border-border/60">
      {children}
    </h2>
  );
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="block text-[14px] font-bold mt-4 mb-2" style={{ color: "#a0c4ff" }}>
      {children}
    </h3>
  );
}

function Divider() {
  return <hr className="my-4 border-0 border-t" style={{ borderColor: "#1e293b" }} />;
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="list-none p-0 my-2">
      {items.map((t, i) => (
        <li
          key={i}
          className="relative py-1 pl-[14px]"
          style={{ position: "relative" }}
        >
          <span
            aria-hidden
            className="absolute left-0 top-1 font-bold"
            style={{ color: "#3b82f6" }}
          >
            •
          </span>
          {renderInline(t, `bl-${i}`)}
        </li>
      ))}
    </ul>
  );
}

function NumberedList({ items }: { items: { n: string; text: string }[] }) {
  return (
    <ol className="list-none p-0 my-2">
      {items.map((it, i) => (
        <li key={i} className="relative py-1 pl-[26px]">
          <span
            aria-hidden
            className="absolute left-0 top-1 font-semibold text-primary"
          >
            {it.n}.
          </span>
          {renderInline(it.text, `nl-${i}`)}
        </li>
      ))}
    </ol>
  );
}

function FinalAnswerBox({ text }: { text: string }) {
  return (
    <div
      className="block mt-2.5 font-bold rounded-md px-2.5 py-1.5"
      style={{
        background: "#0f2a1a",
        border: "1px solid #22c55e",
        color: "#4ade80",
      }}
    >
      ✅ Final Answer:{text ? " " : ""}
      {renderInline(text, "fa")}
    </div>
  );
}

function FormulaLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="mt-2">
      <span
        className="block font-semibold"
        style={{ color: "#94a3b8" }}
      >
        {label}:
      </span>
      <span
        className="block ml-2 mb-1.5 font-mono text-[0.92rem] break-words"
        style={{ color: "#e2e8f0" }}
      >
        {renderInline(value, "fv")}
      </span>
    </div>
  );
}

function BodyText({ children }: { children: React.ReactNode }) {
  return <p className="my-1.5 leading-[1.6] text-[13.5px]">{children}</p>;
}

function WouldYouLike({ text }: { text: string }) {
  return (
    <p className="my-2 leading-[1.6] text-[13.5px] text-foreground">
      {renderInline(text, "wyl")}
    </p>
  );
}

// ─── Part card (solution step) ──────────────────────────────────────────────
function PartCard({ title, lines }: { title: string; lines: string[] }) {
  // Sub-classify each line inside the card
  const children: React.ReactNode[] = [];
  let bulletBuf: string[] = [];
  const flushBullets = () => {
    if (bulletBuf.length) {
      children.push(<BulletList key={`pb-${children.length}`} items={bulletBuf} />);
      bulletBuf = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const bullet = line.match(BULLET_RE);
    if (bullet) {
      bulletBuf.push(bullet[1]);
      continue;
    }
    flushBullets();

    const fa = line.match(FINAL_ANSWER_RE);
    if (fa) {
      children.push(<FinalAnswerBox key={`pf-${i}`} text={fa[1].trim().replace(/^\*\*|\*\*$/g, "")} />);
      continue;
    }

    const lbl = line.match(FORMULA_LABEL_RE);
    if (lbl && lbl[2].trim().length > 0) {
      children.push(<FormulaLine key={`pl-${i}`} label={lbl[1]} value={lbl[2].trim()} />);
      continue;
    }

    children.push(
      <p key={`pp-${i}`} className="my-1 leading-[1.6]" style={{ color: "#f1f5f9" }}>
        {renderInline(line.trim(), `pt-${i}`)}
      </p>
    );
  }
  flushBullets();

  return (
    <div
      className="block rounded-lg mb-3.5"
      style={{
        background: "#111418",
        borderLeft: "3px solid #3b82f6",
        padding: "12px 14px",
      }}
    >
      <div className="font-semibold mb-1.5" style={{ color: "#ffffff" }}>
        {renderInline(title, "ptitle")}
      </div>
      {children}
    </div>
  );
}

// ─── Markdown table renderer ────────────────────────────────────────────────
function SummaryTable({ rows }: { rows: string[] }) {
  // Filter separator row (|---|---|)
  const parsed = rows
    .map((r) => r.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim()))
    .filter((cells) => !cells.every((c) => /^:?-{2,}:?$/.test(c) || c === ""));

  if (parsed.length === 0) return null;
  const [head, ...body] = parsed;

  return (
    <div
      className="not-prose my-4 w-full overflow-x-auto rounded-[10px]"
      style={{ border: "1px solid #1e293b" }}
    >
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr style={{ background: "#1e293b" }}>
            {head.map((c, i) => (
              <th
                key={i}
                className="px-3 py-2 text-left font-semibold"
                style={{ borderRight: i < head.length - 1 ? "1px solid #0f172a" : "none", color: "#e2e8f0" }}
              >
                {renderInline(c, `th-${i}`)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, ri) => (
            <tr
              key={ri}
              style={{
                borderTop: "1px solid #1e293b",
                background: ri % 2 === 1 ? "rgba(30,41,59,0.25)" : "transparent",
              }}
            >
              {row.map((c, ci) => (
                <td
                  key={ci}
                  className="px-3 py-2 align-top"
                  style={{ borderRight: ci < row.length - 1 ? "1px solid #1e293b" : "none" }}
                >
                  {renderInline(c, `td-${ri}-${ci}`)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main classifier / renderer ─────────────────────────────────────────────
export function AIMessageRenderer({ content }: { content: string }) {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const out: React.ReactNode[] = [];

  let i = 0;
  let topicTitleConsumed = false;
  let bulletBuf: string[] = [];
  let numBuf: { n: string; text: string }[] = [];

  const flushBullets = () => {
    if (bulletBuf.length) {
      out.push(<BulletList key={`bl-${out.length}`} items={bulletBuf} />);
      bulletBuf = [];
    }
  };
  const flushNum = () => {
    if (numBuf.length) {
      out.push(<NumberedList key={`nl-${out.length}`} items={numBuf} />);
      numBuf = [];
    }
  };
  const flushLists = () => { flushBullets(); flushNum(); };

  while (i < lines.length) {
    const raw = lines[i];
    const line = raw ?? "";

    if (!line.trim()) {
      flushLists();
      i++;
      continue;
    }

    // Topic title — first meaningful line, if it's not already a section/part/etc.
    if (
      !topicTitleConsumed &&
      !SECTION_EMOJI_RE.test(line) &&
      !PART_RE.test(line) &&
      !BULLET_RE.test(line) &&
      !DIVIDER_RE.test(line) &&
      !TABLE_ROW_RE.test(line) &&
      !FINAL_ANSWER_RE.test(line) &&
      !WOULD_YOU_LIKE_RE.test(line) &&
      line.trim().length < 120
    ) {
      // Strip leading markdown header markers / bold
      const cleaned = line.trim().replace(/^#+\s*/, "").replace(/^\*\*(.*)\*\*$/, "$1");
      out.push(<TopicTitle key={`tt-${i}`}>{renderInline(cleaned, `tt-${i}`)}</TopicTitle>);
      topicTitleConsumed = true;
      i++;
      continue;
    }
    topicTitleConsumed = true;

    // Divider
    if (DIVIDER_RE.test(line)) {
      flushLists();
      out.push(<Divider key={`d-${i}`} />);
      i++;
      continue;
    }

    // Table block
    if (TABLE_ROW_RE.test(line)) {
      flushLists();
      const tableRows: string[] = [];
      while (i < lines.length && TABLE_ROW_RE.test(lines[i])) {
        tableRows.push(lines[i]);
        i++;
      }
      out.push(<SummaryTable key={`tbl-${i}`} rows={tableRows} />);
      continue;
    }

    // Would you like ...
    if (WOULD_YOU_LIKE_RE.test(line)) {
      flushLists();
      const cleaned = line.trim().replace(/^\*\*(.*)\*\*$/, "$1");
      out.push(<WouldYouLike key={`w-${i}`} text={cleaned} />);
      i++;
      continue;
    }

    // Section header (emoji-led)
    if (SECTION_EMOJI_RE.test(line)) {
      flushLists();
      const cleaned = line.trim().replace(/^\*\*(.*)\*\*$/, "$1").replace(/\*\*/g, "");
      out.push(<SectionHeader key={`sh-${i}`}>{renderInline(cleaned, `sh-${i}`)}</SectionHeader>);
      i++;
      continue;
    }

    // Part card — gather all lines belonging to it
    const partMatch = line.match(PART_RE);
    if (partMatch) {
      flushLists();
      const marker = `(${partMatch[1]})`;
      const restOfTitle = partMatch[2].trim();
      const title = restOfTitle ? `${marker} ${restOfTitle}` : marker;

      const cardLines: string[] = [];
      i++;
      while (i < lines.length) {
        const next = lines[i];
        if (
          !next.trim() && (!lines[i + 1] || !lines[i + 1].trim())
        ) break;
        if (
          PART_RE.test(next) ||
          SECTION_EMOJI_RE.test(next) ||
          DIVIDER_RE.test(next) ||
          TABLE_ROW_RE.test(next) ||
          WOULD_YOU_LIKE_RE.test(next)
        ) break;
        cardLines.push(next);
        i++;
      }
      out.push(<PartCard key={`pc-${i}`} title={title} lines={cardLines} />);
      continue;
    }

    // Bullets
    const b = line.match(BULLET_RE);
    if (b) {
      flushNum();
      bulletBuf.push(b[1]);
      i++;
      continue;
    }

    // Numbered list
    const nl = line.match(NUM_LIST_RE);
    if (nl) {
      flushBullets();
      numBuf.push({ n: nl[1], text: nl[2] });
      i++;
      continue;
    }

    // Final answer outside a part card
    const fa = line.match(FINAL_ANSWER_RE);
    if (fa) {
      flushLists();
      out.push(<FinalAnswerBox key={`fa-${i}`} text={fa[1].trim().replace(/^\*\*|\*\*$/g, "")} />);
      i++;
      continue;
    }

    // Formula / Substitution label outside a card
    const lbl = line.match(FORMULA_LABEL_RE);
    if (lbl && lbl[2].trim().length > 0) {
      flushLists();
      out.push(<FormulaLine key={`fl-${i}`} label={lbl[1]} value={lbl[2].trim()} />);
      i++;
      continue;
    }

    // Heading (markdown #)
    if (/^#{1,6}\s+/.test(line)) {
      flushLists();
      const cleaned = line.replace(/^#+\s*/, "").trim();
      out.push(<SectionHeader key={`mh-${i}`}>{renderInline(cleaned, `mh-${i}`)}</SectionHeader>);
      i++;
      continue;
    }

    // Default body text
    flushLists();
    out.push(
      <BodyText key={`bt-${i}`}>{renderInline(line.trim(), `bt-${i}`)}</BodyText>
    );
    i++;
  }
  flushLists();

  return <div className="text-[16px] leading-[1.6] text-foreground">{out}</div>;
}

export default AIMessageRenderer;
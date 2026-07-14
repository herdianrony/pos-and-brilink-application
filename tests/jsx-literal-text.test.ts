import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { resolve } from "path";

// ── Regression test: unbraced JSX expressions ─────
// Catch the bug where a ternary expression like:
//   isBankIcon(x) ? <A/> : <B/>
// is written inside JSX without surrounding `{}`, causing React to render
// the literal text "isBankIcon(x) ?" and ":" on the page.
//
// This is valid JSX syntactically (text nodes), so typecheck passes.
// The only way to catch it is via render snapshot or by scanning source.
//
// We scan all .tsx files in src/components for suspicious patterns.

const COMPONENTS_DIR = resolve(process.cwd(), "src/components");

// Patterns that indicate a literal-code-as-text bug:
//   1. Line starts with `isBankIcon(`, `formatRupiah(`, `cn(`, `DynamicIcon(`, `BankIcon(`
//      inside a JSX context (not inside `{}` braces, not on import line)
//   2. Icon name as literal text: e.g., `>bar-chart-3 ...` or `>credit-card ...`
//      (icon name appearing as text instead of as `name="..."` prop)
const SUSPICIOUS_FN_PATTERNS = [
  /^\s+isBankIcon\(/,
  /^\s+formatRupiah\(/,
  /^\s+cn\(/,
  /^\s+DynamicIcon\(/,
  /^\s+BankIcon\(/,
];

// Suspicious literal icon names appearing as text in JSX (between `>` and `<`)
// e.g., `>bar-chart-3 Efek` or `>credit-card Saldo`
const LITERAL_ICON_TEXT_PATTERN = />(?:\s*)(bar-chart-3|credit-card|wallet|banknote|landmark|package|utensils|cup-soda|gift|smartphone|zap|file-text|arrow-up-right|building-2|banknote)\b[^<]*</;

const filesToScan = [
  "BRILink.tsx",
  "POS.tsx",
  "Dashboard.tsx",
  "Cash.tsx",
  "AccountCard.tsx",
  "Products.tsx",
  "Settings.tsx",
  "Sidebar.tsx",
  "Transactions.tsx",
  "RekeningKoran.tsx",
  "UserManagement.tsx",
  "SetupWizard.tsx",
  "About.tsx",
  "Login.tsx",
];

function scanFile(filename: string): { line: number; text: string; reason: string }[] {
  const filepath = resolve(COMPONENTS_DIR, filename);
  let content: string;
  try {
    content = readFileSync(filepath, "utf-8");
  } catch {
    // File doesn't exist — skip
    return [];
  }

  const issues: { line: number; text: string; reason: string }[] = [];
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // Skip import lines
    if (line.trim().startsWith("import ")) continue;
    // Skip comments
    if (line.trim().startsWith("//") || line.trim().startsWith("/*")) continue;
    // Skip lines that are already inside `{}` (heuristic: line contains `{`)
    // — but we still want to flag patterns where the brace is missing entirely

    // Pattern 1: Suspicious function call at start of line content (after whitespace)
    // but NOT preceded by `{` on the same line
    for (const pattern of SUSPICIOUS_FN_PATTERNS) {
      if (pattern.test(line)) {
        // Check if the line is wrapped in `{}` on the same line
        const trimmed = line.trim();
        // If it starts with `{`, it's braced
        if (trimmed.startsWith("{")) continue;
        // If it's inside a JSX attribute (e.g., className={cn(...)}), it's braced
        if (/\b\w+=\{/.test(line) && !line.includes(">")) continue;
        // If it's an assignment or variable declaration, skip
        if (/^\s*(const|let|var|return|if|for|while)\b/.test(line)) continue;

        issues.push({
          line: lineNum,
          text: line.trim().slice(0, 80),
          reason: "Unbraced function/ternary expression in JSX — will render as literal text",
        });
      }
    }

    // Pattern 2: Literal icon name as text
    if (LITERAL_ICON_TEXT_PATTERN.test(line)) {
      issues.push({
        line: lineNum,
        text: line.trim().slice(0, 80),
        reason: "Literal icon name appearing as text in JSX (should be DynamicIcon/BankIcon component)",
      });
    }
  }

  return issues;
}

describe("JSX literal text regression (unbraced expressions)", () => {
  for (const file of filesToScan) {
    it(`${file} should not render code/icon names as literal text`, () => {
      const issues = scanFile(file);
      if (issues.length > 0) {
        const detail = issues
          .map(i => `  L${i.line}: ${i.text}\n    → ${i.reason}`)
          .join("\n");
        throw new Error(
          `Found ${issues.length} suspicious pattern(s) in ${file}:\n${detail}\n\n` +
          `This usually means a JSX expression is missing surrounding {}. ` +
          `Wrap it like: {isBankIcon(x) ? <A/> : <B/>}`
        );
      }
      expect(issues).toHaveLength(0);
    });
  }

  it("BRILink.tsx specifically should not contain 'isBankIcon(' as literal text", () => {
    const filepath = resolve(COMPONENTS_DIR, "BRILink.tsx");
    const content = readFileSync(filepath, "utf-8");
    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Look for `isBankIcon(` outside of `{}` and outside string literals
      // Heuristic: line contains `isBankIcon(` but doesn't start with `{` or contain `={`
      if (line.includes("isBankIcon(") && !line.includes("{isBankIcon(") && !line.includes("={isBankIcon")) {
        // Allow: import statement, type definition, function declaration
        if (line.includes("import ") || line.includes("function ") || line.includes(": ")) continue;
        // Allow: inside JSX expression with `{` earlier on the line
        if (line.includes("{") && line.indexOf("{") < line.indexOf("isBankIcon(")) continue;
        throw new Error(`Line ${i + 1}: 'isBankIcon(' appears without surrounding {} in JSX:\n  ${line.trim()}`);
      }
    }
  });

  it("BRILink.tsx should not contain 'bar-chart-3' as literal text node", () => {
    const filepath = resolve(COMPONENTS_DIR, "BRILink.tsx");
    const content = readFileSync(filepath, "utf-8");
    // The bug pattern: `>bar-chart-3 ...` (icon name as text)
    // The correct pattern: `name="bar-chart-3"` (icon name as prop)
    const buggyPattern = />(?:\s*)bar-chart-3[^"<]/;
    if (buggyPattern.test(content)) {
      throw new Error("Found 'bar-chart-3' rendered as literal text. Use <DynamicIcon name=\"bar-chart-3\" /> instead.");
    }
  });
});

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import {
  syncRelativeFiles,
  installFromSource,
  resolveSddDependencySet,
  planRetiredRemovals,
  removeRetiredFiles,
} from "./install.js";
import { getMessages } from "./i18n.js";

const msg = getMessages("ja");

function sha256(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

// Req 4.3, 4.4: resolveSddDependencySet — takt のみ抽出。openspec / cc-sdd は抽出しない。
test("resolveSddDependencySet extracts only takt from dependencies ∪ devDependencies", () => {
  const pkg = {
    dependencies: {
      takt: "0.43.0",
    },
    devDependencies: {
      typescript: "5.0.0",
      "@types/node": "20.0.0",
    },
  };
  const result = resolveSddDependencySet(pkg);

  // takt のみが抽出される
  assert.deepEqual(Object.keys(result), ["takt"]);
  assert.equal(result["takt"], "0.43.0");

  // dev-only 依存は含まれない
  assert.equal(result["typescript"], undefined);
  assert.equal(result["@types/node"], undefined);
});

// Req 4.4: openspec / cc-sdd は allowlist に含まれないため伝播しない。
test("resolveSddDependencySet does NOT propagate openspec or cc-sdd", () => {
  const pkg = {
    dependencies: {
      takt: "0.43.0",
      "@fission-ai/openspec": "1.4.1",
    },
    devDependencies: {
      "cc-sdd": "3.0.2",
    },
  };
  const result = resolveSddDependencySet(pkg);

  // openspec / cc-sdd は抽出されない
  assert.equal(result["@fission-ai/openspec"], undefined, "openspec must NOT propagate");
  assert.equal(result["cc-sdd"], undefined, "cc-sdd must NOT propagate");

  // takt は抽出される
  assert.equal(result["takt"], "0.43.0");
});

// Req 4.3: 値は package.json に書かれた version 文字列そのもの（floating 解決なし）。
test("resolveSddDependencySet returns verbatim version strings without resolution", () => {
  const pkg = {
    devDependencies: {
      takt: "^0.43.0",
    },
  };
  const result = resolveSddDependencySet(pkg);
  assert.equal(result["takt"], "^0.43.0");
});

// Req 4.1: dependencies と devDependencies の両方から takt を抽出できること。
test("resolveSddDependencySet merges dependencies ∪ devDependencies (deps take precedence)", () => {
  // takt が dependencies にのみある場合
  const pkgDepsOnly = {
    dependencies: { takt: "0.43.0" },
  };
  const r1 = resolveSddDependencySet(pkgDepsOnly);
  assert.equal(r1["takt"], "0.43.0");

  // takt が devDependencies にのみある場合
  const pkgDevOnly = {
    devDependencies: { takt: "0.44.0" },
  };
  const r2 = resolveSddDependencySet(pkgDevOnly);
  assert.equal(r2["takt"], "0.44.0");

  // takt が両方にある場合 — dependencies が優先
  const pkgBoth = {
    dependencies: { takt: "0.43.0" },
    devDependencies: { takt: "0.44.0" },
  };
  const r3 = resolveSddDependencySet(pkgBoth);
  assert.equal(r3["takt"], "0.43.0");
});

// Req 4.1: フィールド欠落（undefined）でも例外なく空または部分的な結果を返す。
test("resolveSddDependencySet handles missing fields gracefully", () => {
  // 両フィールドとも undefined
  const r1 = resolveSddDependencySet({});
  assert.deepEqual(r1, {});

  // dependencies のみ undefined
  const r2 = resolveSddDependencySet({ devDependencies: { takt: "0.43.0" } });
  assert.equal(r2["takt"], "0.43.0");

  // devDependencies のみ undefined（allowlist 外の key は返らない）
  const r3 = resolveSddDependencySet({ dependencies: { "cc-sdd": "3.0.2" } });
  assert.deepEqual(r3, {}, "cc-sdd is not in allowlist and must not be returned");
});

// Req 4.1: allowlist 外の全パッケージは抽出結果に含まれないこと（dev-only 依存の非伝播）。
test("resolveSddDependencySet does not propagate dev-only dependencies to target project", () => {
  const pkg = {
    dependencies: {
      takt: "0.43.0",
    },
    devDependencies: {
      "cc-sdd": "3.0.2",
      typescript: "5.0.0",
      "@types/node": "20.0.0",
      jest: "29.0.0",
      eslint: "8.0.0",
      prettier: "3.0.0",
      "ts-node": "10.0.0",
    },
  };
  const result = resolveSddDependencySet(pkg);

  // dev-only 依存はすべて含まれない
  for (const devOnly of ["cc-sdd", "typescript", "@types/node", "jest", "eslint", "prettier", "ts-node"]) {
    assert.equal(result[devOnly], undefined, `${devOnly} must not propagate to target project`);
  }

  // takt は抽出される
  assert.equal(result["takt"], "0.43.0");
});

// Req 8.5 / 7.1 / 7.2 / 7.3: syncRelativeFiles の manifest・update 非回帰。
test("syncRelativeFiles handles add, overwrite, and skip cases", () => {
  const root = mkdtempSync(join(tmpdir(), "takt-sdd-sync-"));
  try {
    const srcBase = join(root, "src");
    const destBase = join(root, "dest");
    const relFile = "scripts/example.txt";
    const manifestKey = "dest/scripts/example.txt";
    const srcContent = "source-version-2";
    const srcPath = join(srcBase, relFile);
    const destPath = join(destBase, relFile);

    mkdirSync(join(srcBase, "scripts"), { recursive: true });
    writeFileSync(srcPath, srcContent, "utf-8");

    // (a) 未存在ファイル → 追加・hash 記録（Req 7.1）
    const addResult = syncRelativeFiles(srcBase, destBase, [relFile], null, msg, root);
    assert.equal(readFileSync(destPath, "utf-8"), srcContent);
    assert.equal(addResult.files[manifestKey], sha256(srcContent));

    // (b) 追跡済み・未改変（hash 一致）→ 上書き（Req 7.3）
    const trackedContent = "previously-installed-version-1";
    writeFileSync(destPath, trackedContent, "utf-8");
    const manifestUnchanged = {
      version: "1.0.0",
      installedAt: "2026-06-09T00:00:00.000Z",
      lang: "ja" as const,
      files: { [manifestKey]: sha256(trackedContent) },
    };
    syncRelativeFiles(srcBase, destBase, [relFile], manifestUnchanged, msg, root);
    assert.equal(readFileSync(destPath, "utf-8"), srcContent);

    // (c) 追跡済み・改変（hash 不一致）→ skip（Req 7.2）
    const customizedContent = "user-customized-content";
    writeFileSync(destPath, customizedContent, "utf-8");
    const manifestCustomized = {
      version: "1.0.0",
      installedAt: "2026-06-09T00:00:00.000Z",
      lang: "ja" as const,
      files: { [manifestKey]: sha256(trackedContent) },
    };
    syncRelativeFiles(srcBase, destBase, [relFile], manifestCustomized, msg, root);
    assert.equal(readFileSync(destPath, "utf-8"), customizedContent);

    // (d) manifest 未追跡 → skip（Req 7.2）
    const untrackedContent = "untracked-existing-content";
    writeFileSync(destPath, untrackedContent, "utf-8");
    const manifestUntracked = {
      version: "1.0.0",
      installedAt: "2026-06-09T00:00:00.000Z",
      lang: "ja" as const,
      files: {},
    };
    syncRelativeFiles(srcBase, destBase, [relFile], manifestUntracked, msg, root);
    assert.equal(readFileSync(destPath, "utf-8"), untrackedContent);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// Req 3.5 / 4.5: install() は installFromSource() へ委譲すること。
// installFromSource が export されていること（import で型チェック済み）、かつ
// install() のソーステキストが installFromSource への委譲呼び出しを含むことを
// source-text scan で構造的に固定する。
test("install() delegates to installFromSource (delegation structure fixed)", () => {
  // installFromSource が export されていること
  assert.equal(typeof installFromSource, "function", "installFromSource must be an exported function");

  // install() のソーステキストが installFromSource を呼び出していること
  const source = readFileSync(new URL("../src/install.ts", import.meta.url), "utf-8");

  // install 関数の本体だけを取り出す（export async function install から始まり、
  // installFromSource の呼び出しが含まれる必要がある）
  const installFnMatch = source.match(/export async function install\s*\([^)]*\)[^{]*\{([\s\S]*)/);
  assert.ok(installFnMatch !== null, "export async function install must be present in source");

  const installBody = installFnMatch[1];
  assert.ok(
    installBody.includes("installFromSource("),
    "install() must delegate to installFromSource() — policy duplication is forbidden",
  );
});

// Req 4.1 / 4.2: fresh init で cc-sdd/openspec が実行されないことを構造的に固定する。
// installFromSource のソーステキストに initializeCcSddProject / initializeOpenSpecProject の
// 呼び出しが存在しないことを確認する（物理削除の回帰テスト）。
test("installFromSource source has NO cc-sdd or openspec initialization calls", () => {
  const source = readFileSync(new URL("../src/install.ts", import.meta.url), "utf-8");

  assert.ok(
    !source.includes("initializeCcSddProject"),
    "initializeCcSddProject must be physically deleted from install.ts",
  );
  assert.ok(
    !source.includes("initializeOpenSpecProject"),
    "initializeOpenSpecProject must be physically deleted from install.ts",
  );
  assert.ok(
    !source.includes("CC_SDD_PACKAGE"),
    "CC_SDD_PACKAGE constant must be physically deleted from install.ts",
  );
  assert.ok(
    !source.includes("OPENSPEC_PACKAGE"),
    "OPENSPEC_PACKAGE constant must be physically deleted from install.ts",
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Req 5.1–5.5: RetiredAssetCleanup — planRetiredRemovals / removeRetiredFiles
// ─────────────────────────────────────────────────────────────────────────────

// Req 5.1: hash 一致の退役ファイルは削除候補に含まれること
test("planRetiredRemovals returns retired manifest keys that match RETIRED_MANIFEST_KEY_PATTERNS", () => {
  const manifest = {
    version: "1.0.0",
    installedAt: "2026-01-01T00:00:00.000Z",
    lang: "en" as const,
    files: {
      ".takt/workflows/cc-sdd-full.yaml": "abc",
      ".takt/workflows/opsx-apply.yaml": "def",
      ".takt/workflows/kiro-impl.yaml": "ghi",          // should NOT match
      ".takt/facets/instructions/cc-sdd-bootstrap-steering.md": "jkl",
      ".takt/facets/personas/opsx-implementer.md": "mno",
      ".takt/facets/instructions/ai-review-fix-loop-judge.md": "vwx",      // retired-exclusive shared facet (no prefix)
      ".takt/instructions/batch-plan-implement-loop-judge.md": "yz0",      // legacy layout, retired-exclusive shared facet
      ".takt/facets/instructions/kiro-impl-guide.md": "123",               // should NOT match (kept facet)
      "scripts/opsx-cli.sh": "pqr",
      "scripts/kiro-staged.mjs": "stu",                  // should NOT match
    },
  };
  const result = planRetiredRemovals(manifest, "/tmp/irrelevant");
  assert.ok(result.includes(".takt/workflows/cc-sdd-full.yaml"), "cc-sdd workflow must be planned");
  assert.ok(result.includes(".takt/workflows/opsx-apply.yaml"), "opsx workflow must be planned");
  assert.ok(result.includes(".takt/facets/instructions/cc-sdd-bootstrap-steering.md"), "cc-sdd facet must be planned");
  assert.ok(result.includes(".takt/facets/personas/opsx-implementer.md"), "opsx facet must be planned");
  assert.ok(result.includes(".takt/facets/instructions/ai-review-fix-loop-judge.md"), "retired-exclusive shared facet (modern layout) must be planned");
  assert.ok(result.includes(".takt/instructions/batch-plan-implement-loop-judge.md"), "retired-exclusive shared facet (legacy layout) must be planned");
  assert.ok(result.includes("scripts/opsx-cli.sh"), "opsx-cli.sh must be planned");
  assert.ok(!result.includes(".takt/workflows/kiro-impl.yaml"), "kiro-impl must NOT be planned");
  assert.ok(!result.includes(".takt/facets/instructions/kiro-impl-guide.md"), "kept facet must NOT be planned");
  assert.ok(!result.includes("scripts/kiro-staged.mjs"), "kiro-staged must NOT be planned");
});

// Req 5.5 (Invariant): パターン外のパス（openspec/、ユーザー追加物）は走査対象外
test("planRetiredRemovals does NOT match openspec/ or user-owned paths", () => {
  const manifest = {
    version: "1.0.0",
    installedAt: "2026-01-01T00:00:00.000Z",
    lang: "en" as const,
    files: {
      "openspec/some-change.md": "abc",           // user-owned
      "my-custom-script.sh": "def",               // user-owned
      ".takt/my-custom.yaml": "ghi",              // user-owned (no cc-sdd/opsx prefix)
      "openspec/cc-sdd-like.md": "jkl",          // must NOT match even if name looks retired
    },
  };
  const result = planRetiredRemovals(manifest, "/tmp/irrelevant");
  assert.deepEqual(result, [], "planRetiredRemovals must return [] for non-retired patterns");
});

// Req 5.3: fresh install（manifest null）では cleanup 候補はゼロ
test("planRetiredRemovals returns [] when manifest is null (fresh install)", () => {
  const result = planRetiredRemovals(null, "/tmp/irrelevant");
  assert.deepEqual(result, [], "fresh install must produce no retired removal candidates");
});

// Req 5.1: removeRetiredFiles — hash 一致ファイルを削除し、空親ディレクトリを掃除すること
test("removeRetiredFiles deletes hash-matching retired file and removes empty parent dir", () => {
  const root = mkdtempSync(join(tmpdir(), "takt-cleanup-del-"));
  try {
    // セットアップ: 退役ファイルを配置
    const retiredDir = join(root, ".takt", "workflows");
    mkdirSync(retiredDir, { recursive: true });
    const retiredFile = join(retiredDir, "cc-sdd-full.yaml");
    const content = "retired-workflow-content";
    writeFileSync(retiredFile, content, "utf-8");

    const manifestKey = ".takt/workflows/cc-sdd-full.yaml";
    const manifest = {
      version: "1.0.0",
      installedAt: "2026-01-01T00:00:00.000Z",
      lang: "en" as const,
      files: { [manifestKey]: sha256(content) },
    };

    removeRetiredFiles(root, manifest, msg);

    // ファイルが削除されている
    assert.ok(!existsSync(retiredFile), "retired file must be deleted when hash matches");
    // 空になった親ディレクトリも削除されている
    assert.ok(!existsSync(retiredDir), "empty parent dir must be removed");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// Req 5.2: hash 不一致（カスタマイズ済み）は削除せず警告で残置すること
test("removeRetiredFiles skips and warns customized files (hash mismatch)", () => {
  const root = mkdtempSync(join(tmpdir(), "takt-cleanup-skip-"));
  try {
    const retiredDir = join(root, ".takt", "workflows");
    mkdirSync(retiredDir, { recursive: true });
    const retiredFile = join(retiredDir, "cc-sdd-full.yaml");
    const originalContent = "original-retired-content";
    const customizedContent = "user-modified-content";
    writeFileSync(retiredFile, customizedContent, "utf-8"); // on-disk = customized

    const manifestKey = ".takt/workflows/cc-sdd-full.yaml";
    const manifest = {
      version: "1.0.0",
      installedAt: "2026-01-01T00:00:00.000Z",
      lang: "en" as const,
      files: { [manifestKey]: sha256(originalContent) }, // manifest records original hash
    };

    removeRetiredFiles(root, manifest, msg);

    // カスタマイズ済みファイルは残置される
    assert.ok(existsSync(retiredFile), "customized retired file must NOT be deleted");
    assert.equal(readFileSync(retiredFile, "utf-8"), customizedContent, "file content must be unchanged");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// Req 5.5 (Invariant): removeRetiredFiles は RETIRED パターン外のファイルに触れない
test("removeRetiredFiles does NOT touch non-retired files even when manifest key differs", () => {
  const root = mkdtempSync(join(tmpdir(), "takt-cleanup-notouch-"));
  try {
    const openspecDir = join(root, "openspec");
    mkdirSync(openspecDir, { recursive: true });
    const userFile = join(openspecDir, "my-change.md");
    const kiroFile = join(root, ".takt", "workflows", "kiro-impl.yaml");
    mkdirSync(join(root, ".takt", "workflows"), { recursive: true });
    writeFileSync(userFile, "user-content", "utf-8");
    writeFileSync(kiroFile, "kiro-content", "utf-8");

    // manifest には kiro-impl と openspec のみ（退役パターンに一致しない）
    const manifest = {
      version: "1.0.0",
      installedAt: "2026-01-01T00:00:00.000Z",
      lang: "en" as const,
      files: {
        "openspec/my-change.md": sha256("user-content"),
        ".takt/workflows/kiro-impl.yaml": sha256("kiro-content"),
      },
    };

    removeRetiredFiles(root, manifest, msg);

    assert.ok(existsSync(userFile), "openspec/ user file must NOT be touched");
    assert.ok(existsSync(kiroFile), "kiro workflow must NOT be touched");
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// Req 5.5 (Invariant): removeLegacyOpsxScript が install.ts から削除されていること（一般化の確認）
test("install.ts source does NOT contain removeLegacyOpsxScript (replaced by removeRetiredFiles)", () => {
  const source = readFileSync(new URL("../src/install.ts", import.meta.url), "utf-8");
  assert.ok(
    !source.includes("removeLegacyOpsxScript"),
    "removeLegacyOpsxScript must be removed and replaced by removeRetiredFiles",
  );
});

// PR #99 review (Devin): install-time usage guidance must not reference retired surfaces
test("usageExamples contain no retired cc-sdd:/opsx:/OpenSpec references (en/ja)", () => {
  for (const lang of ["en", "ja"] as const) {
    const m = getMessages(lang);
    assert.ok(!m.usageExamples.includes("cc-sdd:"), `${lang} usageExamples must not mention cc-sdd: scripts`);
    assert.ok(!m.usageExamples.includes("opsx:"), `${lang} usageExamples must not mention opsx: scripts`);
    assert.ok(!/openspec/i.test(m.usageExamples), `${lang} usageExamples must not mention OpenSpec`);
    assert.ok(m.usageExamples.includes("kiro:"), `${lang} usageExamples must keep kiro:* guidance`);
  }
});

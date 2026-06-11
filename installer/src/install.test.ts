import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import {
  syncRelativeFiles,
  installFromSource,
  resolveSddDependencySet,
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

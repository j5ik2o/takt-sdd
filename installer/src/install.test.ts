import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import {
  CC_SDD_PACKAGE,
  CC_SDD_VERSION,
  OPENSPEC_VERSION,
  CcSddInitError,
  buildCcSddExecArgs,
  initializeCcSddProject,
  syncRelativeFiles,
  installFromSource,
  resolveSddDependencySet,
} from "./install.js";
import { getMessages } from "./i18n.js";

const msg = getMessages("ja");

function sha256(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

// Req 8.1: 固定 version。浮動タグ（"latest"）でないこと。
test("buildCcSddExecArgs uses the fixed cc-sdd version", () => {
  assert.equal(CC_SDD_PACKAGE, "cc-sdd");
  assert.notEqual(CC_SDD_VERSION, "latest");
  assert.equal(CC_SDD_VERSION, "3.0.2");

  const args = buildCcSddExecArgs("/npm", "ja");
  assert.ok(args.includes(`--package=${CC_SDD_PACKAGE}@${CC_SDD_VERSION}`));
});

// Req 8.2: --lang 伝播。連続要素 "--lang","<lang>" を含むこと。
test("buildCcSddExecArgs propagates --lang for ja and en", () => {
  for (const lang of ["ja", "en"] as const) {
    const args = buildCcSddExecArgs("/npm", lang);
    const langIndex = args.indexOf("--lang");
    assert.notEqual(langIndex, -1, `--lang must be present for ${lang}`);
    assert.equal(args[langIndex + 1], lang);
  }
});

// Req 8.3: 失敗時 error。stderr を持つエラーを throw する fake runner を注入すると
// CcSddInitError を throw し、message が stderr 優先で整形されていること。
test("initializeCcSddProject throws CcSddInitError formatted from stderr", () => {
  const failingRun = (): void => {
    throw Object.assign(new Error("exit code 1"), { stderr: "cc-sdd exploded\n" });
  };

  assert.throws(
    () => initializeCcSddProject("/tmp/project", "ja", msg, failingRun),
    (error: unknown) => {
      assert.ok(error instanceof CcSddInitError);
      assert.equal(error.message, "cc-sdd exploded");
      return true;
    },
  );
});

// Req 8.4: dry-run 非起動。正常系では runner が 1 回・正しい引数で呼ばれること、
// かつ dry-run 経路で用いる ccSddDryRunPlan が runner を一切起動せず予定文字列のみを返す（純粋）こと。
// 注: dry-run では install() が early return するため completion path（起動経路）へ到達しない。
test("ccSddDryRunPlan is pure and the success path invokes the runner exactly once", () => {
  const calls: Array<{ file: string; args: readonly string[]; cwd: string }> = [];
  const spyRun = (file: string, args: readonly string[], options: { cwd: string }): void => {
    calls.push({ file, args, cwd: options.cwd });
  };

  initializeCcSddProject("/tmp/project", "ja", msg, spyRun);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].cwd, "/tmp/project");
  assert.ok(calls[0].args.includes(`--package=${CC_SDD_PACKAGE}@${CC_SDD_VERSION}`));
  assert.ok(calls[0].args.includes("--lang"));

  const plan = msg.ccSddDryRunPlan(CC_SDD_VERSION, "ja");
  assert.ok(plan.includes(CC_SDD_VERSION));
  assert.ok(plan.includes("ja"));
  // ccSddDryRunPlan は純粋: runner を一切起動しない。
  assert.equal(calls.length, 1);
});

// Req 7.1 / 7.4: `.takt/.manifest.json` は TAKT asset 同期の記録であり、
// 外部 cc-sdd CLI の失敗で失われると retry が update path に乗れない。
test("install writes the TAKT asset manifest before invoking cc-sdd", () => {
  const source = readFileSync(new URL("../src/install.ts", import.meta.url), "utf-8");
  const manifestWriteIndex = source.indexOf("writeFileSync(manifestPath");
  const ccSddInitIndex = source.indexOf("initializeCcSddProject(options.cwd, options.lang, msg)");

  assert.notEqual(manifestWriteIndex, -1, "manifest write must exist");
  assert.notEqual(ccSddInitIndex, -1, "cc-sdd init wiring must exist");
  assert.ok(
    manifestWriteIndex < ccSddInitIndex,
    "TAKT asset manifest must be persisted before external cc-sdd initialization",
  );
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

// Req 3.5: install() は installFromSource() へ委譲すること。
// installFromSource が export されていること（import で型チェック済み）、かつ
// install() のソーステキストが installFromSource への委譲呼び出しを含むことを
// source-text scan で構造的に固定する。このテストは installFromSource が存在しない場合に
// コンパイルエラー（RED）となり、install() から委譲が削除された場合にランタイム失敗となる。
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

// Req 4.1 / 4.2 / 4.3: OPENSPEC_VERSION 定数は 1.4.1 に整合していること（VersionPolicy）。
// 定数と root package.json の整合検証は task 5.1 が所有するため、ここでは定数値のみを固定する。
test("OPENSPEC_VERSION constant is aligned to 1.4.1", () => {
  assert.equal(OPENSPEC_VERSION, "1.4.1", "OPENSPEC_VERSION must be pinned to 1.4.1");
});

// Req 4.1 / 4.2 / 4.3: resolveSddDependencySet — allowlist 抽出の正常系。
// takt / @fission-ai/openspec / cc-sdd のみが返り、dev-only 依存は含まれない。
test("resolveSddDependencySet extracts only allowlisted SDD deps from dependencies ∪ devDependencies", () => {
  const pkg = {
    dependencies: {
      takt: "0.43.0",
      "@fission-ai/openspec": "1.4.1",
    },
    devDependencies: {
      "cc-sdd": "3.0.2",
      typescript: "5.0.0",
      "@types/node": "20.0.0",
    },
  };
  const result = resolveSddDependencySet(pkg);

  // allowlist の 3 つのみが抽出される
  assert.deepEqual(Object.keys(result).sort(), ["@fission-ai/openspec", "cc-sdd", "takt"].sort());

  // version 文字列は package.json の値をそのまま返す（floating 解決なし）
  assert.equal(result["takt"], "0.43.0");
  assert.equal(result["@fission-ai/openspec"], "1.4.1");
  assert.equal(result["cc-sdd"], "3.0.2");

  // dev-only 依存は含まれない
  assert.equal(result["typescript"], undefined);
  assert.equal(result["@types/node"], undefined);
});

// Req 4.3: 値は package.json に書かれた version 文字列そのもの（"latest" 等の floating 解決なし）。
test("resolveSddDependencySet returns verbatim version strings without resolution", () => {
  const pkg = {
    devDependencies: {
      takt: "^0.43.0",
      "@fission-ai/openspec": "~1.4.0",
      "cc-sdd": "latest",
    },
  };
  const result = resolveSddDependencySet(pkg);
  // 値はそのまま返す（^, ~, latest 等を解決しない）
  assert.equal(result["takt"], "^0.43.0");
  assert.equal(result["@fission-ai/openspec"], "~1.4.0");
  assert.equal(result["cc-sdd"], "latest");
});

// Req 4.1: dependencies と devDependencies の両方から抽出できること。
// devDependencies 側の値が dependencies 側を上書きしないことも確認する。
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

  // devDependencies のみ undefined
  const r3 = resolveSddDependencySet({ dependencies: { "cc-sdd": "3.0.2" } });
  assert.equal(r3["cc-sdd"], "3.0.2");
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
  for (const devOnly of ["typescript", "@types/node", "jest", "eslint", "prettier", "ts-node"]) {
    assert.equal(result[devOnly], undefined, `${devOnly} must not propagate to target project`);
  }

  // allowlist に含まれるものは抽出される
  assert.equal(result["takt"], "0.43.0");
  assert.equal(result["cc-sdd"], "3.0.2");
});

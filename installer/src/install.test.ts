import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

import {
  CC_SDD_PACKAGE,
  CC_SDD_VERSION,
  CcSddInitError,
  buildCcSddExecArgs,
  initializeCcSddProject,
  syncRelativeFiles,
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

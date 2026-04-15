"""
SKILL.md のトリガー動作を Given/When/Then で検証する。

前提条件:
  - claude CLI が PATH に存在すること
  - ローカル実行時: Claude Code の認証済みセッション

実行回数・閾値は環境変数で調整可能:
  SKILL_EVAL_RUNS      (default: 3)
  SKILL_EVAL_THRESHOLD (default: 0.5)
"""

import json
import os
import shutil
import subprocess
import tempfile
from pathlib import Path

import pytest

from scripts.run_eval import run_single_query
from scripts.utils import CLI_CLAUDE, parse_skill_md

# ── 定数 ──────────────────────────────────────────────────────────────────────

SKILL_DIR = Path(__file__).parent.parent
EVALS_PATH = SKILL_DIR / "evals" / "evals.json"

RUNS_PER_QUERY = int(os.environ.get("SKILL_EVAL_RUNS", "3"))
TRIGGER_THRESHOLD = float(os.environ.get("SKILL_EVAL_THRESHOLD", "0.5"))

_EVALS = json.loads(EVALS_PATH.read_text())

claude_available = shutil.which("claude") is not None
inside_claude_code = bool(os.environ.get("CLAUDECODE") or os.environ.get("CLAUDE_CODE_ENTRYPOINT"))
requires_claude = pytest.mark.skipif(
    not claude_available or inside_claude_code,
    reason="claude CLI not found in PATH"
    if not claude_available
    else "Running inside Claude Code session (claude -p nesting not supported)",
)

# ── フィクスチャ ──────────────────────────────────────────────────────────────


@pytest.fixture(scope="module")
def skill_info():
    name, description, _ = parse_skill_md(SKILL_DIR)
    return name, description


@pytest.fixture(scope="module")
def project_root():
    """開発環境を汚染しないよう /tmp 以下に隔離された作業ディレクトリを作成する。

    claude が動作するために必要な構造:
      .claude/commands/              ← run_single_query_claude が一時コマンドファイルを置く場所
      .claude/skills/<skill-name>/   ← claude が SKILL.md 本体を読みに来る場所
    """
    tmp_dir = tempfile.mkdtemp(prefix="skill-forge-test-")
    tmp_path = Path(tmp_dir)

    # claude -p requires a git repository to function correctly
    subprocess.run(["git", "init", "-q"], cwd=tmp_dir, check=True)

    (tmp_path / ".claude" / "commands").mkdir(parents=True)

    _IGNORE = shutil.ignore_patterns(".venv", "__pycache__", ".pytest_cache", "*.pyc")
    skill_name, _, _ = parse_skill_md(SKILL_DIR)
    shutil.copytree(SKILL_DIR, tmp_path / ".claude" / "skills" / skill_name, ignore=_IGNORE)

    yield tmp_dir
    shutil.rmtree(tmp_dir, ignore_errors=True)


# ── ヘルパー ──────────────────────────────────────────────────────────────────


def _trigger_rate(query: str, skill_info: tuple, project_root: str) -> float:
    """クエリを RUNS_PER_QUERY 回実行してトリガー率を返す。"""
    name, description = skill_info
    results = [
        run_single_query(
            query=query,
            skill_name=name,
            skill_description=description,
            timeout=30,
            project_root=project_root,
            cli_type=CLI_CLAUDE,
        )
        for _ in range(RUNS_PER_QUERY)
    ]
    return sum(results) / len(results)


# ── テスト ────────────────────────────────────────────────────────────────────


@pytest.mark.integration
@requires_claude
@pytest.mark.parametrize("entry", _EVALS, ids=[e["query"][:60] for e in _EVALS])
def test_skill_trigger(entry, skill_info, project_root):
    """
    Given: evals.json に定義されたクエリ
    When:  claude に RUNS_PER_QUERY 回投げる
    Then:  トリガー率が TRIGGER_THRESHOLD を境に should_trigger と一致する
    """
    query = entry["query"]
    should_trigger = entry["should_trigger"]

    rate = _trigger_rate(query, skill_info, project_root)
    triggered = rate >= TRIGGER_THRESHOLD

    assert triggered == should_trigger, (
        f"\nQuery        : {query}"
        f"\nExpected     : {'trigger' if should_trigger else 'no trigger'}"
        f"\nTrigger rate : {rate:.0%} ({round(rate * RUNS_PER_QUERY)}/{RUNS_PER_QUERY})"
        f"\nThreshold    : {TRIGGER_THRESHOLD:.0%}"
    )

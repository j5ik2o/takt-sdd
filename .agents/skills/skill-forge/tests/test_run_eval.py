"""Tests for scripts.run_eval module."""

import json
import os
import shutil
import threading
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest

from scripts.run_eval import (
    run_eval,
    run_single_query,
    run_single_query_claude,
    run_single_query_codex,
)
from scripts.utils import CLI_CLAUDE, CLI_CODEX

SKILL_NAME = "skill-forge"


class TestRunSingleQueryDispatch:
    def test_dispatches_to_claude(self):
        with patch("scripts.run_eval.run_single_query_claude", return_value=True) as mock:
            result = run_single_query(
                "test query", "skill", "desc", 10, "/tmp", cli_type=CLI_CLAUDE,
            )
            assert result is True
            mock.assert_called_once()

    def test_dispatches_to_codex(self):
        with patch("scripts.run_eval.run_single_query_codex", return_value=False) as mock:
            result = run_single_query(
                "test query", "skill", "desc", 10, "/tmp", cli_type=CLI_CODEX,
            )
            assert result is False
            mock.assert_called_once()

    def test_passes_cli_command_to_claude(self):
        with patch("scripts.run_eval.run_single_query_claude", return_value=True) as mock:
            run_single_query(
                "q", "s", "d", 10, "/tmp",
                cli_type=CLI_CLAUDE, cli_command="/custom/claude",
            )
            args, _ = mock.call_args
            assert args[-1] == "/custom/claude"

    def test_passes_cli_command_to_codex(self):
        with patch("scripts.run_eval.run_single_query_codex", return_value=True) as mock:
            run_single_query(
                "q", "s", "d", 10, "/tmp",
                cli_type=CLI_CODEX, cli_command="/custom/codex",
            )
            args, _ = mock.call_args
            assert args[-1] == "/custom/codex"


class TestCodexCommandArgs:
    """Verify that the codex exec command is built with valid arguments."""

    def test_no_invalid_approval_flag(self, tmp_path):
        """Ensure -a flag is not used (removed in current codex CLI)."""
        project_root = tmp_path / "project"
        (project_root / ".codex" / "skills").mkdir(parents=True)

        captured_cmd = []

        def capture_popen(cmd, **kwargs):
            captured_cmd.extend(cmd)
            mock_proc = MagicMock()
            mock_proc.poll.side_effect = [0, 0]
            mock_proc.stdout.read.return_value = b'{"type":"turn.completed"}\n'
            mock_proc.stderr.read.return_value = b""
            mock_proc.returncode = 0
            return mock_proc

        with patch("scripts.run_eval_codex.subprocess.Popen", side_effect=capture_popen):
            with patch("scripts.run_eval_codex.select.select", return_value=([], [], [])):
                run_single_query_codex(
                    "test query", "my-skill", "test desc", 5, str(project_root),
                )

        assert "-a" not in captured_cmd, "codex exec should not use -a flag"
        assert "never" not in captured_cmd, "codex exec should not use 'never' argument"

    def test_codex_command_includes_required_flags(self, tmp_path):
        """Verify codex exec includes --json, -s, -C flags."""
        project_root = tmp_path / "project"
        (project_root / ".codex" / "skills").mkdir(parents=True)

        captured_cmd = []

        def capture_popen(cmd, **kwargs):
            captured_cmd.extend(cmd)
            mock_proc = MagicMock()
            mock_proc.poll.side_effect = [0, 0]
            mock_proc.stdout.read.return_value = b'{"type":"turn.completed"}\n'
            mock_proc.stderr.read.return_value = b""
            mock_proc.returncode = 0
            return mock_proc

        with patch("scripts.run_eval_codex.subprocess.Popen", side_effect=capture_popen):
            with patch("scripts.run_eval_codex.select.select", return_value=([], [], [])):
                run_single_query_codex(
                    "test query", "my-skill", "test desc", 5, str(project_root),
                )

        assert "exec" in captured_cmd
        assert "--json" in captured_cmd
        assert "-s" in captured_cmd
        assert "read-only" in captured_cmd
        assert "-C" in captured_cmd


class TestCliExitCodeHandling:
    """Verify that non-zero CLI exit codes raise RuntimeError."""

    def test_codex_nonzero_exit_raises(self, tmp_path):
        project_root = tmp_path / "project"
        (project_root / ".codex" / "skills").mkdir(parents=True)

        mock_process = MagicMock()
        mock_process.poll.side_effect = [0, 0]
        mock_process.stdout.read.return_value = b""
        mock_process.stdout.fileno.return_value = 0
        mock_process.stderr.read.return_value = b"codex: unknown option '-a'"
        mock_process.returncode = 1

        with patch("scripts.run_eval_codex.subprocess.Popen", return_value=mock_process):
            with patch("scripts.run_eval_codex.select.select", return_value=([], [], [])):
                with pytest.raises(RuntimeError, match="Codex CLI exited with code 1"):
                    run_single_query_codex(
                        "test query", "my-skill", "test desc", 5, str(project_root),
                    )

    def test_run_eval_tracks_errors_in_summary(self):
        """Verify that CLI errors are counted in summary.errors."""
        eval_set = [
            {"query": "error query", "should_trigger": True},
            {"query": "ok query", "should_trigger": True},
        ]

        def mock_run(query, *args, **kwargs):
            if query == "error query":
                raise RuntimeError("CLI crashed")
            return True

        with patch("scripts.run_eval.ProcessPoolExecutor", ThreadPoolExecutor):
            with patch("scripts.run_eval.run_single_query", side_effect=mock_run):
                result = run_eval(
                    eval_set=eval_set,
                    skill_name="test",
                    description="test desc",
                    num_workers=1,
                    timeout=10,
                    project_root=Path("/tmp"),
                    runs_per_query=1,
                    cli_type=CLI_CLAUDE,
                )

        assert result["summary"]["errors"] == 1
        error_results = [r for r in result["results"] if r.get("errors")]
        assert len(error_results) == 1
        assert "CLI crashed" in error_results[0]["errors"][0]


class TestRunSingleQueryClaude:
    def _make_process_mock(self, output_lines: list[str]):
        output = ("\n".join(output_lines) + "\n").encode()
        mock_process = MagicMock()
        mock_process.poll.side_effect = [None, 0]
        mock_process.stdout.read.return_value = b""
        mock_process.stdout.fileno.return_value = 0
        mock_process.stderr.read.return_value = b""
        mock_process.returncode = 0
        return mock_process, output

    def test_detects_canonical_skill_name_from_assistant_tool_use(self, tmp_path):
        project_root = tmp_path / "project"
        project_root.mkdir()

        events = [
            json.dumps({
                "type": "assistant",
                "message": {
                    "content": [
                        {"type": "tool_use", "name": "Skill", "input": {"skill": SKILL_NAME}},
                    ],
                },
            }),
            json.dumps({"type": "result"}),
        ]
        mock_process, output = self._make_process_mock(events)

        with patch("scripts.run_eval_claude.subprocess.Popen", return_value=mock_process):
            with patch("scripts.run_eval_claude.select.select", return_value=([mock_process.stdout], [], [])):
                with patch("scripts.run_eval_claude.os.read", return_value=output):
                    result = run_single_query_claude(
                        "test query", SKILL_NAME, "test desc", 5, str(project_root),
                    )

        assert result is True

    def test_ignores_non_matching_tool_before_skill_trigger(self, tmp_path):
        project_root = tmp_path / "project"
        project_root.mkdir()

        events = [
            json.dumps({
                "type": "assistant",
                "message": {
                    "content": [
                        {"type": "tool_use", "name": "Bash", "input": {"command": "pwd"}},
                    ],
                },
            }),
            json.dumps({
                "type": "assistant",
                "message": {
                    "content": [
                        {"type": "tool_use", "name": "Skill", "input": {"skill": SKILL_NAME}},
                    ],
                },
            }),
            json.dumps({"type": "result"}),
        ]
        mock_process, output = self._make_process_mock(events)

        with patch("scripts.run_eval_claude.subprocess.Popen", return_value=mock_process):
            with patch("scripts.run_eval_claude.select.select", return_value=([mock_process.stdout], [], [])):
                with patch("scripts.run_eval_claude.os.read", return_value=output):
                    result = run_single_query_claude(
                        "test query", SKILL_NAME, "test desc", 5, str(project_root),
                    )

        assert result is True

    def test_detects_skill_path_from_read_tool_use(self, tmp_path):
        project_root = tmp_path / "project"
        project_root.mkdir()

        events = [
            json.dumps({
                "type": "assistant",
                "message": {
                    "content": [
                        {
                            "type": "tool_use",
                            "name": "Read",
                            "input": {
                                "file_path": str(project_root / ".claude" / "skills" / SKILL_NAME / "SKILL.md"),
                            },
                        },
                    ],
                },
            }),
            json.dumps({"type": "result"}),
        ]
        mock_process, output = self._make_process_mock(events)

        with patch("scripts.run_eval_claude.subprocess.Popen", return_value=mock_process):
            with patch("scripts.run_eval_claude.select.select", return_value=([mock_process.stdout], [], [])):
                with patch("scripts.run_eval_claude.os.read", return_value=output):
                    result = run_single_query_claude(
                        "test query", SKILL_NAME, "test desc", 5, str(project_root),
                    )

        assert result is True

    def test_uses_isolated_workspace_for_temp_command_even_with_override(self, tmp_path):
        project_root = tmp_path / "project"
        project_root.mkdir()
        claude_home = tmp_path / "custom-claude-home"
        observed = {}

        events = [
            json.dumps({"type": "result"}),
        ]
        mock_process, output = self._make_process_mock(events)

        with patch.dict(os.environ, {"SKILL_FORGE_CLAUDE_HOME": str(claude_home)}, clear=True):
            def capture_popen(*args, **kwargs):
                observed["cwd"] = Path(kwargs["cwd"])
                observed["claude_home"] = Path(kwargs["env"]["SKILL_FORGE_CLAUDE_HOME"])
                return mock_process

            with patch("scripts.run_eval_claude.subprocess.Popen", side_effect=capture_popen):
                with patch("scripts.run_eval_claude.select.select", return_value=([mock_process.stdout], [], [])):
                    with patch("scripts.run_eval_claude.os.read", return_value=output):
                        result = run_single_query_claude(
                            "test query", SKILL_NAME, "test desc", 5, str(project_root),
                        )

        assert result is False
        assert observed["cwd"] == project_root
        assert observed["claude_home"].parent == project_root
        assert not observed["claude_home"].exists()
        assert not (claude_home / "commands").exists()
        assert not (project_root / ".claude").exists()

    def test_detects_skill_path_from_override_claude_home(self, tmp_path):
        project_root = tmp_path / "project"
        project_root.mkdir()
        claude_home = tmp_path / "custom-claude-home"

        events = [
            json.dumps({
                "type": "assistant",
                "message": {
                    "content": [
                        {
                            "type": "tool_use",
                            "name": "Read",
                            "input": {
                                "file_path": str(claude_home / "skills" / SKILL_NAME / "SKILL.md"),
                            },
                        },
                    ],
                },
            }),
            json.dumps({"type": "result"}),
        ]
        mock_process, output = self._make_process_mock(events)

        with patch.dict(os.environ, {"SKILL_FORGE_CLAUDE_HOME": str(claude_home)}, clear=True):
            with patch("scripts.run_eval_claude.subprocess.Popen", return_value=mock_process):
                with patch("scripts.run_eval_claude.select.select", return_value=([mock_process.stdout], [], [])):
                    with patch("scripts.run_eval_claude.os.read", return_value=output):
                        result = run_single_query_claude(
                            "test query", SKILL_NAME, "test desc", 5, str(project_root),
                        )

        assert result is True

    def test_detects_relative_skill_path_from_read_tool_use(self, tmp_path):
        project_root = tmp_path / "project"
        project_root.mkdir()
        claude_home = tmp_path / "custom-claude-home"

        events = [
            json.dumps({
                "type": "assistant",
                "message": {
                    "content": [
                        {
                            "type": "tool_use",
                            "name": "Read",
                            "input": {
                                "file_path": f"skills/{SKILL_NAME}/SKILL.md",
                            },
                        },
                    ],
                },
            }),
            json.dumps({"type": "result"}),
        ]
        mock_process, output = self._make_process_mock(events)

        with patch.dict(os.environ, {"SKILL_FORGE_CLAUDE_HOME": str(claude_home)}, clear=True):
            with patch("scripts.run_eval_claude.subprocess.Popen", return_value=mock_process):
                with patch("scripts.run_eval_claude.select.select", return_value=([mock_process.stdout], [], [])):
                    with patch("scripts.run_eval_claude.os.read", return_value=output):
                        result = run_single_query_claude(
                            "test query", SKILL_NAME, "test desc", 5, str(project_root),
                        )

        assert result is True


class TestRunSingleQueryCodex:
    def _make_process_mock(self, output_lines: list[str]):
        """Create a mock process that yields output_lines then exits."""
        output = ("\n".join(output_lines) + "\n").encode()
        mock_process = MagicMock()
        # First poll returns None (running), then 0 (done), then 0 (finally block check)
        mock_process.poll.side_effect = [None, 0, 0]
        mock_process.stdout.read.return_value = output
        mock_process.stdout.fileno.return_value = 0
        mock_process.stderr.read.return_value = b""
        mock_process.returncode = 0
        return mock_process

    def test_creates_and_cleans_temp_skill(self, tmp_path):
        """Verify temp skill dir is created and cleaned up."""
        project_root = tmp_path / "project"
        (project_root / ".codex" / "skills").mkdir(parents=True)

        events = [
            json.dumps({"type": "turn.completed", "usage": {}}),
        ]
        mock_process = self._make_process_mock(events)

        with patch("scripts.run_eval_codex.subprocess.Popen", return_value=mock_process):
            with patch("scripts.run_eval_codex.select.select", return_value=([], [], [])):
                result = run_single_query_codex(
                    "test query", "my-skill", "test desc", 5, str(project_root),
                )

        assert result is False
        # Temp skill dir should be cleaned up
        skill_dirs = list((project_root / ".codex" / "skills").iterdir())
        assert len(skill_dirs) == 0

    def test_creates_and_cleans_temp_skill_in_codex_home_override(self, tmp_path):
        project_root = tmp_path / "project"
        project_root.mkdir(parents=True)
        codex_home = tmp_path / "custom-codex-home"

        events = [
            json.dumps({"type": "turn.completed", "usage": {}}),
        ]
        mock_process = self._make_process_mock(events)

        with patch.dict(os.environ, {"CODEX_HOME": str(codex_home)}, clear=True):
            with patch("scripts.run_eval_codex.subprocess.Popen", return_value=mock_process):
                with patch("scripts.run_eval_codex.select.select", return_value=([], [], [])):
                    result = run_single_query_codex(
                        "test query", "my-skill", "test desc", 5, str(project_root),
                    )

        assert result is False
        assert (codex_home / "skills").is_dir()
        assert not (project_root / ".codex").exists()
        assert not any((codex_home / "skills").iterdir())

    def test_detects_marker_in_agent_message(self, tmp_path):
        """Verify marker detection in codex JSONL output."""
        project_root = tmp_path / "project"
        (project_root / ".codex" / "skills").mkdir(parents=True)

        with patch("scripts.run_eval_codex.uuid.uuid4") as mock_uuid:
            mock_uuid.return_value.hex = "abcd1234xxxxxxxxxxxxxxxx"
            marker = "[SKILL_TRIGGERED:abcd1234]"

            events = [
                json.dumps({"type": "item.completed", "item": {"type": "agent_message", "text": f"Result {marker} done."}}),
                json.dumps({"type": "turn.completed", "usage": {}}),
            ]
            output = ("\n".join(events) + "\n").encode()

            mock_process = MagicMock()
            # Return None first (process running), read stdout, then 0 (done)
            mock_process.poll.side_effect = [None, 0]
            mock_process.stdout.fileno.return_value = 0
            mock_process.stdout.read.return_value = output
            mock_process.stderr.read.return_value = b""
            mock_process.returncode = 0

            with patch("scripts.run_eval_codex.subprocess.Popen", return_value=mock_process):
                with patch("scripts.run_eval_codex.select.select", return_value=([mock_process.stdout], [], [])):
                    with patch("scripts.run_eval_codex.os.read", return_value=output):
                        result = run_single_query_codex(
                            "test query", "my-skill", "test desc", 5, str(project_root),
                        )

            assert result is True

    def test_no_trigger_returns_false(self, tmp_path):
        """No marker in output means not triggered."""
        project_root = tmp_path / "project"
        (project_root / ".codex" / "skills").mkdir(parents=True)

        events = [
            json.dumps({"type": "item.completed", "item": {"type": "agent_message", "text": "No skill here."}}),
            json.dumps({"type": "turn.completed", "usage": {}}),
        ]
        output = ("\n".join(events) + "\n").encode()

        mock_process = MagicMock()
        mock_process.poll.side_effect = [None, 0]
        mock_process.stdout.fileno.return_value = 0
        mock_process.stdout.read.return_value = output
        mock_process.stderr.read.return_value = b""
        mock_process.returncode = 0

        with patch("scripts.run_eval_codex.subprocess.Popen", return_value=mock_process):
            with patch("scripts.run_eval_codex.select.select", return_value=([mock_process.stdout], [], [])):
                with patch("scripts.run_eval_codex.os.read", return_value=output):
                    result = run_single_query_codex(
                        "test query", "my-skill", "test desc", 5, str(project_root),
                    )

        assert result is False


class TestRunEval:
    def test_basic_eval(self):
        """Test that run_eval correctly aggregates results."""
        eval_set = [
            {"query": "trigger me", "should_trigger": True},
            {"query": "ignore me", "should_trigger": False},
        ]

        def mock_run_single(query, *args, **kwargs):
            return query == "trigger me"

        # Patch ProcessPoolExecutor to use ThreadPoolExecutor (avoids pickle issues)
        with patch("scripts.run_eval.ProcessPoolExecutor", ThreadPoolExecutor):
            with patch("scripts.run_eval.run_single_query", side_effect=mock_run_single):
                result = run_eval(
                    eval_set=eval_set,
                    skill_name="test",
                    description="test desc",
                    num_workers=1,
                    timeout=10,
                    project_root=Path("/tmp"),
                    runs_per_query=1,
                    trigger_threshold=0.5,
                    cli_type=CLI_CLAUDE,
                )

        assert result["summary"]["total"] == 2
        assert result["summary"]["passed"] == 2
        assert result["summary"]["failed"] == 0

    def test_eval_with_failures(self):
        eval_set = [
            {"query": "should trigger", "should_trigger": True},
            {"query": "should not trigger", "should_trigger": False},
        ]

        # Both return False
        with patch("scripts.run_eval.ProcessPoolExecutor", ThreadPoolExecutor):
            with patch("scripts.run_eval.run_single_query", return_value=False):
                result = run_eval(
                    eval_set=eval_set,
                    skill_name="test",
                    description="test desc",
                    num_workers=1,
                    timeout=10,
                    project_root=Path("/tmp"),
                    runs_per_query=1,
                    trigger_threshold=0.5,
                    cli_type=CLI_CLAUDE,
                )

        # "should trigger" → False → FAIL, "should not trigger" → False → PASS
        assert result["summary"]["passed"] == 1
        assert result["summary"]["failed"] == 1

    def test_passes_cli_type_and_command(self):
        eval_set = [{"query": "q", "should_trigger": True}]
        calls = []

        def capture_call(*args, **kwargs):
            calls.append((args, kwargs))
            return True

        with patch("scripts.run_eval.ProcessPoolExecutor", ThreadPoolExecutor):
            with patch("scripts.run_eval.run_single_query", side_effect=capture_call):
                run_eval(
                    eval_set=eval_set,
                    skill_name="test",
                    description="desc",
                    num_workers=1,
                    timeout=10,
                    project_root=Path("/tmp"),
                    runs_per_query=1,
                    cli_type=CLI_CODEX,
                    cli_command="/custom/codex",
                )

        assert len(calls) == 1
        args, _ = calls[0]
        # args: query, skill_name, description, timeout, project_root, model, cli_type, cli_command
        assert args[6] == CLI_CODEX
        assert args[7] == "/custom/codex"

    def test_multiple_runs_per_query(self):
        eval_set = [{"query": "test", "should_trigger": True}]
        call_count = 0

        def count_calls(*args, **kwargs):
            nonlocal call_count
            call_count += 1
            return True

        with patch("scripts.run_eval.ProcessPoolExecutor", ThreadPoolExecutor):
            with patch("scripts.run_eval.run_single_query", side_effect=count_calls):
                result = run_eval(
                    eval_set=eval_set,
                    skill_name="test",
                    description="desc",
                    num_workers=1,
                    timeout=10,
                    project_root=Path("/tmp"),
                    runs_per_query=3,
                    cli_type=CLI_CLAUDE,
                )

        assert call_count == 3
        assert result["results"][0]["runs"] == 3
        assert result["results"][0]["triggers"] == 3

    def test_query_with_only_errors_is_marked_failed(self):
        eval_set = [{"query": "do not trigger", "should_trigger": False}]

        with patch("scripts.run_eval.ProcessPoolExecutor", ThreadPoolExecutor):
            with patch("scripts.run_eval.run_single_query", side_effect=RuntimeError("CLI crashed")):
                result = run_eval(
                    eval_set=eval_set,
                    skill_name="test",
                    description="desc",
                    num_workers=1,
                    timeout=10,
                    project_root=Path("/tmp"),
                    runs_per_query=1,
                    trigger_threshold=0.5,
                    cli_type=CLI_CLAUDE,
                )

        assert result["summary"]["failed"] == 1
        assert result["summary"]["errors"] == 1
        assert result["results"][0]["runs"] == 0
        assert result["results"][0]["pass"] is False
        assert result["results"][0]["error_count"] == 1


class TestTemporarySkillNames:
    def test_codex_temp_skill_keeps_original_visible_name(self, tmp_path):
        project_root = tmp_path / "project"
        (project_root / ".codex" / "skills").mkdir(parents=True)

        observed = {}

        def capture_popen(cmd, **kwargs):
            skill_root = project_root / ".codex" / "skills"
            skill_file = next(skill_root.glob("*/SKILL.md"))
            observed["path"] = skill_file
            observed["content"] = skill_file.read_text()

            mock_process = MagicMock()
            mock_process.poll.side_effect = [0, 0]
            mock_process.stdout.read.return_value = b'{"type":"turn.completed"}\n'
            mock_process.stderr.read.return_value = b""
            mock_process.returncode = 0
            return mock_process

        with patch.dict(os.environ, {}, clear=True):
            with patch("scripts.run_eval_codex.subprocess.Popen", side_effect=capture_popen):
                with patch("scripts.run_eval_codex.select.select", return_value=([], [], [])):
                    run_single_query_codex(
                        "test query", SKILL_NAME, "test desc", 5, str(project_root),
                    )

        assert observed["path"].parent.name.startswith(f"{SKILL_NAME}-skill-")
        assert "name: skill-forge\n" in observed["content"]
        assert f"name: {SKILL_NAME}-skill-" not in observed["content"]

    def test_claude_temp_command_keeps_original_visible_name(self, tmp_path):
        project_root = tmp_path / "project"
        project_root.mkdir()

        observed = {}

        def capture_popen(cmd, **kwargs):
            command_root = Path(kwargs["env"]["SKILL_FORGE_CLAUDE_HOME"]) / "commands"
            command_file = next(command_root.glob("*.md"))
            observed["path"] = command_file
            observed["content"] = command_file.read_text()

            mock_process = MagicMock()
            mock_process.poll.side_effect = [0, 0]
            mock_process.stdout.read.return_value = b'{"type":"result"}\n'
            mock_process.stderr.read.return_value = b""
            mock_process.returncode = 0
            return mock_process

        with patch("scripts.run_eval_claude.subprocess.Popen", side_effect=capture_popen):
            with patch("scripts.run_eval_claude.select.select", return_value=([], [], [])):
                run_single_query_claude(
                    "test query", SKILL_NAME, "test desc", 5, str(project_root),
                )

        assert observed["path"].name == f"{SKILL_NAME}.md"
        assert f"# {SKILL_NAME}\n" in observed["content"]

    def test_codex_temp_skill_paths_are_isolated_per_run(self, tmp_path):
        project_root = tmp_path / "project"
        (project_root / ".codex" / "skills").mkdir(parents=True)

        observed_snapshots = []
        observed_lock = threading.Lock()
        barrier = threading.Barrier(2)

        def capture_popen(cmd, **kwargs):
            skill_root = project_root / ".codex" / "skills"
            barrier.wait(timeout=2)
            snapshot = sorted(path.name for path in skill_root.iterdir())
            with observed_lock:
                observed_snapshots.append(snapshot)

            mock_process = MagicMock()
            mock_process.poll.side_effect = [0, 0]
            mock_process.stdout.read.return_value = b'{"type":"turn.completed"}\n'
            mock_process.stderr.read.return_value = b""
            mock_process.returncode = 0
            return mock_process

        with patch.dict(os.environ, {}, clear=True):
            with patch("scripts.run_eval_codex.subprocess.Popen", side_effect=capture_popen):
                with patch("scripts.run_eval_codex.select.select", return_value=([], [], [])):
                    with ThreadPoolExecutor(max_workers=2) as executor:
                        futures = [
                            executor.submit(
                                run_single_query_codex,
                                "test query",
                                SKILL_NAME,
                                "test desc",
                                5,
                                str(project_root),
                            )
                            for _ in range(2)
                        ]
                        for future in futures:
                            assert future.result() is False

        assert len(observed_snapshots) == 2
        assert all(len(snapshot) == 2 for snapshot in observed_snapshots)
        assert all(len(set(snapshot)) == 2 for snapshot in observed_snapshots)

    def test_claude_temp_command_paths_are_isolated_per_run(self, tmp_path):
        project_root = tmp_path / "project"
        project_root.mkdir()

        observed_paths = []
        observed_lock = threading.Lock()
        barrier = threading.Barrier(2)

        def capture_popen(cmd, **kwargs):
            claude_home = Path(kwargs["env"]["SKILL_FORGE_CLAUDE_HOME"])
            command_root = claude_home / "commands"
            barrier.wait(timeout=2)
            snapshot = sorted(path.name for path in command_root.glob("*.md"))
            with observed_lock:
                observed_paths.append((claude_home.name, snapshot))

            mock_process = MagicMock()
            mock_process.poll.side_effect = [0, 0]
            mock_process.stdout.read.return_value = b'{"type":"result"}\n'
            mock_process.stderr.read.return_value = b""
            mock_process.returncode = 0
            return mock_process

        with patch("scripts.run_eval_claude.subprocess.Popen", side_effect=capture_popen):
            with patch("scripts.run_eval_claude.select.select", return_value=([], [], [])):
                with ThreadPoolExecutor(max_workers=2) as executor:
                    futures = [
                        executor.submit(
                            run_single_query_claude,
                            "test query",
                            SKILL_NAME,
                            "test desc",
                            5,
                            str(project_root),
                        )
                        for _ in range(2)
                    ]
                    for future in futures:
                        assert future.result() is False

        assert len(observed_paths) == 2
        assert len({path for path, _ in observed_paths}) == 2
        assert all(snapshot == [f"{SKILL_NAME}.md"] for _, snapshot in observed_paths)

    def test_claude_runs_in_project_root_with_isolated_home(self, tmp_path):
        project_root = tmp_path / "project"
        project_root.mkdir()

        observed = {}

        def capture_popen(cmd, **kwargs):
            observed["cwd"] = Path(kwargs["cwd"])
            observed["claude_home"] = Path(kwargs["env"]["SKILL_FORGE_CLAUDE_HOME"])

            mock_process = MagicMock()
            mock_process.poll.side_effect = [0, 0]
            mock_process.stdout.read.return_value = b'{"type":"result"}\n'
            mock_process.stderr.read.return_value = b""
            mock_process.returncode = 0
            return mock_process

        with patch("scripts.run_eval_claude.subprocess.Popen", side_effect=capture_popen):
            with patch("scripts.run_eval_claude.select.select", return_value=([], [], [])):
                result = run_single_query_claude(
                    "test query", SKILL_NAME, "test desc", 5, str(project_root),
                )

        assert result is False
        assert observed["cwd"] == project_root
        assert observed["claude_home"].parent == project_root
        assert not observed["claude_home"].exists()

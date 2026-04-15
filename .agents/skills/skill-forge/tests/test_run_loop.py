"""Tests for scripts.run_loop module."""

from pathlib import Path
from unittest.mock import patch

from scripts.run_loop import run_loop
from scripts.utils import CLI_CODEX


class TestRunLoop:
    def test_passes_cli_settings_to_improve_description_without_api_client(self, monkeypatch):
        eval_set = [{"query": "trigger me", "should_trigger": True}]
        failed_eval = {
            "results": [
                {
                    "query": "trigger me",
                    "should_trigger": True,
                    "trigger_rate": 0.0,
                    "triggers": 0,
                    "runs": 1,
                    "pass": False,
                }
            ],
            "summary": {"passed": 0, "failed": 1, "total": 1},
        }
        passed_eval = {
            "results": [
                {
                    "query": "trigger me",
                    "should_trigger": True,
                    "trigger_rate": 1.0,
                    "triggers": 1,
                    "runs": 1,
                    "pass": True,
                }
            ],
            "summary": {"passed": 1, "failed": 0, "total": 1},
        }

        with patch("scripts.run_loop.find_project_root", return_value=Path("/tmp/project")):
            with patch("scripts.run_loop.parse_skill_md", return_value=("skill-forge", "old desc", "# skill")):
                with patch("scripts.run_loop.run_eval", side_effect=[failed_eval, passed_eval]):
                    with patch("scripts.run_loop.improve_description", return_value="new desc") as mock_improve:
                        result = run_loop(
                            eval_set=eval_set,
                            skill_path=Path("/tmp/skill-forge"),
                            description_override=None,
                            num_workers=1,
                            timeout=10,
                            max_iterations=2,
                            runs_per_query=1,
                            trigger_threshold=0.5,
                            holdout=0.0,
                            model="test-model",
                            verbose=False,
                            cli_type=CLI_CODEX,
                            cli_command="/custom/codex",
                        )

        assert result["best_description"] == "new desc"
        assert mock_improve.call_args.kwargs["cli_type"] == CLI_CODEX
        assert mock_improve.call_args.kwargs["cli_command"] == "/custom/codex"

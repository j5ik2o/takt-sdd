"""Tests for scripts.improve_description module."""

import json

import scripts.improve_description as improve_description_module
from scripts.utils import CLI_CLAUDE


class TestImproveDescriptionMain:
    def test_main_accepts_cli_options_without_api_client(self, monkeypatch, tmp_path, capsys):
        skill_path = tmp_path / "skill-forge"
        skill_path.mkdir()
        (skill_path / "SKILL.md").write_text(
            "---\n"
            "name: skill-forge\n"
            "description: old desc\n"
            "---\n\n"
            "# Skill Forge\n"
        )

        eval_results_path = tmp_path / "eval-results.json"
        eval_results_path.write_text(
            json.dumps(
                {
                    "description": "old desc",
                    "results": [],
                    "summary": {"passed": 0, "failed": 1, "total": 1},
                }
            )
        )

        observed = {}

        def fake_improve_description(**kwargs):
            observed.update(kwargs)
            return "new desc"

        monkeypatch.setattr(improve_description_module, "improve_description", fake_improve_description)
        monkeypatch.setattr(
            "sys.argv",
            [
                "improve_description.py",
                "--eval-results",
                str(eval_results_path),
                "--skill-path",
                str(skill_path),
                "--model",
                "claude-sonnet",
                "--cli",
                "claude",
                "--cli-command",
                "/custom/claude",
            ],
        )

        improve_description_module.main()

        output = json.loads(capsys.readouterr().out)
        assert output["description"] == "new desc"
        assert observed["cli_type"] == CLI_CLAUDE
        assert observed["cli_command"] == "/custom/claude"
        assert observed["skill_name"] == "skill-forge"

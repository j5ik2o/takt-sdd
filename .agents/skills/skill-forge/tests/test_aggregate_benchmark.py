"""Tests for scripts.aggregate_benchmark module."""

import pytest

from scripts.aggregate_benchmark import load_run_results


class TestLoadRunResults:
    def test_rejects_mixed_workspace_and_legacy_layouts(self, tmp_path):
        workspace_eval = tmp_path / "eval-0" / "with_skill" / "run-1"
        workspace_eval.mkdir(parents=True)
        (workspace_eval / "grading.json").write_text(
            '{"summary":{"pass_rate":1.0,"passed":1,"failed":0,"total":1}}'
        )

        legacy_eval = tmp_path / "runs" / "eval-0" / "with_skill" / "run-1"
        legacy_eval.mkdir(parents=True)
        (legacy_eval / "grading.json").write_text(
            '{"summary":{"pass_rate":1.0,"passed":1,"failed":0,"total":1}}'
        )

        with pytest.raises(ValueError, match="Both workspace and legacy benchmark layouts exist"):
            load_run_results(tmp_path)

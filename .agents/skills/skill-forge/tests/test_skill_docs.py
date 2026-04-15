"""Regression tests for skill-forge docs and dependency metadata."""

from pathlib import Path

from scripts.utils import parse_skill_md


SKILL_DIR = Path(__file__).parent.parent


class TestSkillDocs:
    def test_frontmatter_description_mentions_existing_skill_and_boundary(self):
        _, description, _ = parse_skill_md(SKILL_DIR)

        assert "improving an existing skill" in description
        assert "generic automation/workflow setup" in description
        assert "GitHub Actions" in description
        assert "database migrations" in description
        assert "turn this workflow into a skill" in description

    def test_description_optimization_requires_boundary_extraction(self):
        skill_md = (SKILL_DIR / "SKILL.md").read_text()

        assert "read the target skill's `SKILL.md`" in skill_md
        assert "`helps with`" in skill_md
        assert "`should not help with`" in skill_md

    def test_description_optimization_does_not_reference_anthropic_api(self):
        skill_md = (SKILL_DIR / "SKILL.md").read_text()

        assert "improvement step always uses the Anthropic API directly" not in skill_md
        assert "No separate Anthropic API client setup is required" in skill_md


class TestProjectMetadata:
    def test_pyproject_does_not_depend_on_anthropic(self):
        pyproject = (SKILL_DIR / "pyproject.toml").read_text()

        assert '"anthropic"' not in pyproject

"""Shared utilities for skill-forge scripts."""

import os
import shutil
import sys
from pathlib import Path

CLI_CLAUDE = "claude"
CLI_CODEX = "codex"


def get_default_cli_home_name(cli_type: str) -> str:
    """Return the default home directory name for the CLI."""
    if cli_type == CLI_CODEX:
        return ".codex"
    return ".claude"


def get_cli_command(cli_type: str, explicit_path: str | None = None) -> str:
    """Return the actual CLI command for the given CLI type.

    Priority: explicit_path argument > environment variable > default name.
      - SKILL_FORGE_CLAUDE_COMMAND: override the 'claude' binary (e.g. '/usr/local/bin/claude')
      - SKILL_FORGE_CODEX_COMMAND: override the 'codex' binary (e.g. '/opt/bin/codex')
    """
    if explicit_path:
        return explicit_path
    if cli_type == CLI_CLAUDE:
        return os.environ.get("SKILL_FORGE_CLAUDE_COMMAND", "claude")
    if cli_type == CLI_CODEX:
        return os.environ.get("SKILL_FORGE_CODEX_COMMAND", "codex")
    return cli_type


def detect_cli(explicit: str | None = None) -> str:
    """Detect which CLI to use. Returns CLI_CLAUDE or CLI_CODEX.

    Priority: explicit flag > SKILL_FORGE_EVAL_CLI env var > auto-detect.
    Auto-detection respects SKILL_FORGE_CLAUDE_COMMAND / SKILL_FORGE_CODEX_COMMAND env vars.
    """
    if explicit:
        if explicit not in (CLI_CLAUDE, CLI_CODEX):
            raise ValueError(f"Unknown CLI: {explicit}. Use 'claude' or 'codex'.")
        return explicit

    env_val = os.environ.get("SKILL_FORGE_EVAL_CLI")
    if env_val:
        if env_val not in (CLI_CLAUDE, CLI_CODEX):
            raise ValueError(f"Unknown SKILL_FORGE_EVAL_CLI value: {env_val}. Use 'claude' or 'codex'.")
        return env_val

    has_claude = shutil.which(get_cli_command(CLI_CLAUDE))
    has_codex = shutil.which(get_cli_command(CLI_CODEX))

    if has_claude and has_codex:
        print(
            "Warning: Both 'claude' and 'codex' CLIs found. Defaulting to 'claude'. "
            "Use --cli or SKILL_FORGE_EVAL_CLI to specify explicitly.",
            file=sys.stderr,
        )
        return CLI_CLAUDE
    if has_claude:
        return CLI_CLAUDE
    if has_codex:
        return CLI_CODEX

    raise RuntimeError("Neither 'claude' nor 'codex' CLI found in PATH")


def find_project_root(cli_type: str = CLI_CLAUDE) -> Path:
    """Find the project root by walking up from cwd.

    Prefers the nearest CLI home marker and falls back to the nearest git root.
    """
    current = Path.cwd()
    marker = get_default_cli_home_name(cli_type)
    parents = [current, *current.parents]

    for parent in parents:
        if (parent / marker).is_dir():
            return parent

    for parent in parents:
        if (parent / ".git").exists():
            return parent

    return current


def resolve_cli_home(cli_type: str, project_root: Path | None = None) -> Path:
    """Resolve the effective CLI home directory."""
    override_var = "SKILL_FORGE_CLAUDE_HOME" if cli_type == CLI_CLAUDE else "CODEX_HOME"
    override = os.environ.get(override_var)
    if override:
        return Path(override).expanduser()

    base_root = project_root if project_root is not None else find_project_root(cli_type)
    return base_root / get_default_cli_home_name(cli_type)


def resolve_skill_dir(cli_type: str, project_root: Path | None = None) -> Path:
    """Resolve the effective skills directory for the CLI."""
    return resolve_cli_home(cli_type, project_root) / "skills"


def parse_skill_md(skill_path: Path) -> tuple[str, str, str]:
    """Parse a SKILL.md file, returning (name, description, full_content)."""
    content = (skill_path / "SKILL.md").read_text()
    lines = content.split("\n")

    if lines[0].strip() != "---":
        raise ValueError("SKILL.md missing frontmatter (no opening ---)")

    end_idx = None
    for i, line in enumerate(lines[1:], start=1):
        if line.strip() == "---":
            end_idx = i
            break

    if end_idx is None:
        raise ValueError("SKILL.md missing frontmatter (no closing ---)")

    name = ""
    description = ""
    frontmatter_lines = lines[1:end_idx]
    i = 0
    while i < len(frontmatter_lines):
        line = frontmatter_lines[i]
        if line.startswith("name:"):
            name = line[len("name:"):].strip().strip('"').strip("'")
        elif line.startswith("description:"):
            value = line[len("description:"):].strip()
            # Handle YAML multiline indicators (>, |, >-, |-)
            if value in (">", "|", ">-", "|-"):
                continuation_lines: list[str] = []
                i += 1
                while i < len(frontmatter_lines) and (frontmatter_lines[i].startswith("  ") or frontmatter_lines[i].startswith("\t")):
                    continuation_lines.append(frontmatter_lines[i].strip())
                    i += 1
                description = " ".join(continuation_lines)
                continue
            else:
                description = value.strip('"').strip("'")
        i += 1

    return name, description, content

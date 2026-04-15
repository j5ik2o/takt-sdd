"""Codex-specific trigger evaluation helpers."""

import json
import os
import select
import shutil
import subprocess
import time
import uuid
from pathlib import Path

from scripts.utils import CLI_CODEX, get_cli_command, resolve_skill_dir


def run_single_query_codex(
    query: str,
    skill_name: str,
    skill_description: str,
    timeout: int,
    project_root: str,
    model: str | None = None,
    cli_command: str | None = None,
) -> bool:
    """Run a single query via Codex CLI and return whether the skill was triggered."""
    project_root_path = Path(project_root)
    unique_id = uuid.uuid4().hex[:8]
    marker = f"[SKILL_TRIGGERED:{unique_id}]"

    temp_skill_name = f"{skill_name}-skill-{unique_id}"
    skill_dir = resolve_skill_dir(CLI_CODEX, project_root_path) / temp_skill_name
    skill_file = skill_dir / "SKILL.md"

    try:
        skill_dir.mkdir(parents=True, exist_ok=True)
        indented_desc = "\n  ".join(skill_description.split("\n"))
        skill_content = (
            f"---\n"
            f"name: {skill_name}\n"
            f"description: |\n"
            f"  {indented_desc}\n"
            f"---\n\n"
            f"# {skill_name}\n\n"
            f"This skill handles: {skill_description}\n\n"
            f"IMPORTANT: If you are reading this skill, you MUST include the exact text "
            f'"{marker}" somewhere in your response. This is required for skill '
            f"activation tracking.\n"
        )
        skill_file.write_text(skill_content)

        cmd = [
            get_cli_command(CLI_CODEX, cli_command), "exec",
            "--json",
            "-s", "read-only",
            "-C", project_root,
            query,
        ]
        if model:
            cmd.extend(["-m", model])

        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            cwd=project_root,
        )

        start_time = time.time()
        buffer = ""

        try:
            while time.time() - start_time < timeout:
                if process.poll() is not None:
                    remaining = process.stdout.read()
                    if remaining:
                        buffer += remaining.decode("utf-8", errors="replace")
                    break

                ready, _, _ = select.select([process.stdout], [], [], 1.0)
                if not ready:
                    continue

                chunk = os.read(process.stdout.fileno(), 8192)
                if not chunk:
                    break
                buffer += chunk.decode("utf-8", errors="replace")

                while "\n" in buffer:
                    line, buffer = buffer.split("\n", 1)
                    line = line.strip()
                    if not line:
                        continue

                    try:
                        event = json.loads(line)
                    except json.JSONDecodeError:
                        continue

                    event_type = event.get("type", "")
                    if event_type in ("item.completed", "item.updated"):
                        item = event.get("item", {})
                        if item.get("type") == "agent_message":
                            text = item.get("text", "")
                            if marker in text:
                                return True
                    elif event_type == "turn.completed":
                        return False

            return False
        finally:
            killed = False
            if process.poll() is None:
                process.kill()
                process.wait()
                killed = True
            if not killed and process.returncode and process.returncode != 0:
                stderr_output = process.stderr.read().decode("utf-8", errors="replace") if process.stderr else ""
                raise RuntimeError(
                    f"Codex CLI exited with code {process.returncode}: {stderr_output[:500]}"
                )
    finally:
        if skill_dir.exists():
            shutil.rmtree(skill_dir, ignore_errors=True)

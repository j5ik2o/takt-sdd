#!/usr/bin/env python3
"""Improve a skill description based on eval results."""

import argparse
import json
import os
import re
import subprocess
import sys
from pathlib import Path

from scripts.utils import CLI_CLAUDE, CLI_CODEX, detect_cli, find_project_root, get_cli_command, parse_skill_md

NEW_DESCRIPTION_PATTERN = re.compile(r"<new_description>(.*?)</new_description>", re.DOTALL)


def _extract_description(response_text: str) -> str:
    """Extract the new description from the model response."""
    match = NEW_DESCRIPTION_PATTERN.search(response_text)
    if match:
        return match.group(1).strip().strip('"')
    return response_text.strip().strip('"')


def _build_prompt(
    skill_name: str,
    skill_content: str,
    current_description: str,
    eval_results: dict,
    history: list[dict],
    test_results: dict | None = None,
) -> str:
    failed_triggers = [
        result for result in eval_results["results"]
        if result["should_trigger"] and not result["pass"]
    ]
    false_triggers = [
        result for result in eval_results["results"]
        if not result["should_trigger"] and not result["pass"]
    ]

    train_score = f"{eval_results['summary']['passed']}/{eval_results['summary']['total']}"
    if test_results:
        test_score = f"{test_results['summary']['passed']}/{test_results['summary']['total']}"
        scores_summary = f"Train: {train_score}, Test: {test_score}"
    else:
        scores_summary = f"Train: {train_score}"

    prompt = f"""You are optimizing a skill description for a Claude Code skill called "{skill_name}". A "skill" is sort of like a prompt, but with progressive disclosure -- there's a title and description that Claude sees when deciding whether to use the skill, and then if it does use the skill, it reads the .md file which has lots more details and potentially links to other resources in the skill folder like helper files and scripts and additional documentation or examples.

The description appears in Claude's "available_skills" list. When a user sends a query, Claude decides whether to invoke the skill based solely on the title and on this description. Your goal is to write a description that triggers for relevant queries, and doesn't trigger for irrelevant ones.

Here's the current description:
<current_description>
"{current_description}"
</current_description>

Current scores ({scores_summary}):
<scores_summary>
"""
    if failed_triggers:
        prompt += "FAILED TO TRIGGER (should have triggered but didn't):\n"
        for result in failed_triggers:
            prompt += f'  - "{result["query"]}" (triggered {result["triggers"]}/{result["runs"]} times)\n'
        prompt += "\n"

    if false_triggers:
        prompt += "FALSE TRIGGERS (triggered but shouldn't have):\n"
        for result in false_triggers:
            prompt += f'  - "{result["query"]}" (triggered {result["triggers"]}/{result["runs"]} times)\n'
        prompt += "\n"

    if history:
        prompt += "PREVIOUS ATTEMPTS (do NOT repeat these — try something structurally different):\n\n"
        for item in history:
            train_history = f"{item.get('train_passed', item.get('passed', 0))}/{item.get('train_total', item.get('total', 0))}"
            test_history = None
            if item.get("test_passed") is not None:
                test_history = f"{item.get('test_passed')}/{item.get('test_total', '?')}"
            score_line = f"train={train_history}"
            if test_history:
                score_line += f", test={test_history}"
            prompt += f"<attempt {score_line}>\n"
            prompt += f'Description: "{item["description"]}"\n'
            if "results" in item:
                prompt += "Train results:\n"
                for result in item["results"]:
                    status = "PASS" if result["pass"] else "FAIL"
                    prompt += f'  [{status}] "{result["query"][:80]}" (triggered {result["triggers"]}/{result["runs"]})\n'
            if item.get("note"):
                prompt += f'Note: {item["note"]}\n'
            prompt += "</attempt>\n\n"

    prompt += f"""</scores_summary>

Skill content (for context on what the skill does):
<skill_content>
{skill_content}
</skill_content>

Based on the failures, write a new and improved description that is more likely to trigger correctly. When I say "based on the failures", it's a bit of a tricky line to walk because we don't want to overfit to the specific cases you're seeing. So what I DON'T want you to do is produce an ever-expanding list of specific queries that this skill should or shouldn't trigger for. Instead, try to generalize from the failures to broader categories of user intent and situations where this skill would be useful or not useful. The reason for this is twofold:

1. Avoid overfitting
2. The list might get loooong and it's injected into ALL queries and there might be a lot of skills, so we don't want to blow too much space on any given description.

Concretely, your description should not be more than about 100-200 words, even if that comes at the cost of accuracy.

Here are some tips that we've found to work well in writing these descriptions:
- The skill should be phrased in the imperative -- "Use this skill for" rather than "this skill does"
- The skill description should focus on the user's intent, what they are trying to achieve, vs. the implementation details of how the skill works.
- The description competes with other skills for Claude's attention — make it distinctive and immediately recognizable.
- If you're getting lots of failures after repeated attempts, change things up. Try different sentence structures or wordings.

I'd encourage you to be creative and mix up the style in different iterations since you'll have multiple opportunities to try different approaches and we'll just grab the highest-scoring one at the end.

Please respond with only the new description text in <new_description> tags, nothing else."""
    return prompt


def _build_shorten_prompt(original_prompt: str, prior_response: str, char_count: int) -> str:
    return (
        f"{original_prompt}\n\n"
        f"The previous response was:\n<previous_response>\n{prior_response}\n</previous_response>\n\n"
        f"That description is {char_count} characters, which exceeds the hard 1024 character limit. "
        "Rewrite it to be under 1024 characters while preserving the most important trigger words and intent coverage. "
        "Respond with only the new description in <new_description> tags."
    )


def _build_cli_command(prompt: str, model: str, cli_type: str, cli_command: str | None, project_root: Path) -> list[str]:
    command = [get_cli_command(cli_type, cli_command)]
    if cli_type == CLI_CODEX:
        command.extend(["exec", "-s", "read-only", "-C", str(project_root)])
        if model:
            command.extend(["-m", model])
        command.append(prompt)
        return command

    command.extend(["-p", prompt])
    if model:
        command.extend(["--model", model])
    return command


def _run_prompt(prompt: str, model: str, cli_type: str, cli_command: str | None) -> str:
    """Run the improvement prompt through the selected CLI."""
    project_root = find_project_root(cli_type)
    command = _build_cli_command(prompt, model, cli_type, cli_command, project_root)
    env = {key: value for key, value in os.environ.items() if key != "CLAUDECODE"}
    completed = subprocess.run(
        command,
        cwd=project_root,
        capture_output=True,
        text=True,
        check=False,
        env=env,
    )
    if completed.returncode != 0:
        stderr = completed.stderr.strip()
        raise RuntimeError(
            f"{cli_type} CLI exited with code {completed.returncode}: {stderr[:500]}"
        )
    return completed.stdout.strip()


def improve_description(
    skill_name: str,
    skill_content: str,
    current_description: str,
    eval_results: dict,
    history: list[dict],
    model: str,
    cli_type: str = CLI_CLAUDE,
    cli_command: str | None = None,
    test_results: dict | None = None,
    log_dir: Path | None = None,
    iteration: int | None = None,
) -> str:
    """Generate an improved description using the configured CLI."""
    prompt = _build_prompt(
        skill_name=skill_name,
        skill_content=skill_content,
        current_description=current_description,
        eval_results=eval_results,
        history=history,
        test_results=test_results,
    )
    response_text = _run_prompt(prompt, model, cli_type, cli_command)
    description = _extract_description(response_text)

    transcript: dict = {
        "iteration": iteration,
        "prompt": prompt,
        "response": response_text,
        "parsed_description": description,
        "char_count": len(description),
        "over_limit": len(description) > 1024,
    }

    if len(description) > 1024:
        shorten_prompt = _build_shorten_prompt(prompt, response_text, len(description))
        shortened_response = _run_prompt(shorten_prompt, model, cli_type, cli_command)
        shortened_description = _extract_description(shortened_response)
        transcript["rewrite_prompt"] = shorten_prompt
        transcript["rewrite_response"] = shortened_response
        transcript["rewrite_description"] = shortened_description
        transcript["rewrite_char_count"] = len(shortened_description)
        description = shortened_description

    transcript["final_description"] = description

    if log_dir:
        log_dir.mkdir(parents=True, exist_ok=True)
        log_file = log_dir / f"improve_iter_{iteration or 'unknown'}.json"
        log_file.write_text(json.dumps(transcript, indent=2))

    return description


def main():
    parser = argparse.ArgumentParser(description="Improve a skill description based on eval results")
    parser.add_argument("--eval-results", required=True, help="Path to eval results JSON (from run_eval.py)")
    parser.add_argument("--skill-path", required=True, help="Path to skill directory")
    parser.add_argument("--history", default=None, help="Path to history JSON (previous attempts)")
    parser.add_argument("--model", required=True, help="Model for improvement")
    parser.add_argument("--cli", default=None, choices=[CLI_CLAUDE, CLI_CODEX], help="CLI to use (default: auto-detect)")
    parser.add_argument("--cli-command", default=None, help="Path to CLI binary")
    parser.add_argument("--verbose", action="store_true", help="Print progress to stderr")
    args = parser.parse_args()

    skill_path = Path(args.skill_path)
    if not (skill_path / "SKILL.md").exists():
        print(f"Error: No SKILL.md found at {skill_path}", file=sys.stderr)
        sys.exit(1)

    eval_results = json.loads(Path(args.eval_results).read_text())
    history = []
    if args.history:
        history = json.loads(Path(args.history).read_text())

    cli_type = detect_cli(args.cli)
    name, _, content = parse_skill_md(skill_path)
    current_description = eval_results["description"]

    if args.verbose:
        print(f"Current: {current_description}", file=sys.stderr)
        print(f"Score: {eval_results['summary']['passed']}/{eval_results['summary']['total']}", file=sys.stderr)

    new_description = improve_description(
        skill_name=name,
        skill_content=content,
        current_description=current_description,
        eval_results=eval_results,
        history=history,
        model=args.model,
        cli_type=cli_type,
        cli_command=args.cli_command,
    )

    if args.verbose:
        print(f"Improved: {new_description}", file=sys.stderr)

    output = {
        "description": new_description,
        "history": history + [{
            "description": current_description,
            "passed": eval_results["summary"]["passed"],
            "failed": eval_results["summary"]["failed"],
            "total": eval_results["summary"]["total"],
            "results": eval_results["results"],
        }],
    }
    print(json.dumps(output, indent=2))


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""Run trigger evaluation for a skill description."""

import argparse
import json
import sys
from concurrent.futures import ProcessPoolExecutor, as_completed
from pathlib import Path

from scripts.run_eval_claude import run_single_query_claude
from scripts.run_eval_codex import run_single_query_codex
from scripts.utils import (
    CLI_CLAUDE,
    CLI_CODEX,
    detect_cli,
    find_project_root,
    parse_skill_md,
)


def run_single_query(
    query: str,
    skill_name: str,
    skill_description: str,
    timeout: int,
    project_root: str,
    model: str | None = None,
    cli_type: str = CLI_CLAUDE,
    cli_command: str | None = None,
) -> bool:
    """Run a single query and return whether the skill was triggered.

    Dispatches to the appropriate CLI-specific implementation.
    """
    if cli_type == CLI_CODEX:
        return run_single_query_codex(
            query, skill_name, skill_description, timeout, project_root, model,
            cli_command,
        )
    return run_single_query_claude(
        query, skill_name, skill_description, timeout, project_root, model,
        cli_command,
    )


def run_eval(
    eval_set: list[dict],
    skill_name: str,
    description: str,
    num_workers: int,
    timeout: int,
    project_root: Path,
    runs_per_query: int = 1,
    trigger_threshold: float = 0.5,
    model: str | None = None,
    cli_type: str = CLI_CLAUDE,
    cli_command: str | None = None,
) -> dict:
    """Run the full eval set and return results."""
    results = []

    with ProcessPoolExecutor(max_workers=num_workers) as executor:
        future_to_info = {}
        for item in eval_set:
            for run_idx in range(runs_per_query):
                future = executor.submit(
                    run_single_query,
                    item["query"],
                    skill_name,
                    description,
                    timeout,
                    str(project_root),
                    model,
                    cli_type,
                    cli_command,
                )
                future_to_info[future] = (item, run_idx)

        query_triggers: dict[str, list[bool]] = {}
        query_errors: dict[str, list[str]] = {}
        query_items: dict[str, dict] = {}
        for future in as_completed(future_to_info):
            item, _ = future_to_info[future]
            query = item["query"]
            query_items[query] = item
            if query not in query_triggers:
                query_triggers[query] = []
                query_errors[query] = []
            try:
                query_triggers[query].append(future.result())
            except Exception as e:
                print(f"Error: query failed: {e}", file=sys.stderr)
                query_errors[query].append(str(e))

    total_errors = sum(len(errs) for errs in query_errors.values())
    if total_errors > 0:
        print(
            f"Warning: {total_errors} query run(s) failed with errors. "
            f"Results may be unreliable.",
            file=sys.stderr,
        )

    for query, triggers in query_triggers.items():
        item = query_items[query]
        errors = query_errors.get(query, [])
        effective_runs = len(triggers)
        if effective_runs > 0:
            trigger_rate = sum(triggers) / effective_runs
        else:
            trigger_rate = 0.0
        should_trigger = item["should_trigger"]
        if should_trigger:
            did_pass = trigger_rate >= trigger_threshold
        else:
            did_pass = trigger_rate < trigger_threshold
        if effective_runs == 0 and errors:
            did_pass = False
        result_entry: dict = {
            "query": query,
            "should_trigger": should_trigger,
            "trigger_rate": trigger_rate,
            "triggers": sum(triggers),
            "runs": effective_runs,
            "pass": did_pass,
        }
        if errors:
            result_entry["errors"] = errors
            result_entry["error_count"] = len(errors)
        results.append(result_entry)

    passed = sum(1 for r in results if r["pass"])
    total = len(results)

    return {
        "skill_name": skill_name,
        "description": description,
        "results": results,
        "summary": {
            "total": total,
            "passed": passed,
            "failed": total - passed,
            "errors": total_errors,
        },
    }


def main():
    parser = argparse.ArgumentParser(description="Run trigger evaluation for a skill description")
    parser.add_argument("--eval-set", required=True, help="Path to eval set JSON file")
    parser.add_argument("--skill-path", required=True, help="Path to skill directory")
    parser.add_argument("--description", default=None, help="Override description to test")
    parser.add_argument("--num-workers", type=int, default=10, help="Number of parallel workers")
    parser.add_argument("--timeout", type=int, default=30, help="Timeout per query in seconds")
    parser.add_argument("--runs-per-query", type=int, default=3, help="Number of runs per query")
    parser.add_argument("--trigger-threshold", type=float, default=0.5, help="Trigger rate threshold")
    parser.add_argument("--model", default=None, help="Model to use (default: CLI's configured model)")
    parser.add_argument("--cli", default=None, choices=["claude", "codex"], help="CLI to use (default: auto-detect)")
    parser.add_argument("--cli-command", default=None, help="Path to CLI binary (e.g. /usr/local/bin/claude)")
    parser.add_argument("--verbose", action="store_true", help="Print progress to stderr")
    args = parser.parse_args()

    cli_type = detect_cli(args.cli)

    eval_set = json.loads(Path(args.eval_set).read_text())
    skill_path = Path(args.skill_path)

    if not (skill_path / "SKILL.md").exists():
        print(f"Error: No SKILL.md found at {skill_path}", file=sys.stderr)
        sys.exit(1)

    name, original_description, content = parse_skill_md(skill_path)
    description = args.description or original_description
    project_root = find_project_root(cli_type)

    if args.verbose:
        print(f"CLI: {cli_type}", file=sys.stderr)
        print(f"Evaluating: {description}", file=sys.stderr)

    output = run_eval(
        eval_set=eval_set,
        skill_name=name,
        description=description,
        num_workers=args.num_workers,
        timeout=args.timeout,
        project_root=project_root,
        runs_per_query=args.runs_per_query,
        trigger_threshold=args.trigger_threshold,
        model=args.model,
        cli_type=cli_type,
        cli_command=args.cli_command,
    )

    if args.verbose:
        summary = output["summary"]
        print(f"Results: {summary['passed']}/{summary['total']} passed", file=sys.stderr)
        for r in output["results"]:
            status = "PASS" if r["pass"] else "FAIL"
            rate_str = f"{r['triggers']}/{r['runs']}"
            print(f"  [{status}] rate={rate_str} expected={r['should_trigger']}: {r['query'][:70]}", file=sys.stderr)

    print(json.dumps(output, indent=2))
    if output["summary"]["total"] > 0 and all(result["runs"] == 0 for result in output["results"]):
        sys.exit(1)


if __name__ == "__main__":
    main()

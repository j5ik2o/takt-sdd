use std::fs;

use assert_cmd::Command;
use predicates::prelude::predicate;
use serde_json::Value;
use tempfile::tempdir;

#[test]
fn displays_help() {
    let mut command = qgrep_command();

    command
        .arg("--help")
        .assert()
        .success()
        .stdout(predicate::str::contains("Usage: qgrep"));
}

#[test]
fn exits_with_code_2_for_invalid_regex() {
    let temp_directory = tempdir().unwrap();
    let target_file = temp_directory.path().join("target.txt");
    fs::write(&target_file, "line").unwrap();

    let mut command = qgrep_command();
    command
        .arg("(")
        .arg(&target_file)
        .assert()
        .code(2)
        .stderr(predicate::str::contains("invalid regular expression"));
}

#[test]
fn accepts_directory_target_with_gitignore() {
    let temp_directory = tempdir().unwrap();
    fs::write(temp_directory.path().join(".gitignore"), "ignored.txt\n").unwrap();
    fs::write(temp_directory.path().join("included.txt"), "alpha").unwrap();
    fs::write(temp_directory.path().join("ignored.txt"), "beta").unwrap();

    let mut command = qgrep_command();
    command
        .arg("alpha")
        .arg(temp_directory.path())
        .assert()
        .code(0)
        .stdout(predicate::str::contains("included.txt:1:alpha"));
}

#[test]
fn recursively_searches_non_ignored_files_in_deterministic_order() {
    let temp_directory = tempdir().unwrap();
    fs::create_dir_all(temp_directory.path().join("nested").join("deeper")).unwrap();
    fs::create_dir_all(temp_directory.path().join("ignored")).unwrap();
    fs::write(temp_directory.path().join(".gitignore"), "ignored/\n").unwrap();

    let root_file = temp_directory.path().join("a.txt");
    let nested_file = temp_directory.path().join("nested").join("b.txt");
    let deeper_file = temp_directory.path().join("nested").join("deeper").join("c.txt");
    let ignored_file = temp_directory.path().join("ignored").join("skip.txt");

    fs::write(&root_file, "hit-a-1\nskip\nhit-a-3\n").unwrap();
    fs::write(&nested_file, "skip\nhit-b-2\n").unwrap();
    fs::write(&deeper_file, "hit-c-1\n").unwrap();
    fs::write(&ignored_file, "hit-ignored-1\n").unwrap();

    let mut command = qgrep_command();
    let assert = command.arg("hit").arg(temp_directory.path()).assert().code(0);

    let output = String::from_utf8(assert.get_output().stdout.clone()).unwrap();
    let expected = format!(
        "{root}:1:hit-a-1\n{root}:3:hit-a-3\n{nested}:2:hit-b-2\n{deeper}:1:hit-c-1\n",
        root = root_file.display(),
        nested = nested_file.display(),
        deeper = deeper_file.display(),
    );

    assert_eq!(output, expected);
    assert!(!output.contains(&ignored_file.display().to_string()));
}

#[test]
fn renders_text_output_with_context_and_group_separator() {
    let temp_directory = tempdir().unwrap();
    let target_file = temp_directory.path().join("target.txt");
    fs::write(
        &target_file,
        "before-1\nhit-1\nafter-1\ngap-1\ngap-2\nbefore-2\nhit-2\nafter-2\n",
    )
    .unwrap();

    let mut command = qgrep_command();
    let assert = command
        .args(["-C", "1", "hit"])
        .arg(&target_file)
        .assert()
        .code(0);

    let output = String::from_utf8(assert.get_output().stdout.clone()).unwrap();
    let expected = format!(
        "{path}-1-before-1\n{path}:2:hit-1\n{path}-3-after-1\n--\n{path}-6-before-2\n{path}:7:hit-2\n{path}-8-after-2\n",
        path = target_file.display()
    );

    assert_eq!(output, expected);
}

#[test]
fn renders_json_output_without_plain_text_format() {
    let temp_directory = tempdir().unwrap();
    let target_file = temp_directory.path().join("target.txt");
    fs::write(&target_file, "before\nhit\nafter\n").unwrap();

    let mut command = qgrep_command();
    let assert = command
        .args(["--json", "-C", "1", "hit"])
        .arg(&target_file)
        .assert()
        .code(0);

    let output = String::from_utf8(assert.get_output().stdout.clone()).unwrap();
    let lines = output.lines().collect::<Vec<_>>();

    assert_eq!(lines.len(), 1);
    assert!(!output.contains(&format!("{}:2:hit", target_file.display())));

    let value: Value = serde_json::from_str(lines[0]).unwrap();
    assert_eq!(
        value["path"],
        Value::String(target_file.display().to_string())
    );
    assert_eq!(value["line_number"], Value::from(2));
    assert_eq!(value["line"], Value::String("hit".to_string()));
    assert_eq!(value["before_context"][0]["line_number"], Value::from(1));
    assert_eq!(
        value["before_context"][0]["line"],
        Value::String("before".to_string())
    );
    assert_eq!(value["after_context"][0]["line_number"], Value::from(3));
    assert_eq!(
        value["after_context"][0]["line"],
        Value::String("after".to_string())
    );
}

#[test]
fn exits_with_code_1_when_no_match_and_no_issue() {
    let temp_directory = tempdir().unwrap();
    let target_file = temp_directory.path().join("target.txt");
    fs::write(&target_file, "alpha\nbeta\n").unwrap();

    let mut command = qgrep_command();
    command.arg("gamma").arg(&target_file).assert().code(1);
}

#[test]
fn exits_with_code_2_when_match_and_runtime_issue_coexist() {
    let temp_directory = tempdir().unwrap();
    let valid_target = temp_directory.path().join("a.txt");
    let invalid_target = temp_directory.path().join("b.bin");
    fs::write(&valid_target, "hit\n").unwrap();
    fs::write(&invalid_target, [0xff, 0xfe]).unwrap();

    let mut command = qgrep_command();
    command
        .arg("hit")
        .arg(temp_directory.path())
        .assert()
        .code(2)
        .stdout(predicate::str::contains(format!("{}:1:hit", valid_target.display())))
        .stderr(predicate::str::contains("target decode failed"));
}

fn qgrep_command() -> Command {
    Command::new(assert_cmd::cargo::cargo_bin!("qgrep"))
}

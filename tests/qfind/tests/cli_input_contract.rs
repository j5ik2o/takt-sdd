use std::fs;
use std::path::Path;
use std::process::Command;

use assert_cmd::prelude::*;
use predicates::str::contains;
use serde_json::Value;
use tempfile::tempdir;

fn write_file(path: &Path) {
    fs::write(path, "content").expect("file should be written");
}

fn collect_paths_from_json(stdout: &[u8]) -> Vec<String> {
    let json_text = std::str::from_utf8(stdout).expect("stdout should be valid UTF-8");
    let parsed: Value = serde_json::from_str(json_text.trim()).expect("stdout should be JSON");
    let entries = parsed
        .as_array()
        .expect("JSON output should be an array of results");

    entries
        .iter()
        .map(|entry| {
            entry
                .get("path")
                .and_then(Value::as_str)
                .expect("each JSON item should include path")
                .to_string()
        })
        .collect()
}

#[test]
fn exits_success_when_required_arguments_are_valid() {
    let search_root = tempdir().expect("tempdir should be created");

    let mut command = Command::new(assert_cmd::cargo::cargo_bin!("qfind"));
    command.arg(search_root.path());

    command.assert().success();
}

#[test]
fn exits_non_zero_when_glob_is_invalid() {
    let search_root = tempdir().expect("tempdir should be created");

    let mut command = Command::new(assert_cmd::cargo::cargo_bin!("qfind"));
    command.arg(search_root.path()).args(["--glob", "[abc"]);

    command
        .assert()
        .code(2)
        .stderr(contains("invalid --glob pattern"));
}

#[test]
fn exits_non_zero_when_regex_is_invalid() {
    let search_root = tempdir().expect("tempdir should be created");

    let mut command = Command::new(assert_cmd::cargo::cargo_bin!("qfind"));
    command.arg(search_root.path()).args(["--regex", "("]);

    command
        .assert()
        .code(2)
        .stderr(contains("invalid --regex pattern"));
}

#[test]
fn exits_non_zero_when_max_depth_is_invalid() {
    let search_root = tempdir().expect("tempdir should be created");

    let mut command = Command::new(assert_cmd::cargo::cargo_bin!("qfind"));
    command
        .arg(search_root.path())
        .args(["--max-depth", "invalid"]);

    command
        .assert()
        .code(2)
        .stderr(contains("invalid --max-depth value"));
}

#[test]
fn prints_json_array_with_path_field_when_json_option_is_enabled() {
    let search_root = tempdir().expect("tempdir should be created");
    write_file(&search_root.path().join("match.rs"));

    let mut command = Command::new(assert_cmd::cargo::cargo_bin!("qfind"));
    command
        .arg(search_root.path())
        .args(["--glob", "*.rs", "--json"]);

    let assertion = command.assert().success();
    let paths = collect_paths_from_json(&assertion.get_output().stdout);

    assert_eq!(paths.len(), 1);
    assert!(paths[0].ends_with("match.rs"));
}

#[test]
fn prints_empty_json_array_when_no_result_matches() {
    let search_root = tempdir().expect("tempdir should be created");
    write_file(&search_root.path().join("match.rs"));

    let mut command = Command::new(assert_cmd::cargo::cargo_bin!("qfind"));
    command
        .arg(search_root.path())
        .args(["--glob", "*.md", "--json"]);

    command.assert().success().stdout("[]\n");
}

#[test]
fn prints_plain_text_paths_when_json_option_is_disabled() {
    let search_root = tempdir().expect("tempdir should be created");
    write_file(&search_root.path().join("match.rs"));

    let mut command = Command::new(assert_cmd::cargo::cargo_bin!("qfind"));
    command.arg(search_root.path()).args(["--glob", "*.rs"]);

    let assertion = command.assert().success();
    let stdout = std::str::from_utf8(&assertion.get_output().stdout)
        .expect("stdout should be valid UTF-8")
        .trim();

    assert!(stdout.ends_with("match.rs"));
    assert!(!stdout.starts_with('['));
}

#[test]
fn returns_success_with_empty_output_when_all_candidates_are_ignored() {
    let search_root = tempdir().expect("tempdir should be created");
    write_file(&search_root.path().join("ignored.rs"));
    fs::write(search_root.path().join(".gitignore"), "*.rs\n")
        .expect(".gitignore should be written");

    let mut command = Command::new(assert_cmd::cargo::cargo_bin!("qfind"));
    command.arg(search_root.path()).args(["--glob", "*.rs"]);

    command.assert().success().stdout("");
}

#[test]
fn honors_max_depth_zero_and_n_in_cli_output() {
    let search_root = tempdir().expect("tempdir should be created");
    fs::create_dir_all(search_root.path().join("nested/child"))
        .expect("nested directories should be created");
    write_file(&search_root.path().join("root.rs"));
    write_file(&search_root.path().join("nested/inside.rs"));
    write_file(&search_root.path().join("nested/child/deep.rs"));

    let mut depth_zero_command = Command::new(assert_cmd::cargo::cargo_bin!("qfind"));
    depth_zero_command.arg(search_root.path()).args([
        "--glob",
        "*.rs",
        "--max-depth",
        "0",
        "--json",
    ]);
    let depth_zero_assertion = depth_zero_command.assert().success();
    let depth_zero_paths = collect_paths_from_json(&depth_zero_assertion.get_output().stdout);

    assert_eq!(depth_zero_paths.len(), 1);
    assert!(
        depth_zero_paths
            .iter()
            .any(|path| path.ends_with("root.rs"))
    );

    let mut depth_one_command = Command::new(assert_cmd::cargo::cargo_bin!("qfind"));
    depth_one_command.arg(search_root.path()).args([
        "--glob",
        "*.rs",
        "--max-depth",
        "1",
        "--json",
    ]);
    let depth_one_assertion = depth_one_command.assert().success();
    let depth_one_paths = collect_paths_from_json(&depth_one_assertion.get_output().stdout);

    assert_eq!(depth_one_paths.len(), 2);
    assert!(depth_one_paths.iter().any(|path| path.ends_with("root.rs")));
    assert!(
        depth_one_paths
            .iter()
            .any(|path| path.ends_with("nested/inside.rs"))
    );
    assert!(
        !depth_one_paths
            .iter()
            .any(|path| path.ends_with("nested/child/deep.rs"))
    );
}

#[cfg(unix)]
#[test]
fn continues_regex_search_when_file_is_permission_denied() {
    use std::os::unix::fs::PermissionsExt;

    struct PermissionReset {
        path: std::path::PathBuf,
        mode: u32,
    }

    impl Drop for PermissionReset {
        fn drop(&mut self) {
            let _ = fs::set_permissions(&self.path, fs::Permissions::from_mode(self.mode));
        }
    }

    let search_root = tempdir().expect("tempdir should be created");
    let readable_path = search_root.path().join("readable.txt");
    let blocked_path = search_root.path().join("blocked.txt");
    fs::write(&readable_path, "needle").expect("readable file should be written");
    fs::write(&blocked_path, "needle").expect("blocked file should be written");

    let original_mode = fs::metadata(&blocked_path)
        .expect("blocked file metadata should be available")
        .permissions()
        .mode();
    let _permission_reset = PermissionReset {
        path: blocked_path.clone(),
        mode: original_mode,
    };
    fs::set_permissions(&blocked_path, fs::Permissions::from_mode(0o000))
        .expect("blocked file should be restricted");

    let mut command = Command::new(assert_cmd::cargo::cargo_bin!("qfind"));
    command
        .arg(search_root.path())
        .args(["--glob", "*.txt", "--regex", "needle", "--json"]);
    let assertion = command.assert().success();
    let paths = collect_paths_from_json(&assertion.get_output().stdout);

    assert!(paths.iter().any(|path| path.ends_with("readable.txt")));
    assert!(!paths.iter().any(|path| path.ends_with("blocked.txt")));
}

use std::path::PathBuf;
use std::process::Command;

fn fixtures_dir() -> PathBuf {
    PathBuf::from(env!("CARGO_MANIFEST_DIR"))
        .join("tests")
        .join("integration")
        .join("fixtures")
}

fn run_qcount_json(path: &PathBuf) -> serde_json::Value {
    let bin = env!("CARGO_BIN_EXE_qcount");
    let output = Command::new(bin)
        .arg(path)
        .arg("--json")
        .output()
        .expect("Failed to run qcount");

    assert!(
        output.status.success(),
        "qcount exited with non-zero status: {:?}",
        String::from_utf8_lossy(&output.stderr)
    );

    let stdout = String::from_utf8(output.stdout).expect("Invalid UTF-8 output");
    serde_json::from_str(&stdout).expect("Failed to parse JSON output")
}

#[test]
fn test_fixture_total_files() {
    let fixtures = fixtures_dir();
    let result = run_qcount_json(&fixtures);

    let total_files = result["total"]["files"].as_u64().unwrap();
    assert_eq!(total_files, 3, "Expected 3 fixture files");
}

#[test]
fn test_fixture_rust_stats() {
    let fixtures = fixtures_dir();
    let result = run_qcount_json(&fixtures);

    let by_language = result["by_language"].as_array().unwrap();
    let rust = by_language
        .iter()
        .find(|s| s["language"].as_str().unwrap() == "Rust")
        .expect("Rust stats not found");

    assert_eq!(rust["files"].as_u64().unwrap(), 1);
    assert_eq!(rust["total_lines"].as_u64().unwrap(), 10);
    assert_eq!(rust["code_lines"].as_u64().unwrap(), 7);
    assert_eq!(rust["blank_lines"].as_u64().unwrap(), 1);
    assert_eq!(rust["comment_lines"].as_u64().unwrap(), 2);
}

#[test]
fn test_fixture_python_stats() {
    let fixtures = fixtures_dir();
    let result = run_qcount_json(&fixtures);

    let by_language = result["by_language"].as_array().unwrap();
    let python = by_language
        .iter()
        .find(|s| s["language"].as_str().unwrap() == "Python")
        .expect("Python stats not found");

    assert_eq!(python["files"].as_u64().unwrap(), 1);
    assert_eq!(python["total_lines"].as_u64().unwrap(), 8);
    assert_eq!(python["code_lines"].as_u64().unwrap(), 4);
    assert_eq!(python["blank_lines"].as_u64().unwrap(), 2);
    assert_eq!(python["comment_lines"].as_u64().unwrap(), 2);
}

#[test]
fn test_fixture_javascript_stats() {
    let fixtures = fixtures_dir();
    let result = run_qcount_json(&fixtures);

    let by_language = result["by_language"].as_array().unwrap();
    let js = by_language
        .iter()
        .find(|s| s["language"].as_str().unwrap() == "JavaScript")
        .expect("JavaScript stats not found");

    assert_eq!(js["files"].as_u64().unwrap(), 1);
    assert_eq!(js["total_lines"].as_u64().unwrap(), 10);
    assert_eq!(js["code_lines"].as_u64().unwrap(), 6);
    assert_eq!(js["blank_lines"].as_u64().unwrap(), 2);
    assert_eq!(js["comment_lines"].as_u64().unwrap(), 2);
}

#[test]
fn test_fixture_total_lines() {
    let fixtures = fixtures_dir();
    let result = run_qcount_json(&fixtures);

    let total_lines = result["total"]["total_lines"].as_u64().unwrap();
    // 10 (rs) + 8 (py) + 10 (js) = 28
    assert_eq!(total_lines, 28);
}

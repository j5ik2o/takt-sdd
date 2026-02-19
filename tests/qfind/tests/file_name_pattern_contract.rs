use std::path::PathBuf;

use qfind::file_name_pattern::FileNamePattern;

#[test]
fn keeps_only_candidates_matching_glob_condition() {
    let pattern = FileNamePattern::parse("*.rs".to_string()).expect("glob should be valid");
    let candidates = vec![
        PathBuf::from("src/main.rs"),
        PathBuf::from("src/lib.rs"),
        PathBuf::from("README.md"),
    ];

    let filtered: Vec<PathBuf> = candidates
        .into_iter()
        .filter(|candidate| pattern.matches_path(candidate))
        .collect();

    assert_eq!(
        filtered,
        vec![PathBuf::from("src/main.rs"), PathBuf::from("src/lib.rs")]
    );
}

#[test]
fn returns_empty_when_no_candidates_match_glob_condition() {
    let pattern = FileNamePattern::parse("*.toml".to_string()).expect("glob should be valid");
    let candidates = vec![PathBuf::from("src/main.rs"), PathBuf::from("README.md")];

    let filtered: Vec<PathBuf> = candidates
        .into_iter()
        .filter(|candidate| pattern.matches_path(candidate))
        .collect();

    assert!(filtered.is_empty());
}

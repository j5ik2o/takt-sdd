use std::fs;
use std::path::{Path, PathBuf};

use qfind::content_pattern::ContentPattern;
use tempfile::tempdir;

fn write_file(path: &Path, content: &str) {
    fs::write(path, content).expect("file should be written");
}

fn relative_paths(root: &Path, paths: &[PathBuf]) -> Vec<String> {
    paths
        .iter()
        .map(|path| {
            path.strip_prefix(root)
                .expect("path should be inside root")
                .to_string_lossy()
                .replace('\\', "/")
        })
        .collect()
}

fn filter_candidates_by_content(
    candidate_paths: &[PathBuf],
    content_pattern: &ContentPattern,
) -> Vec<PathBuf> {
    candidate_paths
        .iter()
        .filter_map(|candidate_path| {
            let is_match = content_pattern
                .is_match_in_file(candidate_path)
                .expect("candidate file should be readable");
            if is_match {
                Some(candidate_path.clone())
            } else {
                None
            }
        })
        .collect()
}

#[test]
fn keeps_only_candidates_with_content_match_when_pattern_is_specified() {
    let temp = tempdir().expect("tempdir should be created");
    let match_path = temp.path().join("match.txt");
    let another_match_path = temp.path().join("another-match.txt");
    let miss_path = temp.path().join("miss.txt");
    write_file(&match_path, "prefix needle suffix");
    write_file(&another_match_path, "needle appears twice: needle");
    write_file(&miss_path, "no hit");
    let content_pattern =
        ContentPattern::parse("needle".to_string()).expect("regex should be valid");

    let matched = filter_candidates_by_content(
        &[
            match_path.clone(),
            miss_path.clone(),
            another_match_path.clone(),
        ],
        &content_pattern,
    );

    let relative = relative_paths(temp.path(), &matched);
    assert_eq!(relative, vec!["match.txt", "another-match.txt"]);
}

#[test]
fn returns_empty_when_no_candidate_matches_content_pattern() {
    let temp = tempdir().expect("tempdir should be created");
    let first_path = temp.path().join("first.txt");
    let second_path = temp.path().join("second.txt");
    write_file(&first_path, "alpha");
    write_file(&second_path, "beta");
    let content_pattern =
        ContentPattern::parse("needle".to_string()).expect("regex should be valid");

    let matched = filter_candidates_by_content(&[first_path, second_path], &content_pattern);

    assert!(matched.is_empty());
}

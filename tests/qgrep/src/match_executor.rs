use std::fs;
use std::path::{Path, PathBuf};

use rayon::prelude::*;

use crate::context_slice_policy::ContextSlicePolicy;
use crate::match_record::MatchRecord;
use crate::search_issue::SearchIssue;
use crate::search_outcome::SearchOutcome;
use crate::search_request::SearchRequest;

pub struct MatchExecutor;

impl MatchExecutor {
    pub fn execute(search_request: &SearchRequest, target_paths: &[PathBuf]) -> SearchOutcome {
        let target_outcomes = if target_paths.len() >= 2 {
            target_paths
                .par_iter()
                .map(|target_path| search_target(search_request, target_path.as_path()))
                .collect::<Vec<_>>()
        } else {
            target_paths
                .iter()
                .map(|target_path| search_target(search_request, target_path.as_path()))
                .collect::<Vec<_>>()
        };

        let mut match_records = Vec::new();
        let mut issues = Vec::new();
        for target_outcome in target_outcomes {
            let (target_match_records, target_issues) = target_outcome.into_parts();
            match_records.extend(target_match_records);
            issues.extend(target_issues);
        }

        match_records.sort_by(|left, right| {
            left.path()
                .cmp(right.path())
                .then_with(|| left.line_number().cmp(&right.line_number()))
        });
        issues.sort_by_key(issue_sort_key);

        SearchOutcome::new(match_records, issues)
    }
}

fn search_target(search_request: &SearchRequest, target_path: &Path) -> SearchOutcome {
    let bytes = match fs::read(target_path) {
        Ok(bytes) => bytes,
        Err(error) => {
            return SearchOutcome::new(
                Vec::new(),
                vec![SearchIssue::TargetReadFailed {
                    path: target_path.to_path_buf(),
                    message: error.to_string(),
                }],
            );
        }
    };

    let content = match String::from_utf8(bytes) {
        Ok(content) => content,
        Err(error) => {
            return SearchOutcome::new(
                Vec::new(),
                vec![SearchIssue::TargetDecodeFailed {
                    path: target_path.to_path_buf(),
                    message: error.to_string(),
                }],
            );
        }
    };

    let lines = content.lines().map(ToString::to_string).collect::<Vec<_>>();

    let mut match_records = Vec::new();
    for (line_index, line) in lines.iter().enumerate() {
        if search_request.pattern().is_match(line.as_str()) {
            let (before_context, after_context) =
                ContextSlicePolicy::slice(&lines, line_index, search_request.context_window());
            match_records.push(MatchRecord::new(
                target_path.to_path_buf(),
                line_index + 1,
                line.clone(),
                before_context,
                after_context,
            ));
        }
    }

    SearchOutcome::new(match_records, Vec::new())
}

fn issue_sort_key(issue: &SearchIssue) -> (u8, String, String) {
    match issue {
        SearchIssue::TargetReadFailed { path, message } => {
            (0, path.display().to_string(), message.clone())
        }
        SearchIssue::TargetDecodeFailed { path, message } => {
            (1, path.display().to_string(), message.clone())
        }
        SearchIssue::OutputWriteFailed { message } => (2, String::new(), message.clone()),
    }
}

#[cfg(test)]
mod tests {
    use std::fs;
    use std::path::PathBuf;

    use tempfile::tempdir;

    use crate::context_window::ContextWindow;
    use crate::match_executor::MatchExecutor;
    use crate::search_issue::SearchIssue;
    use crate::search_pattern::SearchPattern;
    use crate::search_request::SearchRequest;

    #[test]
    fn sorts_matches_by_path_then_line_number() {
        let temp_directory = tempdir().unwrap();
        let b_path = temp_directory.path().join("b.txt");
        let a_path = temp_directory.path().join("a.txt");
        fs::write(&a_path, "hit-a-1\nskip\nhit-a-3\n").unwrap();
        fs::write(&b_path, "hit-b-1\nhit-b-2\n").unwrap();

        let search_request = build_search_request(temp_directory.path().to_path_buf(), 0, 0);
        let target_paths = vec![b_path.clone(), a_path.clone()];

        let search_outcome = MatchExecutor::execute(&search_request, target_paths.as_slice());
        let ordered_pairs = search_outcome
            .match_records()
            .iter()
            .map(|record| {
                (
                    record
                        .path()
                        .file_name()
                        .unwrap()
                        .to_string_lossy()
                        .into_owned(),
                    record.line_number(),
                )
            })
            .collect::<Vec<_>>();

        assert_eq!(
            ordered_pairs,
            vec![
                ("a.txt".to_string(), 1),
                ("a.txt".to_string(), 3),
                ("b.txt".to_string(), 1),
                ("b.txt".to_string(), 2),
            ]
        );
    }

    #[test]
    fn appends_context_lines_to_each_match() {
        let temp_directory = tempdir().unwrap();
        let target_path = temp_directory.path().join("sample.txt");
        fs::write(&target_path, "before\nmatch\nafter-1\nafter-2\n").unwrap();

        let search_request = build_search_request(temp_directory.path().to_path_buf(), 1, 2);
        let search_outcome = MatchExecutor::execute(&search_request, &[target_path.clone()]);

        assert_eq!(search_outcome.match_records().len(), 1);
        let match_record = &search_outcome.match_records()[0];
        assert_eq!(match_record.line_number(), 2);
        assert_eq!(match_record.before_context().len(), 1);
        assert_eq!(match_record.before_context()[0].line_number(), 1);
        assert_eq!(match_record.before_context()[0].line(), "before");
        assert_eq!(match_record.after_context().len(), 2);
        assert_eq!(match_record.after_context()[0].line_number(), 3);
        assert_eq!(match_record.after_context()[0].line(), "after-1");
        assert_eq!(match_record.after_context()[1].line_number(), 4);
        assert_eq!(match_record.after_context()[1].line(), "after-2");
        assert!(search_outcome.issues().is_empty());
    }

    #[test]
    fn keeps_searching_when_one_target_has_decode_issue() {
        let temp_directory = tempdir().unwrap();
        let valid_path = temp_directory.path().join("a.txt");
        let invalid_path = temp_directory.path().join("b.bin");
        fs::write(&valid_path, "hit\n").unwrap();
        fs::write(&invalid_path, [0xff, 0xfe]).unwrap();

        let search_request = build_search_request(temp_directory.path().to_path_buf(), 0, 0);
        let search_outcome =
            MatchExecutor::execute(&search_request, &[invalid_path.clone(), valid_path.clone()]);

        assert_eq!(search_outcome.match_records().len(), 1);
        assert_eq!(search_outcome.match_records()[0].path(), valid_path.as_path());
        assert_eq!(search_outcome.issues().len(), 1);

        match &search_outcome.issues()[0] {
            SearchIssue::TargetDecodeFailed { path, .. } => {
                assert_eq!(path, &invalid_path);
            }
            _ => panic!("unexpected issue variant"),
        }
    }

    fn build_search_request(
        target: PathBuf,
        before_context: usize,
        after_context: usize,
    ) -> SearchRequest {
        SearchRequest::new(
            SearchPattern::from_cli("hit|match".to_string(), false).unwrap(),
            target,
            ContextWindow::new(before_context, after_context),
            false,
            Vec::new(),
            Vec::new(),
            Vec::new(),
            Vec::new(),
        )
    }
}

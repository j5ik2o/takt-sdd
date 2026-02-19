use std::io::ErrorKind;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};

use ignore::{Error as IgnoreError, WalkBuilder, WalkState};
use rayon::prelude::*;

use crate::depth_limit::DepthLimit;
use crate::path_scanner_port::PathScannerPort;
use crate::scan_issue::ScanIssue;
use crate::scan_snapshot::ScanSnapshot;

#[derive(Debug, Default, Clone, Copy)]
pub(crate) struct ParallelPathScanner;

impl ParallelPathScanner {
    pub(crate) fn new() -> Self {
        Self
    }

    pub(crate) fn collect_candidate_paths(
        &self,
        search_root: &Path,
        depth_limit: Option<DepthLimit>,
    ) -> Vec<PathBuf> {
        <Self as PathScannerPort>::scan_paths(self, search_root, depth_limit)
            .candidate_paths()
            .to_vec()
    }

    fn build_walker(search_root: &Path, depth_limit: Option<DepthLimit>) -> WalkBuilder {
        let mut builder = WalkBuilder::new(search_root);
        builder.hidden(false);
        builder.parents(false);
        builder.ignore(false);
        builder.git_global(false);
        builder.git_exclude(false);
        builder.git_ignore(true);
        builder.require_git(false);
        builder.max_depth(depth_limit.map(walk_max_depth));
        builder
    }

    fn issue_from_walk_error(error: IgnoreError) -> ScanIssue {
        let permission_denied = error
            .io_error()
            .is_some_and(|io_error| io_error.kind() == ErrorKind::PermissionDenied);
        let path = extract_error_path(&error);

        ScanIssue::new(path, error.to_string(), permission_denied)
    }
}

fn walk_max_depth(depth_limit: DepthLimit) -> usize {
    depth_limit.value().saturating_add(1)
}

impl PathScannerPort for ParallelPathScanner {
    fn scan_paths(&self, search_root: &Path, depth_limit: Option<DepthLimit>) -> ScanSnapshot {
        let candidate_paths = Arc::new(Mutex::new(Vec::<PathBuf>::new()));
        let issues = Arc::new(Mutex::new(Vec::<ScanIssue>::new()));

        let walker = Self::build_walker(search_root, depth_limit).build_parallel();

        walker.run(|| {
            let candidate_paths = Arc::clone(&candidate_paths);
            let issues = Arc::clone(&issues);

            Box::new(move |entry| {
                match entry {
                    Ok(directory_entry) => {
                        if directory_entry
                            .file_type()
                            .is_some_and(|file_type| file_type.is_file())
                        {
                            candidate_paths
                                .lock()
                                .expect("candidate paths lock should not be poisoned")
                                .push(directory_entry.into_path());
                        }
                    }
                    Err(error) => {
                        issues
                            .lock()
                            .expect("scan issues lock should not be poisoned")
                            .push(Self::issue_from_walk_error(error));
                    }
                }

                WalkState::Continue
            })
        });

        let mut candidate_paths = Arc::into_inner(candidate_paths)
            .expect("all candidate path references should be dropped")
            .into_inner()
            .expect("candidate paths lock should not be poisoned");
        let mut issues = Arc::into_inner(issues)
            .expect("all issue references should be dropped")
            .into_inner()
            .expect("scan issues lock should not be poisoned");

        rayon::join(
            || candidate_paths.par_sort_unstable(),
            || {
                issues.par_sort_unstable_by(|left, right| {
                    left.path_buf()
                        .cmp(&right.path_buf())
                        .then_with(|| left.detail().cmp(right.detail()))
                        .then_with(|| left.permission_denied().cmp(&right.permission_denied()))
                });
            },
        );

        ScanSnapshot::new(candidate_paths, issues)
    }
}

fn extract_error_path(error: &IgnoreError) -> Option<PathBuf> {
    match error {
        IgnoreError::Partial(errors) => errors.iter().find_map(extract_error_path),
        IgnoreError::WithLineNumber { err, .. } => extract_error_path(err),
        IgnoreError::WithPath { path, .. } => Some(path.clone()),
        IgnoreError::WithDepth { err, .. } => extract_error_path(err),
        IgnoreError::Loop { child, .. } => Some(child.clone()),
        IgnoreError::Io(_)
        | IgnoreError::Glob { .. }
        | IgnoreError::UnrecognizedFileType(_)
        | IgnoreError::InvalidDefinition => None,
    }
}

#[cfg(test)]
mod tests {
    use std::fs;
    use std::path::{Path, PathBuf};

    use tempfile::tempdir;

    use crate::depth_limit::DepthLimit;
    use crate::path_scanner_port::PathScannerPort;

    use super::ParallelPathScanner;

    fn write_file(path: &Path) {
        fs::write(path, "content").expect("file should be written");
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

    #[test]
    fn collects_candidates_in_reproducible_order() {
        let temp = tempdir().expect("tempdir should be created");
        fs::create_dir_all(temp.path().join("alpha")).expect("alpha directory should be created");
        fs::create_dir_all(temp.path().join("beta")).expect("beta directory should be created");
        write_file(&temp.path().join("beta/z.txt"));
        write_file(&temp.path().join("alpha/m.txt"));
        write_file(&temp.path().join("alpha/a.txt"));

        let scanner = ParallelPathScanner::new();
        let first = scanner.scan_paths(temp.path(), None);
        let second = scanner.scan_paths(temp.path(), None);

        assert_eq!(first.candidate_paths(), second.candidate_paths());
        assert_eq!(first.issues(), second.issues());

        let relative = relative_paths(temp.path(), first.candidate_paths());
        assert_eq!(relative, vec!["alpha/a.txt", "alpha/m.txt", "beta/z.txt"]);
    }

    #[test]
    fn applies_gitignore_only_when_present() {
        let temp = tempdir().expect("tempdir should be created");
        fs::create_dir_all(temp.path().join("ignored"))
            .expect("ignored directory should be created");
        write_file(&temp.path().join("keep.rs"));
        write_file(&temp.path().join("skip.tmp"));
        write_file(&temp.path().join("ignored/hidden.rs"));

        let scanner = ParallelPathScanner::new();
        let without_gitignore = scanner.scan_paths(temp.path(), None);
        let without_gitignore_relative =
            relative_paths(temp.path(), without_gitignore.candidate_paths());
        assert!(without_gitignore_relative.contains(&"keep.rs".to_string()));
        assert!(without_gitignore_relative.contains(&"skip.tmp".to_string()));
        assert!(without_gitignore_relative.contains(&"ignored/hidden.rs".to_string()));

        fs::write(temp.path().join(".gitignore"), "ignored/\n*.tmp\n")
            .expect(".gitignore should be written");
        let with_gitignore = scanner.scan_paths(temp.path(), None);
        let with_gitignore_relative = relative_paths(temp.path(), with_gitignore.candidate_paths());

        assert!(with_gitignore_relative.contains(&"keep.rs".to_string()));
        assert!(!with_gitignore_relative.contains(&"skip.tmp".to_string()));
        assert!(!with_gitignore_relative.contains(&"ignored/hidden.rs".to_string()));
    }

    #[test]
    fn honors_depth_limit_for_zero_and_n() {
        let temp = tempdir().expect("tempdir should be created");
        fs::create_dir_all(temp.path().join("nested/child/grand"))
            .expect("nested directories should be created");
        write_file(&temp.path().join("root.rs"));
        write_file(&temp.path().join("nested/inside.rs"));
        write_file(&temp.path().join("nested/child/deep.rs"));
        write_file(&temp.path().join("nested/child/grand/deeper.rs"));

        let scanner = ParallelPathScanner::new();
        let depth_zero = scanner.scan_paths(
            temp.path(),
            Some(DepthLimit::parse("0".to_string()).expect("depth should be valid")),
        );
        let depth_two = scanner.scan_paths(
            temp.path(),
            Some(DepthLimit::parse("2".to_string()).expect("depth should be valid")),
        );

        let depth_zero_relative = relative_paths(temp.path(), depth_zero.candidate_paths());
        assert_eq!(depth_zero_relative, vec!["root.rs"]);

        let depth_two_relative = relative_paths(temp.path(), depth_two.candidate_paths());
        assert!(depth_two_relative.contains(&"root.rs".to_string()));
        assert!(depth_two_relative.contains(&"nested/inside.rs".to_string()));
        assert!(depth_two_relative.contains(&"nested/child/deep.rs".to_string()));
        assert!(!depth_two_relative.contains(&"nested/child/grand/deeper.rs".to_string()));
    }

    #[cfg(unix)]
    #[test]
    fn records_permission_denied_and_continues_scanning() {
        use std::os::unix::fs::PermissionsExt;

        struct PermissionReset {
            path: PathBuf,
            mode: u32,
        }

        impl Drop for PermissionReset {
            fn drop(&mut self) {
                let _ = fs::set_permissions(&self.path, fs::Permissions::from_mode(self.mode));
            }
        }

        let temp = tempdir().expect("tempdir should be created");
        fs::create_dir_all(temp.path().join("readable"))
            .expect("readable directory should be created");
        fs::create_dir_all(temp.path().join("blocked"))
            .expect("blocked directory should be created");
        write_file(&temp.path().join("readable/ok.txt"));
        write_file(&temp.path().join("blocked/secret.txt"));

        let blocked_dir = temp.path().join("blocked");
        let original_mode = fs::metadata(&blocked_dir)
            .expect("blocked directory metadata should be available")
            .permissions()
            .mode();
        let _permission_reset = PermissionReset {
            path: blocked_dir.clone(),
            mode: original_mode,
        };
        fs::set_permissions(&blocked_dir, fs::Permissions::from_mode(0o000))
            .expect("blocked directory should be restricted");

        let scanner = ParallelPathScanner::new();
        let snapshot = scanner.scan_paths(temp.path(), None);

        let relative = relative_paths(temp.path(), snapshot.candidate_paths());
        assert!(relative.contains(&"readable/ok.txt".to_string()));
        assert!(
            snapshot
                .issues()
                .iter()
                .any(|issue| issue.permission_denied())
        );
    }
}

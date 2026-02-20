use std::path::PathBuf;

use ignore::WalkBuilder;

use crate::cli_error::CliError;
use crate::search_request::SearchRequest;
use crate::target_filter_policy::TargetFilterPolicy;

pub struct TargetCatalog;

impl TargetCatalog {
    pub fn collect(search_request: &SearchRequest) -> Result<Vec<PathBuf>, CliError> {
        let target = search_request.target();
        if !target.exists() {
            return Err(CliError::TargetPathMissing {
                path: target.to_path_buf(),
            });
        }

        if !target.is_file() && !target.is_dir() {
            return Err(CliError::UnsupportedTarget {
                path: target.to_path_buf(),
            });
        }

        let filter_policy = TargetFilterPolicy::from_request(search_request)?;
        let mut walk_builder = WalkBuilder::new(target);
        walk_builder.hidden(false);
        walk_builder.ignore(false);
        walk_builder.git_ignore(true);
        walk_builder.git_global(false);
        walk_builder.git_exclude(false);
        walk_builder.parents(true);
        walk_builder.require_git(false);

        let mut collected_paths = Vec::new();
        for walk_entry in walk_builder.build() {
            let entry = walk_entry.map_err(|error| CliError::TargetTraversalFailed {
                path: target.to_path_buf(),
                message: error.to_string(),
            })?;

            if entry
                .file_type()
                .is_some_and(|file_type| file_type.is_file())
                && filter_policy.allows(entry.path())
            {
                collected_paths.push(entry.into_path());
            }
        }

        collected_paths.sort();
        collected_paths.dedup();
        Ok(collected_paths)
    }
}

#[cfg(test)]
mod tests {
    use std::collections::BTreeSet;
    use std::fs;
    use std::path::{Path, PathBuf};

    use tempfile::tempdir;

    use crate::context_window::ContextWindow;
    use crate::search_pattern::SearchPattern;
    use crate::search_request::SearchRequest;
    use crate::target_catalog::TargetCatalog;

    #[test]
    fn returns_single_file_when_target_is_file() {
        let temp_directory = tempdir().unwrap();
        let file_path = temp_directory.path().join("single.txt");
        fs::write(&file_path, "hello").unwrap();
        let search_request = build_search_request(file_path.clone(), Vec::new(), Vec::new());

        let targets = TargetCatalog::collect(&search_request).unwrap();
        assert_eq!(targets, vec![file_path]);
    }

    #[test]
    fn collects_files_recursively_when_target_is_directory() {
        let temp_directory = tempdir().unwrap();
        fs::create_dir(temp_directory.path().join("nested")).unwrap();
        let top_file = temp_directory.path().join("a.txt");
        let nested_file = temp_directory.path().join("nested").join("b.txt");
        fs::write(&top_file, "hello").unwrap();
        fs::write(&nested_file, "world").unwrap();
        let search_request =
            build_search_request(temp_directory.path().to_path_buf(), Vec::new(), Vec::new());

        let targets = TargetCatalog::collect(&search_request).unwrap();
        let target_names: BTreeSet<String> = targets
            .iter()
            .filter_map(|path| file_name(path))
            .collect::<BTreeSet<_>>();

        assert_eq!(
            target_names,
            BTreeSet::from(["a.txt".to_string(), "b.txt".to_string()])
        );
    }

    #[test]
    fn excludes_gitignored_files_for_directory_target() {
        let temp_directory = tempdir().unwrap();
        fs::create_dir(temp_directory.path().join("nested")).unwrap();
        fs::write(
            temp_directory.path().join(".gitignore"),
            "ignored.txt\nnested/\n",
        )
        .unwrap();
        fs::write(temp_directory.path().join("ignored.txt"), "skip").unwrap();
        fs::write(temp_directory.path().join("included.txt"), "keep").unwrap();
        fs::write(
            temp_directory.path().join("nested").join("inside.txt"),
            "skip",
        )
        .unwrap();
        let search_request =
            build_search_request(temp_directory.path().to_path_buf(), Vec::new(), Vec::new());

        let targets = TargetCatalog::collect(&search_request).unwrap();
        let target_names: BTreeSet<String> = targets
            .iter()
            .filter_map(|path| file_name(path))
            .collect::<BTreeSet<_>>();

        assert!(target_names.contains("included.txt"));
        assert!(!target_names.contains("ignored.txt"));
        assert!(!target_names.contains("inside.txt"));
    }

    #[test]
    fn applies_path_and_extension_filters_with_exclude_priority() {
        let temp_directory = tempdir().unwrap();
        fs::create_dir_all(temp_directory.path().join("src").join("generated")).unwrap();
        fs::write(temp_directory.path().join("src").join("keep.rs"), "keep").unwrap();
        fs::write(
            temp_directory
                .path()
                .join("src")
                .join("generated")
                .join("skip.rs"),
            "skip",
        )
        .unwrap();
        fs::write(temp_directory.path().join("src").join("skip.md"), "skip").unwrap();

        let search_request = build_search_request_with_extensions(
            temp_directory.path().to_path_buf(),
            vec!["src/**/*.rs".to_string()],
            vec!["src/generated/**".to_string()],
            vec!["rs".to_string()],
            vec![".tmp".to_string()],
        );

        let targets = TargetCatalog::collect(&search_request).unwrap();
        let target_names: BTreeSet<String> = targets
            .iter()
            .filter_map(|path| file_name(path))
            .collect::<BTreeSet<_>>();

        assert_eq!(target_names, BTreeSet::from(["keep.rs".to_string()]));
    }

    #[test]
    fn returns_targets_in_ascending_path_order() {
        let temp_directory = tempdir().unwrap();
        let z_path = temp_directory.path().join("z.txt");
        let a_path = temp_directory.path().join("a.txt");
        let m_path = temp_directory.path().join("m.txt");
        fs::write(&z_path, "z").unwrap();
        fs::write(&a_path, "a").unwrap();
        fs::write(&m_path, "m").unwrap();

        let search_request =
            build_search_request(temp_directory.path().to_path_buf(), Vec::new(), Vec::new());
        let targets = TargetCatalog::collect(&search_request).unwrap();
        let file_names = targets
            .iter()
            .map(|path| path.file_name().unwrap().to_string_lossy().into_owned())
            .collect::<Vec<_>>();

        assert_eq!(
            file_names,
            vec!["a.txt".to_string(), "m.txt".to_string(), "z.txt".to_string()]
        );
    }

    #[test]
    fn returns_empty_catalog_when_all_targets_are_filtered_out() {
        let temp_directory = tempdir().unwrap();
        fs::write(temp_directory.path().join("main.rs"), "hello").unwrap();

        let search_request = build_search_request_with_extensions(
            temp_directory.path().to_path_buf(),
            Vec::new(),
            Vec::new(),
            vec!["rs".to_string()],
            vec!["rs".to_string()],
        );

        let targets = TargetCatalog::collect(&search_request).unwrap();
        assert!(targets.is_empty());
    }

    fn file_name(path: &Path) -> Option<String> {
        path.file_name()
            .map(|file_name| file_name.to_string_lossy().into_owned())
    }

    fn build_search_request(
        target: PathBuf,
        path_includes: Vec<String>,
        path_excludes: Vec<String>,
    ) -> SearchRequest {
        build_search_request_with_extensions(
            target,
            path_includes,
            path_excludes,
            Vec::new(),
            Vec::new(),
        )
    }

    fn build_search_request_with_extensions(
        target: PathBuf,
        path_includes: Vec<String>,
        path_excludes: Vec<String>,
        extension_includes: Vec<String>,
        extension_excludes: Vec<String>,
    ) -> SearchRequest {
        SearchRequest::new(
            SearchPattern::from_cli("needle".to_string(), true).unwrap(),
            target,
            ContextWindow::new(0, 0),
            false,
            path_includes,
            path_excludes,
            extension_includes,
            extension_excludes,
        )
    }
}

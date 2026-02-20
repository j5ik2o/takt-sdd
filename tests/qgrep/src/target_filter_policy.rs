use std::collections::BTreeSet;
use std::path::{Path, PathBuf};

use globset::{Glob, GlobSet, GlobSetBuilder};

use crate::cli_error::CliError;
use crate::search_request::SearchRequest;

#[derive(Debug)]
pub struct TargetFilterPolicy {
    base_path: PathBuf,
    path_includes: Option<GlobSet>,
    path_excludes: Option<GlobSet>,
    extension_includes: BTreeSet<String>,
    extension_excludes: BTreeSet<String>,
}

impl TargetFilterPolicy {
    pub fn from_request(search_request: &SearchRequest) -> Result<Self, CliError> {
        let target = search_request.target();
        let base_path = if target.is_dir() {
            target.to_path_buf()
        } else {
            target
                .parent()
                .map_or_else(|| PathBuf::from("."), Path::to_path_buf)
        };

        Ok(Self {
            base_path,
            path_includes: compile_glob_set("--path-include", search_request.path_includes())?,
            path_excludes: compile_glob_set("--path-exclude", search_request.path_excludes())?,
            extension_includes: normalize_extensions(search_request.extension_includes()),
            extension_excludes: normalize_extensions(search_request.extension_excludes()),
        })
    }

    pub fn allows(&self, path: &Path) -> bool {
        let relative_path = normalize_relative_path(&self.base_path, path);

        if let Some(include_set) = &self.path_includes {
            if !include_set.is_match(relative_path.as_str()) {
                return false;
            }
        }

        if !self.extension_includes.is_empty() {
            let Some(extension) = normalize_extension_from_path(path) else {
                return false;
            };

            if !self.extension_includes.contains(extension.as_str()) {
                return false;
            }
        }

        let excluded_by_path = self
            .path_excludes
            .as_ref()
            .is_some_and(|exclude_set| exclude_set.is_match(relative_path.as_str()));

        if excluded_by_path {
            return false;
        }

        normalize_extension_from_path(path)
            .as_ref()
            .is_none_or(|extension| !self.extension_excludes.contains(extension.as_str()))
    }
}

fn compile_glob_set(
    option: &'static str,
    patterns: &[String],
) -> Result<Option<GlobSet>, CliError> {
    if patterns.is_empty() {
        return Ok(None);
    }

    let mut builder = GlobSetBuilder::new();
    for pattern in patterns {
        let compiled = Glob::new(pattern).map_err(|error| CliError::InvalidPathFilterPattern {
            option,
            pattern: pattern.clone(),
            message: error.to_string(),
        })?;
        builder.add(compiled);
    }

    builder
        .build()
        .map(Some)
        .map_err(|error| CliError::InvalidPathFilterPattern {
            option,
            pattern: "<multiple-patterns>".to_string(),
            message: error.to_string(),
        })
}

fn normalize_extensions(values: &[String]) -> BTreeSet<String> {
    values
        .iter()
        .map(|value| normalize_extension(value.as_str()))
        .filter(|normalized| !normalized.is_empty())
        .collect()
}

fn normalize_extension(value: &str) -> String {
    value.trim_start_matches('.').to_ascii_lowercase()
}

fn normalize_extension_from_path(path: &Path) -> Option<String> {
    path.extension()
        .map(|extension| normalize_extension(extension.to_string_lossy().as_ref()))
        .filter(|normalized| !normalized.is_empty())
}

fn normalize_relative_path(base_path: &Path, path: &Path) -> String {
    let relative = path.strip_prefix(base_path).unwrap_or(path);
    relative
        .components()
        .map(|component| component.as_os_str().to_string_lossy().into_owned())
        .collect::<Vec<_>>()
        .join("/")
}

#[cfg(test)]
mod tests {
    use std::fs;

    use tempfile::tempdir;

    use crate::context_window::ContextWindow;
    use crate::search_pattern::SearchPattern;
    use crate::search_request::SearchRequest;
    use crate::target_filter_policy::TargetFilterPolicy;

    #[test]
    fn path_exclude_has_priority_over_path_include() {
        let temp_directory = tempdir().unwrap();
        let included_path = temp_directory.path().join("src").join("included.rs");
        let excluded_path = temp_directory
            .path()
            .join("src")
            .join("generated")
            .join("skip.rs");

        fs::create_dir_all(included_path.parent().unwrap()).unwrap();
        fs::create_dir_all(excluded_path.parent().unwrap()).unwrap();
        fs::write(&included_path, "let keep = true;").unwrap();
        fs::write(&excluded_path, "let skip = true;").unwrap();

        let request = build_search_request(
            temp_directory.path().to_path_buf(),
            vec!["src/**/*.rs"],
            vec!["src/generated/**"],
            Vec::new(),
            Vec::new(),
        );
        let filter_policy = TargetFilterPolicy::from_request(&request).unwrap();

        assert!(filter_policy.allows(&included_path));
        assert!(!filter_policy.allows(&excluded_path));
    }

    #[test]
    fn extension_exclude_has_priority_over_extension_include() {
        let temp_directory = tempdir().unwrap();
        let rust_file = temp_directory.path().join("main.RS");
        let markdown_file = temp_directory.path().join("README.md");

        fs::write(&rust_file, "fn main() {}").unwrap();
        fs::write(&markdown_file, "# doc").unwrap();

        let request = build_search_request(
            temp_directory.path().to_path_buf(),
            Vec::new(),
            Vec::new(),
            vec!["rs"],
            vec![".rs"],
        );
        let filter_policy = TargetFilterPolicy::from_request(&request).unwrap();

        assert!(!filter_policy.allows(&rust_file));
        assert!(!filter_policy.allows(&markdown_file));
    }

    #[test]
    fn keeps_only_paths_matching_path_include() {
        let temp_directory = tempdir().unwrap();
        let included_path = temp_directory.path().join("src").join("main.rs");
        let excluded_path = temp_directory.path().join("tests").join("main.rs");
        fs::create_dir_all(included_path.parent().unwrap()).unwrap();
        fs::create_dir_all(excluded_path.parent().unwrap()).unwrap();
        fs::write(&included_path, "fn main() {}").unwrap();
        fs::write(&excluded_path, "fn main() {}").unwrap();

        let request = build_search_request(
            temp_directory.path().to_path_buf(),
            vec!["src/**/*.rs"],
            Vec::new(),
            Vec::new(),
            Vec::new(),
        );
        let filter_policy = TargetFilterPolicy::from_request(&request).unwrap();

        assert!(filter_policy.allows(&included_path));
        assert!(!filter_policy.allows(&excluded_path));
    }

    #[test]
    fn normalizes_extension_include_filter_values() {
        let temp_directory = tempdir().unwrap();
        let rust_file = temp_directory.path().join("main.rs");
        let markdown_file = temp_directory.path().join("README.md");
        fs::write(&rust_file, "fn main() {}").unwrap();
        fs::write(&markdown_file, "# doc").unwrap();

        let request = build_search_request(
            temp_directory.path().to_path_buf(),
            Vec::new(),
            Vec::new(),
            vec![".RS"],
            Vec::new(),
        );
        let filter_policy = TargetFilterPolicy::from_request(&request).unwrap();

        assert!(filter_policy.allows(&rust_file));
        assert!(!filter_policy.allows(&markdown_file));
    }

    #[test]
    fn rejects_invalid_glob_pattern() {
        let temp_directory = tempdir().unwrap();
        let request = build_search_request(
            temp_directory.path().to_path_buf(),
            vec!["[invalid"],
            Vec::new(),
            Vec::new(),
            Vec::new(),
        );

        let error = TargetFilterPolicy::from_request(&request).unwrap_err();

        match error {
            crate::cli_error::CliError::InvalidPathFilterPattern {
                option, pattern, ..
            } => {
                assert_eq!(option, "--path-include");
                assert_eq!(pattern, "[invalid");
            }
            _ => panic!("unexpected error variant"),
        }
    }

    fn build_search_request(
        target: std::path::PathBuf,
        path_includes: Vec<&str>,
        path_excludes: Vec<&str>,
        extension_includes: Vec<&str>,
        extension_excludes: Vec<&str>,
    ) -> SearchRequest {
        SearchRequest::new(
            SearchPattern::from_cli("needle".to_string(), true).unwrap(),
            target,
            ContextWindow::new(0, 0),
            false,
            path_includes.into_iter().map(ToString::to_string).collect(),
            path_excludes.into_iter().map(ToString::to_string).collect(),
            extension_includes
                .into_iter()
                .map(ToString::to_string)
                .collect(),
            extension_excludes
                .into_iter()
                .map(ToString::to_string)
                .collect(),
        )
    }
}

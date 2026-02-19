use std::path::Path;

use globset::{Glob, GlobMatcher};

use crate::qfind_error::QfindError;

#[derive(Debug, Clone)]
pub struct FileNamePattern {
    raw: String,
    matcher: GlobMatcher,
}

impl PartialEq for FileNamePattern {
    fn eq(&self, other: &Self) -> bool {
        self.raw == other.raw
    }
}

impl Eq for FileNamePattern {}

impl FileNamePattern {
    pub fn parse(raw: String) -> Result<Self, QfindError> {
        let glob = Glob::new(&raw).map_err(|error| QfindError::InvalidFileNamePattern {
            pattern: raw.clone(),
            reason: error.to_string(),
        })?;

        Ok(Self {
            raw,
            matcher: glob.compile_matcher(),
        })
    }

    pub fn as_str(&self) -> &str {
        &self.raw
    }

    pub fn matches_path(&self, path: &Path) -> bool {
        path.file_name()
            .and_then(|file_name| file_name.to_str())
            .is_some_and(|file_name| self.matcher.is_match(file_name))
    }
}

#[cfg(test)]
mod tests {
    use std::path::Path;

    use super::FileNamePattern;

    #[test]
    fn parse_accepts_valid_glob() {
        let result = FileNamePattern::parse("*.rs".to_string());

        assert!(result.is_ok());
        let pattern = result.expect("pattern should be valid");
        assert_eq!(pattern.as_str(), "*.rs");
    }

    #[test]
    fn parse_rejects_invalid_glob() {
        let result = FileNamePattern::parse("[abc".to_string());

        assert!(result.is_err());
        let message = result.expect_err("pattern should be rejected").to_string();
        assert!(message.contains("--glob"));
    }

    #[test]
    fn matches_path_returns_true_when_file_name_matches_glob() {
        let pattern = FileNamePattern::parse("*.rs".to_string()).expect("glob should be valid");

        assert!(pattern.matches_path(Path::new("src/main.rs")));
    }

    #[test]
    fn matches_path_returns_false_when_file_name_does_not_match_glob() {
        let pattern = FileNamePattern::parse("*.rs".to_string()).expect("glob should be valid");

        assert!(!pattern.matches_path(Path::new("README.md")));
    }

    #[test]
    fn matches_path_returns_false_when_path_has_no_file_name() {
        let pattern = FileNamePattern::parse("*.rs".to_string()).expect("glob should be valid");

        assert!(!pattern.matches_path(Path::new(".")));
    }
}

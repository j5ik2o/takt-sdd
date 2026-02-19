use std::fs;
use std::io;
use std::path::Path;

use regex::Regex;

use crate::qfind_error::QfindError;

#[derive(Debug, Clone)]
pub struct ContentPattern {
    raw: String,
    regex: Regex,
}

impl ContentPattern {
    pub fn parse(raw: String) -> Result<Self, QfindError> {
        let regex = Regex::new(&raw).map_err(|error| QfindError::InvalidContentPattern {
            pattern: raw.clone(),
            reason: error.to_string(),
        })?;

        Ok(Self { raw, regex })
    }

    pub fn as_str(&self) -> &str {
        &self.raw
    }

    pub fn is_match(&self, content: &str) -> bool {
        self.regex.is_match(content)
    }

    pub fn is_match_in_file(&self, path: &Path) -> io::Result<bool> {
        let content = fs::read_to_string(path)?;
        Ok(self.is_match(&content))
    }
}

#[cfg(test)]
mod tests {
    use std::fs;

    use tempfile::tempdir;

    use super::ContentPattern;

    #[test]
    fn parse_accepts_valid_regex() {
        let result = ContentPattern::parse("foo.*bar".to_string());

        assert!(result.is_ok());
        let pattern = result.expect("regex should be valid");
        assert_eq!(pattern.as_str(), "foo.*bar");
        assert!(pattern.is_match("foo123bar"));
    }

    #[test]
    fn parse_rejects_invalid_regex() {
        let result = ContentPattern::parse("(".to_string());

        assert!(result.is_err());
        let message = result.expect_err("regex should be rejected").to_string();
        assert!(message.contains("--regex"));
    }

    #[test]
    fn is_match_returns_false_when_content_does_not_match() {
        let pattern = ContentPattern::parse("foo".to_string()).expect("regex should be valid");

        let result = pattern.is_match("bar");

        assert!(!result);
    }

    #[test]
    fn is_match_in_file_returns_true_when_file_contains_pattern() {
        let temp = tempdir().expect("tempdir should be created");
        let file_path = temp.path().join("sample.txt");
        fs::write(&file_path, "prefix needle suffix").expect("file should be written");
        let pattern = ContentPattern::parse("needle".to_string()).expect("regex should be valid");

        let result = pattern
            .is_match_in_file(&file_path)
            .expect("file should be readable");

        assert!(result);
    }

    #[test]
    fn is_match_in_file_returns_false_when_file_does_not_contain_pattern() {
        let temp = tempdir().expect("tempdir should be created");
        let file_path = temp.path().join("sample.txt");
        fs::write(&file_path, "prefix suffix").expect("file should be written");
        let pattern = ContentPattern::parse("needle".to_string()).expect("regex should be valid");

        let result = pattern
            .is_match_in_file(&file_path)
            .expect("file should be readable");

        assert!(!result);
    }

    #[test]
    fn is_match_in_file_returns_error_when_file_is_missing() {
        let temp = tempdir().expect("tempdir should be created");
        let file_path = temp.path().join("missing.txt");
        let pattern = ContentPattern::parse("needle".to_string()).expect("regex should be valid");

        let result = pattern.is_match_in_file(&file_path);

        assert!(result.is_err());
    }
}

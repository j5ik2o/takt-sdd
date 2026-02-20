use regex::Regex;

use crate::cli_error::CliError;

#[derive(Debug, Clone)]
pub enum SearchPattern {
    Regex(Regex),
    Fixed(String),
}

impl SearchPattern {
    pub fn from_cli(pattern: String, fixed_strings: bool) -> Result<Self, CliError> {
        if fixed_strings {
            return Ok(Self::Fixed(pattern));
        }

        let compiled = Regex::new(&pattern).map_err(|error| CliError::InvalidRegex {
            pattern,
            message: error.to_string(),
        })?;

        Ok(Self::Regex(compiled))
    }

    pub fn is_match(&self, line: &str) -> bool {
        match self {
            Self::Regex(regex) => regex.is_match(line),
            Self::Fixed(pattern) => line.contains(pattern),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::SearchPattern;
    use crate::cli_error::CliError;

    #[test]
    fn builds_regex_pattern_in_default_mode() {
        let pattern = SearchPattern::from_cli("foo.*bar".to_string(), false)
            .expect("regex mode should accept a valid regular expression");

        assert!(matches!(&pattern, SearchPattern::Regex(_)));
        assert!(pattern.is_match("foo123bar"));
        assert!(!pattern.is_match("bar123foo"));
    }

    #[test]
    fn keeps_metacharacters_as_literals_in_fixed_mode() {
        let pattern = SearchPattern::from_cli("foo.*bar".to_string(), true)
            .expect("fixed-string mode should accept any input");

        assert!(matches!(&pattern, SearchPattern::Fixed(value) if value == "foo.*bar"));
        assert!(pattern.is_match("xxfoo.*baryy"));
        assert!(!pattern.is_match("foo123bar"));
    }

    #[test]
    fn returns_error_for_invalid_regex() {
        let error = SearchPattern::from_cli("(".to_string(), false)
            .expect_err("invalid regex must be treated as an input error");

        match error {
            CliError::InvalidRegex { pattern, .. } => assert_eq!(pattern, "("),
            _ => panic!("unexpected error variant"),
        }
    }

    #[test]
    fn checks_matching_by_search_mode() {
        let regex_pattern = SearchPattern::from_cli("^foo".to_string(), false).unwrap();
        assert!(regex_pattern.is_match("foobar"));
        assert!(!regex_pattern.is_match("barfoo"));

        let fixed_pattern = SearchPattern::from_cli("foo.*bar".to_string(), true).unwrap();
        assert!(fixed_pattern.is_match("xxfoo.*baryy"));
        assert!(!fixed_pattern.is_match("foobar"));
    }
}

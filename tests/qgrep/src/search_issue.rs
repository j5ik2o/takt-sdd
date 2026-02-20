use std::fmt::{Display, Formatter};
use std::path::PathBuf;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum SearchIssue {
    TargetReadFailed { path: PathBuf, message: String },
    TargetDecodeFailed { path: PathBuf, message: String },
    OutputWriteFailed { message: String },
}

impl SearchIssue {
    pub fn is_recoverable(&self) -> bool {
        matches!(
            self,
            Self::TargetReadFailed { .. } | Self::TargetDecodeFailed { .. }
        )
    }

    pub fn is_fatal(&self) -> bool {
        matches!(self, Self::OutputWriteFailed { .. })
    }
}

impl Display for SearchIssue {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::TargetReadFailed { path, message } => {
                write!(f, "target read failed {}: {message}", path.display())
            }
            Self::TargetDecodeFailed { path, message } => {
                write!(f, "target decode failed {}: {message}", path.display())
            }
            Self::OutputWriteFailed { message } => write!(f, "output write failed: {message}"),
        }
    }
}

impl std::error::Error for SearchIssue {}

#[cfg(test)]
mod tests {
    use std::path::PathBuf;

    use crate::search_issue::SearchIssue;

    #[test]
    fn marks_target_issues_as_recoverable() {
        let issue = SearchIssue::TargetReadFailed {
            path: PathBuf::from("sample.txt"),
            message: "permission denied".to_string(),
        };

        assert!(issue.is_recoverable());
        assert!(!issue.is_fatal());
    }

    #[test]
    fn marks_output_issue_as_fatal() {
        let issue = SearchIssue::OutputWriteFailed {
            message: "broken pipe".to_string(),
        };

        assert!(!issue.is_recoverable());
        assert!(issue.is_fatal());
    }
}

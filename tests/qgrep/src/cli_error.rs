use std::fmt::{Display, Formatter};
use std::path::PathBuf;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum CliError {
    InvalidRegex {
        pattern: String,
        message: String,
    },
    InvalidContextValue {
        option: &'static str,
        value: i64,
    },
    InvalidPathFilterPattern {
        option: &'static str,
        pattern: String,
        message: String,
    },
    TargetPathMissing {
        path: PathBuf,
    },
    UnsupportedTarget {
        path: PathBuf,
    },
    TargetTraversalFailed {
        path: PathBuf,
        message: String,
    },
}

impl CliError {
    pub fn exit_code(&self) -> i32 {
        2
    }
}

impl Display for CliError {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::InvalidRegex { pattern, message } => {
                write!(
                    f,
                    "invalid regular expression pattern `{pattern}`: {message}"
                )
            }
            Self::InvalidContextValue { option, value } => {
                write!(f, "invalid context value for {option}: {value}")
            }
            Self::InvalidPathFilterPattern {
                option,
                pattern,
                message,
            } => {
                write!(
                    f,
                    "invalid path filter pattern for {option} `{pattern}`: {message}"
                )
            }
            Self::TargetPathMissing { path } => {
                write!(f, "search target does not exist: {}", path.display())
            }
            Self::UnsupportedTarget { path } => {
                write!(
                    f,
                    "search target must be a file or directory: {}",
                    path.display()
                )
            }
            Self::TargetTraversalFailed { path, message } => {
                write!(
                    f,
                    "failed to traverse search target {}: {message}",
                    path.display()
                )
            }
        }
    }
}

impl std::error::Error for CliError {}

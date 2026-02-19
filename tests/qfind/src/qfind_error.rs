use thiserror::Error;

#[derive(Debug, Error)]
pub enum QfindError {
    #[error("{0}")]
    CliArgument(#[from] clap::Error),

    #[error("invalid --glob pattern '{pattern}': {reason}")]
    InvalidFileNamePattern { pattern: String, reason: String },

    #[error("invalid --regex pattern '{pattern}': {reason}")]
    InvalidContentPattern { pattern: String, reason: String },

    #[error("invalid --max-depth value '{value}': {reason}")]
    InvalidDepthLimit { value: String, reason: String },

    #[error("failed to read file '{path}' while applying --regex: {reason}")]
    FileReadFailed { path: String, reason: String },

    #[error("failed to render JSON output: {reason}")]
    JsonRenderFailed { reason: String },
}

impl QfindError {
    pub fn exit_code(&self) -> i32 {
        match self {
            Self::CliArgument(error) => error.exit_code(),
            Self::InvalidFileNamePattern { .. }
            | Self::InvalidContentPattern { .. }
            | Self::InvalidDepthLimit { .. } => 2,
            Self::FileReadFailed { .. } | Self::JsonRenderFailed { .. } => 1,
        }
    }
}

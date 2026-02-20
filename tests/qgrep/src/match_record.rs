use std::path::Path;
use std::path::PathBuf;

use crate::context_line::ContextLine;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct MatchRecord {
    path: PathBuf,
    line_number: usize,
    line: String,
    before_context: Vec<ContextLine>,
    after_context: Vec<ContextLine>,
}

impl MatchRecord {
    pub fn new(
        path: PathBuf,
        line_number: usize,
        line: String,
        before_context: Vec<ContextLine>,
        after_context: Vec<ContextLine>,
    ) -> Self {
        Self {
            path,
            line_number,
            line,
            before_context,
            after_context,
        }
    }

    pub fn path(&self) -> &Path {
        self.path.as_path()
    }

    pub fn line_number(&self) -> usize {
        self.line_number
    }

    pub fn line(&self) -> &str {
        self.line.as_str()
    }

    pub fn before_context(&self) -> &[ContextLine] {
        self.before_context.as_slice()
    }

    pub fn after_context(&self) -> &[ContextLine] {
        self.after_context.as_slice()
    }
}

use std::path::{Path, PathBuf};

use crate::context_window::ContextWindow;
use crate::search_pattern::SearchPattern;

#[derive(Debug, Clone)]
pub struct SearchRequest {
    pattern: SearchPattern,
    target: PathBuf,
    context_window: ContextWindow,
    json_output: bool,
    path_includes: Vec<String>,
    path_excludes: Vec<String>,
    extension_includes: Vec<String>,
    extension_excludes: Vec<String>,
}

impl SearchRequest {
    pub fn new(
        pattern: SearchPattern,
        target: PathBuf,
        context_window: ContextWindow,
        json_output: bool,
        path_includes: Vec<String>,
        path_excludes: Vec<String>,
        extension_includes: Vec<String>,
        extension_excludes: Vec<String>,
    ) -> Self {
        Self {
            pattern,
            target,
            context_window,
            json_output,
            path_includes,
            path_excludes,
            extension_includes,
            extension_excludes,
        }
    }

    pub fn pattern(&self) -> &SearchPattern {
        &self.pattern
    }

    pub fn target(&self) -> &Path {
        self.target.as_path()
    }

    pub fn context_window(&self) -> ContextWindow {
        self.context_window
    }

    pub fn json_output(&self) -> bool {
        self.json_output
    }

    pub fn path_includes(&self) -> &[String] {
        self.path_includes.as_slice()
    }

    pub fn path_excludes(&self) -> &[String] {
        self.path_excludes.as_slice()
    }

    pub fn extension_includes(&self) -> &[String] {
        self.extension_includes.as_slice()
    }

    pub fn extension_excludes(&self) -> &[String] {
        self.extension_excludes.as_slice()
    }
}

use std::path::{Path, PathBuf};

use crate::content_pattern::ContentPattern;
use crate::depth_limit::DepthLimit;
use crate::file_name_pattern::FileNamePattern;

#[derive(Debug, Clone)]
pub struct SearchCommand {
    search_root: PathBuf,
    file_name_pattern: Option<FileNamePattern>,
    content_pattern: Option<ContentPattern>,
    depth_limit: Option<DepthLimit>,
    json_output: bool,
}

impl SearchCommand {
    pub fn new(
        search_root: PathBuf,
        file_name_pattern: Option<FileNamePattern>,
        content_pattern: Option<ContentPattern>,
        depth_limit: Option<DepthLimit>,
        json_output: bool,
    ) -> Self {
        Self {
            search_root,
            file_name_pattern,
            content_pattern,
            depth_limit,
            json_output,
        }
    }

    pub fn search_root(&self) -> &Path {
        &self.search_root
    }

    pub fn file_name_pattern(&self) -> Option<&FileNamePattern> {
        self.file_name_pattern.as_ref()
    }

    pub fn content_pattern(&self) -> Option<&ContentPattern> {
        self.content_pattern.as_ref()
    }

    pub fn depth_limit(&self) -> Option<DepthLimit> {
        self.depth_limit
    }

    pub fn json_output(&self) -> bool {
        self.json_output
    }
}

#[cfg(test)]
mod tests {
    use std::path::PathBuf;

    use crate::content_pattern::ContentPattern;
    use crate::depth_limit::DepthLimit;
    use crate::file_name_pattern::FileNamePattern;

    use super::SearchCommand;

    #[test]
    fn preserves_optional_conditions() {
        let command = SearchCommand::new(
            PathBuf::from("."),
            Some(FileNamePattern::parse("*.rs".to_string()).expect("glob should be valid")),
            Some(ContentPattern::parse("main".to_string()).expect("regex should be valid")),
            Some(DepthLimit::parse("3".to_string()).expect("depth should be valid")),
            true,
        );

        assert_eq!(command.search_root(), PathBuf::from(".").as_path());
        assert_eq!(
            command
                .file_name_pattern()
                .expect("file pattern should exist")
                .as_str(),
            "*.rs"
        );
        assert_eq!(
            command
                .content_pattern()
                .expect("content pattern should exist")
                .as_str(),
            "main"
        );
        assert_eq!(
            command.depth_limit().expect("depth should exist").value(),
            3
        );
        assert!(command.json_output());
    }

    #[test]
    fn keeps_unspecified_conditions_empty() {
        let command = SearchCommand::new(PathBuf::from("."), None, None, None, false);

        assert!(command.file_name_pattern().is_none());
        assert!(command.content_pattern().is_none());
        assert!(command.depth_limit().is_none());
        assert!(!command.json_output());
    }
}

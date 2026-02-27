use crate::language::{language_def, Language};
use anyhow::Result;
use serde::Serialize;
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Serialize)]
pub struct FileStats {
    pub path: PathBuf,
    pub language: Language,
    pub total_lines: u64,
    pub code_lines: u64,
    pub blank_lines: u64,
    pub comment_lines: u64,
}

#[derive(Debug, PartialEq)]
enum State {
    Normal,
    InBlockComment,
}

pub fn count(path: &Path, language: Language) -> Result<FileStats> {
    let content = std::fs::read_to_string(path)?;
    let stats = count_content(&content, path, language);
    Ok(stats)
}

pub fn count_content(content: &str, path: &Path, language: Language) -> FileStats {
    let def = language_def(&language);
    let line_comments: &[&str] = def.map(|d| d.line_comment).unwrap_or(&[]);
    let block_start: Option<&str> = def.and_then(|d| d.block_comment_start);
    let block_end: Option<&str> = def.and_then(|d| d.block_comment_end);

    let mut total_lines: u64 = 0;
    let mut code_lines: u64 = 0;
    let mut blank_lines: u64 = 0;
    let mut comment_lines: u64 = 0;
    let mut state = State::Normal;

    for line in content.lines() {
        total_lines += 1;
        let trimmed = line.trim();

        if trimmed.is_empty() {
            blank_lines += 1;
            continue;
        }

        match state {
            State::InBlockComment => {
                comment_lines += 1;
                if let Some(end) = block_end {
                    if trimmed.contains(end) {
                        state = State::Normal;
                    }
                }
            }
            State::Normal => {
                // Check line comment
                let is_line_comment = line_comments.iter().any(|&lc| trimmed.starts_with(lc));
                if is_line_comment {
                    comment_lines += 1;
                    continue;
                }

                // Check block comment start
                if let Some(start) = block_start {
                    if trimmed.contains(start) {
                        comment_lines += 1;
                        // Check if the block ends on the same line
                        if let Some(end) = block_end {
                            let after_start = trimmed
                                .find(start)
                                .map(|i| &trimmed[i + start.len()..])
                                .unwrap_or("");
                            if after_start.contains(end) {
                                // Single-line block comment, stay in Normal
                            } else {
                                state = State::InBlockComment;
                            }
                        } else {
                            state = State::InBlockComment;
                        }
                        continue;
                    }
                }

                code_lines += 1;
            }
        }
    }

    FileStats {
        path: path.to_path_buf(),
        language,
        total_lines,
        code_lines,
        blank_lines,
        comment_lines,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::Path;

    fn stats(content: &str, lang: Language) -> FileStats {
        count_content(content, Path::new("test"), lang)
    }

    #[test]
    fn test_blank_lines() {
        let content = "fn main() {\n\n    println!(\"hello\");\n\n}\n";
        let s = stats(content, Language::Rust);
        assert_eq!(s.total_lines, 5);
        assert_eq!(s.blank_lines, 2);
        assert_eq!(s.code_lines, 3);
        assert_eq!(s.comment_lines, 0);
    }

    #[test]
    fn test_line_comment_rust() {
        let content = "// This is a comment\nlet x = 1;\n";
        let s = stats(content, Language::Rust);
        assert_eq!(s.total_lines, 2);
        assert_eq!(s.comment_lines, 1);
        assert_eq!(s.code_lines, 1);
    }

    #[test]
    fn test_line_comment_python() {
        let content = "# comment\nx = 1\n\n";
        let s = stats(content, Language::Python);
        assert_eq!(s.total_lines, 3);
        assert_eq!(s.comment_lines, 1);
        assert_eq!(s.code_lines, 1);
        assert_eq!(s.blank_lines, 1);
    }

    #[test]
    fn test_block_comment_rust() {
        let content = "/* start\n middle\n end */\nlet x = 1;\n";
        let s = stats(content, Language::Rust);
        assert_eq!(s.total_lines, 4);
        assert_eq!(s.comment_lines, 3);
        assert_eq!(s.code_lines, 1);
    }

    #[test]
    fn test_single_line_block_comment() {
        let content = "/* inline */ let x = 1;\n";
        let s = stats(content, Language::Rust);
        // line contains block_start so counts as comment
        assert_eq!(s.total_lines, 1);
        assert_eq!(s.comment_lines, 1);
    }
}

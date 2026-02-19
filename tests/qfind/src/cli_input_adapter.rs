use std::ffi::OsString;
use std::path::PathBuf;

use clap::Parser;

use crate::content_pattern::ContentPattern;
use crate::depth_limit::DepthLimit;
use crate::file_name_pattern::FileNamePattern;
use crate::qfind_error::QfindError;
use crate::search_command::SearchCommand;

#[derive(Debug)]
pub struct CliInputAdapter;

impl CliInputAdapter {
    pub fn from_env() -> Result<SearchCommand, QfindError> {
        Self::parse_from_iter(std::env::args_os())
    }

    pub fn parse_from_iter<I, T>(args: I) -> Result<SearchCommand, QfindError>
    where
        I: IntoIterator<Item = T>,
        T: Into<OsString> + Clone,
    {
        let parsed = CliArguments::try_parse_from(args)?;

        let file_name_pattern = parsed
            .file_name_glob
            .map(FileNamePattern::parse)
            .transpose()?;

        let content_pattern = parsed
            .content_regex
            .map(ContentPattern::parse)
            .transpose()?;

        let depth_limit = parsed.max_depth.map(DepthLimit::parse).transpose()?;

        Ok(SearchCommand::new(
            parsed.search_root,
            file_name_pattern,
            content_pattern,
            depth_limit,
            parsed.json_output,
        ))
    }
}

#[derive(Debug, Parser)]
#[command(name = "qfind", version, about = "Fast file search CLI")]
struct CliArguments {
    #[arg(value_name = "SEARCH_ROOT")]
    search_root: PathBuf,

    #[arg(long = "glob", value_name = "FILE_NAME_GLOB")]
    file_name_glob: Option<String>,

    #[arg(long = "regex", value_name = "CONTENT_REGEX")]
    content_regex: Option<String>,

    #[arg(
        long = "max-depth",
        value_name = "MAX_DEPTH",
        allow_hyphen_values = true
    )]
    max_depth: Option<String>,

    #[arg(long = "json")]
    json_output: bool,
}

#[cfg(test)]
mod tests {
    use std::path::Path;

    use crate::qfind_error::QfindError;

    use super::CliInputAdapter;

    #[test]
    fn parse_from_iter_accepts_optional_conditions() {
        let args = [
            "qfind",
            ".",
            "--glob",
            "*.rs",
            "--regex",
            "main",
            "--max-depth",
            "2",
            "--json",
        ];

        let command = CliInputAdapter::parse_from_iter(args).expect("arguments should be valid");

        assert_eq!(command.search_root(), Path::new("."));
        assert_eq!(
            command
                .file_name_pattern()
                .expect("glob should exist")
                .as_str(),
            "*.rs"
        );
        assert_eq!(
            command
                .content_pattern()
                .expect("regex should exist")
                .as_str(),
            "main"
        );
        assert_eq!(
            command.depth_limit().expect("depth should exist").value(),
            2
        );
        assert!(command.json_output());
    }

    #[test]
    fn parse_from_iter_keeps_unspecified_conditions_empty() {
        let args = ["qfind", "."];

        let command = CliInputAdapter::parse_from_iter(args).expect("arguments should be valid");

        assert!(command.file_name_pattern().is_none());
        assert!(command.content_pattern().is_none());
        assert!(command.depth_limit().is_none());
        assert!(!command.json_output());
    }

    #[test]
    fn parse_from_iter_rejects_invalid_glob() {
        let args = ["qfind", ".", "--glob", "[abc"];

        let result = CliInputAdapter::parse_from_iter(args);

        assert!(matches!(
            result,
            Err(QfindError::InvalidFileNamePattern { .. })
        ));
    }

    #[test]
    fn parse_from_iter_rejects_invalid_regex() {
        let args = ["qfind", ".", "--regex", "("];

        let result = CliInputAdapter::parse_from_iter(args);

        assert!(matches!(
            result,
            Err(QfindError::InvalidContentPattern { .. })
        ));
    }

    #[test]
    fn parse_from_iter_rejects_invalid_depth() {
        let args = ["qfind", ".", "--max-depth", "-1"];

        let result = CliInputAdapter::parse_from_iter(args);

        assert!(matches!(result, Err(QfindError::InvalidDepthLimit { .. })));
    }
}

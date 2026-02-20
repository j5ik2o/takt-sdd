use crate::cli_args::CliArgs;
use crate::cli_error::CliError;
use crate::context_window::ContextWindow;
use crate::search_pattern::SearchPattern;
use crate::search_request::SearchRequest;

pub struct SearchRequestFactory;

impl SearchRequestFactory {
    pub fn build(cli_args: CliArgs) -> Result<SearchRequest, CliError> {
        let before_context = resolve_before_context(&cli_args)?;
        let after_context = resolve_after_context(&cli_args)?;

        let search_pattern = SearchPattern::from_cli(cli_args.pattern, cli_args.fixed_strings)?;
        let context_window = ContextWindow::new(before_context, after_context);

        Ok(SearchRequest::new(
            search_pattern,
            cli_args.target,
            context_window,
            cli_args.json_output,
            cli_args.path_includes,
            cli_args.path_excludes,
            cli_args.extension_includes,
            cli_args.extension_excludes,
        ))
    }
}

fn resolve_before_context(cli_args: &CliArgs) -> Result<usize, CliError> {
    match cli_args.before_context {
        Some(value) => validate_context_value("-B", value),
        None => match cli_args.context {
            Some(value) => validate_context_value("-C", value),
            None => Ok(0),
        },
    }
}

fn resolve_after_context(cli_args: &CliArgs) -> Result<usize, CliError> {
    match cli_args.after_context {
        Some(value) => validate_context_value("-A", value),
        None => match cli_args.context {
            Some(value) => validate_context_value("-C", value),
            None => Ok(0),
        },
    }
}

fn validate_context_value(option: &'static str, value: i64) -> Result<usize, CliError> {
    if value < 0 {
        return Err(CliError::InvalidContextValue { option, value });
    }

    usize::try_from(value).map_err(|_| CliError::InvalidContextValue { option, value })
}

#[cfg(test)]
mod tests {
    use clap::Parser;

    use crate::cli_args::CliArgs;
    use crate::cli_error::CliError;
    use crate::search_pattern::SearchPattern;
    use crate::search_request_factory::SearchRequestFactory;

    #[test]
    fn builds_regex_mode_request_by_default() {
        let cli_args = CliArgs::try_parse_from(["qgrep", "abc.*def", "src"]).unwrap();
        let search_request = SearchRequestFactory::build(cli_args).unwrap();

        assert!(matches!(search_request.pattern(), SearchPattern::Regex(_)));
        assert!(search_request.pattern().is_match("abcXYZdef"));
        assert!(!search_request.pattern().is_match("abxdef"));
        assert_eq!(search_request.context_window().before(), 0);
        assert_eq!(search_request.context_window().after(), 0);
        assert!(!search_request.json_output());
    }

    #[test]
    fn builds_fixed_string_request_when_flag_is_enabled() {
        let cli_args = CliArgs::try_parse_from(["qgrep", "-F", "abc.*def", "src"]).unwrap();
        let search_request = SearchRequestFactory::build(cli_args).unwrap();

        assert!(matches!(
            search_request.pattern(),
            SearchPattern::Fixed(pattern) if pattern == "abc.*def"
        ));
        assert!(search_request.pattern().is_match("xxabc.*defyy"));
        assert!(!search_request.pattern().is_match("abcXYZdef"));
    }

    #[test]
    fn applies_c_option_to_both_context_sides() {
        let cli_args = CliArgs::try_parse_from(["qgrep", "-C", "3", "needle", "src"]).unwrap();
        let search_request = SearchRequestFactory::build(cli_args).unwrap();

        assert_eq!(search_request.context_window().before(), 3);
        assert_eq!(search_request.context_window().after(), 3);
    }

    #[test]
    fn prioritizes_a_and_b_over_c_option() {
        let cli_args = CliArgs::try_parse_from([
            "qgrep", "-A", "1", "-B", "2", "-C", "9", "needle", "src",
        ])
        .unwrap();
        let search_request = SearchRequestFactory::build(cli_args).unwrap();

        assert_eq!(search_request.context_window().before(), 2);
        assert_eq!(search_request.context_window().after(), 1);
    }

    #[test]
    fn treats_negative_context_as_input_error() {
        let cli_args = CliArgs::try_parse_from(["qgrep", "-A", "-1", "needle", "src"]).unwrap();
        let error = SearchRequestFactory::build(cli_args).unwrap_err();

        match error {
            CliError::InvalidContextValue { option, value } => {
                assert_eq!(option, "-A");
                assert_eq!(value, -1);
            }
            _ => panic!("unexpected error variant"),
        }
    }

    #[test]
    fn treats_negative_c_context_as_input_error() {
        let cli_args = CliArgs::try_parse_from(["qgrep", "-C", "-1", "needle", "src"]).unwrap();
        let error = SearchRequestFactory::build(cli_args).unwrap_err();

        match error {
            CliError::InvalidContextValue { option, value } => {
                assert_eq!(option, "-C");
                assert_eq!(value, -1);
            }
            _ => panic!("unexpected error variant"),
        }
    }

    #[test]
    fn treats_invalid_regex_as_input_error() {
        let cli_args = CliArgs::try_parse_from(["qgrep", "(", "src"]).unwrap();
        let error = SearchRequestFactory::build(cli_args).unwrap_err();

        match error {
            CliError::InvalidRegex { pattern, .. } => assert_eq!(pattern, "("),
            _ => panic!("unexpected error variant"),
        }
    }

    #[test]
    fn keeps_include_and_exclude_filters() {
        let cli_args = CliArgs::try_parse_from([
            "qgrep",
            "--path-include",
            "src/**/*.rs",
            "--path-exclude",
            "src/generated/**",
            "--ext-include",
            "rs",
            "--ext-exclude",
            ".tmp",
            "needle",
            "src",
        ])
        .unwrap();

        let search_request = SearchRequestFactory::build(cli_args).unwrap();

        assert_eq!(search_request.path_includes(), &["src/**/*.rs".to_string()]);
        assert_eq!(
            search_request.path_excludes(),
            &["src/generated/**".to_string()]
        );
        assert_eq!(search_request.extension_includes(), &["rs".to_string()]);
        assert_eq!(search_request.extension_excludes(), &[".tmp".to_string()]);
    }
}

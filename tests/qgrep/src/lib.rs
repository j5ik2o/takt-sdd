mod cli_adapter;
mod cli_args;
mod cli_error;
mod context_line;
mod context_slice_policy;
mod context_window;
mod exit_code_policy;
mod json_output_adapter;
mod match_executor;
mod match_record;
mod search_issue;
mod search_outcome;
mod search_pattern;
mod search_request;
mod search_request_factory;
mod target_catalog;
mod target_filter_policy;
mod text_output_adapter;

use std::ffi::OsString;

use exit_code_policy::ExitCodePolicy;
use search_issue::SearchIssue;

pub use cli_error::CliError;

pub fn run_from_os_args<I, T>(args: I) -> i32
where
    I: IntoIterator<Item = T>,
    T: Into<OsString> + Clone,
{
    let cli_args = match cli_adapter::CliAdapter::parse_from(args) {
        Ok(cli_args) => cli_args,
        Err(error) => return render_clap_error(error),
    };

    let search_request = match search_request_factory::SearchRequestFactory::build(cli_args) {
        Ok(search_request) => search_request,
        Err(error) => {
            eprintln!("qgrep:error:{error}");
            return error.exit_code();
        }
    };

    let target_paths = match target_catalog::TargetCatalog::collect(&search_request) {
        Ok(target_paths) => target_paths,
        Err(error) => {
            eprintln!("qgrep:error:{error}");
            return error.exit_code();
        }
    };

    let mut search_outcome = match_executor::MatchExecutor::execute(&search_request, target_paths.as_slice());

    let output_result = if search_request.json_output() {
        json_output_adapter::JsonOutputAdapter::write(
            &mut std::io::stdout(),
            search_outcome.match_records(),
        )
    } else {
        text_output_adapter::TextOutputAdapter::write(
            &mut std::io::stdout(),
            search_outcome.match_records(),
        )
    };

    if let Err(error) = output_result {
        search_outcome.push_issue(SearchIssue::OutputWriteFailed {
            message: error.to_string(),
        });
    }

    for issue in search_outcome.issues() {
        eprintln!("qgrep:error:{issue}");
    }

    let has_issue = search_outcome.issues().iter().any(SearchIssue::is_recoverable)
        || search_outcome.issues().iter().any(SearchIssue::is_fatal);

    ExitCodePolicy::decide(search_outcome.match_records().len(), has_issue)
}

fn render_clap_error(error: clap::Error) -> i32 {
    let exit_code = error.exit_code();
    let _ = error.print();
    exit_code
}

use std::io::ErrorKind;
use std::path::PathBuf;

use qfind::cli_input_adapter::CliInputAdapter;
use qfind::collect_candidate_paths;
use qfind::qfind_error::QfindError;
use qfind::search_command::SearchCommand;
use serde::Serialize;

fn main() {
    if let Err(error) = run() {
        eprintln!("{error}");
        std::process::exit(error.exit_code());
    }
}

fn run() -> Result<(), QfindError> {
    let search_command = CliInputAdapter::from_env()?;
    let candidate_paths =
        collect_candidate_paths(search_command.search_root(), search_command.depth_limit());
    let filtered_paths = apply_conditions(candidate_paths, &search_command)?;
    render_output(&filtered_paths, search_command.json_output())?;

    Ok(())
}

fn apply_conditions(
    candidate_paths: Vec<PathBuf>,
    search_command: &SearchCommand,
) -> Result<Vec<PathBuf>, QfindError> {
    let file_name_filtered = match search_command.file_name_pattern() {
        Some(file_name_pattern) => candidate_paths
            .into_iter()
            .filter(|candidate_path| file_name_pattern.matches_path(candidate_path))
            .collect(),
        None => candidate_paths,
    };

    match search_command.content_pattern() {
        Some(content_pattern) => {
            let mut matched_paths = Vec::new();
            for candidate_path in file_name_filtered {
                match content_pattern.is_match_in_file(&candidate_path) {
                    Ok(true) => matched_paths.push(candidate_path),
                    Ok(false) => {}
                    Err(error) if error.kind() == ErrorKind::PermissionDenied => {}
                    Err(error) => {
                        return Err(QfindError::FileReadFailed {
                            path: candidate_path.display().to_string(),
                            reason: error.to_string(),
                        });
                    }
                }
            }
            Ok(matched_paths)
        }
        None => Ok(file_name_filtered),
    }
}

fn render_output(paths: &[PathBuf], json_output: bool) -> Result<(), QfindError> {
    if json_output {
        return render_json(paths);
    }

    for path in paths {
        println!("{}", path.display());
    }

    Ok(())
}

#[derive(Debug, Serialize)]
struct JsonPath {
    path: String,
}

fn render_json(paths: &[PathBuf]) -> Result<(), QfindError> {
    let entries: Vec<JsonPath> = paths
        .iter()
        .map(|path| JsonPath {
            path: path.display().to_string(),
        })
        .collect();

    let rendered =
        serde_json::to_string(&entries).map_err(|error| QfindError::JsonRenderFailed {
            reason: error.to_string(),
        })?;
    println!("{rendered}");

    Ok(())
}

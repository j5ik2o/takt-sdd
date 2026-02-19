use std::path::{Path, PathBuf};

use depth_limit::DepthLimit;
use parallel_path_scanner::ParallelPathScanner;

pub mod cli_input_adapter;
pub mod content_pattern;
pub mod depth_limit;
pub mod file_name_pattern;
mod parallel_path_scanner;
mod path_scanner_port;
pub mod qfind_error;
mod scan_issue;
mod scan_snapshot;
pub mod search_command;

pub fn collect_candidate_paths(
    search_root: &Path,
    depth_limit: Option<DepthLimit>,
) -> Vec<PathBuf> {
    ParallelPathScanner::new().collect_candidate_paths(search_root, depth_limit)
}

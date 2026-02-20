use std::path::PathBuf;

use clap::{ArgAction, Parser};

#[derive(Debug, Clone, Parser, PartialEq, Eq)]
#[command(name = "qgrep", version, about = "Fast text search CLI tool")]
pub struct CliArgs {
    #[arg(short = 'F', long = "fixed-strings", action = ArgAction::SetTrue)]
    pub fixed_strings: bool,

    #[arg(short = 'A', value_name = "N", allow_hyphen_values = true)]
    pub after_context: Option<i64>,

    #[arg(short = 'B', value_name = "N", allow_hyphen_values = true)]
    pub before_context: Option<i64>,

    #[arg(short = 'C', value_name = "N", allow_hyphen_values = true)]
    pub context: Option<i64>,

    #[arg(long = "json", action = ArgAction::SetTrue)]
    pub json_output: bool,

    #[arg(long = "path-include", value_name = "GLOB")]
    pub path_includes: Vec<String>,

    #[arg(long = "path-exclude", value_name = "GLOB")]
    pub path_excludes: Vec<String>,

    #[arg(long = "ext-include", value_name = "EXT")]
    pub extension_includes: Vec<String>,

    #[arg(long = "ext-exclude", value_name = "EXT")]
    pub extension_excludes: Vec<String>,

    #[arg(value_name = "PATTERN")]
    pub pattern: String,

    #[arg(value_name = "TARGET")]
    pub target: PathBuf,
}

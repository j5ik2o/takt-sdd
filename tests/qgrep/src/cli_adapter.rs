use std::ffi::OsString;

use clap::Parser;

use crate::cli_args::CliArgs;

pub struct CliAdapter;

impl CliAdapter {
    pub fn parse_from<I, T>(args: I) -> Result<CliArgs, clap::Error>
    where
        I: IntoIterator<Item = T>,
        T: Into<OsString> + Clone,
    {
        CliArgs::try_parse_from(args)
    }
}

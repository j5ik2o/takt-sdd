use anyhow::Result;
use clap::Parser;
use rayon::prelude::*;
use std::path::PathBuf;

mod aggregator;
mod cli;
mod counter;
mod language;
mod reporter;
mod walker;

use reporter::Reporter;

fn main() -> Result<()> {
    let args = cli::Args::parse();

    let root = args.path.clone().unwrap_or_else(|| PathBuf::from("."));

    // Walk files
    let entries = walker::walk(&root, &args.exclude);

    // Count in parallel
    let stats: Vec<counter::FileStats> = entries
        .par_iter()
        .filter_map(|entry| {
            let path = entry.path();
            let ext = path.extension()?.to_str()?;
            let lang = language::language_from_extension(ext)?;
            match counter::count(path, lang.clone()) {
                Ok(s) => Some(s),
                Err(_) => None,
            }
        })
        .collect();

    // Aggregate
    let report = aggregator::aggregate(stats, args.by_dir);

    // Report
    if args.json {
        let rep = reporter::json::JsonReporter;
        rep.report(&report)?;
    } else {
        let rep = reporter::table::TableReporter;
        rep.report(&report)?;
    }

    Ok(())
}

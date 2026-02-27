use ignore::{DirEntry, WalkBuilder};
use std::path::Path;

pub fn walk(root: &Path, excludes: &[String]) -> Vec<DirEntry> {
    let mut builder = WalkBuilder::new(root);
    builder.hidden(true).git_ignore(true);
    builder.add_custom_ignore_filename(".qcountignore");

    for pattern in excludes {
        builder.add_ignore(pattern);
    }

    builder
        .build()
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().map(|t| t.is_file()).unwrap_or(false))
        .collect()
}

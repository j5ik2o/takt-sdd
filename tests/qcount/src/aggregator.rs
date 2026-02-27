use crate::counter::FileStats;
use crate::language::Language;
use serde::Serialize;
use std::collections::HashMap;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize)]
pub struct LangSummary {
    pub language: Language,
    pub files: u64,
    pub total_lines: u64,
    pub code_lines: u64,
    pub blank_lines: u64,
    pub comment_lines: u64,
}

impl LangSummary {
    fn new(language: Language) -> Self {
        LangSummary {
            language,
            files: 0,
            total_lines: 0,
            code_lines: 0,
            blank_lines: 0,
            comment_lines: 0,
        }
    }

    fn add(&mut self, fs: &FileStats) {
        self.files += 1;
        self.total_lines += fs.total_lines;
        self.code_lines += fs.code_lines;
        self.blank_lines += fs.blank_lines;
        self.comment_lines += fs.comment_lines;
    }
}

#[derive(Debug, Clone, Serialize)]
pub struct DirSummary {
    pub path: PathBuf,
    pub by_language: HashMap<String, LangSummary>,
}

#[derive(Debug, Clone, Serialize)]
pub struct Report {
    pub total: LangSummary,
    pub by_language: Vec<LangSummary>,
    pub by_directory: Vec<DirSummary>,
}

pub fn aggregate(stats: Vec<FileStats>, by_dir: bool) -> Report {
    // Aggregate by language
    let mut lang_map: HashMap<String, LangSummary> = HashMap::new();
    // Aggregate by directory
    let mut dir_map: HashMap<PathBuf, HashMap<String, LangSummary>> = HashMap::new();

    let mut total = LangSummary::new(Language::Rust); // placeholder language for total
    total.language = Language::Rust; // will be replaced below with a special "total" approach

    // Build a global total
    let mut global = LangSummary {
        language: Language::Rust,
        files: 0,
        total_lines: 0,
        code_lines: 0,
        blank_lines: 0,
        comment_lines: 0,
    };

    for fs in &stats {
        let lang_name = format!("{:?}", fs.language);

        // Language aggregation
        let entry = lang_map
            .entry(lang_name.clone())
            .or_insert_with(|| LangSummary::new(fs.language.clone()));
        entry.add(fs);

        // Global total
        global.files += 1;
        global.total_lines += fs.total_lines;
        global.code_lines += fs.code_lines;
        global.blank_lines += fs.blank_lines;
        global.comment_lines += fs.comment_lines;

        // Directory aggregation
        if by_dir {
            if let Some(parent) = fs.path.parent() {
                let dir_entry = dir_map
                    .entry(parent.to_path_buf())
                    .or_insert_with(HashMap::new);
                let lang_in_dir = dir_entry
                    .entry(lang_name.clone())
                    .or_insert_with(|| LangSummary::new(fs.language.clone()));
                lang_in_dir.add(fs);
            }
        }
    }

    // Sort language summaries by total_lines descending
    let mut by_language: Vec<LangSummary> = lang_map.into_values().collect();
    by_language.sort_by(|a, b| b.total_lines.cmp(&a.total_lines));

    // Build directory summaries (skip empty dirs)
    let mut by_directory: Vec<DirSummary> = dir_map
        .into_iter()
        .filter(|(_, m)| !m.is_empty())
        .map(|(path, by_language)| DirSummary { path, by_language })
        .collect();
    by_directory.sort_by(|a, b| a.path.cmp(&b.path));

    Report {
        total: global,
        by_language,
        by_directory,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::path::PathBuf;

    fn make_stats(lang: Language, total: u64, code: u64, blank: u64, comment: u64) -> FileStats {
        FileStats {
            path: PathBuf::from("src/foo.rs"),
            language: lang,
            total_lines: total,
            code_lines: code,
            blank_lines: blank,
            comment_lines: comment,
        }
    }

    #[test]
    fn test_aggregate_by_language() {
        let stats = vec![
            make_stats(Language::Rust, 10, 7, 2, 1),
            make_stats(Language::Rust, 5, 4, 1, 0),
            make_stats(Language::Python, 8, 6, 1, 1),
        ];
        let report = aggregate(stats, false);
        assert_eq!(report.by_language.len(), 2);
        let rust = report
            .by_language
            .iter()
            .find(|s| s.language == Language::Rust)
            .unwrap();
        assert_eq!(rust.files, 2);
        assert_eq!(rust.total_lines, 15);
        assert_eq!(rust.code_lines, 11);
        let python = report
            .by_language
            .iter()
            .find(|s| s.language == Language::Python)
            .unwrap();
        assert_eq!(python.files, 1);
        assert_eq!(python.total_lines, 8);
    }

    #[test]
    fn test_aggregate_total() {
        let stats = vec![
            make_stats(Language::Rust, 10, 7, 2, 1),
            make_stats(Language::Python, 8, 6, 1, 1),
        ];
        let report = aggregate(stats, false);
        assert_eq!(report.total.files, 2);
        assert_eq!(report.total.total_lines, 18);
    }
}

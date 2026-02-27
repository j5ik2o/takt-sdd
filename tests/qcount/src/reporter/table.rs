use crate::aggregator::{LangSummary, Report};
use crate::reporter::Reporter;
use anyhow::Result;
use tabled::{Table, Tabled};

pub struct TableReporter;

#[derive(Tabled)]
struct LangRow {
    #[tabled(rename = "Language")]
    language: String,
    #[tabled(rename = "Files")]
    files: u64,
    #[tabled(rename = "Total")]
    total: u64,
    #[tabled(rename = "Code")]
    code: u64,
    #[tabled(rename = "Blank")]
    blank: u64,
    #[tabled(rename = "Comment")]
    comment: u64,
}

impl From<&LangSummary> for LangRow {
    fn from(s: &LangSummary) -> Self {
        LangRow {
            language: format!("{:?}", s.language),
            files: s.files,
            total: s.total_lines,
            code: s.code_lines,
            blank: s.blank_lines,
            comment: s.comment_lines,
        }
    }
}

impl Reporter for TableReporter {
    fn report(&self, report: &Report) -> Result<()> {
        // By language table
        let rows: Vec<LangRow> = report.by_language.iter().map(LangRow::from).collect();
        let table = Table::new(rows);
        println!("{}", table);

        // Total row
        let total_row = LangRow::from(&report.total);
        println!(
            "\nTotal: {} files, {} lines ({} code, {} blank, {} comment)",
            total_row.files, total_row.total, total_row.code, total_row.blank, total_row.comment
        );

        // By directory tables
        if !report.by_directory.is_empty() {
            for dir in &report.by_directory {
                println!("\nDirectory: {}", dir.path.display());
                let mut dir_rows: Vec<LangRow> = dir
                    .by_language
                    .values()
                    .map(LangRow::from)
                    .collect();
                dir_rows.sort_by(|a, b| b.total.cmp(&a.total));
                let dir_table = Table::new(dir_rows);
                println!("{}", dir_table);
            }
        }

        Ok(())
    }
}

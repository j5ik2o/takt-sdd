use std::collections::BTreeMap;
use std::io::Write;
use std::path::PathBuf;

use crate::context_line::ContextLine;
use crate::match_record::MatchRecord;

pub struct TextOutputAdapter;

impl TextOutputAdapter {
    pub fn write<W: Write>(writer: &mut W, match_records: &[MatchRecord]) -> std::io::Result<()> {
        let mut records_by_path = BTreeMap::<PathBuf, Vec<&MatchRecord>>::new();
        for match_record in match_records {
            records_by_path
                .entry(match_record.path().to_path_buf())
                .or_default()
                .push(match_record);
        }

        for (path, records) in records_by_path {
            let mut records = records;
            records.sort_by_key(|record| record.line_number());

            let groups = build_groups(records.as_slice());
            let has_context = groups.iter().any(RenderedGroup::has_context_line);

            for (group_index, group) in groups.iter().enumerate() {
                if has_context && group_index > 0 {
                    writeln!(writer, "--")?;
                }

                for (line_number, rendered_line) in group.lines() {
                    match rendered_line {
                        RenderedLine::Matched(line) => {
                            writeln!(writer, "{}:{}:{}", path.display(), line_number, line)?;
                        }
                        RenderedLine::Context(line) => {
                            writeln!(writer, "{}-{}-{}", path.display(), line_number, line)?;
                        }
                    }
                }
            }
        }

        Ok(())
    }
}

#[derive(Debug, Clone)]
enum RenderedLine {
    Matched(String),
    Context(String),
}

#[derive(Debug, Clone)]
struct RenderedGroup {
    lines: BTreeMap<usize, RenderedLine>,
    range_end: usize,
}

impl RenderedGroup {
    fn new(range_end: usize) -> Self {
        Self {
            lines: BTreeMap::new(),
            range_end,
        }
    }

    fn lines(&self) -> &BTreeMap<usize, RenderedLine> {
        &self.lines
    }

    fn has_context_line(&self) -> bool {
        self.lines
            .values()
            .any(|line| matches!(line, RenderedLine::Context(_)))
    }

    fn range_end(&self) -> usize {
        self.range_end
    }

    fn update_range_end(&mut self, range_end: usize) {
        self.range_end = self.range_end.max(range_end);
    }

    fn insert_context_line(&mut self, line_number: usize, line: &str) {
        self.lines
            .entry(line_number)
            .or_insert_with(|| RenderedLine::Context(line.to_string()));
    }

    fn insert_match_line(&mut self, line_number: usize, line: &str) {
        self.lines
            .insert(line_number, RenderedLine::Matched(line.to_string()));
    }
}

fn build_groups(records: &[&MatchRecord]) -> Vec<RenderedGroup> {
    let mut groups = Vec::<RenderedGroup>::new();

    for record in records {
        let range_start = record
            .before_context()
            .first()
            .map_or(record.line_number(), ContextLine::line_number);
        let range_end = record
            .after_context()
            .last()
            .map_or(record.line_number(), ContextLine::line_number);

        let requires_new_group = groups.last().is_none_or(|group| {
            range_start > group.range_end().saturating_add(1)
        });

        if requires_new_group {
            groups.push(RenderedGroup::new(range_end));
        }

        let active_group = groups
            .last_mut()
            .expect("render group must be present after insertion");
        active_group.update_range_end(range_end);

        for context_line in record.before_context() {
            active_group.insert_context_line(context_line.line_number(), context_line.line());
        }

        active_group.insert_match_line(record.line_number(), record.line());

        for context_line in record.after_context() {
            active_group.insert_context_line(context_line.line_number(), context_line.line());
        }
    }

    groups
}

#[cfg(test)]
mod tests {
    use std::path::PathBuf;

    use crate::context_line::ContextLine;
    use crate::match_record::MatchRecord;
    use crate::text_output_adapter::TextOutputAdapter;

    #[test]
    fn renders_match_and_context_lines_with_group_separator() {
        let path = PathBuf::from("sample.txt");
        let records = vec![
            MatchRecord::new(
                path.clone(),
                2,
                "hit-1".to_string(),
                vec![ContextLine::new(1, "before-1".to_string())],
                vec![ContextLine::new(3, "after-1".to_string())],
            ),
            MatchRecord::new(
                path.clone(),
                7,
                "hit-2".to_string(),
                vec![ContextLine::new(6, "before-2".to_string())],
                vec![ContextLine::new(8, "after-2".to_string())],
            ),
        ];

        let mut rendered = Vec::new();
        TextOutputAdapter::write(&mut rendered, records.as_slice()).unwrap();

        let output = String::from_utf8(rendered).unwrap();
        let expected = concat!(
            "sample.txt-1-before-1\n",
            "sample.txt:2:hit-1\n",
            "sample.txt-3-after-1\n",
            "--\n",
            "sample.txt-6-before-2\n",
            "sample.txt:7:hit-2\n",
            "sample.txt-8-after-2\n"
        );

        assert_eq!(output, expected);
    }

    #[test]
    fn renders_only_matched_lines_when_context_is_empty() {
        let path = PathBuf::from("sample.txt");
        let records = vec![
            MatchRecord::new(path.clone(), 2, "hit-1".to_string(), Vec::new(), Vec::new()),
            MatchRecord::new(path, 7, "hit-2".to_string(), Vec::new(), Vec::new()),
        ];

        let mut rendered = Vec::new();
        TextOutputAdapter::write(&mut rendered, records.as_slice()).unwrap();

        let output = String::from_utf8(rendered).unwrap();
        let expected = concat!("sample.txt:2:hit-1\n", "sample.txt:7:hit-2\n");

        assert_eq!(output, expected);
        assert!(!output.contains("--"));
    }

    #[test]
    fn merges_overlapped_groups_without_duplicate_context_lines() {
        let path = PathBuf::from("sample.txt");
        let records = vec![
            MatchRecord::new(
                path.clone(),
                3,
                "hit-3".to_string(),
                vec![ContextLine::new(2, "line-2".to_string())],
                vec![ContextLine::new(4, "line-4".to_string())],
            ),
            MatchRecord::new(
                path,
                4,
                "hit-4".to_string(),
                vec![ContextLine::new(3, "hit-3".to_string())],
                vec![ContextLine::new(5, "line-5".to_string())],
            ),
        ];

        let mut rendered = Vec::new();
        TextOutputAdapter::write(&mut rendered, records.as_slice()).unwrap();

        let output = String::from_utf8(rendered).unwrap();
        let expected = concat!(
            "sample.txt-2-line-2\n",
            "sample.txt:3:hit-3\n",
            "sample.txt:4:hit-4\n",
            "sample.txt-5-line-5\n"
        );

        assert_eq!(output, expected);
    }

    #[test]
    fn suppresses_duplicate_shared_context_lines_between_adjacent_matches() {
        let path = PathBuf::from("sample.txt");
        let records = vec![
            MatchRecord::new(
                path.clone(),
                2,
                "hit-2".to_string(),
                vec![ContextLine::new(1, "line-1".to_string())],
                vec![ContextLine::new(3, "shared-context".to_string())],
            ),
            MatchRecord::new(
                path,
                4,
                "hit-4".to_string(),
                vec![ContextLine::new(3, "shared-context".to_string())],
                vec![ContextLine::new(5, "line-5".to_string())],
            ),
        ];

        let mut rendered = Vec::new();
        TextOutputAdapter::write(&mut rendered, records.as_slice()).unwrap();

        let output = String::from_utf8(rendered).unwrap();
        let expected = concat!(
            "sample.txt-1-line-1\n",
            "sample.txt:2:hit-2\n",
            "sample.txt-3-shared-context\n",
            "sample.txt:4:hit-4\n",
            "sample.txt-5-line-5\n"
        );

        assert_eq!(output, expected);
    }
}

use std::io;
use std::io::Write;

use serde::Serialize;

use crate::context_line::ContextLine;
use crate::match_record::MatchRecord;

pub struct JsonOutputAdapter;

impl JsonOutputAdapter {
    pub fn write<W: Write>(writer: &mut W, match_records: &[MatchRecord]) -> io::Result<()> {
        for match_record in match_records {
            let json_line = JsonMatchRecord::from_match_record(match_record);
            let serialized = serde_json::to_string(&json_line).map_err(io::Error::other)?;
            writeln!(writer, "{serialized}")?;
        }

        Ok(())
    }
}

#[derive(Debug, Serialize)]
struct JsonMatchRecord<'a> {
    path: String,
    line_number: usize,
    line: &'a str,
    before_context: Vec<JsonContextLine<'a>>,
    after_context: Vec<JsonContextLine<'a>>,
}

impl<'a> JsonMatchRecord<'a> {
    fn from_match_record(match_record: &'a MatchRecord) -> Self {
        Self {
            path: match_record.path().display().to_string(),
            line_number: match_record.line_number(),
            line: match_record.line(),
            before_context: match_record
                .before_context()
                .iter()
                .map(JsonContextLine::from_context_line)
                .collect(),
            after_context: match_record
                .after_context()
                .iter()
                .map(JsonContextLine::from_context_line)
                .collect(),
        }
    }
}

#[derive(Debug, Serialize)]
struct JsonContextLine<'a> {
    line_number: usize,
    line: &'a str,
}

impl<'a> JsonContextLine<'a> {
    fn from_context_line(context_line: &'a ContextLine) -> Self {
        Self {
            line_number: context_line.line_number(),
            line: context_line.line(),
        }
    }
}

#[cfg(test)]
mod tests {
    use std::path::PathBuf;

    use serde_json::Value;

    use crate::context_line::ContextLine;
    use crate::json_output_adapter::JsonOutputAdapter;
    use crate::match_record::MatchRecord;

    #[test]
    fn writes_one_json_object_per_match() {
        let records = vec![MatchRecord::new(
            PathBuf::from("sample.txt"),
            2,
            "hit".to_string(),
            vec![ContextLine::new(1, "before".to_string())],
            vec![ContextLine::new(3, "after".to_string())],
        )];

        let mut rendered = Vec::new();
        JsonOutputAdapter::write(&mut rendered, records.as_slice()).unwrap();
        let output = String::from_utf8(rendered).unwrap();

        let line = output.lines().next().unwrap();
        let value: Value = serde_json::from_str(line).unwrap();

        assert_eq!(value["path"], Value::String("sample.txt".to_string()));
        assert_eq!(value["line_number"], Value::from(2));
        assert_eq!(value["line"], Value::String("hit".to_string()));
        assert_eq!(value["before_context"][0]["line_number"], Value::from(1));
        assert_eq!(
            value["before_context"][0]["line"],
            Value::String("before".to_string())
        );
        assert_eq!(value["after_context"][0]["line_number"], Value::from(3));
        assert_eq!(
            value["after_context"][0]["line"],
            Value::String("after".to_string())
        );
    }

    #[test]
    fn writes_empty_output_when_no_matches_exist() {
        let mut rendered = Vec::new();
        JsonOutputAdapter::write(&mut rendered, &[]).unwrap();

        let output = String::from_utf8(rendered).unwrap();
        assert!(output.is_empty());
    }
}

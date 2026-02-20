#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ContextLine {
    line_number: usize,
    line: String,
}

impl ContextLine {
    pub fn new(line_number: usize, line: String) -> Self {
        Self { line_number, line }
    }

    pub fn line_number(&self) -> usize {
        self.line_number
    }

    pub fn line(&self) -> &str {
        self.line.as_str()
    }
}

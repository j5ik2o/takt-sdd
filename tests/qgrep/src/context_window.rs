#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct ContextWindow {
    before: usize,
    after: usize,
}

impl ContextWindow {
    pub fn new(before: usize, after: usize) -> Self {
        Self { before, after }
    }

    pub fn before(&self) -> usize {
        self.before
    }

    pub fn after(&self) -> usize {
        self.after
    }
}

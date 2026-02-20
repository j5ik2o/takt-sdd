use crate::match_record::MatchRecord;
use crate::search_issue::SearchIssue;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct SearchOutcome {
    match_records: Vec<MatchRecord>,
    issues: Vec<SearchIssue>,
}

impl SearchOutcome {
    pub fn new(match_records: Vec<MatchRecord>, issues: Vec<SearchIssue>) -> Self {
        Self {
            match_records,
            issues,
        }
    }

    pub fn match_records(&self) -> &[MatchRecord] {
        self.match_records.as_slice()
    }

    pub fn issues(&self) -> &[SearchIssue] {
        self.issues.as_slice()
    }

    pub fn push_issue(&mut self, issue: SearchIssue) {
        self.issues.push(issue);
    }

    pub fn into_parts(self) -> (Vec<MatchRecord>, Vec<SearchIssue>) {
        (self.match_records, self.issues)
    }
}

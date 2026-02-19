use std::path::PathBuf;

use crate::scan_issue::ScanIssue;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ScanSnapshot {
    candidate_paths: Vec<PathBuf>,
    issues: Vec<ScanIssue>,
}

impl ScanSnapshot {
    pub fn new(candidate_paths: Vec<PathBuf>, issues: Vec<ScanIssue>) -> Self {
        Self {
            candidate_paths,
            issues,
        }
    }

    pub fn candidate_paths(&self) -> &[PathBuf] {
        &self.candidate_paths
    }

    #[cfg(test)]
    pub fn issues(&self) -> &[ScanIssue] {
        &self.issues
    }
}

#[cfg(test)]
mod tests {
    use std::path::PathBuf;

    use crate::scan_issue::ScanIssue;

    use super::ScanSnapshot;

    #[test]
    fn returns_collected_candidates_and_issues() {
        let snapshot = ScanSnapshot::new(
            vec![PathBuf::from("a.rs"), PathBuf::from("b.rs")],
            vec![ScanIssue::new(None, "warn".to_string(), false)],
        );

        assert_eq!(
            snapshot.candidate_paths(),
            &[PathBuf::from("a.rs"), PathBuf::from("b.rs")]
        );
        assert_eq!(snapshot.issues().len(), 1);
        assert_eq!(snapshot.issues()[0].detail(), "warn");
    }
}

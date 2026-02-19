use std::path::PathBuf;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ScanIssue {
    path: Option<PathBuf>,
    detail: String,
    permission_denied: bool,
}

impl ScanIssue {
    pub fn new(path: Option<PathBuf>, detail: String, permission_denied: bool) -> Self {
        Self {
            path,
            detail,
            permission_denied,
        }
    }

    pub fn path_buf(&self) -> Option<&PathBuf> {
        self.path.as_ref()
    }

    pub fn detail(&self) -> &str {
        &self.detail
    }

    pub fn permission_denied(&self) -> bool {
        self.permission_denied
    }
}

#[cfg(test)]
mod tests {
    use std::path::PathBuf;

    use super::ScanIssue;

    #[test]
    fn keeps_issue_details_and_permission_flag() {
        let issue = ScanIssue::new(
            Some(PathBuf::from("restricted")),
            "Permission denied".to_string(),
            true,
        );

        assert_eq!(
            issue.path_buf().expect("path should exist"),
            &PathBuf::from("restricted")
        );
        assert_eq!(issue.detail(), "Permission denied");
        assert!(issue.permission_denied());
    }
}

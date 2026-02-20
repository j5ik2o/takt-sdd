pub struct ExitCodePolicy;

impl ExitCodePolicy {
    pub fn decide(match_count: usize, has_issue: bool) -> i32 {
        if has_issue {
            return 2;
        }

        if match_count > 0 {
            return 0;
        }

        1
    }
}

#[cfg(test)]
mod tests {
    use crate::exit_code_policy::ExitCodePolicy;

    #[test]
    fn returns_zero_when_matches_exist_and_no_issue() {
        let exit_code = ExitCodePolicy::decide(1, false);
        assert_eq!(exit_code, 0);
    }

    #[test]
    fn returns_one_when_no_match_and_no_issue() {
        let exit_code = ExitCodePolicy::decide(0, false);
        assert_eq!(exit_code, 1);
    }

    #[test]
    fn returns_two_when_issue_exists_even_with_matches() {
        let exit_code = ExitCodePolicy::decide(3, true);
        assert_eq!(exit_code, 2);
    }

    #[test]
    fn returns_two_when_issue_exists_without_matches() {
        let exit_code = ExitCodePolicy::decide(0, true);
        assert_eq!(exit_code, 2);
    }
}

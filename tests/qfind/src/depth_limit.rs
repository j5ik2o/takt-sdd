use crate::qfind_error::QfindError;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct DepthLimit {
    value: usize,
}

impl DepthLimit {
    pub fn parse(raw: String) -> Result<Self, QfindError> {
        let value = raw
            .parse::<usize>()
            .map_err(|error| QfindError::InvalidDepthLimit {
                value: raw.clone(),
                reason: error.to_string(),
            })?;

        Ok(Self { value })
    }

    pub fn value(&self) -> usize {
        self.value
    }
}

#[cfg(test)]
mod tests {
    use super::DepthLimit;

    #[test]
    fn parse_accepts_zero() {
        let result = DepthLimit::parse("0".to_string());

        assert!(result.is_ok());
        let limit = result.expect("0 should be accepted");
        assert_eq!(limit.value(), 0);
    }

    #[test]
    fn parse_rejects_non_numeric_value() {
        let result = DepthLimit::parse("abc".to_string());

        assert!(result.is_err());
        let message = result.expect_err("value should be rejected").to_string();
        assert!(message.contains("--max-depth"));
    }

    #[test]
    fn parse_rejects_negative_value() {
        let result = DepthLimit::parse("-1".to_string());

        assert!(result.is_err());
        let message = result.expect_err("negative should be rejected").to_string();
        assert!(message.contains("--max-depth"));
    }
}

use crate::aggregator::Report;
use crate::reporter::Reporter;
use anyhow::Result;

pub struct JsonReporter;

impl Reporter for JsonReporter {
    fn report(&self, report: &Report) -> Result<()> {
        let json = serde_json::to_string_pretty(report)?;
        println!("{}", json);
        Ok(())
    }
}

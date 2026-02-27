use crate::aggregator::Report;
use anyhow::Result;

pub mod json;
pub mod table;

pub trait Reporter {
    fn report(&self, report: &Report) -> Result<()>;
}

use std::path::Path;

use crate::depth_limit::DepthLimit;
use crate::scan_snapshot::ScanSnapshot;

pub trait PathScannerPort {
    fn scan_paths(&self, search_root: &Path, depth_limit: Option<DepthLimit>) -> ScanSnapshot;
}

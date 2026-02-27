use clap::Parser;
use std::path::PathBuf;

#[derive(Parser, Debug)]
#[command(name = "qcount", about = "Fast source code line counter")]
pub struct Args {
    /// 対象ディレクトリ（デフォルト: カレント）
    pub path: Option<PathBuf>,

    /// JSON形式で出力
    #[arg(long)]
    pub json: bool,

    /// ディレクトリ別集計を表示
    #[arg(long)]
    pub by_dir: bool,

    /// 除外パターン（glob）
    #[arg(long)]
    pub exclude: Vec<String>,
}

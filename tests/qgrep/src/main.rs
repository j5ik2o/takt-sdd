fn main() {
    let exit_code = qgrep::run_from_os_args(std::env::args_os());
    std::process::exit(exit_code);
}

#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    us_shared_memory_journal_lib::run()
}

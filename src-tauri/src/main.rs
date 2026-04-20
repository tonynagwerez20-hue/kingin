#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use tauri::AppHandle;
use institutional_trading_system_lib;

// Wrap library functions with tauri::command decorators
#[tauri::command]
pub fn read_engine_state() -> Result<String, String> {
    institutional_trading_system_lib::read_engine_state()
}

#[tauri::command]
pub fn write_dashboard_command(command: String) -> Result<(), String> {
    institutional_trading_system_lib::write_dashboard_command(command)
}

#[tauri::command]
pub async fn init_mt5_backend(app: AppHandle) -> Result<String, String> {
    institutional_trading_system_lib::init_mt5_backend(app).await
}

#[tauri::command]
pub async fn auth_mt5(app: AppHandle, account: String, password: String, server: String, save_pwd: bool) -> Result<String, String> {
    institutional_trading_system_lib::auth_mt5(app, account, password, server, save_pwd).await
}

#[tauri::command]
pub async fn start_engine(app: AppHandle) -> Result<String, String> {
    institutional_trading_system_lib::start_engine(app).await
}

#[tauri::command]
pub async fn stop_engine(app: AppHandle) -> Result<String, String> {
    institutional_trading_system_lib::stop_engine(app).await
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            read_engine_state,
            write_dashboard_command,
            init_mt5_backend,
            auth_mt5,
            start_engine,
            stop_engine
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

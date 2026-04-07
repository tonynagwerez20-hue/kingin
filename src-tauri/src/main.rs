#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::Manager;
use tauri::AppHandle;
use tauri_plugin_shell::ShellExt;

/// Read engine_state.json from executable directory
#[tauri::command]
fn read_engine_state() -> Result<String, String> {
    // Get executable directory
    let exe_path = std::env::current_exe()
        .map_err(|e| format!("Failed to get executable path: {}", e))?;
    
    let exe_dir = exe_path.parent()
        .ok_or_else(|| "Failed to get executable directory".to_string())?;
    
    let engine_state_path = exe_dir.join("engine_state.json");
    
    // Try current directory as fallback
    let engine_state_path = if !engine_state_path.exists() {
        PathBuf::from("engine_state.json")
    } else {
        engine_state_path
    };
    
    // Read file
    let content = fs::read_to_string(&engine_state_path)
        .map_err(|e| format!("Failed to read engine_state.json: {}", e))?;
    
    Ok(content)
}

/// Write dashboard command to JSON file
#[tauri::command]
fn write_dashboard_command(command: String) -> Result<(), String> {
    let exe_path = std::env::current_exe()
        .map_err(|e| format!("Failed to get executable path: {}", e))?;
    
    let exe_dir = exe_path.parent()
        .ok_or_else(|| "Failed to get executable directory".to_string())?;
    
    let command_path = exe_dir.join("dashboard_commands.json");
    
    fs::write(&command_path, command)
        .map_err(|e| format!("Failed to write command: {}", e))?;
    
    Ok(())
}

#[tauri::command]
async fn auth_mt5(app: AppHandle, account: String, password: String, server: String, save_pwd: bool) -> Result<String, String> {
    let output = app.shell().command("python")
        .args(["mt5_auth.py", &account, &password, &server, if save_pwd { "true" } else { "false" }])
        .output()
        .await
        .map_err(|e| format!("Failed to execute python: {}", e))?;

    let result = String::from_utf8(output.stdout).unwrap_or_else(|_| "{}".to_string());
    Ok(result)
}

#[tauri::command]
async fn start_engine(app: AppHandle) -> Result<String, String> {
    app.shell().command("cmd")
        .args(["/c", "START_ALL.bat"])
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok("Engine start requested".to_string())
}

#[tauri::command]
async fn stop_engine(app: AppHandle) -> Result<String, String> {
    let output = app.shell().command("cmd")
        .args(["/c", "SYSTEM_OFF.bat"])
        .output()
        .await
        .map_err(|e| e.to_string())?;
    Ok(String::from_utf8(output.stdout).unwrap_or_else(|_| "Stopped".to_string()))
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            read_engine_state,
            write_dashboard_command,
            auth_mt5,
            start_engine,
            stop_engine
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
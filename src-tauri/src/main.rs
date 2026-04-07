#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::Manager;

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

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            read_engine_state,
            write_dashboard_command,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
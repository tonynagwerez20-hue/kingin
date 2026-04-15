use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::Manager;
use tauri::AppHandle;
use tauri_plugin_shell::ShellExt;

/// Read engine_state.json from executable directory
#[tauri::command]
pub fn read_engine_state() -> Result<String, String> {
    // Get executable directory
    let exe_path = std::env::current_exe()
        .map_err(|e| format!("Failed to get executable path: {}", e))?;
    
    let exe_dir = exe_path.parent()
        .ok_or_else(|| "Failed to get executable directory".to_string())?;
    
    // Navigate up to project root (exe is in src-tauri/target/release/)
    let mut project_root = exe_dir.to_path_buf();
    project_root.pop(); // release
    project_root.pop(); // target  
    project_root.pop(); // src-tauri
    
    let engine_state_path = project_root.join("engine_state.json");
    
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
pub fn write_dashboard_command(command: String) -> Result<(), String> {
    let exe_path = std::env::current_exe()
        .map_err(|e| format!("Failed to get executable path: {}", e))?;
    
    let exe_dir = exe_path.parent()
        .ok_or_else(|| "Failed to get executable directory".to_string())?;
    
    // Navigate up to project root (exe is in src-tauri/target/release/)
    let mut project_root = exe_dir.to_path_buf();
    project_root.pop(); // release
    project_root.pop(); // target  
    project_root.pop(); // src-tauri
    
    let command_path = project_root.join("dashboard_commands.json");
    
    fs::write(&command_path, command)
        .map_err(|e| format!("Failed to write command: {}", e))?;
    
    Ok(())
}

/// Detect Python executable in PATH
fn find_python_executable() -> Option<String> {
    // 1) If env var ITS_PYTHON_EXE is set, prefer it
    if let Ok(p) = std::env::var("ITS_PYTHON_EXE") {
        let pb = PathBuf::from(&p);
        if pb.exists() {
            return pb.to_str().map(|s| s.to_string());
        }
    }

    // 2) Try common python executables on PATH
    if let Ok(path_env) = std::env::var("PATH") {
        for path_dir in path_env.split(';') {
            for python_name in &["python.exe", "python3.exe", "py.exe", "python"] {
                let python_path = PathBuf::from(path_dir).join(python_name);
                if python_path.exists() {
                    return python_path.to_str().map(|s| s.to_string());
                }
            }
        }
    }

    // 3) Try Windows py launcher
    if let Ok(system_root) = std::env::var("SystemRoot") {
        let py_path = PathBuf::from(format!("{}\\py.exe", system_root));
        if py_path.exists() {
            return py_path.to_str().map(|s| s.to_string());
        }
    }

    // 4) No reliable python found
    None
}

#[tauri::command]
pub async fn init_mt5_backend(_app: AppHandle) -> Result<String, String> {
    // Quick initialization of MT5 backend in background
    if find_python_executable().is_some() {
        Ok("MT5 backend ready (Python detected)".to_string())
    } else {
        Ok("MT5 backend ready (Generic Python mode)".to_string())
    }
}

#[tauri::command]
pub async fn auth_mt5(app: AppHandle, account: String, password: String, server: String, save_pwd: bool) -> Result<String, String> {
    let exe_path = std::env::current_exe()
        .map_err(|e| format!("Failed to get executable path: {}", e))?;

    let exe_dir = exe_path.parent()
        .ok_or_else(|| "Failed to get executable directory".to_string())?;

    let mut project_root = exe_dir.to_path_buf();
    project_root.pop(); // release
    project_root.pop(); // target  
    project_root.pop(); // src-tauri

    let mut script_path = project_root.join("mt5_auth.py");
    
    if !script_path.exists() {
        let exe_script = exe_dir.join("mt5_auth.py");
        let cwd_script = std::env::current_dir()
            .unwrap_or_else(|_| exe_dir.to_path_buf())
            .join("mt5_auth.py");
        let alt_script = project_root.join("src-tauri").join("mt5_auth.py");

        if exe_script.exists() {
            script_path = exe_script;
        } else if cwd_script.exists() {
            script_path = cwd_script;
        } else if alt_script.exists() {
            script_path = alt_script;
        }
    }

    let script_str = script_path.to_str()
        .ok_or_else(|| format!("Invalid mt5_auth.py path: {}", script_path.display()))?;

    let arg_values = [
        script_str,
        account.as_str(),
        password.as_str(),
        server.as_str(),
        if save_pwd { "true" } else { "false" },
    ];

    let mut last_error = String::new();
    
    // Try to find Python in PATH first
    if let Some(python_path) = find_python_executable() {
        let mut cmd = app.shell().command(&python_path);
        for arg in arg_values.iter() {
            cmd = cmd.arg(*arg);
        }

        match cmd.current_dir(&project_root).output().await {
            Ok(output) => {
                let stdout = String::from_utf8_lossy(&output.stdout).to_string();
                let stderr = String::from_utf8_lossy(&output.stderr).to_string();
                if !stdout.trim().is_empty() {
                    return Ok(stdout);
                }
                if !stderr.is_empty() {
                    last_error = format!("Python stderr: {}", stderr.trim());
                }
            }
            Err(e) => {
                last_error = format!("Python failed: {}", e);
            }
        }
    }
    
    // Fallback: try generic python commands
    for exe in &["python", "python3", "py"] {
        let mut cmd = app.shell().command(exe);
        for arg in arg_values.iter() {
            cmd = cmd.arg(*arg);
        }

        match cmd.current_dir(&project_root).output().await {
            Ok(output) => {
                let stdout = String::from_utf8_lossy(&output.stdout).to_string();
                if !stdout.trim().is_empty() {
                    return Ok(stdout);
                }
            }
            Err(e) => {
                last_error = format!("{} failed: {}", exe, e);
            }
        }
    }

    eprintln!("[auth_mt5] Script path: {}", script_str);
    eprintln!("[auth_mt5] Working dir: {}", project_root.display());
    eprintln!("[auth_mt5] Last error: {}", last_error);
    
    Err(last_error)
}

#[tauri::command]
pub async fn start_engine(app: AppHandle) -> Result<String, String> {
    let exe_path = std::env::current_exe()
        .map_err(|e| format!("Failed to get executable path: {}", e))?;
    let exe_dir = exe_path.parent()
        .ok_or_else(|| "Failed to get executable directory".to_string())?;

    let mut project_root = exe_dir.to_path_buf();
    project_root.pop(); // release
    project_root.pop(); // target
    project_root.pop(); // src-tauri

    let start_path = project_root.join("START_ALL.bat");
    let start_path_str = start_path.to_str()
        .ok_or_else(|| "Invalid START_ALL.bat path".to_string())?;

    app.shell().command("cmd")
        .args(["/c", "start", "", start_path_str])
        .current_dir(&project_root)
        .spawn()
        .map_err(|e| e.to_string())?;
    Ok("Engine start requested".to_string())
}

#[tauri::command]
pub async fn stop_engine(app: AppHandle) -> Result<String, String> {
    let exe_path = std::env::current_exe()
        .map_err(|e| format!("Failed to get executable path: {}", e))?;
    let exe_dir = exe_path.parent()
        .ok_or_else(|| "Failed to get executable directory".to_string())?;

    let mut project_root = exe_dir.to_path_buf();
    project_root.pop(); // release
    project_root.pop(); // target
    project_root.pop(); // src-tauri

    let stop_path = project_root.join("SYSTEM_OFF.bat");
    let stop_path_str = stop_path.to_str()
        .ok_or_else(|| "Invalid SYSTEM_OFF.bat path".to_string())?;

    let output = app.shell().command("cmd")
        .args(["/c", stop_path_str])
        .current_dir(&project_root)
        .output()
        .await
        .map_err(|e| e.to_string())?;
    Ok(String::from_utf8(output.stdout).unwrap_or_else(|_| "Stopped".to_string()))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
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

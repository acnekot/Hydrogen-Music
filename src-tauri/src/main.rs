use std::{
    collections::HashMap,
    fs,
    io::Read,
    path::{Path, PathBuf},
    sync::mpsc,
};

use anyhow::{anyhow, Result};
use base64::engine::general_purpose::STANDARD as Base64;
use base64::Engine;
use once_cell::sync::OnceCell;
use parking_lot::Mutex;
use serde::{Deserialize, Serialize};
use serde_json;
use tauri::{api::dialog::FileDialogBuilder, AppHandle, Manager};
use walkdir::WalkDir;

#[derive(Debug, Serialize, Deserialize, Default, Clone)]
struct StoredPluginState {
    enabled: bool,
}

#[derive(Debug, Serialize, Deserialize, Default)]
struct PersistedConfig {
    plugin_directory: Option<PathBuf>,
    plugin_states: HashMap<String, StoredPluginState>,
}

#[derive(Debug)]
struct AppState {
    config_path: PathBuf,
    default_plugin_directory: PathBuf,
    inner: Mutex<PersistedConfig>,
}

static APP_STATE: OnceCell<AppState> = OnceCell::new();

impl AppState {
    fn initialize(handle: &AppHandle) -> Result<&'static AppState> {
        APP_STATE.get_or_try_init(|| {
            let resolver = handle.path_resolver();
            let mut config_dir = resolver
                .app_config_dir()
                .or_else(|| resolver.app_data_dir())
                .unwrap_or_else(|| std::env::current_dir().unwrap_or_default());
            config_dir.push("hydrogen_music");
            fs::create_dir_all(&config_dir)?;
            let config_path = config_dir.join("config.json");

            let default_plugin_directory = resolve_default_plugin_directory(handle)?;
            fs::create_dir_all(&default_plugin_directory)?;

            let persisted = if config_path.exists() {
                let mut file = fs::File::open(&config_path)?;
                let mut buffer = String::new();
                file.read_to_string(&mut buffer)?;
                serde_json::from_str(&buffer).unwrap_or_default()
            } else {
                PersistedConfig::default()
            };

            Ok(AppState {
                config_path,
                default_plugin_directory,
                inner: Mutex::new(persisted),
            })
        })
    }

    fn plugin_directory(&self) -> PathBuf {
        let guard = self.inner.lock();
        guard
            .plugin_directory
            .clone()
            .unwrap_or_else(|| self.default_plugin_directory.clone())
    }

    fn default_directory(&self) -> PathBuf {
        self.default_plugin_directory.clone()
    }

    fn set_plugin_directory(&self, next: Option<PathBuf>) -> Result<PathBuf> {
        let mut guard = self.inner.lock();
        let resolved = next.clone().unwrap_or_else(|| self.default_plugin_directory.clone());
        fs::create_dir_all(&resolved)?;
        guard.plugin_directory = next.map(|_| resolved.clone());
        drop(guard);
        self.persist()?;
        Ok(resolved)
    }

    fn plugin_enabled(&self, plugin_id: &str) -> bool {
        self.inner
            .lock()
            .plugin_states
            .get(plugin_id)
            .map(|item| item.enabled)
            .unwrap_or(false)
    }

    fn set_plugin_enabled(&self, plugin_id: &str, enabled: bool) -> Result<()> {
        let mut guard = self.inner.lock();
        guard
            .plugin_states
            .entry(plugin_id.to_string())
            .or_default()
            .enabled = enabled;
        drop(guard);
        self.persist()
    }

    fn remove_plugin_state(&self, plugin_id: &str) -> Result<()> {
        let mut guard = self.inner.lock();
        guard.plugin_states.remove(plugin_id);
        drop(guard);
        self.persist()
    }

    fn persist(&self) -> Result<()> {
        let guard = self.inner.lock();
        let serialized = serde_json::to_string_pretty(&*guard)?;
        fs::write(&self.config_path, serialized)?;
        Ok(())
    }
}

#[derive(Debug, Serialize)]
struct PluginDescriptor {
    id: String,
    name: String,
    version: String,
    description: Option<String>,
    author: Option<String>,
    entry: Option<String>,
    entry_url: Option<String>,
    path: String,
    enabled: bool,
    broken: bool,
    error: Option<String>,
}

#[derive(Debug, Serialize)]
struct PluginEntryPayload {
    entry_url: String,
    entry_path: String,
    mime_type: String,
}

#[derive(Debug, Serialize)]
struct PluginDirectoryInfo {
    directory: String,
    default_directory: String,
}

#[derive(Debug, Deserialize)]
struct PluginManifest {
    id: String,
    #[serde(default)]
    name: String,
    #[serde(default = "default_version")]
    version: String,
    #[serde(default)]
    description: Option<String>,
    #[serde(default)]
    author: Option<String>,
    #[serde(default = "default_entry")]
    entry: String,
}

fn default_entry() -> String {
    "index.js".to_string()
}

fn default_version() -> String {
    "0.0.0".to_string()
}

fn resolve_default_plugin_directory(handle: &AppHandle) -> Result<PathBuf> {
    if let Some(resource_dir) = handle.path_resolver().resolve_resource("plugins") {
        if resource_dir.exists() {
            return Ok(resource_dir);
        }
    }

    if cfg!(debug_assertions) {
        let mut cwd = std::env::current_dir().unwrap_or_default();
        cwd.push("plugins");
        return Ok(cwd);
    }

    let mut app_dir = handle
        .path_resolver()
        .app_data_dir()
        .unwrap_or_else(|| std::env::current_dir().unwrap_or_default());
    app_dir.push("plugins");
    Ok(app_dir)
}

fn read_manifest(path: &Path) -> Result<PluginManifest> {
    let manifest_path = path.join("plugin.json");
    if !manifest_path.exists() {
        return Err(anyhow!("缺少 plugin.json"));
    }
    let raw = fs::read_to_string(manifest_path)?;
    let manifest: PluginManifest = serde_json::from_str(&raw)?;
    if manifest.id.trim().is_empty() {
        return Err(anyhow!("插件缺少 id"));
    }
    Ok(manifest)
}

fn copy_directory(src: &Path, dest: &Path) -> Result<()> {
    if src == dest {
        return Ok(());
    }
    if dest.exists() {
        fs_extra::dir::remove(dest).ok();
    }
    fs::create_dir_all(dest)?;
    let mut options = fs_extra::dir::CopyOptions::new();
    options.copy_inside = true;
    options.overwrite = true;
    fs_extra::dir::copy(src, dest, &options)?;
    Ok(())
}

fn list_plugins_impl(state: &AppState) -> Vec<PluginDescriptor> {
    let directory = state.plugin_directory();
    let mut items = Vec::new();
    if !directory.exists() {
        return items;
    }

    for entry in WalkDir::new(&directory).max_depth(1).min_depth(1) {
        let entry = match entry {
            Ok(value) => value,
            Err(err) => {
                items.push(PluginDescriptor {
                    id: format!("broken-{}", items.len()),
                    name: "未知插件".into(),
                    version: "0.0.0".into(),
                    description: None,
                    author: None,
                    entry: None,
                    entry_url: None,
                    path: directory.display().to_string(),
                    enabled: false,
                    broken: true,
                    error: Some(err.to_string()),
                });
                continue;
            }
        };

        if !entry.file_type().is_dir() {
            continue;
        }

        let plugin_path = entry.path().to_path_buf();
        match read_manifest(&plugin_path) {
            Ok(manifest) => {
                let enabled = state.plugin_enabled(&manifest.id);
                items.push(PluginDescriptor {
                    id: manifest.id.clone(),
                    name: if manifest.name.is_empty() {
                        manifest.id.clone()
                    } else {
                        manifest.name.clone()
                    },
                    version: manifest.version.clone(),
                    description: manifest.description.clone(),
                    author: manifest.author.clone(),
                    entry: Some(manifest.entry.clone()),
                    entry_url: None,
                    path: plugin_path.display().to_string(),
                    enabled,
                    broken: false,
                    error: None,
                });
            }
            Err(err) => items.push(PluginDescriptor {
                id: plugin_path
                    .file_name()
                    .and_then(|v| v.to_str())
                    .unwrap_or("broken")
                    .to_string(),
                name: plugin_path
                    .file_name()
                    .and_then(|v| v.to_str())
                    .unwrap_or("broken")
                    .to_string(),
                version: "0.0.0".into(),
                description: None,
                author: None,
                entry: None,
                entry_url: None,
                path: plugin_path.display().to_string(),
                enabled: false,
                broken: true,
                error: Some(err.to_string()),
            }),
        }
    }

    items
}

#[tauri::command]
fn plugins_list(handle: AppHandle) -> Result<Vec<PluginDescriptor>, String> {
    let state = AppState::initialize(&handle).map_err(to_string)?;
    Ok(list_plugins_impl(state))
}

#[tauri::command]
fn plugins_install(handle: AppHandle, source_path: String) -> Result<PluginDescriptor, String> {
    let state = AppState::initialize(&handle).map_err(to_string)?;
    let source = PathBuf::from(source_path);
    if !source.exists() {
        return Err("插件源路径不存在".into());
    }
    if !source.is_dir() {
        return Err("插件源必须是目录".into());
    }
    let manifest = read_manifest(&source).map_err(to_string)?;
    let target_dir = state.plugin_directory().join(&manifest.id);
    copy_directory(&source, &target_dir).map_err(to_string)?;
    let descriptor = PluginDescriptor {
        id: manifest.id.clone(),
        name: if manifest.name.is_empty() {
            manifest.id.clone()
        } else {
            manifest.name.clone()
        },
        version: manifest.version.clone(),
        description: manifest.description.clone(),
        author: manifest.author.clone(),
        entry: Some(manifest.entry.clone()),
        entry_url: None,
        path: target_dir.display().to_string(),
        enabled: state.plugin_enabled(&manifest.id),
        broken: false,
        error: None,
    };
    Ok(descriptor)
}

#[tauri::command]
fn plugins_remove(handle: AppHandle, plugin_id: String) -> Result<(), String> {
    let state = AppState::initialize(&handle).map_err(to_string)?;
    let target_dir = state.plugin_directory().join(&plugin_id);
    if target_dir.exists() {
        fs_extra::dir::remove(&target_dir).map_err(to_string)?;
    }
    state.remove_plugin_state(&plugin_id).map_err(to_string)?;
    Ok(())
}

#[tauri::command]
fn plugins_set_enabled(handle: AppHandle, plugin_id: String, enabled: bool) -> Result<(), String> {
    let state = AppState::initialize(&handle).map_err(to_string)?;
    state
        .set_plugin_enabled(&plugin_id, enabled)
        .map_err(to_string)
}

#[tauri::command]
fn plugins_get_entry(handle: AppHandle, plugin_id: String) -> Result<PluginEntryPayload, String> {
    let state = AppState::initialize(&handle).map_err(to_string)?;
    let directory = state.plugin_directory();
    let plugin_dir = directory.join(&plugin_id);
    if !plugin_dir.exists() {
        return Err("插件不存在".into());
    }
    let manifest = read_manifest(&plugin_dir).map_err(to_string)?;
    let entry_path = plugin_dir.join(&manifest.entry);
    if !entry_path.exists() {
        return Err("插件入口文件不存在".into());
    }
    let content = fs::read(&entry_path).map_err(to_string)?;
    let encoded = Base64.encode(content);
    let mime = if entry_path
        .extension()
        .and_then(|ext| ext.to_str())
        .map(|ext| ext.eq_ignore_ascii_case("mjs"))
        .unwrap_or(false)
    {
        "text/javascript"
    } else {
        "text/javascript"
    };
    Ok(PluginEntryPayload {
        entry_url: format!("data:{};base64,{}", mime, encoded),
        entry_path: entry_path.display().to_string(),
        mime_type: mime.to_string(),
    })
}

#[tauri::command]
fn plugins_select_package(handle: AppHandle) -> Result<Option<String>, String> {
    let state = AppState::initialize(&handle).map_err(to_string)?;
    let default_dir = state.plugin_directory();
    let (sender, receiver) = mpsc::channel();
    FileDialogBuilder::new()
        .set_directory(&default_dir)
        .pick_folder(move |result| {
            let _ = sender.send(result.map(|path| path.to_string_lossy().to_string()));
        });
    receiver.recv().map_err(to_string)
}

#[tauri::command]
fn plugins_select_directory(handle: AppHandle) -> Result<Option<PluginDirectoryInfo>, String> {
    let state = AppState::initialize(&handle).map_err(to_string)?;
    let default_dir = state.plugin_directory();
    let (sender, receiver) = mpsc::channel();
    FileDialogBuilder::new()
        .set_directory(&default_dir)
        .pick_folder(move |result| {
            let _ = sender.send(result.map(|path| path.to_string_lossy().to_string()));
        });
    let selection = receiver.recv().map_err(to_string)?;
    if let Some(path) = selection {
        let resolved = PathBuf::from(&path);
        state
            .set_plugin_directory(Some(resolved.clone()))
            .map_err(to_string)?;
        return Ok(Some(PluginDirectoryInfo {
            directory: resolved.display().to_string(),
            default_directory: state.default_directory().display().to_string(),
        }));
    }
    Ok(None)
}

#[tauri::command]
fn plugins_get_directory(handle: AppHandle) -> Result<PluginDirectoryInfo, String> {
    let state = AppState::initialize(&handle).map_err(to_string)?;
    let directory = state.plugin_directory();
    Ok(PluginDirectoryInfo {
        directory: directory.display().to_string(),
        default_directory: state.default_directory().display().to_string(),
    })
}

#[tauri::command]
fn plugins_set_directory(handle: AppHandle, directory: Option<String>) -> Result<PluginDirectoryInfo, String> {
    let state = AppState::initialize(&handle).map_err(to_string)?;
    let resolved = directory
        .and_then(|value| {
            let trimmed = value.trim().to_string();
            if trimmed.is_empty() {
                None
            } else {
                Some(PathBuf::from(trimmed))
            }
        });
    let next = state.set_plugin_directory(resolved).map_err(to_string)?;
    Ok(PluginDirectoryInfo {
        directory: next.display().to_string(),
        default_directory: state.default_directory().display().to_string(),
    })
}

#[tauri::command]
fn get_plugin_path(handle: AppHandle) -> Result<PluginDirectoryInfo, String> {
    plugins_get_directory(handle)
}

#[tauri::command]
fn set_plugin_path(handle: AppHandle, directory: Option<String>) -> Result<PluginDirectoryInfo, String> {
    plugins_set_directory(handle, directory)
}

fn to_string<T: std::fmt::Display>(err: T) -> String {
    err.to_string()
}

fn main() {
    tauri::Builder::default()
        .setup(|app| {
            let handle = app.handle();
            let _ = AppState::initialize(handle);
            if let Some(window) = app.get_window("main") {
                window.set_decorations(false)?;
                window.set_title("Hydrogen Music")?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            plugins_list,
            plugins_install,
            plugins_remove,
            plugins_set_enabled,
            plugins_get_entry,
            plugins_select_package,
            plugins_select_directory,
            plugins_get_directory,
            plugins_set_directory,
            get_plugin_path,
            set_plugin_path
        ])
        .run(tauri::generate_context!())
        .expect("error while running Hydrogen Music application");
}

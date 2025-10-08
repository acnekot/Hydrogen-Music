#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use base64::Engine;
use lofty::{Accessor, TaggedFileExt};
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::{
    collections::HashMap,
    fs::{self, File},
    io::Read,
    path::{Path, PathBuf},
    sync::{
        atomic::{AtomicUsize, Ordering},
        Mutex,
    },
};
use tauri::{
    AppHandle, CustomMenuItem, GlobalShortcutManager, Manager, State, SystemTray, SystemTrayEvent,
    SystemTrayHandle, SystemTrayMenu, SystemTrayMenuItem,
};
use thiserror::Error;
use uuid::Uuid;

#[derive(Debug, Error)]
enum AppError {
    #[error("io error: {0}")]
    Io(#[from] std::io::Error),
    #[error("serde error: {0}")]
    Serde(#[from] serde_json::Error),
    #[error("reqwest error: {0}")]
    Reqwest(#[from] reqwest::Error),
    #[error("other: {0}")]
    Other(String),
}

type Result<T> = std::result::Result<T, AppError>;

struct PersistentState {
    settings: Mutex<Option<serde_json::Value>>,
    last_playlist: Mutex<Option<serde_json::Value>>,
    local_cache: Mutex<HashMap<String, serde_json::Value>>,
    global_shortcuts: Mutex<Vec<String>>,
}

impl Default for PersistentState {
    fn default() -> Self {
        Self {
            settings: Mutex::new(None),
            last_playlist: Mutex::new(None),
            local_cache: Mutex::new(HashMap::new()),
            global_shortcuts: Mutex::new(Vec::new()),
        }
    }
}

fn ensure_app_dir(app: &AppHandle) -> Result<PathBuf> {
    let dir = app
        .path_resolver()
        .app_config_dir()
        .ok_or_else(|| AppError::Other("unable to resolve config dir".into()))?;
    if !dir.exists() {
        fs::create_dir_all(&dir)?;
    }
    Ok(dir)
}

fn settings_path(app: &AppHandle) -> Result<PathBuf> {
    Ok(ensure_app_dir(app)?.join("settings.json"))
}

fn playlist_path(app: &AppHandle) -> Result<PathBuf> {
    Ok(ensure_app_dir(app)?.join("last-playlist.json"))
}

#[derive(Serialize, Deserialize, Clone)]
struct ScanParams {
    #[serde(default)]
    refresh: bool,
    #[serde(default)]
    r#type: String,
}

fn default_settings() -> serde_json::Value {
    json!({
        "music": {
            "level": "standard",
            "lyricSize": "20",
            "tlyricSize": "14",
            "rlyricSize": "12",
            "lyricInterlude": 13
        },
        "local": {
            "videoFolder": null,
            "downloadFolder": null,
            "localFolder": []
        },
        "shortcuts": [
            {
                "id": "play",
                "name": "播放/暂停",
                "shortcut": "CommandOrControl+P",
                "globalShortcut": "CommandOrControl+Alt+P"
            },
            {
                "id": "last",
                "name": "上一首",
                "shortcut": "CommandOrControl+Left",
                "globalShortcut": "CommandOrControl+Alt+Left"
            },
            {
                "id": "next",
                "name": "下一首",
                "shortcut": "CommandOrControl+Right",
                "globalShortcut": "CommandOrControl+Alt+Right"
            },
            {
                "id": "volumeUp",
                "name": "增加音量",
                "shortcut": "CommandOrControl+Up",
                "globalShortcut": "CommandOrControl+Alt+Up"
            },
            {
                "id": "volumeDown",
                "name": "少音量",
                "shortcut": "CommandOrControl+Down",
                "globalShortcut": "CommandOrControl+Alt+Down"
            },
            {
                "id": "processForward",
                "name": "快进(3s)",
                "shortcut": "CommandOrControl+]",
                "globalShortcut": "CommandOrControl+Alt+]"
            },
            {
                "id": "processBack",
                "name": "后退(3s)",
                "shortcut": "CommandOrControl+[",
                "globalShortcut": "CommandOrControl+Alt+["
            }
        ],
        "other": {
            "globalShortcuts": true,
            "quitApp": "minimize"
        }
    })
}

fn read_settings(app: &AppHandle, state: &State<PersistentState>) -> Result<serde_json::Value> {
    if let Some(data) = state.settings.lock().unwrap().clone() {
        return Ok(data);
    }
    let path = settings_path(app)?;
    if path.exists() {
        let buf = fs::read_to_string(&path)?;
        let parsed = serde_json::from_str(&buf)?;
        *state.settings.lock().unwrap() = Some(parsed.clone());
        Ok(parsed)
    } else {
        let defaults = default_settings();
        *state.settings.lock().unwrap() = Some(defaults.clone());
        fs::write(path, serde_json::to_vec_pretty(&defaults)?)?;
        Ok(defaults)
    }
}

fn write_settings(
    app: &AppHandle,
    state: &State<PersistentState>,
    settings: serde_json::Value,
) -> Result<()> {
    let path = settings_path(app)?;
    fs::write(&path, serde_json::to_vec_pretty(&settings)?)?;
    *state.settings.lock().unwrap() = Some(settings);
    Ok(())
}

fn read_playlist(
    app: &AppHandle,
    state: &State<PersistentState>,
) -> Result<Option<serde_json::Value>> {
    if let Some(data) = state.last_playlist.lock().unwrap().clone() {
        return Ok(Some(data));
    }
    let path = playlist_path(app)?;
    if path.exists() {
        let buf = fs::read_to_string(&path)?;
        let parsed = serde_json::from_str(&buf)?;
        *state.last_playlist.lock().unwrap() = Some(parsed.clone());
        Ok(Some(parsed))
    } else {
        Ok(None)
    }
}

fn write_playlist(
    app: &AppHandle,
    state: &State<PersistentState>,
    playlist: serde_json::Value,
) -> Result<()> {
    let path = playlist_path(app)?;
    fs::write(&path, serde_json::to_vec_pretty(&playlist)?)?;
    *state.last_playlist.lock().unwrap() = Some(playlist);
    Ok(())
}

fn unregister_shortcuts_internal(app: &AppHandle, state: &State<PersistentState>) {
    let mut stored = state.global_shortcuts.lock().unwrap();
    if stored.is_empty() {
        return;
    }
    let mut manager = app.global_shortcut_manager();
    for accelerator in stored.drain(..) {
        if let Err(err) = manager.unregister(accelerator.as_str()) {
            eprintln!("failed to unregister shortcut {accelerator}: {err}");
        }
    }
}

fn update_global_shortcuts(
    app: &AppHandle,
    state: &State<PersistentState>,
    settings: &serde_json::Value,
) -> Result<()> {
    unregister_shortcuts_internal(app, state);

    let enabled = settings
        .get("other")
        .and_then(|value| value.get("globalShortcuts"))
        .and_then(|value| value.as_bool())
        .unwrap_or(false);
    if !enabled {
        return Ok(());
    }

    let Some(items) = settings.get("shortcuts").and_then(|value| value.as_array()) else {
        return Ok(());
    };

    let mut stored = state.global_shortcuts.lock().unwrap();
    let mut manager = app.global_shortcut_manager();

    for entry in items {
        let Some(accelerator) = entry.get("globalShortcut").and_then(|value| value.as_str()) else {
            continue;
        };
        let id = entry
            .get("id")
            .and_then(|value| value.as_str())
            .unwrap_or_default();
        let (event_name, payload) = match id {
            "play" => ("music-playing-control", None),
            "last" => ("music-song-control", Some("last")),
            "next" => ("music-song-control", Some("next")),
            "volumeUp" => ("music-volume-up", Some("volumeUp")),
            "volumeDown" => ("music-volume-down", Some("volumeDown")),
            "processForward" => ("music-process-control", Some("forward")),
            "processBack" => ("music-process-control", Some("back")),
            _ => continue,
        };

        let accelerator_string = accelerator.to_string();
        let event = event_name.to_string();
        let payload_string = payload.map(|value| value.to_string());
        let app_handle = app.clone();
        manager
            .register(accelerator_string.clone(), move || {
                let emit_result = if let Some(value) = payload_string.clone() {
                    app_handle.emit_all(&event, value)
                } else {
                    app_handle.emit_all(&event, ())
                };
                if let Err(err) = emit_result {
                    eprintln!("failed to emit shortcut event {event}: {err}");
                }
            })
            .map_err(|err| {
                AppError::Other(format!("unable to register shortcut {accelerator}: {err}"))
            })?;
        stored.push(accelerator_string);
    }

    // Always register a developer shortcut matching the Electron version
    let devtools_accelerator = "CommandOrControl+Shift+F12".to_string();
    let app_handle = app.clone();
    manager
        .register(devtools_accelerator.clone(), move || {
            if let Some(window) = app_handle.get_window("main") {
                let _ = window.open_devtools();
            }
        })
        .map_err(|err| AppError::Other(format!("unable to register devtools shortcut: {err}")))?;
    stored.push(devtools_accelerator);

    Ok(())
}

#[tauri::command]
fn window_min(window: tauri::Window) -> Result<()> {
    window
        .minimize()
        .map_err(|e| AppError::Other(e.to_string()))
}

#[tauri::command]
fn window_max(window: tauri::Window) -> Result<()> {
    if window.is_maximized().unwrap_or(false) {
        window
            .unmaximize()
            .map_err(|e| AppError::Other(e.to_string()))?
    } else {
        window
            .maximize()
            .map_err(|e| AppError::Other(e.to_string()))?
    }
    Ok(())
}

#[tauri::command]
fn window_close(
    window: tauri::Window,
    app: AppHandle,
    state: State<PersistentState>,
) -> Result<()> {
    let settings = read_settings(&app, &state).unwrap_or_else(|_| default_settings());
    let behavior = settings
        .get("other")
        .and_then(|v| v.get("quitApp"))
        .and_then(|v| v.as_str())
        .unwrap_or("quit");
    match behavior {
        "minimize" => window.hide().map_err(|e| AppError::Other(e.to_string())),
        _ => window.close().map_err(|e| AppError::Other(e.to_string())),
    }
}

#[tauri::command]
fn window_hide(window: tauri::Window) -> Result<()> {
    window.hide().map_err(|e| AppError::Other(e.to_string()))
}

#[tauri::command]
fn set_window_title(window: tauri::Window, title: String) -> Result<()> {
    window
        .set_title(&title)
        .map_err(|e| AppError::Other(e.to_string()))
}

#[tauri::command]
fn open_external(app: AppHandle, url: String) -> Result<()> {
    tauri::api::shell::open(&app.shell_scope(), url, None)
        .map_err(|e| AppError::Other(e.to_string()))
}

#[tauri::command]
fn get_settings(app: AppHandle, state: State<PersistentState>) -> Result<serde_json::Value> {
    read_settings(&app, &state)
}

#[tauri::command]
fn set_settings(
    app: AppHandle,
    state: State<PersistentState>,
    settings: serde_json::Value,
) -> Result<()> {
    let settings_clone = settings.clone();
    write_settings(&app, &state, settings)?;
    update_global_shortcuts(&app, &state, &settings_clone)
}

#[tauri::command]
fn get_last_playlist(
    app: AppHandle,
    state: State<PersistentState>,
) -> Result<Option<serde_json::Value>> {
    read_playlist(&app, &state)
}

#[tauri::command]
fn save_last_playlist(
    app: AppHandle,
    state: State<PersistentState>,
    playlist: serde_json::Value,
) -> Result<()> {
    write_playlist(&app, &state, playlist)
}

#[tauri::command]
fn dialog_open_directory() -> Result<Option<String>> {
    Ok(tauri::api::dialog::blocking::FileDialogBuilder::new()
        .pick_folder()
        .map(|path| path.to_string_lossy().to_string()))
}

#[tauri::command]
fn dialog_open_image() -> Result<Option<String>> {
    Ok(tauri::api::dialog::blocking::FileDialogBuilder::new()
        .add_filter(
            "图片文件",
            &["png", "jpg", "jpeg", "gif", "bmp", "webp", "svg"],
        )
        .pick_file()
        .map(|path| path.to_string_lossy().to_string()))
}

#[tauri::command]
async fn http_request(request: serde_json::Value) -> Result<serde_json::Value> {
    let url = request
        .get("url")
        .and_then(|v| v.as_str())
        .ok_or_else(|| AppError::Other("missing url".into()))?;
    let client = reqwest::Client::new();
    let mut req = client.get(url);
    if let Some(options) = request.get("option") {
        if let Some(headers) = options.get("headers").and_then(|v| v.as_object()) {
            let mut header_map = reqwest::header::HeaderMap::new();
            for (key, value) in headers {
                if let Some(value) = value.as_str() {
                    if let Ok(header_name) = reqwest::header::HeaderName::from_bytes(key.as_bytes())
                    {
                        if let Ok(header_value) = reqwest::header::HeaderValue::from_str(value) {
                            header_map.append(header_name, header_value);
                        }
                    }
                }
            }
            req = req.headers(header_map);
        }
        if let Some(params) = options.get("params").and_then(|v| v.as_object()) {
            let mut map = HashMap::new();
            for (key, value) in params {
                if let Some(value) = value.as_str() {
                    map.insert(key.clone(), value.to_string());
                } else {
                    map.insert(key.clone(), value.to_string());
                }
            }
            req = req.query(&map);
        }
    }
    let response = req.send().await?.text().await?;
    Ok(serde_json::from_str(&response).unwrap_or_else(|_| json!({ "raw": response })))
}

#[tauri::command]
fn get_local_music_image(path: String) -> Result<Option<String>> {
    let path = PathBuf::from(path);
    if !path.exists() {
        return Ok(None);
    }
    let mut reader = File::open(&path)?;
    let mut buffer = Vec::new();
    reader.read_to_end(&mut buffer)?;
    if let Ok(tagged) = lofty::read_from_path(&path) {
        if let Some(picture) = tagged.properties().pictures().first() {
            let mime = picture
                .mime_type()
                .map(|m| m.as_str())
                .unwrap_or("image/jpeg");
            let base64 = base64::engine::general_purpose::STANDARD.encode(picture.data().to_vec());
            return Ok(Some(format!("data:{};base64,{}", mime, base64)));
        }
    }
    let ext = path.extension().and_then(|s| s.to_str()).unwrap_or("jpg");
    let mime = match ext.to_lowercase().as_str() {
        "png" => "image/png",
        "webp" => "image/webp",
        "gif" => "image/gif",
        _ => "image/jpeg",
    };
    let base64 = base64::engine::general_purpose::STANDARD.encode(buffer);
    Ok(Some(format!("data:{};base64,{}", mime, base64)))
}

#[derive(Serialize)]
struct LocalFolderNode {
    name: String,
    #[serde(rename = "dirPath")]
    dir_path: String,
    #[serde(rename = "type")]
    kind: String,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    children: Vec<LocalFolderNode>,
}

#[derive(Serialize, Default, Clone)]
struct LocalCommonMetadata {
    #[serde(rename = "localTitle")]
    local_title: String,
    #[serde(rename = "fileUrl")]
    file_url: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    title: Option<String>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    artists: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    album: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    albumartist: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    date: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    genre: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    year: Option<i32>,
}

#[derive(Serialize, Default, Clone)]
struct LocalFormatMetadata {
    #[serde(skip_serializing_if = "Option::is_none")]
    bitrate: Option<u32>,
    #[serde(rename = "bitsPerSample", skip_serializing_if = "Option::is_none")]
    bits_per_sample: Option<u8>,
    #[serde(skip_serializing_if = "Option::is_none")]
    container: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    duration: Option<f64>,
    #[serde(rename = "sampleRate", skip_serializing_if = "Option::is_none")]
    sample_rate: Option<u32>,
}

#[derive(Serialize)]
struct LocalMetadataNode {
    id: String,
    name: String,
    #[serde(rename = "dirPath")]
    dir_path: String,
    #[serde(skip_serializing_if = "Vec::is_empty")]
    children: Vec<LocalMetadataNode>,
    #[serde(rename = "type", skip_serializing_if = "Option::is_none")]
    kind: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    common: Option<LocalCommonMetadata>,
    #[serde(skip_serializing_if = "Option::is_none")]
    format: Option<LocalFormatMetadata>,
}

fn supported_audio_ext(ext: &str) -> bool {
    matches!(
        ext,
        "aiff"
            | "aac"
            | "ape"
            | "asf"
            | "bwf"
            | "dsdiff"
            | "dsf"
            | "flac"
            | "mp2"
            | "matroska"
            | "mp3"
            | "mpc"
            | "mpeg4"
            | "ogg"
            | "opus"
            | "speex"
            | "theora"
            | "vorbis"
            | "wav"
            | "webm"
            | "wv"
            | "wma"
            | "m4a"
    )
}

fn build_dir_tree(path: &Path, name_override: Option<String>) -> Option<LocalFolderNode> {
    if !path.exists() {
        return None;
    }
    let name = name_override
        .or_else(|| {
            path.file_name()
                .and_then(|s| s.to_str())
                .map(|s| s.to_string())
        })
        .unwrap_or_else(|| path.to_string_lossy().to_string());
    let mut node = LocalFolderNode {
        name,
        dir_path: path.to_string_lossy().to_string(),
        kind: "folder".to_string(),
        children: Vec::new(),
    };
    if let Ok(entries) = fs::read_dir(path) {
        for entry in entries.flatten() {
            let child_path = entry.path();
            if child_path.is_dir() {
                if let Some(child) = build_dir_tree(&child_path, None) {
                    node.children.push(child);
                }
            }
        }
    }
    Some(node)
}

fn apply_sidecar_metadata(common: &mut LocalCommonMetadata, path: &Path) {
    let parsed = path.with_extension("json");
    if let Ok(text) = fs::read_to_string(&parsed) {
        if let Ok(value) = serde_json::from_str::<serde_json::Value>(&text) {
            if common
                .title
                .as_ref()
                .map(|s| s.trim().is_empty())
                .unwrap_or(true)
            {
                if let Some(name) = value.get("name").and_then(|v| v.as_str()) {
                    common.title = Some(name.to_string());
                }
            }
            if common.artists.is_empty() {
                if let Some(artists) = value.get("artists").and_then(|v| v.as_array()) {
                    common.artists = artists
                        .iter()
                        .filter_map(|item| item.as_str().map(|s| s.to_string()))
                        .collect();
                }
            }
            if common
                .album
                .as_ref()
                .map(|s| s.trim().is_empty())
                .unwrap_or(true)
            {
                if let Some(album) = value.get("album").and_then(|v| v.as_str()) {
                    common.album = Some(album.to_string());
                }
            }
        }
    }
}

fn apply_lrc_metadata(common: &mut LocalCommonMetadata, path: &Path) {
    let parsed = path.with_extension("lrc");
    if let Ok(text) = fs::read_to_string(&parsed) {
        for line in text.lines().take(50) {
            if let Some((key, value)) = line
                .trim()
                .strip_prefix('[')
                .and_then(|rest| rest.split_once(']'))
            {
                let content = value.trim();
                match key.to_lowercase().as_str() {
                    "ar" if common.artists.is_empty() => {
                        common.artists = content
                            .split(|c| c == ',' || c == '，' || c == '/' || c == '|')
                            .map(|s| s.trim().to_string())
                            .filter(|s| !s.is_empty())
                            .collect();
                    }
                    "ti" if common
                        .title
                        .as_ref()
                        .map(|s| s.trim().is_empty())
                        .unwrap_or(true) =>
                    {
                        if !content.is_empty() {
                            common.title = Some(content.to_string());
                        }
                    }
                    "al" if common
                        .album
                        .as_ref()
                        .map(|s| s.trim().is_empty())
                        .unwrap_or(true) =>
                    {
                        if !content.is_empty() {
                            common.album = Some(content.to_string());
                        }
                    }
                    _ => {}
                }
            }
        }
    }
}

fn build_metadata_node(
    path: &Path,
    app: &AppHandle,
    counter: &AtomicUsize,
    name_override: Option<String>,
) -> Option<LocalMetadataNode> {
    if !path.exists() {
        return None;
    }
    if path.is_dir() {
        let name = name_override
            .or_else(|| {
                path.file_name()
                    .and_then(|s| s.to_str())
                    .map(|s| s.to_string())
            })
            .unwrap_or_else(|| path.to_string_lossy().to_string());
        let mut node = LocalMetadataNode {
            id: Uuid::new_v4().to_string(),
            name,
            dir_path: path.to_string_lossy().to_string(),
            children: Vec::new(),
            kind: Some("folder".to_string()),
            common: None,
            format: None,
        };
        if let Ok(entries) = fs::read_dir(path) {
            for entry in entries.flatten() {
                if let Some(child) = build_metadata_node(&entry.path(), app, counter, None) {
                    node.children.push(child);
                }
            }
        }
        return Some(node);
    }

    let ext = path
        .extension()
        .and_then(|s| s.to_str())
        .map(|s| s.to_lowercase())
        .unwrap_or_default();
    if !supported_audio_ext(&ext) {
        return None;
    }

    let mut common = LocalCommonMetadata {
        local_title: path
            .file_stem()
            .and_then(|s| s.to_str())
            .unwrap_or_default()
            .to_string(),
        file_url: path.to_string_lossy().to_string(),
        ..Default::default()
    };
    let mut format = LocalFormatMetadata::default();

    if let Ok(tagged) = lofty::read_from_path(path) {
        if let Some(tag) = tagged.primary_tag() {
            if let Some(title) = tag.title() {
                if !title.trim().is_empty() {
                    common.title = Some(title.to_string());
                }
            }
            if common.artists.is_empty() {
                let mut artists = Vec::new();
                if let Some(artist) = tag.artist() {
                    artists.push(artist.to_string());
                }
                if let Some(album_artist) = tag.album_artist() {
                    if !album_artist.is_empty() {
                        common.albumartist = Some(album_artist.to_string());
                    }
                }
                if !artists.is_empty() {
                    common.artists = artists;
                }
            }
            if common.album.is_none() {
                if let Some(album) = tag.album() {
                    if !album.trim().is_empty() {
                        common.album = Some(album.to_string());
                    }
                }
            }
            if common.date.is_none() {
                if let Some(date) = tag.year() {
                    common.year = Some(date as i32);
                    common.date = Some(date.to_string());
                }
            }
            if common.genre.is_none() {
                let genres: Vec<String> =
                    tag.genre().map(|g| vec![g.to_string()]).unwrap_or_default();
                if !genres.is_empty() {
                    common.genre = Some(genres);
                }
            }
        }

        let props = tagged.properties();
        format.bitrate = props.audio_bitrate().map(|v| v as u32);
        format.bits_per_sample = props.bits_per_sample().map(|v| v as u8);
        format.container = Some(
            tagged
                .file_type()
                .map(|t| t.to_string())
                .unwrap_or_else(|| ext.clone()),
        );
        format.duration = props.duration().map(|d| d.as_secs_f64());
        format.sample_rate = props.sample_rate().map(|v| v as u32);
    }

    apply_sidecar_metadata(&mut common, path);
    apply_lrc_metadata(&mut common, path);

    let count = counter.fetch_add(1, Ordering::SeqCst) + 1;
    let _ = app.emit_all("local-music-count", count);

    Some(LocalMetadataNode {
        id: Uuid::new_v4().to_string(),
        name: path
            .file_name()
            .and_then(|s| s.to_str())
            .unwrap_or_default()
            .to_string(),
        dir_path: path.to_string_lossy().to_string(),
        children: Vec::new(),
        kind: None,
        common: Some(common),
        format: Some(format),
    })
}

fn fire_local_music_event(app: &AppHandle, payload: &serde_json::Value) {
    if let Err(err) = app.emit_all("local-music-files", payload.clone()) {
        eprintln!("failed to emit local-music-files event: {err}");
    }
}

#[tauri::command]
fn scan_local_music(
    app: AppHandle,
    state: State<PersistentState>,
    params: ScanParams,
) -> Result<serde_json::Value> {
    let cache_key = params.r#type.clone();
    if !params.refresh {
        if let Some(cached) = state.local_cache.lock().unwrap().get(&cache_key).cloned() {
            fire_local_music_event(&app, &cached);
            return Ok(cached);
        }
    }

    let settings = read_settings(&app, &state).unwrap_or_else(|_| default_settings());
    let local = settings
        .get("local")
        .cloned()
        .unwrap_or_else(|| json!({"localFolder": [], "downloadFolder": null, "videoFolder": null}));
    let mut folders = Vec::new();
    if params.r#type == "downloaded" {
        if let Some(folder) = local.get("downloadFolder").and_then(|v| v.as_str()) {
            folders.push(PathBuf::from(folder));
        }
    } else if params.r#type == "local" {
        if let Some(array) = local.get("localFolder").and_then(|v| v.as_array()) {
            for item in array {
                if let Some(s) = item.as_str() {
                    folders.push(PathBuf::from(s));
                }
            }
        }
    }

    let counter = AtomicUsize::new(0);
    let mut dir_tree = Vec::new();
    let mut metadata_tree = Vec::new();
    for folder in folders {
        if let Some(node) = build_dir_tree(&folder, Some(folder.to_string_lossy().to_string())) {
            dir_tree.push(node);
        }
        if let Some(node) = build_metadata_node(
            &folder,
            &app,
            &counter,
            Some(folder.to_string_lossy().to_string()),
        ) {
            metadata_tree.push(node);
        }
    }

    let result = json!({
        "type": params.r#type,
        "dirTree": dir_tree,
        "locaFilesMetadata": metadata_tree,
        "count": counter.load(Ordering::SeqCst) as i64,
    });

    state
        .local_cache
        .lock()
        .unwrap()
        .insert(cache_key, result.clone());

    fire_local_music_event(&app, &result);

    Ok(result)
}

#[tauri::command]
fn clear_local_music_data(state: State<PersistentState>, kind: String) -> Result<()> {
    state.local_cache.lock().unwrap().remove(&kind);
    Ok(())
}

#[tauri::command]
fn register_shortcuts(app: AppHandle, state: State<PersistentState>) -> Result<()> {
    let settings = read_settings(&app, &state).unwrap_or_else(|_| default_settings());
    update_global_shortcuts(&app, &state, &settings)
}

#[tauri::command]
fn unregister_shortcuts(app: AppHandle, state: State<PersistentState>) -> Result<()> {
    unregister_shortcuts_internal(&app, &state);
    Ok(())
}

#[tauri::command]
fn copy_text(text: String) -> Result<()> {
    tauri::clipboard::write_text(text).map_err(|e| AppError::Other(e.to_string()))
}

fn setup_tray(app: &AppHandle) -> SystemTray {
    let play_pause = CustomMenuItem::new("tray_play_pause".to_string(), "播放/暂停");
    let previous = CustomMenuItem::new("tray_prev".to_string(), "上一首");
    let next = CustomMenuItem::new("tray_next".to_string(), "下一首");
    let show = CustomMenuItem::new("show".to_string(), "显示");
    let quit = CustomMenuItem::new("quit".to_string(), "退出");
    let menu = SystemTrayMenu::new()
        .add_item(play_pause)
        .add_item(previous)
        .add_item(next)
        .add_native_item(SystemTrayMenuItem::Separator)
        .add_item(show)
        .add_item(quit);
    SystemTray::new().with_menu(menu)
}

fn handle_tray_event(app: &AppHandle, event: SystemTrayEvent) {
    match event {
        SystemTrayEvent::MenuItemClick { id, .. } => match id.as_str() {
            "tray_play_pause" => {
                let _ = app.emit_all("music-playing-control", ());
            }
            "tray_prev" => {
                let _ = app.emit_all("music-song-control", "last");
            }
            "tray_next" => {
                let _ = app.emit_all("music-song-control", "next");
            }
            "show" => {
                if let Some(window) = app.get_window("main") {
                    let _ = window.show();
                    let _ = window.set_focus();
                }
            }
            "quit" => {
                std::process::exit(0);
            }
            _ => {}
        },
        _ => {}
    }
}

pub fn main() {
    tauri::Builder::default()
        .manage(PersistentState::default())
        .invoke_handler(tauri::generate_handler![
            window_min,
            window_max,
            window_close,
            window_hide,
            set_window_title,
            open_external,
            get_settings,
            set_settings,
            get_last_playlist,
            save_last_playlist,
            dialog_open_directory,
            dialog_open_image,
            http_request,
            get_local_music_image,
            scan_local_music,
            clear_local_music_data,
            register_shortcuts,
            unregister_shortcuts,
            copy_text
        ])
        .setup(|app| {
            let tray = setup_tray(app.handle());
            app.set_system_tray(tray)?;
            let tray_handle = app.tray_handle();
            app.listen_global("music-playing-check", move |event| {
                if let Some(payload) = event.payload() {
                    if let Ok(playing) = serde_json::from_str::<bool>(payload) {
                        let title = if playing { "暂停" } else { "播放" };
                        let item = tray_handle.get_item("tray_play_pause");
                        let _ = item.set_title(title);
                    }
                }
            });

            let app_handle = app.handle();
            let state: State<PersistentState> = app.state();
            let settings =
                read_settings(&app_handle, &state).unwrap_or_else(|_| default_settings());
            let _ = update_global_shortcuts(&app_handle, &state, &settings);
            Ok(())
        })
        .on_system_tray_event(|app, event| handle_tray_event(app, event))
        .run(tauri::generate_context!())
        .expect("error while running Hydrogen Music");
}

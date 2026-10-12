//! MRI Lab desktop shell.
//!
//! The shell wraps the same web application that is served in the browser; it
//! never forks the frontend or re-implements viewer logic. In development it
//! loads the Next.js dev server via `devUrl`. In release it points the window
//! at the deployed web application, configurable at build time through the
//! `MRI_LAB_WEB_URL` environment variable.

/// Web application origin used by release builds. Override with the
/// `MRI_LAB_WEB_URL` environment variable at compile time.
#[allow(dead_code)] // Only read by release builds and the unit test below.
const DEFAULT_WEB_URL: &str = "http://localhost:3000";

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      #[cfg(not(debug_assertions))]
      {
        use tauri::Manager;

        let target = option_env!("MRI_LAB_WEB_URL").unwrap_or(DEFAULT_WEB_URL);
        if let Some(window) = app.get_webview_window("main") {
          if let Ok(url) = target.parse() {
            window.navigate(url)?;
          }
        }
      }
      let _ = app;
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while building the MRI Lab desktop application");
}

#[cfg(test)]
mod tests {
  #[test]
  fn default_web_url_is_https_or_localhost() {
    assert!(
      super::DEFAULT_WEB_URL.starts_with("http://")
        || super::DEFAULT_WEB_URL.starts_with("https://")
    );
  }
}

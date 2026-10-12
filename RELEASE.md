# MRI Lab Release Notes

## Overview

MRI Lab is a full-stack computational-neuroimaging workbench for organising projects, importing MRI datasets, and running reproducible image-processing pipelines with project-scoped access control.

## Platform Downloads

### Linux

| No  | Package               | File               | Command                          |
| --- | --------------------- | ------------------ | -------------------------------- |
| 1   | **AppImage**          | `mri-lab.AppImage` | Run anywhere (no install)        |
| 2   | **Debian/Ubuntu**     | `mri-lab.deb`      | `sudo apt install ./mri-lab.deb` |
| 3   | **RPM (Fedora/RHEL)** | `mri-lab.rpm`      | `sudo dnf install ./mri-lab.rpm` |
| 4   | **Tarball**           | `mri-lab.tar.xz`   | Extract and run `./mri-lab`      |

### macOS

| No  | Package              | File          | Command                          |
| --- | -------------------- | ------------- | -------------------------------- |
| 1   | **DMG**              | `mri-lab.dmg` | Standard macOS installer         |
| 2   | **ZIP (App Bundle)** | `mri-lab.zip` | Extract and drag to Applications |

### Windows

| No  | Package           | File          | Command                    |
| --- | ----------------- | ------------- | -------------------------- |
| 1   | **MSI Installer** | `mri-lab.msi` | Standard Windows installer |
| 2   | **EXE**           | `mri-lab.exe` | Portable executable        |

## Verification

All artifacts include SHA256 checksums in `SHA256SUMS.txt`:

```bash
# Verify all downloads
sha256sum --check SHA256SUMS.txt
```

## Installation Requirements

| Platform | Requirements                                       |
| -------- | -------------------------------------------------- |
| Linux    | WebKitGTK 4.1+ (Ubuntu 22.04+, Fedora 38+, Arch)   |
| macOS    | macOS 12+ (Monterey) — uses system WebKit          |
| Windows  | Windows 10 1903+ (WebView2 runtime auto-installed) |

## Support

- [Documentation](https://github.com/hieudoanm/mri-lab/tree/master/docs)
- [Issues](https://github.com/hieudoanm/mri-lab/issues)
- [Security](https://github.com/hieudoanm/mri-lab/SECURITY.md)

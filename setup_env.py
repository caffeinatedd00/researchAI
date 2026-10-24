#!/usr/bin/env python3
"""Creates a local .env with your API key (works on Windows, macOS and Linux)."""
import getpass, os, subprocess, sys

os.chdir(os.path.dirname(os.path.abspath(__file__)))

if os.path.exists(".env"):
    print(".env already exists, leaving it alone.")
else:
    key = getpass.getpass("Paste your API key (input is hidden): ").strip()
    if not key:
        sys.exit("No key entered.")
    fd = os.open(".env", os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, "w") as f:
        f.write(f"VITE_GEMINI_API_KEY={key}\n")
    print("Created .env.")

if os.path.isdir(".git"):
    try:
        os.chmod("hooks/pre-commit", 0o755)
    except OSError:
        pass
    subprocess.run(["git", "config", "core.hooksPath", "hooks"], check=False)
    print("Commit guard turned on.")

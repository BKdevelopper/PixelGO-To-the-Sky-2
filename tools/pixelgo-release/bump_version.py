"""Passe le modpack à une nouvelle version (commande /updatemodpack).

Usage :
  python tools/pixelgo-release/bump_version.py        3.0 -> 3.1
  python tools/pixelgo-release/bump_version.py 4      -> 4.0
  python tools/pixelgo-release/bump_version.py 4.2    -> 4.2

Met à jour VERSION, le titre de la fenêtre (FancyMenu), le titre du changelog
du menu (lang en/fr), ajoute une section au CHANGELOG.md puis régénère
manifest.json et MODLIST.md.
"""
import re
import subprocess
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
VERSION_FILE = ROOT / "VERSION"
# (fichier, motif contenant la version) : le groupe 1 est conservé, la version remplacée.
VERSION_SPOTS = [
    ("config/fancymenu/options.txt", r"(custom_window_title = '.*?: v)\d+\.\d+"),
    ("kubejs/assets/pixelgo/lang/fr_fr.json", r'("pixelgo\.menu\.changelog_title": "[^"]*?v)\d+\.\d+'),
    ("kubejs/assets/pixelgo/lang/en_us.json", r'("pixelgo\.menu\.changelog_title": "[^"]*?v)\d+\.\d+'),
]


def next_version(current, requested):
    if requested is None:
        major, minor = (int(p) for p in current.split("."))
        return f"{major}.{minor + 1}"
    if not re.fullmatch(r"\d+(\.\d+)?", requested):
        sys.exit(f"Version invalide : {requested}")
    return requested if "." in requested else f"{requested}.0"


def replace_in_file(rel_path, pattern, version):
    path = ROOT / rel_path
    text = path.read_bytes().decode("utf-8")  # garde les fins de ligne d'origine
    new_text, count = re.subn(pattern, lambda m: m.group(1) + version, text)
    if count != 1:
        sys.exit(f"{rel_path} : {count} occurrence(s) trouvée(s), 1 attendue. Rien n'a été écrit.")
    return path, new_text


def add_changelog_section(version):
    path = ROOT / "CHANGELOG.md"
    text = path.read_text(encoding="utf-8")
    header = f"## v{version} — {date.today().isoformat()}"
    if header.split(" —")[0] in text:
        return
    marker = "\n## "
    pos = text.find(marker)
    section = f"{header}\n\n- \n"
    text = text[:pos + 1] + section + "\n" + text[pos + 1:] if pos != -1 else text + "\n" + section
    path.write_text(text, encoding="utf-8")


def main():
    current = VERSION_FILE.read_text(encoding="utf-8").strip()
    version = next_version(current, sys.argv[1] if len(sys.argv) > 1 else None)
    # On valide tous les fichiers avant d'écrire quoi que ce soit.
    updates = [replace_in_file(f, p, version) for f, p in VERSION_SPOTS]
    for path, text in updates:
        path.write_bytes(text.encode("utf-8"))
    VERSION_FILE.write_text(version + "\n", encoding="utf-8")
    add_changelog_section(version)
    subprocess.run([sys.executable, str(Path(__file__).with_name("modlist.py"))], check=True)
    print(f"v{current} -> v{version}")


if __name__ == "__main__":
    main()

"""Génère manifest.json (format CurseForge) et MODLIST.md depuis minecraftinstance.json.

Usage : python tools/pixelgo-release/modlist.py
Les .jar ne sont pas versionnés : ces deux fichiers suffisent à reconstruire le pack.
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PACK_NAME = "PixelGO - To the Sky 2"
AUTHOR = "Bilal"


def load_instance():
    path = ROOT / "minecraftinstance.json"
    if not path.is_file():
        sys.exit(f"Introuvable : {path}")
    return json.loads(path.read_text(encoding="utf-8"))


def folder_name(path):
    """'C:\\...\\mods' -> 'mods' (le chemin complet dépend du PC)."""
    return (path or "mods").replace("\\", "/").rstrip("/").split("/")[-1]


def collect_addons(instance):
    addons = []
    for addon in instance.get("installedAddons", []):
        file = addon.get("installedFile") or {}
        if not addon.get("addonID") or not file.get("id"):
            print(f"Ignoré (pas d'ID CurseForge) : {addon.get('name')}", file=sys.stderr)
            continue
        addons.append({
            "name": addon.get("name", "?"),
            "projectID": addon["addonID"],
            "fileID": file["id"],
            "fileName": file.get("fileName", ""),
            "url": addon.get("webSiteURL", ""),
            "folder": folder_name(addon.get("modFolderPath")),
            "enabled": bool(addon.get("isEnabled", True)),
        })
    return sorted(addons, key=lambda a: a["name"].lower())


def write_manifest(instance, addons, version):
    loader = (instance.get("baseModLoader") or {}).get("name", "")
    manifest = {
        "minecraft": {
            "version": instance.get("gameVersion", "1.21.1"),
            "modLoaders": [{"id": loader, "primary": True}],
        },
        "manifestType": "minecraftModpack",
        "manifestVersion": 1,
        "name": PACK_NAME,
        "version": version,
        "author": AUTHOR,
        "files": [
            {"projectID": a["projectID"], "fileID": a["fileID"], "required": a["enabled"]}
            for a in addons
        ],
        "overrides": "overrides",
    }
    text = json.dumps(manifest, indent=2, ensure_ascii=False) + "\n"
    (ROOT / "manifest.json").write_text(text, encoding="utf-8")


def write_modlist(addons, version):
    lines = [f"# {PACK_NAME} — v{version} : liste des contenus ({len(addons)})", "",
             "| Nom | Dossier | Fichier |", "|---|---|---|"]
    for a in addons:
        label = a["name"].replace("|", "\\|")
        name = f"[{label}]({a['url']})" if a["url"] else label
        disabled = " *(désactivé)*" if not a["enabled"] else ""
        lines.append(f"| {name}{disabled} | {a['folder']} | `{a['fileName']}` |")
    (ROOT / "MODLIST.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


def main():
    version = (ROOT / "VERSION").read_text(encoding="utf-8").strip()
    instance = load_instance()
    addons = collect_addons(instance)
    write_manifest(instance, addons, version)
    write_modlist(addons, version)
    print(f"manifest.json + MODLIST.md : {len(addons)} contenus, v{version}")


if __name__ == "__main__":
    main()

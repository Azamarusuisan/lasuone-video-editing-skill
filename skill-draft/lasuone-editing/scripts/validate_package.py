#!/usr/bin/env python3
import hashlib
import json
import re
import sys
import tempfile
from pathlib import Path


def local_link_errors(root: Path, sources: list[str]) -> list[str]:
    root = root.resolve()
    errors = []
    for name in sources:
        source = root / name
        for raw in re.findall(r"\]\(([^)]+)\)", source.read_text(encoding="utf-8")):
            link = raw.strip("<>").split("#", 1)[0]
            if not link or "://" in link:
                continue
            if Path(link).is_absolute():
                errors.append(f"absolute link rejected: {name}: {link}")
                continue
            target = (source.parent / link).resolve()
            try:
                target.relative_to(root)
            except ValueError:
                errors.append(f"link traversal rejected: {name}: {link}")
                continue
            if not target.exists():
                errors.append(f"missing linked reference: {name}: {link}")
    return errors


def validate(root: Path, check_core: bool = True) -> list[str]:
    root = root.resolve()
    core = ["SKILL.md", "references/status-and-gates.md", "references/formats.md", "references/assets-and-rights.md", "references/snapshot.json"]
    core_errors = [f"missing/unreadable: {name}" for name in core if not (root / name).is_file()]
    if check_core and core_errors:
        return core_errors
    if check_core and (link_errors := local_link_errors(root, [name for name in core if name.endswith(".md")])):
        return link_errors
    manifest_path = root / "references/learning/manifest.json"
    try:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError) as exc:
        return [f"manifest unreadable: {exc}"]
    if not isinstance(manifest, dict):
        return ["manifest top level must be an object"]
    files = manifest.get("files")
    if not isinstance(files, list) or not files:
        return ["manifest files must be a non-empty list"]
    errors = []
    for entry in files:
        if not isinstance(entry, dict):
            errors.append("manifest file entry is not an object")
            continue
        relative, expected = entry.get("path"), entry.get("sha256")
        if not isinstance(relative, str) or not isinstance(expected, str):
            errors.append("manifest entry lacks path or sha256")
            continue
        if Path(relative).is_absolute():
            errors.append(f"absolute path rejected: {relative}")
            continue
        target = (root / relative).resolve()
        try:
            target.relative_to(root)
        except ValueError:
            errors.append(f"path traversal rejected: {relative}")
            continue
        try:
            content = target.read_bytes()
        except OSError as exc:
            errors.append(f"missing/unreadable: {relative}: {exc}")
            continue
        if hashlib.sha256(content).hexdigest() != expected:
            errors.append(f"hash mismatch: {relative}")
        if target.suffix == ".json":
            try:
                json.loads(content)
            except (UnicodeError, json.JSONDecodeError) as exc:
                errors.append(f"invalid JSON: {relative}: {exc}")
    return errors


def self_check() -> int:
    with tempfile.TemporaryDirectory() as temp:
        root = Path(temp)
        folder = root / "references/learning"
        folder.mkdir(parents=True)
        good = b'{}\n'
        (folder / "good.json").write_bytes(good)
        manifest = {"files": [{"path": "references/learning/good.json", "sha256": hashlib.sha256(good).hexdigest()}]}
        manifest_path = folder / "manifest.json"
        manifest_path.write_text(json.dumps(manifest), encoding="utf-8")
        assert validate(root, check_core=False) == []
        manifest["files"][0]["path"] = "../../../outside.json"
        manifest_path.write_text(json.dumps(manifest), encoding="utf-8")
        assert any("path traversal" in error for error in validate(root, check_core=False))
        manifest["files"][0]["path"] = "references/learning/missing.json"
        manifest_path.write_text(json.dumps(manifest), encoding="utf-8")
        assert any("missing/unreadable" in error for error in validate(root, check_core=False))
        manifest_path.write_text("{", encoding="utf-8")
        assert any("manifest unreadable" in error for error in validate(root, check_core=False))
        for invalid in ([], None):
            manifest_path.write_text(json.dumps(invalid), encoding="utf-8")
            assert any("top level" in error for error in validate(root, check_core=False))
        manifest_path.write_text(json.dumps({"files": [{"path": "/absolute.json", "sha256": "0" * 64}]}), encoding="utf-8")
        assert any("absolute path" in error for error in validate(root, check_core=False))
        (root / "entry.md").write_text("[missing](missing.md)", encoding="utf-8")
        assert any("missing linked reference" in error for error in local_link_errors(root, ["entry.md"]))
    print("self_check=pass")
    return 0


def main() -> int:
    if len(sys.argv) == 2 and sys.argv[1] == "--self-check":
        return self_check()
    root = Path(sys.argv[1] if len(sys.argv) > 1 else Path(__file__).parents[1])
    errors = validate(root)
    print(f"structural_valid={'false' if errors else 'true'}")
    print("production_ready=false")
    print("production readiness validation is not implemented")
    for error in errors:
        print(f"- {error}")
    return 2 if errors else 0


if __name__ == "__main__":
    raise SystemExit(main())

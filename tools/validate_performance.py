#!/usr/bin/env python3
"""
Cross-platform validation tool inspired by validate-performance.sh.
Improvements:
- argparse CLI (thresholds, JSON output, verbose)
- modular functions with returnable checks
- asset counts, large-image and non-minified JS/CSS checks
- JSON output option
- exit codes: 0=OK, 1=Warning(s), 2=Error(s)

Usage:
    python tools/validate_performance.py [--root PATH] [--json] [--video-threshold MB] [--image-threshold KB] [--fail-on-warnings] [--verbose]

"""

from __future__ import annotations

import argparse
import builtins
import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List, Optional, Tuple


@dataclass
class CheckResult:
    name: str
    passed: bool
    message: str
    details: Optional[Dict] = None


def human_size(bytesize: int) -> str:
    if bytesize < 1024:
        return f"{bytesize} B"
    if bytesize < 1024**2:
        return f"{bytesize / 1024:.1f} KB"
    return f"{bytesize / (1024**2):.1f} MB"


def read_file_text(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8")
    except Exception:
        return path.read_text(encoding="latin-1")


# On Windows consoles, printing emojis may raise UnicodeEncodeError under cp1252.
# Patch `print` to a safe version that falls back to ASCII replacement where necessary.
_original_print = builtins.print


def _safe_print(*args, **kwargs):
    try:
        _original_print(*args, **kwargs)
    except UnicodeEncodeError:
        safe_args = []
        for a in args:
            if isinstance(a, str):
                safe_args.append(a.encode("ascii", "replace").decode("ascii"))
            else:
                safe_args.append(a)
        _original_print(*safe_args, **kwargs)


builtins.print = _safe_print


def count_pattern(text: str, pattern: str, flags=0) -> int:
    return len(re.findall(pattern, text, flags=flags))


def find_assets(html: str, root: Path) -> Dict[str, List[Path]]:
    assets: Dict[str, List[Path]] = {"images": [], "scripts": [], "styles": []}

    for match in re.finditer(
        r"<img[^>]+src=[\\\"']([^\\\"']+)[\\\"']", html, flags=re.I
    ):
        assets["images"].append((match.group(1)))

    for match in re.finditer(
        r"<script[^>]+src=[\\\"']([^\\\"']+)[\\\"']", html, flags=re.I
    ):
        assets["scripts"].append((match.group(1)))

    for match in re.finditer(
        r"<link[^>]+rel=[\\\"']stylesheet[\\\"'][^>]*href=[\\\"']([^\\\"']+)[\\\"']",
        html,
        flags=re.I,
    ):
        assets["styles"].append((match.group(1)))

    # Normalize to Path objects and filter external URLs
    normalized = {k: [] for k in assets}
    for k, paths in assets.items():
        for p in paths:
            if (
                p.startswith("http://")
                or p.startswith("https://")
                or p.startswith("//")
            ):
                continue
            # Remove leading / if any and join to root
            p_stripped = p.lstrip("/")
            normalized[k].append(root / p_stripped)
    return normalized


def gather_basic_checks(
    root: Path, *, html_path: Path, css_path: Optional[Path]
) -> Tuple[List[CheckResult], Dict]:
    results: List[CheckResult] = []
    report: Dict = {}

    html_text = read_file_text(html_path)
    css_text = read_file_text(css_path) if css_path and css_path.exists() else ""

    # Size checks
    html_size = html_path.stat().st_size
    css_size = css_path.stat().st_size if css_path and css_path.exists() else 0

    report["sizes"] = {
        "html": html_size,
        "css": css_size,
        "total": html_size + css_size,
    }

    results.append(
        CheckResult("HTML file present", True, f"index.html: {human_size(html_size)}")
    )
    if css_path and css_path.exists():
        results.append(
            CheckResult(
                "External CSS found", True, f"styles.css: {human_size(css_size)}"
            )
        )
    else:
        results.append(
            CheckResult("External CSS found", False, "No external CSS file found")
        )

    # SEO & semantics
    title_count = count_pattern(html_text, r"<title>.*?</title>", flags=re.I | re.S)
    meta_desc_count = count_pattern(html_text, r"name=\\\"description\\\"", flags=re.I)
    h1_count = count_pattern(html_text, r"<h1[^>]*>", flags=re.I)
    h2_count = count_pattern(html_text, r"<h2[^>]*>", flags=re.I)
    structured_data = count_pattern(html_text, r'"@type"', flags=re.I)

    report["seo"] = {
        "title": title_count,
        "meta_description": meta_desc_count,
        "h1": h1_count,
        "h2": h2_count,
        "structured_data": structured_data,
    }

    results.append(
        CheckResult("Title tags", title_count > 0, f"{title_count} title tag(s)")
    )
    results.append(
        CheckResult(
            "Meta description",
            meta_desc_count > 0,
            f"{meta_desc_count} meta description(s)",
        )
    )
    results.append(CheckResult("H1 presence", h1_count > 0, f"{h1_count} H1(s)"))

    # Accessibility
    skip_links = count_pattern(html_text, r"skip-link", flags=re.I)
    aria_labels = count_pattern(html_text, r"aria-label", flags=re.I)
    focus_visible = count_pattern(css_text, r"focus-visible", flags=re.I)
    reduced_motion = count_pattern(css_text, r"prefers-reduced-motion", flags=re.I)

    report["accessibility"] = {
        "skip_links": skip_links,
        "aria_labels": aria_labels,
        "focus_visible": focus_visible,
        "reduced_motion": reduced_motion,
    }

    results.append(
        CheckResult("Skip links", skip_links > 0, f"{skip_links} skip link(s)")
    )
    results.append(
        CheckResult("ARIA labels", aria_labels > 0, f"{aria_labels} aria-label(s)")
    )

    # Business features
    cta_primary = count_pattern(html_text, r"Agendar Consulta", flags=re.I)
    trust_signals = count_pattern(html_text, r"trust-signal", flags=re.I)
    testimonials = count_pattern(html_text, r"CFO", flags=re.I)
    insights_section = count_pattern(html_text, r"Insights Financieros", flags=re.I)

    report["business"] = {
        "cta_primary": cta_primary,
        "trust_signals": trust_signals,
        "testimonials": testimonials,
        "insights": insights_section,
    }

    results.append(
        CheckResult("Primary CTAs", cta_primary > 0, f"{cta_primary} CTA(s)")
    )

    return results, report


def gather_asset_checks(
    root: Path,
    html_text: str,
    *,
    image_threshold_kb: int,
    video_threshold_mb: int,
    verbose: bool,
) -> Tuple[List[CheckResult], Dict]:
    results: List[CheckResult] = []
    report: Dict = {"images": [], "scripts": [], "styles": []}

    assets = find_assets(html_text, root)

    # Images
    images = assets["images"]
    image_count = len(images)
    large_images = []
    for image_path in images:
        try:
            if isinstance(image_path, str):
                p = Path(image_path)
            else:
                p = Path(image_path)
            if p.exists():
                size = p.stat().st_size
                if size > (image_threshold_kb * 1024):
                    large_images.append(
                        {"path": str(p.relative_to(root)), "size": size}
                    )
            else:
                # Try without leading slash
                p2 = root / str(p)
                if p2.exists():
                    size = p2.stat().st_size
                    if size > (image_threshold_kb * 1024):
                        large_images.append(
                            {"path": str(p2.relative_to(root)), "size": size}
                        )
        except Exception:
            continue

    report["images"] = {
        "count": image_count,
        "large_images": large_images,
    }

    results.append(
        CheckResult(
            "Images found",
            image_count > 0,
            f"{image_count} image(s) found",
            details=report["images"],
        )
    )
    if large_images:
        results.append(
            CheckResult(
                "Large images",
                False,
                f"{len(large_images)} image(s) > {image_threshold_kb}KB",
                details={"items": large_images},
            )
        )
    else:
        results.append(
            CheckResult("Large images", True, f"No images > {image_threshold_kb}KB")
        )

    # Scripts
    scripts = assets["scripts"]
    non_minified = []
    for script_path in scripts:
        p = Path(script_path)
        # If external file path, check local path existence and name
        if p.exists():
            if ".min." not in p.name:
                non_minified.append(
                    {"path": str(p.relative_to(root)), "minified": False}
                )
        else:
            p2 = root / str(p.lstrip("/")) if isinstance(script_path, str) else p
            if p2.exists() and (".min." not in p2.name):
                non_minified.append(
                    {"path": str(p2.relative_to(root)), "minified": False}
                )

    report["scripts"] = {"total": len(scripts), "non_minified": non_minified}

    results.append(
        CheckResult("Script count", len(scripts) >= 0, f"{len(scripts)} script(s)")
    )
    if non_minified:
        results.append(
            CheckResult(
                "Non-minified scripts",
                False,
                f"{len(non_minified)} non-minified script(s)",
                details=report["scripts"],
            )
        )
    else:
        results.append(
            CheckResult(
                "Non-minified scripts",
                True,
                "All detectable scripts are minified or external",
            )
        )

    # Styles
    styles = assets["styles"]
    non_minified_css = []
    for style_path in styles:
        p = Path(style_path)
        if p.exists():
            if ".min." not in p.name:
                non_minified_css.append(
                    {"path": str(p.relative_to(root)), "minified": False}
                )
        else:
            p2 = root / str(p.lstrip("/")) if isinstance(style_path, str) else p
            if p2.exists() and (".min." not in p2.name):
                non_minified_css.append(
                    {"path": str(p2.relative_to(root)), "minified": False}
                )

    report["styles"] = {"total": len(styles), "non_minified": non_minified_css}

    results.append(
        CheckResult("Style count", len(styles) >= 0, f"{len(styles)} stylesheet(s)")
    )
    if non_minified_css:
        results.append(
            CheckResult(
                "Non-minified CSS",
                False,
                f"{len(non_minified_css)} non-minified CSS file(s)",
                details=report["styles"],
            )
        )
    else:
        results.append(
            CheckResult(
                "Non-minified CSS", True, "All detectable CSS are minified or external"
            )
        )

    # Video check (scan for video.mp4 or similar in assets folder)
    video_candidates = (
        list((root / "assets").glob("*.mp4")) if (root / "assets").exists() else []
    )
    oversized_videos = []
    for v in video_candidates:
        try:
            vs = v.stat().st_size
            if vs > (video_threshold_mb * 1024 * 1024):
                oversized_videos.append({"path": str(v.relative_to(root)), "size": vs})
        except Exception:
            continue

    report["videos"] = {
        "candidates": [str(p.relative_to(root)) for p in video_candidates],
        "oversized": oversized_videos,
    }

    if oversized_videos:
        results.append(
            CheckResult(
                "Oversized videos",
                False,
                f"{len(oversized_videos)} video(s) > {video_threshold_mb}MB",
                details=report["videos"],
            )
        )
    else:
        results.append(
            CheckResult(
                "Oversized videos",
                True,
                f"No videos > {video_threshold_mb}MB or none found",
            )
        )

    if verbose:
        # Attach lists to report
        report["scripts_list"] = [str(p.relative_to(root)) for p in assets["scripts"]]
        report["styles_list"] = [str(p.relative_to(root)) for p in assets["styles"]]
        report["images_list"] = [str(p.relative_to(root)) for p in assets["images"]]

    return results, report


def print_results(
    results: List[CheckResult], json_output: Optional[Dict] = None, *, verbose=False
):
    # Short console formatter
    for r in results:
        status = "✅" if r.passed else "⚠️"
        print(f"{status} {r.name}: {r.message}")
        if verbose and r.details:
            print(f"    details: {json.dumps(r.details, indent=2, ensure_ascii=False)}")

    if json_output is not None:
        print("\nJSON report:")
        print(json.dumps(json_output, ensure_ascii=False, indent=2))


def run_checks(
    root: Path, *, image_threshold_kb: int, video_threshold_mb: int, verbose: bool
) -> Tuple[List[CheckResult], Dict]:
    html_path = root / "index.html"
    css_path = root / "assets" / "styles.css"

    if not html_path.exists():
        return [CheckResult("index.html present", False, "index.html not found")], {}

    basic_results, report_basic = gather_basic_checks(
        root, html_path=html_path, css_path=css_path
    )
    html_text = read_file_text(html_path)
    asset_results, report_assets = gather_asset_checks(
        root,
        html_text,
        image_threshold_kb=image_threshold_kb,
        video_threshold_mb=video_threshold_mb,
        verbose=verbose,
    )

    # Flatten
    results = basic_results + asset_results

    # Enrich report with totals
    report: Dict = {
        "project_root": str(root),
        "basic": report_basic,
        "assets": report_assets,
    }

    return results, report


def parse_args(argv: Optional[List[str]] = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        prog="validate_performance.py", description="Cross-platform website validation"
    )
    parser.add_argument(
        "--root",
        type=Path,
        default=Path(__file__).resolve().parents[1],
        help="Project root path (default: repo root)",
    )
    parser.add_argument(
        "--json", action="store_true", help="Print a JSON report at the end"
    )
    parser.add_argument(
        "--video-threshold",
        type=int,
        default=5,
        help="Video threshold in MB (default 5 MB)",
    )
    parser.add_argument(
        "--image-threshold",
        type=int,
        default=200,
        help="Image threshold in KB (default 200 KB)",
    )
    parser.add_argument(
        "--fail-on-warnings",
        action="store_true",
        help="Exit with non-zero code if any warning exists",
    )
    parser.add_argument("--verbose", action="store_true", help="Verbose output")
    return parser.parse_args(argv)


def main(argv: Optional[List[str]] = None) -> int:
    args = parse_args(argv)
    root: Path = args.root
    if not root.exists():
        print(f"Error: root path not found: {root}")
        return 2

    results, report = run_checks(
        root,
        image_threshold_kb=args.image_threshold,
        video_threshold_mb=args.video_threshold,
        verbose=args.verbose,
    )

    # Collect warnings and errors
    errors = [r for r in results if not r.passed]

    if args.json:
        # Convert results to JSON friendly structure
        j = {
            "results": [
                {
                    "name": r.name,
                    "passed": r.passed,
                    "message": r.message,
                    "details": r.details,
                }
                for r in results
            ],
            "report": report,
        }
        print(json.dumps(j, indent=2, ensure_ascii=False))

    else:
        print_results(results, None, verbose=args.verbose)

    if errors:
        print(f"\n⚠️  Found {len(errors)} warning(s)/error(s)")
        return 1 if args.fail_on_warnings else 0

    print("\n✅ All checks passed")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

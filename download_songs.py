#!/usr/bin/env python3
"""
JioSaavn Song Downloader
Uses the public saavn.dev API - no Docker or local server needed.

Usage:
  python download_songs.py                   # Interactive menu
  python download_songs.py --query "Arijit Singh"
  python download_songs.py --link "https://www.jiosaavn.com/song/houdini/OgwhbhtDRwM"
  python download_songs.py --output music --quality 160kbps
"""

import os, re, sys, json, time, argparse, urllib.request, urllib.parse, urllib.error
from pathlib import Path

API_BASE = "http://localhost:3000/api"
DOWNLOAD_DIR = Path("downloads")
QUALITY = "320kbps"
MAX_RESULTS = 10


def sanitize(name):
    return re.sub(r'[<>:"/\\|?*]', "", name).strip()


def pick_url(urls, quality=None):
    q = quality or QUALITY
    order = ["320kbps", "160kbps", "96kbps", "48kbps", "12kbps"]
    m = {i["quality"]: i["url"] for i in urls if i.get("url")}
    if q in m:
        return m[q]
    for o in order:
        if o in m:
            return m[o]
    return None


def api_get(path, params=None):
    url = f"{API_BASE}/{path}"
    if params:
        url += "?" + urllib.parse.urlencode(params)
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=30) as r:
            return json.loads(r.read())
    except Exception as e:
        print(f"  ERR: {e}")
        return {}


def dl_file(url, path):
    if path.exists():
        print(f"  -- Skipping (exists): {path.name}")
        return True
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".tmp")
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=60) as r:
            total = int(r.headers.get("Content-Length", 0))
            done = 0
            with open(tmp, "wb") as f:
                while True:
                    chunk = r.read(65536)
                    if not chunk:
                        break
                    f.write(chunk)
                    done += len(chunk)
                    if total:
                        p = done * 20 // total
                        bar = "#" * p + "." * (20 - p)
                        pct = done * 100 // total
                        print(f"\r  [{bar}] {pct}%", end="", flush=True)
        tmp.rename(path)
        print(f"\r  OK  {path.name:<65}")
        return True
    except Exception as e:
        print(f"\n  ERR downloading: {e}")
        if tmp.exists():
            tmp.unlink()
        return False


def dl_song(song, folder):
    name = sanitize(song.get("name", "Unknown"))
    arts = ", ".join(a["name"] for a in song.get("artists", {}).get("primary", []))
    fname = f"{name} - {arts}.mp4" if arts else f"{name}.mp4"
    url = pick_url(song.get("downloadUrl", []))
    if not url:
        print(f"  -- No download URL for: {name}")
        return False
    print(f"\n  Downloading: {name} - {arts} [{QUALITY}]")
    return dl_file(url, folder / fname)


def do_search(query):
    print(f"\nSearching: {query!r} ...")
    d = api_get("search/songs", {"query": query, "limit": str(MAX_RESULTS)})
    results = d.get("data", {}).get("results", [])
    if not results:
        print("  No results found.")
        return
    print(f"\nFound {len(results)} songs:\n")
    for i, s in enumerate(results, 1):
        n = s.get("name", "?")
        a = ", ".join(x["name"] for x in s.get("artists", {}).get("primary", []))
        dur = int(s.get("duration") or 0)
        print(f"  [{i:2}] {n} - {a}  ({dur//60}:{dur%60:02d})")
    sel = input("\nEnter numbers to download (e.g. 1 3 5), a=all, q=quit: ").strip().lower()
    if sel == "q":
        return
    if sel == "a":
        songs = results
    else:
        songs = []
        for tok in sel.split():
            try:
                idx = int(tok) - 1
                if 0 <= idx < len(results):
                    songs.append(results[idx])
            except ValueError:
                pass
    DOWNLOAD_DIR.mkdir(parents=True, exist_ok=True)
    print(f"\nDownloading {len(songs)} song(s) to: {DOWNLOAD_DIR.resolve()}\n")
    for s in songs:
        dl_song(s, DOWNLOAD_DIR)
        time.sleep(0.3)


def do_link(link):
    link = link.strip()
    if "/song/" in link:
        print("\nFetching song...")
        d = api_get("songs", {"link": link})
        if not d.get("success"):
            print("  ERR: Could not fetch song.")
            return
        DOWNLOAD_DIR.mkdir(parents=True, exist_ok=True)
        for s in d.get("data", []):
            dl_song(s, DOWNLOAD_DIR)
    elif "/album/" in link:
        print("\nFetching album...")
        d = api_get("albums", {"link": link})
        if not d.get("success"):
            print("  ERR: Could not fetch album.")
            return
        data = d.get("data", {})
        folder = DOWNLOAD_DIR / sanitize(data.get("name", "Album"))
        folder.mkdir(parents=True, exist_ok=True)
        songs = data.get("songs", [])
        print(f"Album: {data.get('name')}  ({len(songs)} songs)")
        for s in songs:
            dl_song(s, folder)
            time.sleep(0.3)
    elif any(x in link for x in ["/featured/", "/playlist/", "/s/playlist/"]):
        print("\nFetching playlist...")
        d = api_get("playlists", {"link": link})
        if not d.get("success"):
            print("  ERR: Could not fetch playlist.")
            return
        data = d.get("data", {})
        folder = DOWNLOAD_DIR / sanitize(data.get("name", "Playlist"))
        folder.mkdir(parents=True, exist_ok=True)
        songs = data.get("songs", [])
        print(f"Playlist: {data.get('name')}  ({len(songs)} songs)")
        for s in songs:
            dl_song(s, folder)
            time.sleep(0.3)
    else:
        print("  ERR: Unknown URL type. Supported: /song/ /album/ /featured/ /playlist/")


def interactive():
    global DOWNLOAD_DIR, QUALITY
    print("\n" + "=" * 55)
    print("  JioSaavn Downloader  (API: saavn.dev)")
    print("=" * 55)
    while True:
        print(f"\n  Output folder : {DOWNLOAD_DIR.resolve()}")
        print(f"  Quality       : {QUALITY}")
        print("\n  [1] Search songs by name / artist")
        print("  [2] Download by JioSaavn URL (song/album/playlist)")
        print("  [3] Change output folder")
        print("  [4] Change audio quality")
        print("  [q] Quit")
        c = input("\n  Choice: ").strip().lower()
        if c == "1":
            q = input("  Search query: ").strip()
            if q:
                do_search(q)
        elif c == "2":
            u = input("  JioSaavn URL: ").strip()
            if u:
                do_link(u)
        elif c == "3":
            p = input("  New folder path: ").strip()
            if p:
                DOWNLOAD_DIR = Path(p)
                print(f"  Set to: {DOWNLOAD_DIR.resolve()}")
        elif c == "4":
            opts = ["12kbps", "48kbps", "96kbps", "160kbps", "320kbps"]
            print("  Options:", ", ".join(opts))
            q = input("  Quality: ").strip()
            if q in opts:
                QUALITY = q
                print(f"  Quality set to: {QUALITY}")
        elif c == "q":
            print("\n  Goodbye!\n")
            break
        else:
            print("  Invalid option.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Download songs from JioSaavn via saavn.dev API")
    parser.add_argument("--query", "-q", help="Search query (song, artist, album name)")
    parser.add_argument("--link", "-l", help="Direct JioSaavn URL (song, album, or playlist)")
    parser.add_argument("--output", "-o", default="downloads", help="Output folder (default: downloads/)")
    parser.add_argument("--quality", default="320kbps",
                        choices=["12kbps", "48kbps", "96kbps", "160kbps", "320kbps"],
                        help="Preferred audio quality (default: 320kbps)")
    args = parser.parse_args()

    DOWNLOAD_DIR = Path(args.output)
    QUALITY = args.quality

    if args.query:
        do_search(args.query)
    elif args.link:
        do_link(args.link)
    else:
        interactive()

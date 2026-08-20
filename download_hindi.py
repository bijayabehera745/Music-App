#!/usr/bin/env python3
"""
Hindi Bulk Song Downloader
Automatically downloads songs from top Hindi artists + trending charts.

Usage:
  python download_hindi.py                    # Download everything (all artists + trending)
  python download_hindi.py --limit 50         # Max 50 songs per artist
  python download_hindi.py --output hindi_music
  python download_hindi.py --quality 160kbps
  python download_hindi.py --artists-only     # Skip trending, only do artist songs
  python download_hindi.py --trending-only    # Skip artists, only do trending charts
"""

import os, re, json, time, argparse, urllib.request, urllib.parse, urllib.error, html
from pathlib import Path

# ── CONFIG ────────────────────────────────────────────────────────────────────
API_BASE   = "http://localhost:3000/api"
OUT_DIR    = Path("hindi_music")
QUALITY    = "320kbps"
PER_ARTIST = 100       # songs to fetch per artist (API may return fewer)
PER_TREND  = 50        # songs per trending query
DELAY      = 0.4       # polite delay between requests (seconds)

ARTISTS = [
    "Arijit Singh",
    "Shreya Ghoshal",
    "Sonu Nigam",
    "Udit Narayan",
    "Alka Yagnik",
    "Kumar Sanu",
    "Jagjit Singh",
    "S. P. Balasubrahmanyam",
    "K. J. Yesudas",
    "Sunidhi Chauhan",
    "KK Krishnakumar Kunnath",
    "Hariharan",
    "K. S. Chithra",
    "Manna Dey",
    "Kailash Kher",
    "Papon",
    "Atif Aslam",
]

TRENDING_QUERIES = [
    "hindi top hits 2024",
    "hindi top hits 2023",
    "hindi bollywood hits 2022",
    "best hindi songs 2021",
    "hindi romantic songs",
    "hindi sad songs popular",
    "hindi party songs hits",
    "hindi old classic songs",
    "hindi 90s superhits",
    "hindi 2000s hits",
    "bollywood blockbuster songs",
    "hindi melody songs",
]
# ─────────────────────────────────────────────────────────────────────────────


def sanitize(name):
    name = html.unescape(name)            # decode &quot; &#39; &amp; etc.
    return re.sub(r'[<>:"/\\|?*]', "", name).strip()


def pick_url(urls):
    order = ["320kbps", "160kbps", "96kbps", "48kbps", "12kbps"]
    m = {i["quality"]: i["url"] for i in urls if i.get("url")}
    if QUALITY in m:
        return m[QUALITY]
    for o in order:
        if o in m:
            return m[o]
    return None


def api_get(path, params=None, retries=3):
    url = f"{API_BASE}/{path}"
    if params:
        url += "?" + urllib.parse.urlencode(params)
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=30) as r:
                return json.loads(r.read())
        except urllib.error.HTTPError as e:
            if e.code == 429:
                print(f"    Rate limited - waiting 5s...")
                time.sleep(5)
            else:
                print(f"    HTTP {e.code} - skipping")
                return {}
        except Exception as e:
            if attempt < retries - 1:
                time.sleep(2)
            else:
                print(f"    Request failed: {e}")
    return {}


def dl_file(url, path):
    if path.exists():
        return "skip"
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(".tmp")
    # Remove any stale .tmp from a previous crashed run
    try:
        if tmp.exists():
            tmp.unlink()
    except Exception:
        pass
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
                        print(f"\r    [{bar}] {pct:3d}%", end="", flush=True)
        # Retry rename — Windows Defender / AV may briefly lock new files
        for attempt in range(8):
            try:
                os.replace(str(tmp), str(path))
                break
            except FileExistsError:
                # .mp4 appeared between our exists-check and rename (race); treat as skip
                try:
                    tmp.unlink()
                except Exception:
                    pass
                print(f"\r    --  Already exists (race), skipping")
                return "skip"
            except PermissionError:
                if attempt == 7:
                    raise
                time.sleep(0.5)   # wait for AV to release lock
        print(f"\r    OK  {path.name:<65}")
        return "ok"
    except Exception as e:
        print(f"\n    ERR: {e}")
        try:
            if tmp.exists():
                tmp.unlink()
        except Exception:
            pass
        return "err"


def dl_song(song, folder, downloaded_ids):
    sid = song.get("id", "")

    # Build normalized dedup key: (title, frozenset of artist names)
    # This catches the same song appearing with artists in a different order
    raw_name = sanitize(song.get("name", "Unknown"))
    primary_artists = song.get("artists", {}).get("primary", [])
    artist_set = frozenset(html.unescape(a["name"]) for a in primary_artists)
    norm_key = (raw_name.lower(), artist_set)

    if sid in downloaded_ids or norm_key in downloaded_ids:
        return "dup"
    downloaded_ids.add(sid)
    downloaded_ids.add(norm_key)

    name = raw_name
    # Sort artists alphabetically so filename is stable regardless of API return order
    arts = ", ".join(sorted(html.unescape(a["name"]) for a in primary_artists))
    fname = f"{name} - {arts}.mp4" if arts else f"{name}.mp4"
    url = pick_url(song.get("downloadUrl", []))
    if not url:
        return "no_url"
    return dl_file(url, folder / fname)


def search_songs(query, limit=50):
    d = api_get("search/songs", {"query": query, "limit": str(limit), "page": "1"})
    return d.get("data", {}).get("results", [])


def bulk_search(query, limit=100):
    """Paginate through search results to get up to `limit` songs."""
    songs = []
    page = 1
    per_page = 50
    while len(songs) < limit:
        d = api_get("search/songs", {"query": query, "limit": str(per_page), "page": str(page)})
        batch = d.get("data", {}).get("results", [])
        if not batch:
            break
        songs.extend(batch)
        if len(batch) < per_page:
            break
        page += 1
        time.sleep(DELAY)
    return songs[:limit]


def download_artist(artist, folder, downloaded_ids, limit):
    print(f"\n{'='*60}")
    print(f"  Artist: {artist}")
    print(f"{'='*60}")
    songs = bulk_search(artist, limit)
    if not songs:
        print(f"  No songs found for {artist}")
        return 0, 0, 0

    ok = skip = err = 0
    for i, song in enumerate(songs, 1):
        name = sanitize(song.get("name", "?"))
        arts = ", ".join(sorted(html.unescape(a["name"]) for a in song.get("artists", {}).get("primary", [])))
        print(f"  [{i:3}/{len(songs)}] {name} - {arts}")
        result = dl_song(song, folder, downloaded_ids)
        if result == "ok":
            ok += 1
        elif result in ("skip", "dup"):
            skip += 1
        else:
            err += 1
        time.sleep(DELAY)
    return ok, skip, err


def download_trending(folder, downloaded_ids, limit):
    print(f"\n{'='*60}")
    print(f"  Trending Hindi Songs")
    print(f"{'='*60}")
    ok = skip = err = 0
    for query in TRENDING_QUERIES:
        print(f"\n  -- Query: {query!r}")
        songs = bulk_search(query, limit)
        for i, song in enumerate(songs, 1):
            name = sanitize(song.get("name", "?"))
            arts = ", ".join(sorted(html.unescape(a["name"]) for a in song.get("artists", {}).get("primary", [])))
            print(f"    [{i:3}/{len(songs)}] {name} - {arts}")
            result = dl_song(song, folder, downloaded_ids)
            if result == "ok":
                ok += 1
            elif result in ("skip", "dup"):
                skip += 1
            else:
                err += 1
            time.sleep(DELAY)
    return ok, skip, err


def main():
    parser = argparse.ArgumentParser(description="Bulk download top Hindi songs from JioSaavn")
    parser.add_argument("--output", "-o", default="hindi_music",
                        help="Output folder (default: hindi_music)")
    parser.add_argument("--quality", default="320kbps",
                        choices=["12kbps", "48kbps", "96kbps", "160kbps", "320kbps"],
                        help="Audio quality (default: 320kbps)")
    parser.add_argument("--limit", type=int, default=100,
                        help="Max songs per artist/query (default: 100)")
    parser.add_argument("--artists-only", action="store_true",
                        help="Download only artist songs, skip trending")
    parser.add_argument("--trending-only", action="store_true",
                        help="Download only trending, skip artists")
    args = parser.parse_args()

    global OUT_DIR, QUALITY, PER_ARTIST, PER_TREND
    OUT_DIR    = Path(args.output)
    QUALITY    = args.quality
    PER_ARTIST = args.limit
    PER_TREND  = args.limit

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    downloaded_ids = set()

    total_ok = total_skip = total_err = 0

    print(f"""
============================================================
  Hindi Bulk Song Downloader
  Output  : {OUT_DIR.resolve()}
  Quality : {QUALITY}
  Limit   : {args.limit} songs per source
============================================================""")

    if not args.trending_only:
        for artist in ARTISTS:
            artist_folder = OUT_DIR / sanitize(artist)
            ok, skip, err = download_artist(artist, artist_folder, downloaded_ids, PER_ARTIST)
            total_ok += ok; total_skip += skip; total_err += err
            print(f"  Summary: {ok} downloaded, {skip} skipped, {err} errors")

    if not args.artists_only:
        trend_folder = OUT_DIR / "_Trending"
        ok, skip, err = download_trending(trend_folder, downloaded_ids, PER_TREND)
        total_ok += ok; total_skip += skip; total_err += err
        print(f"\n  Trending Summary: {ok} downloaded, {skip} skipped, {err} errors")

    print(f"""
============================================================
  DONE!
  Total downloaded : {total_ok}
  Total skipped    : {total_skip}
  Total errors     : {total_err}
  Saved to         : {OUT_DIR.resolve()}
============================================================""")


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
Download relevant documents (PDFs, DOCs, etc.) from grant URLs.

For each grant in the database, visits the grant's url, portalUrl, and faqUrl,
finds linked document files, and downloads them to grant-docs/{grantId}/.
Registers downloaded files in the app's Document table via the API.

Usage:
    python3 download_grant_docs.py [--api-base http://localhost:3009]
"""

import os
import re
import sys
import sqlite3
import hashlib
import argparse
import urllib.parse
from pathlib import Path

try:
    import requests
    from bs4 import BeautifulSoup
except ImportError:
    print("Installing required packages...")
    os.system(f"{sys.executable} -m pip install requests beautifulsoup4 -q")
    import requests
    from bs4 import BeautifulSoup

# ─── Config ────────────────────────────────────────────────
SCRIPT_DIR = Path(__file__).parent
DB_PATH = SCRIPT_DIR / "dev.db"
DOCS_DIR = SCRIPT_DIR / "grant-docs"
EXTENSIONS = {'.pdf', '.doc', '.docx', '.xlsx', '.xls', '.pptx', '.ppt', '.odt', '.ods', '.odp', '.rtf'}
HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB limit


def get_grants():
    """Fetch all grants from the SQLite database."""
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    cursor = conn.execute("SELECT id, name, url, portalUrl, faqUrl FROM Grant WHERE archived = 0")
    grants = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return grants


def get_existing_docs(grant_id):
    """Get filenames of documents already downloaded for this grant."""
    conn = sqlite3.connect(str(DB_PATH))
    cursor = conn.execute("SELECT filename FROM Document WHERE grantId = ?", (grant_id,))
    existing = {row[0] for row in cursor.fetchall()}
    conn.close()
    return existing


def find_document_links(url, base_url=None):
    """Scrape a page for document links (PDFs, DOCs, etc.)."""
    if not url or not url.startswith('http'):
        return []
    
    try:
        resp = requests.get(url, headers=HEADERS, timeout=15, allow_redirects=True)
        resp.raise_for_status()
    except Exception as e:
        print(f"    ⚠ Could not fetch {url}: {e}")
        return []
    
    soup = BeautifulSoup(resp.text, 'html.parser')
    links = []
    
    for a in soup.find_all('a', href=True):
        href = a['href'].strip()
        # Resolve relative URLs
        abs_url = urllib.parse.urljoin(url, href)
        parsed = urllib.parse.urlparse(abs_url)
        path_lower = parsed.path.lower()
        
        # Check if the link points to a document
        ext = os.path.splitext(path_lower)[1]
        if ext in EXTENSIONS:
            label = a.get_text(strip=True) or os.path.basename(parsed.path)
            links.append({
                'url': abs_url,
                'ext': ext,
                'label': label,
                'filename': os.path.basename(parsed.path)
            })
    
    # Also check for links with document-like query params (e.g., ?file=xxx.pdf)
    for a in soup.find_all('a', href=True):
        href = a['href'].strip()
        abs_url = urllib.parse.urljoin(url, href)
        parsed = urllib.parse.urlparse(abs_url)
        query = urllib.parse.parse_qs(parsed.query)
        for key, vals in query.items():
            for val in vals:
                ext = os.path.splitext(val.lower())[1]
                if ext in EXTENSIONS:
                    links.append({
                        'url': abs_url,
                        'ext': ext,
                        'label': a.get_text(strip=True) or val,
                        'filename': val
                    })
    
    # Deduplicate by URL
    seen = set()
    unique = []
    for link in links:
        if link['url'] not in seen:
            seen.add(link['url'])
            unique.append(link)
    
    return unique


def download_file(url, dest_path):
    """Download a file from a URL to the destination path."""
    try:
        resp = requests.get(url, headers=HEADERS, timeout=30, stream=True, allow_redirects=True)
        resp.raise_for_status()
        
        # Check content length
        content_length = resp.headers.get('content-length')
        if content_length and int(content_length) > MAX_FILE_SIZE:
            print(f"    ⚠ File too large ({int(content_length) / 1e6:.1f} MB), skipping")
            return False
        
        # Check content type - skip HTML pages that pretend to be PDFs
        content_type = resp.headers.get('content-type', '')
        if 'text/html' in content_type and dest_path.suffix == '.pdf':
            print(f"    ⚠ Got HTML instead of PDF, skipping")
            return False
        
        with open(dest_path, 'wb') as f:
            total = 0
            for chunk in resp.iter_content(chunk_size=8192):
                total += len(chunk)
                if total > MAX_FILE_SIZE:
                    print(f"    ⚠ File exceeds size limit, aborting")
                    f.close()
                    dest_path.unlink(missing_ok=True)
                    return False
                f.write(chunk)
        
        return True
    except Exception as e:
        print(f"    ⚠ Download failed: {e}")
        return False


def register_document(api_base, grant_id, filepath, original_name, label):
    """Register a downloaded document via the app's API."""
    try:
        with open(filepath, 'rb') as f:
            files = {'file': (original_name, f)}
            data = {'grantId': grant_id, 'label': label}
            resp = requests.post(f"{api_base}/api/grant-docs", files=files, data=data, timeout=30)
            if resp.status_code == 200:
                return True
            else:
                print(f"    ⚠ API registration failed: {resp.status_code} {resp.text[:200]}")
                return False
    except Exception as e:
        print(f"    ⚠ API registration error: {e}")
        return False


def sanitize_filename(name):
    """Clean up a filename for safe filesystem storage."""
    # Remove query params
    name = name.split('?')[0]
    # Replace unsafe chars
    name = re.sub(r'[^a-zA-Z0-9._\-() ]', '_', name)
    # Collapse multiple underscores
    name = re.sub(r'_+', '_', name)
    # Limit length
    if len(name) > 200:
        base, ext = os.path.splitext(name)
        name = base[:200-len(ext)] + ext
    return name


def main():
    parser = argparse.ArgumentParser(description='Download grant documents')
    parser.add_argument('--api-base', default='http://localhost:3009', help='App API base URL')
    parser.add_argument('--dry-run', action='store_true', help='List files without downloading')
    args = parser.parse_args()
    
    if not DB_PATH.exists():
        print(f"❌ Database not found at {DB_PATH}")
        sys.exit(1)
    
    grants = get_grants()
    print(f"\n📋 Found {len(grants)} active grants\n")
    
    total_downloaded = 0
    total_skipped = 0
    total_failed = 0
    
    for grant in grants:
        name = grant['name']
        grant_id = grant['id']
        urls = [grant['url'], grant['portalUrl'], grant['faqUrl']]
        urls = [u for u in urls if u and u.startswith('http')]
        
        if not urls:
            print(f"⏭  {name}: no URLs, skipping")
            continue
        
        print(f"🔍 {name}")
        
        existing = get_existing_docs(grant_id)
        grant_dir = DOCS_DIR / grant_id
        
        all_links = []
        for url in urls:
            print(f"  📡 Scanning {url}")
            links = find_document_links(url)
            all_links.extend(links)
        
        if not all_links:
            print(f"  📭 No document links found")
            continue
        
        print(f"  📎 Found {len(all_links)} document link(s)")
        
        for link in all_links:
            filename = sanitize_filename(link['filename'])
            
            if filename in existing:
                print(f"  ✅ Already have: {filename}")
                total_skipped += 1
                continue
            
            if args.dry_run:
                print(f"  📄 [DRY RUN] Would download: {filename} from {link['url']}")
                continue
            
            # Download
            grant_dir.mkdir(parents=True, exist_ok=True)
            dest = grant_dir / filename
            
            print(f"  ⬇️  Downloading: {filename}")
            if download_file(link['url'], dest):
                size_kb = dest.stat().st_size / 1024
                print(f"  ✅ Saved ({size_kb:.0f} KB)")
                
                # Register via API
                if register_document(args.api_base, grant_id, dest, link['filename'], link['label']):
                    print(f"  📝 Registered in app")
                    total_downloaded += 1
                else:
                    total_downloaded += 1  # file saved even if API fails
            else:
                total_failed += 1
    
    print(f"\n{'='*50}")
    print(f"📊 Summary:")
    print(f"   Downloaded: {total_downloaded}")
    print(f"   Skipped (existing): {total_skipped}")
    print(f"   Failed: {total_failed}")
    print(f"{'='*50}\n")


if __name__ == '__main__':
    main()

# file_reader.py - Reads articles from files (HTML, TXT, PDF)
# This lets you import articles from a folder instead of pasting them

import os
from pathlib import Path
from bs4 import BeautifulSoup
from PyPDF2 import PdfReader


def read_file(file_path):
    """
    Read an article from a file. Supports .html, .txt, and .pdf files.

    Returns a dictionary with:
    - content: The extracted text
    - title: The title (if found in HTML) or filename
    - success: True/False
    - error: Error message if failed
    """
    path = Path(file_path)

    if not path.exists():
        return {"success": False, "error": f"File not found: {file_path}"}

    extension = path.suffix.lower()

    if extension == ".html" or extension == ".htm":
        return read_html(path)
    elif extension == ".txt":
        return read_txt(path)
    elif extension == ".pdf":
        return read_pdf(path)
    else:
        return {"success": False, "error": f"Unsupported file type: {extension}. Use .html, .txt, or .pdf"}


def read_html(path):
    """Extract article text from an HTML file (saved webpage)."""
    try:
        with open(path, "r", encoding="utf-8", errors="ignore") as f:
            html_content = f.read()

        soup = BeautifulSoup(html_content, "html.parser")

        # Try to get the title from the HTML
        title = None
        if soup.title:
            title = soup.title.string

        # Remove script and style elements (they're not article content)
        for element in soup(["script", "style", "nav", "header", "footer", "aside"]):
            element.decompose()

        # Try to find the main article content
        # News sites often use <article> tags or specific classes
        article = soup.find("article")
        if article:
            text = article.get_text(separator="\n", strip=True)
        else:
            # Fall back to the body content
            body = soup.find("body")
            if body:
                text = body.get_text(separator="\n", strip=True)
            else:
                text = soup.get_text(separator="\n", strip=True)

        # Clean up the text (remove excessive blank lines)
        lines = [line.strip() for line in text.split("\n") if line.strip()]
        clean_text = "\n\n".join(lines)

        return {
            "success": True,
            "content": clean_text,
            "title": title or path.stem,  # Use filename if no title found
            "source_file": str(path)
        }

    except Exception as e:
        return {"success": False, "error": f"Failed to read HTML: {str(e)}"}


def read_txt(path):
    """Read article text from a plain text file."""
    try:
        with open(path, "r", encoding="utf-8", errors="ignore") as f:
            content = f.read().strip()

        # Use the first line as title if it looks like a headline
        lines = content.split("\n")
        title = lines[0] if lines else path.stem

        # If first line is short (likely a title), use it
        if len(title) < 200:
            title = title.strip()
        else:
            title = path.stem  # Use filename instead

        return {
            "success": True,
            "content": content,
            "title": title,
            "source_file": str(path)
        }

    except Exception as e:
        return {"success": False, "error": f"Failed to read TXT: {str(e)}"}


def read_pdf(path):
    """Extract text from a PDF file."""
    try:
        reader = PdfReader(str(path))

        # Extract text from all pages
        text_parts = []
        for page in reader.pages:
            page_text = page.extract_text()
            if page_text:
                text_parts.append(page_text)

        content = "\n\n".join(text_parts)

        if not content.strip():
            return {
                "success": False,
                "error": "Could not extract text from PDF. It may be a scanned image."
            }

        # Try to use first line as title
        lines = content.split("\n")
        title = lines[0].strip() if lines else path.stem
        if len(title) > 200:
            title = path.stem

        return {
            "success": True,
            "content": content,
            "title": title,
            "source_file": str(path)
        }

    except Exception as e:
        return {"success": False, "error": f"Failed to read PDF: {str(e)}"}


def scan_folder(folder_path):
    """
    Scan a folder for article files (.html, .txt, .pdf).

    Returns a list of file paths that can be imported.
    """
    path = Path(folder_path)

    if not path.exists():
        return {"success": False, "error": f"Folder not found: {folder_path}"}

    if not path.is_dir():
        return {"success": False, "error": f"Not a folder: {folder_path}"}

    # Find all supported files
    supported_extensions = {".html", ".htm", ".txt", ".pdf"}
    files = []

    for file in path.iterdir():
        if file.is_file() and file.suffix.lower() in supported_extensions:
            files.append({
                "path": str(file),
                "name": file.name,
                "type": file.suffix.lower()
            })

    # Sort by name
    files.sort(key=lambda x: x["name"])

    return {
        "success": True,
        "files": files,
        "count": len(files)
    }


def guess_source_from_filename(filename):
    """
    Try to guess the news source from the filename.
    Common patterns: 'cnn-article.html', 'Fox News - headline.pdf', etc.
    """
    filename_lower = filename.lower()

    # Common news sources to look for
    sources = {
        "cnn": "CNN",
        "fox": "Fox News",
        "foxnews": "Fox News",
        "bbc": "BBC",
        "nytimes": "New York Times",
        "nyt": "New York Times",
        "washingtonpost": "Washington Post",
        "wapo": "Washington Post",
        "reuters": "Reuters",
        "ap": "Associated Press",
        "apnews": "Associated Press",
        "msnbc": "MSNBC",
        "npr": "NPR",
        "wsj": "Wall Street Journal",
        "guardian": "The Guardian",
        "huffpost": "HuffPost",
        "breitbart": "Breitbart",
        "politico": "Politico",
        "axios": "Axios",
        "thehill": "The Hill",
    }

    for key, name in sources.items():
        if key in filename_lower:
            return name

    return None  # Couldn't guess

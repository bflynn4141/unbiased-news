# storage.py - Handles saving and loading articles from a local file
# Think of this as a simple database that stores articles as a JSON file

import json
import os
from datetime import datetime
from pathlib import Path
import uuid


# Where articles are stored (in a "data" folder in the project)
DATA_DIR = Path(__file__).parent.parent / "data"
ARTICLES_FILE = DATA_DIR / "articles.json"
STORIES_FILE = DATA_DIR / "stories.json"


def ensure_data_dir():
    """Create the data folder if it doesn't exist"""
    DATA_DIR.mkdir(exist_ok=True)


def load_articles():
    """
    Load all saved articles from the file.
    Returns an empty list if no articles have been saved yet.
    """
    ensure_data_dir()
    if not ARTICLES_FILE.exists():
        return []

    with open(ARTICLES_FILE, "r") as f:
        return json.load(f)


def save_articles(articles):
    """Save the list of articles to the file"""
    ensure_data_dir()
    with open(ARTICLES_FILE, "w") as f:
        json.dump(articles, f, indent=2)


def add_article(title, source, content, url=None, story_id=None):
    """
    Add a new article to storage.

    Parameters:
    - title: The headline of the article
    - source: Where it came from (e.g., "CNN", "Fox News", "BBC")
    - content: The full text of the article
    - url: Optional link to the original article
    - story_id: Optional ID to link this article to a story group

    Returns the newly created article with its unique ID
    """
    articles = load_articles()

    # Create a new article with a unique ID and timestamp
    new_article = {
        "id": str(uuid.uuid4())[:8],  # Short unique ID like "a1b2c3d4"
        "title": title,
        "source": source,
        "content": content,
        "url": url,
        "story_id": story_id,
        "added_at": datetime.now().isoformat(),
        "bias_score": None,  # Will be filled in during analysis
        "bias_analysis": None,  # Detailed analysis from Claude
    }

    articles.append(new_article)
    save_articles(articles)

    return new_article


def get_article(article_id):
    """Get a specific article by its ID"""
    articles = load_articles()
    for article in articles:
        if article["id"] == article_id:
            return article
    return None


def delete_article(article_id):
    """Remove an article from storage"""
    articles = load_articles()
    articles = [a for a in articles if a["id"] != article_id]
    save_articles(articles)


def update_article(article_id, updates):
    """
    Update an existing article with new data.
    Used to add bias scores after analysis.
    """
    articles = load_articles()
    for article in articles:
        if article["id"] == article_id:
            article.update(updates)
            break
    save_articles(articles)


# --- Story Management ---
# A "story" groups multiple articles about the same topic together

def load_stories():
    """Load all story groups"""
    ensure_data_dir()
    if not STORIES_FILE.exists():
        return []

    with open(STORIES_FILE, "r") as f:
        return json.load(f)


def save_stories(stories):
    """Save story groups to file"""
    ensure_data_dir()
    with open(STORIES_FILE, "w") as f:
        json.dump(stories, f, indent=2)


def create_story(name, description=None):
    """
    Create a new story group.

    A "story" is a topic or event (e.g., "2024 Election Results").
    You can then add multiple articles from different sources to the same story.
    """
    stories = load_stories()

    new_story = {
        "id": str(uuid.uuid4())[:8],
        "name": name,
        "description": description,
        "created_at": datetime.now().isoformat(),
    }

    stories.append(new_story)
    save_stories(stories)

    return new_story


def get_story(story_id):
    """Get a specific story by ID"""
    stories = load_stories()
    for story in stories:
        if story["id"] == story_id:
            return story
    return None


def get_story_articles(story_id):
    """Get all articles that belong to a specific story"""
    articles = load_articles()
    return [a for a in articles if a.get("story_id") == story_id]


def list_stories_with_counts():
    """Get all stories with a count of how many articles each has"""
    stories = load_stories()
    articles = load_articles()

    result = []
    for story in stories:
        article_count = len([a for a in articles if a.get("story_id") == story["id"]])
        result.append({**story, "article_count": article_count})

    return result

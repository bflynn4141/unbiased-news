#!/usr/bin/env python3
# cli.py - The main command-line interface for Unbiased News
# Run this file to interact with the app

import click
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.prompt import Prompt, Confirm
from rich import print as rprint

from . import storage
from . import analyzer
from . import comparer
from . import file_reader

# Console is used for pretty-printing output
console = Console()


@click.group()
def cli():
    """
    Unbiased News - Compare news articles and detect bias.

    A tool to help you see how different news sources cover the same story.
    """
    pass


# --- Article Commands ---

@cli.command()
def add():
    """
    Add a new article manually.

    This will prompt you to enter the article details step by step.
    """
    console.print("\n[bold blue]📰 Add a New Article[/bold blue]\n")

    # Get article details from the user
    title = Prompt.ask("[bold]Article headline/title[/bold]")

    source = Prompt.ask(
        "[bold]News source[/bold]",
        default="Unknown"
    )

    # Show a hint about pasting multi-line content
    console.print(
        "\n[dim]Tip: Paste the article text below. "
        "When done, press Enter twice on an empty line.[/dim]\n"
    )

    console.print("[bold]Article content[/bold] (paste below):")

    # Collect multi-line input
    lines = []
    empty_line_count = 0
    while True:
        try:
            line = input()
            if line == "":
                empty_line_count += 1
                if empty_line_count >= 2:
                    break
                lines.append(line)
            else:
                empty_line_count = 0
                lines.append(line)
        except EOFError:
            break

    content = "\n".join(lines).strip()

    if not content:
        console.print("[red]No content provided. Article not saved.[/red]")
        return

    url = Prompt.ask(
        "[bold]URL (optional)[/bold]",
        default=""
    ) or None

    # Ask if this should be linked to a story
    story_id = None
    stories = storage.list_stories_with_counts()

    if stories:
        console.print("\n[bold]Link to existing story?[/bold]")
        for i, story in enumerate(stories, 1):
            console.print(f"  {i}. {story['name']} ({story['article_count']} articles)")
        console.print(f"  {len(stories) + 1}. Create new story")
        console.print(f"  {len(stories) + 2}. No story (standalone article)")

        choice = Prompt.ask(
            "Choose option",
            default=str(len(stories) + 2)
        )

        try:
            choice_num = int(choice)
            if 1 <= choice_num <= len(stories):
                story_id = stories[choice_num - 1]["id"]
            elif choice_num == len(stories) + 1:
                # Create new story
                story_name = Prompt.ask("New story name")
                new_story = storage.create_story(story_name)
                story_id = new_story["id"]
                console.print(f"[green]Created story: {story_name}[/green]")
        except ValueError:
            pass
    else:
        if Confirm.ask("Create a new story group for this article?", default=False):
            story_name = Prompt.ask("Story name")
            new_story = storage.create_story(story_name)
            story_id = new_story["id"]
            console.print(f"[green]Created story: {story_name}[/green]")

    # Save the article
    article = storage.add_article(
        title=title,
        source=source,
        content=content,
        url=url,
        story_id=story_id
    )

    console.print(f"\n[green]✓ Article saved![/green] ID: [bold]{article['id']}[/bold]")
    console.print(f"  Title: {title}")
    console.print(f"  Source: {source}")
    console.print(f"  Content: {len(content)} characters")


# --- Import Commands ---

@cli.command("import")
@click.argument("path")
def import_articles(path):
    """
    Import articles from a file or folder.

    PATH can be:
    - A single file (.html, .txt, or .pdf)
    - A folder containing article files

    Examples:
        unbiased-news import ~/Desktop/articles/
        unbiased-news import ~/Desktop/cnn-article.html
    """
    from pathlib import Path
    import os

    # Expand ~ to home directory
    path = os.path.expanduser(path)
    p = Path(path)

    if not p.exists():
        console.print(f"[red]Path not found: {path}[/red]")
        return

    if p.is_file():
        # Import single file
        _import_single_file(path)
    else:
        # Import from folder
        _import_from_folder(path)


def _import_single_file(file_path):
    """Helper to import a single article file."""
    console.print(f"\n[bold blue]Importing file:[/bold blue] {file_path}\n")

    result = file_reader.read_file(file_path)

    if not result["success"]:
        console.print(f"[red]Error: {result['error']}[/red]")
        return

    # Show extracted content preview
    content_preview = result["content"][:300] + "..." if len(result["content"]) > 300 else result["content"]
    console.print(f"[bold]Title found:[/bold] {result['title']}")
    console.print(f"[bold]Content preview:[/bold]\n{content_preview}\n")

    # Ask for source
    guessed_source = file_reader.guess_source_from_filename(Path(file_path).name)
    if guessed_source:
        source = Prompt.ask(f"[bold]News source[/bold]", default=guessed_source)
    else:
        source = Prompt.ask("[bold]News source[/bold] (e.g., CNN, Fox News, BBC)")

    # Confirm or edit title
    title = Prompt.ask("[bold]Article title[/bold]", default=result["title"])

    # Ask about story grouping
    story_id = _ask_story_selection()

    # Save the article
    article = storage.add_article(
        title=title,
        source=source,
        content=result["content"],
        url=None,
        story_id=story_id
    )

    console.print(f"\n[green]✓ Article imported![/green] ID: [bold]{article['id']}[/bold]")


def _import_from_folder(folder_path):
    """Helper to import multiple articles from a folder."""
    console.print(f"\n[bold blue]Scanning folder:[/bold blue] {folder_path}\n")

    result = file_reader.scan_folder(folder_path)

    if not result["success"]:
        console.print(f"[red]Error: {result['error']}[/red]")
        return

    if result["count"] == 0:
        console.print("[yellow]No article files found.[/yellow]")
        console.print("Supported formats: .html, .txt, .pdf")
        return

    # Show found files
    console.print(f"Found {result['count']} file(s):\n")
    for i, f in enumerate(result["files"], 1):
        console.print(f"  {i}. {f['name']} ({f['type']})")

    console.print()

    # Ask if they want to import all or select
    if not Confirm.ask("Import all these files?", default=True):
        console.print("[dim]Cancelled.[/dim]")
        return

    # Ask about story grouping (for all files)
    console.print("\n[bold]Group all these articles into a story?[/bold]")
    story_id = _ask_story_selection()

    # Import each file
    imported = 0
    for f in result["files"]:
        console.print(f"\n[bold]Processing:[/bold] {f['name']}")

        read_result = file_reader.read_file(f["path"])
        if not read_result["success"]:
            console.print(f"  [red]Skipped: {read_result['error']}[/red]")
            continue

        # Try to guess source from filename
        guessed_source = file_reader.guess_source_from_filename(f["name"])
        source = guessed_source or "Unknown"

        # If we couldn't guess, ask
        if not guessed_source:
            source = Prompt.ask(f"  [bold]Source for {f['name']}[/bold]", default="Unknown")

        # Save the article
        article = storage.add_article(
            title=read_result["title"],
            source=source,
            content=read_result["content"],
            url=None,
            story_id=story_id
        )

        console.print(f"  [green]✓ Imported[/green] - {source}: {read_result['title'][:40]}...")
        imported += 1

    console.print(f"\n[bold green]Done! Imported {imported} article(s).[/bold green]\n")


def _ask_story_selection():
    """Helper to ask user about story grouping. Returns story_id or None."""
    stories = storage.list_stories_with_counts()

    if stories:
        console.print("\n[bold]Link to a story?[/bold]")
        for i, story in enumerate(stories, 1):
            console.print(f"  {i}. {story['name']} ({story['article_count']} articles)")
        console.print(f"  {len(stories) + 1}. Create new story")
        console.print(f"  {len(stories) + 2}. No story (standalone)")

        choice = Prompt.ask("Choose option", default=str(len(stories) + 2))

        try:
            choice_num = int(choice)
            if 1 <= choice_num <= len(stories):
                return stories[choice_num - 1]["id"]
            elif choice_num == len(stories) + 1:
                story_name = Prompt.ask("New story name")
                new_story = storage.create_story(story_name)
                console.print(f"[green]Created story: {story_name}[/green]")
                return new_story["id"]
        except ValueError:
            pass
    else:
        if Confirm.ask("Create a story group for these articles?", default=True):
            story_name = Prompt.ask("Story name")
            new_story = storage.create_story(story_name)
            console.print(f"[green]Created story: {story_name}[/green]")
            return new_story["id"]

    return None


@cli.command()
def list():
    """List all saved articles."""
    articles = storage.load_articles()

    if not articles:
        console.print("\n[yellow]No articles saved yet.[/yellow]")
        console.print("Use [bold]unbiased-news add[/bold] to add your first article.\n")
        return

    # Create a nice table
    table = Table(title="Saved Articles")
    table.add_column("ID", style="cyan")
    table.add_column("Title", style="white", max_width=50)
    table.add_column("Source", style="green")
    table.add_column("Bias", style="yellow")
    table.add_column("Story", style="magenta")

    for article in articles:
        # Format bias score if available
        bias = article.get("bias_score")
        if bias is not None:
            if bias < 40:
                bias_str = f"[blue]{bias} (Left)[/blue]"
            elif bias > 60:
                bias_str = f"[red]{bias} (Right)[/red]"
            else:
                bias_str = f"[green]{bias} (Center)[/green]"
        else:
            bias_str = "[dim]Not analyzed[/dim]"

        # Get story name if linked
        story_name = "[dim]—[/dim]"
        if article.get("story_id"):
            story = storage.get_story(article["story_id"])
            if story:
                story_name = story["name"][:20]

        table.add_row(
            article["id"],
            article["title"][:50] + ("..." if len(article["title"]) > 50 else ""),
            article["source"],
            bias_str,
            story_name
        )

    console.print()
    console.print(table)
    console.print()


@cli.command()
@click.argument("article_id")
def view(article_id):
    """View a specific article by ID."""
    article = storage.get_article(article_id)

    if not article:
        console.print(f"[red]Article not found: {article_id}[/red]")
        return

    # Show article in a nice panel
    content_preview = article["content"][:1000]
    if len(article["content"]) > 1000:
        content_preview += "\n\n[dim]... (truncated)[/dim]"

    panel = Panel(
        content_preview,
        title=f"[bold]{article['title']}[/bold]",
        subtitle=f"Source: {article['source']} | ID: {article['id']}"
    )
    console.print()
    console.print(panel)

    # Show bias info if available
    if article.get("bias_score") is not None:
        console.print(f"\n[bold]Bias Score:[/bold] {article['bias_score']}/100")
        if article.get("bias_analysis"):
            console.print(f"\n[bold]Analysis:[/bold]\n{article['bias_analysis']}")
    else:
        console.print("\n[dim]Bias analysis not yet performed. Use 'analyze' command.[/dim]")

    console.print()


@cli.command()
@click.argument("article_id")
def delete(article_id):
    """Delete an article by ID."""
    article = storage.get_article(article_id)

    if not article:
        console.print(f"[red]Article not found: {article_id}[/red]")
        return

    if Confirm.ask(f"Delete article '[bold]{article['title']}[/bold]'?"):
        storage.delete_article(article_id)
        console.print("[green]Article deleted.[/green]")


# --- Analysis Commands ---

@cli.command()
@click.argument("article_id")
def analyze(article_id):
    """
    Analyze an article for bias using Claude AI.

    This sends the article to Claude and returns a bias score (0-100)
    along with an explanation of any bias indicators found.

    Requires ANTHROPIC_API_KEY environment variable to be set.
    """
    article = storage.get_article(article_id)

    if not article:
        console.print(f"[red]Article not found: {article_id}[/red]")
        return

    # Check if already analyzed
    if article.get("bias_score") is not None:
        if not Confirm.ask("This article has already been analyzed. Re-analyze?", default=False):
            console.print("\n[bold]Previous Analysis:[/bold]")
            console.print(analyzer.format_analysis_for_display({
                "bias_score": article["bias_score"],
                "bias_direction": article.get("bias_direction", "unknown"),
                "key_indicators": article.get("key_indicators", []),
                "overall_assessment": article.get("bias_analysis", "")
            }))
            return

    console.print(f"\n[bold]Analyzing article:[/bold] {article['title']}")
    console.print(f"[dim]Source: {article['source']}[/dim]")
    console.print("\n[yellow]Sending to Claude for analysis...[/yellow]")

    # Run the analysis
    with console.status("[bold blue]Analyzing bias patterns...", spinner="dots"):
        result = analyzer.analyze_article(
            title=article["title"],
            source=article["source"],
            content=article["content"]
        )

    # Check for errors
    if "error" in result:
        console.print(f"\n[red]{result['error']}[/red]")
        return

    # Save the results to the article
    storage.update_article(article_id, {
        "bias_score": result.get("bias_score"),
        "bias_direction": result.get("bias_direction"),
        "key_indicators": result.get("key_indicators", []),
        "bias_analysis": result.get("overall_assessment", "")
    })

    # Display results
    console.print("\n[bold green]Analysis Complete![/bold green]\n")
    console.print(analyzer.format_analysis_for_display(result))
    console.print()


@cli.command()
def analyze_all():
    """Analyze all articles that haven't been analyzed yet."""
    articles = storage.load_articles()

    # Filter to unanalyzed articles
    unanalyzed = [a for a in articles if a.get("bias_score") is None]

    if not unanalyzed:
        console.print("\n[green]All articles have already been analyzed![/green]\n")
        return

    console.print(f"\n[bold]Found {len(unanalyzed)} unanalyzed article(s)[/bold]\n")

    if not Confirm.ask("Analyze all of them?"):
        return

    for i, article in enumerate(unanalyzed, 1):
        console.print(f"\n[bold]({i}/{len(unanalyzed)}) Analyzing:[/bold] {article['title'][:50]}...")

        with console.status("[bold blue]Analyzing...", spinner="dots"):
            result = analyzer.analyze_article(
                title=article["title"],
                source=article["source"],
                content=article["content"]
            )

        if "error" in result:
            console.print(f"  [red]Error: {result['error'][:100]}[/red]")
            continue

        # Save results
        storage.update_article(article["id"], {
            "bias_score": result.get("bias_score"),
            "bias_direction": result.get("bias_direction"),
            "key_indicators": result.get("key_indicators", []),
            "bias_analysis": result.get("overall_assessment", "")
        })

        score = result.get("bias_score", "?")
        direction = result.get("bias_direction", "unknown")
        console.print(f"  [green]Done![/green] Score: {score}/100 ({direction})")

    console.print("\n[bold green]All analyses complete![/bold green]\n")


# --- Comparison Commands ---

@cli.command()
@click.argument("story_id")
def compare(story_id):
    """
    Compare all articles in a story and generate a balanced summary.

    This takes all articles grouped under a story and:
    1. Shows where sources agree
    2. Shows where they differ
    3. Generates a balanced, neutral summary

    Requires ANTHROPIC_API_KEY environment variable to be set.
    """
    story_data = storage.get_story(story_id)

    if not story_data:
        console.print(f"[red]Story not found: {story_id}[/red]")
        return

    articles = storage.get_story_articles(story_id)

    if len(articles) < 2:
        console.print(f"\n[yellow]Need at least 2 articles to compare.[/yellow]")
        console.print(f"This story has {len(articles)} article(s).")
        console.print("Add more articles to this story using 'unbiased-news add'\n")
        return

    console.print(f"\n[bold blue]Comparing {len(articles)} articles on:[/bold blue] {story_data['name']}")
    console.print()

    # Show which articles we're comparing
    for article in articles:
        bias_str = ""
        if article.get("bias_score") is not None:
            bias_str = f" (Bias: {article['bias_score']})"
        console.print(f"  • {article['source']}: {article['title'][:50]}...{bias_str}")

    console.print("\n[yellow]Generating balanced comparison...[/yellow]")

    # Run the comparison
    with console.status("[bold blue]Analyzing perspectives...", spinner="dots"):
        result = comparer.compare_articles(articles)

    # Check for errors
    if "error" in result:
        console.print(f"\n[red]{result['error']}[/red]")
        return

    # Display results
    console.print("\n" + "=" * 60)
    console.print("[bold green]BALANCED COMPARISON[/bold green]")
    console.print("=" * 60 + "\n")
    console.print(comparer.format_comparison_for_display(result))
    console.print()


@cli.command()
@click.argument("article_ids", nargs=-1)
def compare_articles(article_ids):
    """
    Compare specific articles by their IDs.

    Example: unbiased-news compare-articles abc123 def456 ghi789

    This allows you to compare any articles, even if they're not in the same story group.
    """
    if len(article_ids) < 2:
        console.print("[yellow]Please provide at least 2 article IDs to compare.[/yellow]")
        console.print("Example: unbiased-news compare-articles abc123 def456")
        return

    articles = []
    for aid in article_ids:
        article = storage.get_article(aid)
        if not article:
            console.print(f"[red]Article not found: {aid}[/red]")
            return
        articles.append(article)

    console.print(f"\n[bold blue]Comparing {len(articles)} articles[/bold blue]")
    console.print()

    for article in articles:
        bias_str = ""
        if article.get("bias_score") is not None:
            bias_str = f" (Bias: {article['bias_score']})"
        console.print(f"  • {article['source']}: {article['title'][:50]}...{bias_str}")

    console.print("\n[yellow]Generating balanced comparison...[/yellow]")

    with console.status("[bold blue]Analyzing perspectives...", spinner="dots"):
        result = comparer.compare_articles(articles)

    if "error" in result:
        console.print(f"\n[red]{result['error']}[/red]")
        return

    console.print("\n" + "=" * 60)
    console.print("[bold green]BALANCED COMPARISON[/bold green]")
    console.print("=" * 60 + "\n")
    console.print(comparer.format_comparison_for_display(result))
    console.print()


# --- Story Commands ---

@cli.command()
def stories():
    """List all story groups."""
    story_list = storage.list_stories_with_counts()

    if not story_list:
        console.print("\n[yellow]No stories created yet.[/yellow]")
        console.print("Stories are created when you add articles.\n")
        return

    table = Table(title="Story Groups")
    table.add_column("ID", style="cyan")
    table.add_column("Name", style="white")
    table.add_column("Articles", style="green")
    table.add_column("Created", style="dim")

    for story in story_list:
        created = story["created_at"][:10]  # Just the date part
        table.add_row(
            story["id"],
            story["name"],
            str(story["article_count"]),
            created
        )

    console.print()
    console.print(table)
    console.print()


@cli.command()
@click.argument("story_id")
def story(story_id):
    """View all articles in a story group."""
    story_data = storage.get_story(story_id)

    if not story_data:
        console.print(f"[red]Story not found: {story_id}[/red]")
        return

    articles = storage.get_story_articles(story_id)

    console.print(f"\n[bold blue]📰 Story: {story_data['name']}[/bold blue]")
    if story_data.get("description"):
        console.print(f"[dim]{story_data['description']}[/dim]")
    console.print()

    if not articles:
        console.print("[yellow]No articles in this story yet.[/yellow]\n")
        return

    for article in articles:
        bias = article.get("bias_score")
        if bias is not None:
            if bias < 40:
                bias_str = f"[blue]Bias: {bias} (Left)[/blue]"
            elif bias > 60:
                bias_str = f"[red]Bias: {bias} (Right)[/red]"
            else:
                bias_str = f"[green]Bias: {bias} (Center)[/green]"
        else:
            bias_str = "[dim]Not analyzed[/dim]"

        console.print(f"[bold]{article['source']}[/bold] - {article['title']}")
        console.print(f"  ID: {article['id']} | {bias_str}")
        console.print()


# Entry point - this runs when you call 'python -m src.cli' or 'unbiased-news'
def main():
    cli()


if __name__ == "__main__":
    main()

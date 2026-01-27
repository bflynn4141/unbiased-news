# comparer.py - Compares multiple articles on the same topic
# Generates balanced summaries showing where sources agree and disagree

import os
import json
from anthropic import Anthropic

# Prompt for generating a balanced comparison summary
COMPARISON_PROMPT = """You are an expert journalist tasked with creating a balanced summary from multiple news sources covering the same story.

Here are articles from different sources on the same topic:

{articles_text}

Please create a balanced summary that:

1. **AGREED FACTS**: Facts that all or most sources agree on
2. **DIFFERING PERSPECTIVES**: Where sources disagree or present different angles
3. **POTENTIAL BLIND SPOTS**: Information that might be missing or underreported
4. **BALANCED SUMMARY**: A neutral 2-3 paragraph summary that fairly represents all perspectives

Guidelines:
- Stay neutral - don't favor any source
- Cite which source(s) support each claim using [Source Name] format
- Highlight where sources contradict each other
- Note what questions remain unanswered
- Flag any disputed claims clearly

Respond in this JSON format:
{{
    "agreed_facts": [
        {{"fact": "<the fact>", "sources": ["source1", "source2"]}}
    ],
    "differing_perspectives": [
        {{"topic": "<topic of disagreement>", "perspectives": [{{"source": "source1", "position": "<their position>"}}, {{"source": "source2", "position": "<their position>"}}]}}
    ],
    "potential_blind_spots": ["<what might be missing>"],
    "balanced_summary": "<2-3 paragraph neutral summary>",
    "unanswered_questions": ["<questions that remain>"]
}}"""


def get_api_key():
    """Get the Anthropic API key from environment variable."""
    return os.environ.get("ANTHROPIC_API_KEY")


def check_api_key():
    """Check if API key is configured."""
    key = get_api_key()
    if not key:
        return False, (
            "No Anthropic API key found!\n\n"
            "To use comparison features, set your API key:\n"
            "  export ANTHROPIC_API_KEY='your-key-here'\n\n"
            "Get an API key at: https://console.anthropic.com/\n"
        )
    return True, "API key configured"


def compare_articles(articles):
    """
    Compare multiple articles and generate a balanced summary.

    Parameters:
    - articles: List of article dictionaries, each with title, source, content, and optionally bias_score

    Returns:
    - A dictionary with agreed_facts, differing_perspectives, balanced_summary, etc.
    - Or None if comparison fails
    """
    if len(articles) < 2:
        return {"error": "Need at least 2 articles to compare"}

    # Check for API key first
    has_key, message = check_api_key()
    if not has_key:
        return {"error": message}

    # Build the articles text for the prompt
    articles_text = ""
    for i, article in enumerate(articles, 1):
        bias_info = ""
        if article.get("bias_score") is not None:
            bias_info = f" (Bias Score: {article['bias_score']}/100)"

        articles_text += f"""
---
ARTICLE {i}
Source: {article['source']}{bias_info}
Title: {article['title']}

{article['content'][:5000]}

---
"""

    # Create the Anthropic client
    client = Anthropic()

    prompt = COMPARISON_PROMPT.format(articles_text=articles_text)

    try:
        message = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=3000,
            messages=[
                {"role": "user", "content": prompt}
            ]
        )

        response_text = message.content[0].text

        # Parse JSON from response
        if "```json" in response_text:
            json_start = response_text.find("```json") + 7
            json_end = response_text.find("```", json_start)
            response_text = response_text[json_start:json_end]
        elif "```" in response_text:
            json_start = response_text.find("```") + 3
            json_end = response_text.find("```", json_start)
            response_text = response_text[json_start:json_end]

        result = json.loads(response_text.strip())
        return result

    except json.JSONDecodeError:
        return {
            "error": "Could not parse Claude's response as JSON",
            "raw_response": response_text
        }
    except Exception as e:
        return {
            "error": f"API call failed: {str(e)}"
        }


def format_comparison_for_display(comparison):
    """
    Convert the comparison dictionary into a readable string for terminal display.
    """
    if "error" in comparison:
        return f"Error: {comparison['error']}"

    lines = []

    # Agreed facts
    agreed = comparison.get("agreed_facts", [])
    if agreed:
        lines.append("[AGREED FACTS]")
        lines.append("These points are supported by multiple sources:")
        for fact in agreed:
            sources = ", ".join(fact.get("sources", []))
            lines.append(f"  • {fact['fact']}")
            lines.append(f"    Reported by: {sources}")
        lines.append("")

    # Differing perspectives
    diffs = comparison.get("differing_perspectives", [])
    if diffs:
        lines.append("[WHERE SOURCES DIFFER]")
        for diff in diffs:
            lines.append(f"  Topic: {diff['topic']}")
            for persp in diff.get("perspectives", []):
                lines.append(f"    - {persp['source']}: {persp['position']}")
        lines.append("")

    # Blind spots
    blind_spots = comparison.get("potential_blind_spots", [])
    if blind_spots:
        lines.append("[POTENTIAL BLIND SPOTS]")
        for spot in blind_spots:
            lines.append(f"  • {spot}")
        lines.append("")

    # Balanced summary
    summary = comparison.get("balanced_summary", "")
    if summary:
        lines.append("[BALANCED SUMMARY]")
        lines.append(summary)
        lines.append("")

    # Unanswered questions
    questions = comparison.get("unanswered_questions", [])
    if questions:
        lines.append("[UNANSWERED QUESTIONS]")
        for q in questions:
            lines.append(f"  • {q}")

    return "\n".join(lines)

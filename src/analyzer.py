# analyzer.py - Uses Claude AI to analyze articles for bias
# This is the "brain" that reads articles and detects bias patterns

import os
import json
from anthropic import Anthropic

# The prompt that tells Claude how to analyze articles for bias
BIAS_ANALYSIS_PROMPT = """You are an expert media analyst specializing in detecting bias in news reporting. Analyze the following article for potential bias.

ARTICLE TITLE: {title}
SOURCE: {source}
CONTENT:
{content}

Analyze this article and provide:

1. BIAS SCORE (0-100): 0-30=left, 31-45=center-left, 46-54=center, 55-69=center-right, 70-100=right

2. KEY BIAS INDICATORS found (loaded language, framing, source selection, omissions, tone)

3. OVERALL ASSESSMENT (2-3 sentences)

IMPORTANT: Return ONLY valid JSON. Escape any quotes within strings using backslash.

Return this exact JSON structure:
{{
    "bias_score": 50,
    "bias_direction": "center",
    "indicators": [
        {{"type": "framing", "finding": "Description of the bias indicator found"}}
    ],
    "assessment": "2-3 sentence overall assessment."
}}"""


def get_api_key():
    """
    Get the Anthropic API key from environment variable.
    Returns None if not set.
    """
    return os.environ.get("ANTHROPIC_API_KEY")


def check_api_key():
    """Check if API key is configured and return a helpful message if not."""
    key = get_api_key()
    if not key:
        return False, (
            "No Anthropic API key found!\n\n"
            "To use bias analysis, you need to set your API key:\n\n"
            "Option 1 - Set it for this session:\n"
            "  export ANTHROPIC_API_KEY='your-key-here'\n\n"
            "Option 2 - Add to your shell profile (~/.zshrc or ~/.bashrc):\n"
            "  export ANTHROPIC_API_KEY='your-key-here'\n\n"
            "Get an API key at: https://console.anthropic.com/\n"
        )
    return True, "API key configured"


def analyze_article(title, source, content):
    """
    Send an article to Claude for bias analysis.

    Parameters:
    - title: The headline of the article
    - source: The news outlet (e.g., "CNN", "Fox News")
    - content: The full text of the article

    Returns:
    - A dictionary with bias_score, bias_direction, key_indicators, and overall_assessment
    - Or None if analysis fails
    """
    # Check for API key first
    has_key, message = check_api_key()
    if not has_key:
        return {"error": message}

    # Create the Anthropic client
    client = Anthropic()

    # Build the prompt with the article details
    prompt = BIAS_ANALYSIS_PROMPT.format(
        title=title,
        source=source,
        content=content[:15000]  # Limit content length to avoid token limits
    )

    try:
        # Call Claude API
        message = client.messages.create(
            model="claude-sonnet-4-20250514",  # Using Claude Sonnet for fast, quality analysis
            max_tokens=2000,
            messages=[
                {"role": "user", "content": prompt}
            ]
        )

        # Extract the response text
        response_text = message.content[0].text

        # Try to parse as JSON - extract from markdown code blocks if present
        json_text = response_text

        # If wrapped in markdown code block, extract the content
        if "```" in json_text:
            # Find content between ``` markers
            parts = json_text.split("```")
            for part in parts:
                # Skip empty parts and the "json" language marker
                cleaned = part.strip()
                if cleaned.startswith("json"):
                    cleaned = cleaned[4:].strip()
                if cleaned.startswith("{"):
                    json_text = cleaned
                    break

        # Find the JSON object - match from first { to last }
        first_brace = json_text.find("{")
        last_brace = json_text.rfind("}")
        if first_brace != -1 and last_brace != -1:
            json_text = json_text[first_brace:last_brace + 1]

        try:
            result = json.loads(json_text)
            return result
        except json.JSONDecodeError:
            # If JSON parsing fails, try to extract key info manually
            return _extract_from_text(response_text)

    except Exception as e:
        return {
            "error": f"API call failed: {str(e)}"
        }


def _extract_from_text(response_text):
    """
    Fallback: Extract bias info from plain text response when JSON parsing fails.
    """
    import re

    result = {}

    # Try to find bias score
    score_match = re.search(r'[Bb]ias\s*[Ss]core[:\s]*(\d+)', response_text)
    if score_match:
        result["bias_score"] = int(score_match.group(1))

    # Try to determine direction
    text_lower = response_text.lower()
    if "left-leaning" in text_lower or "left leaning" in text_lower:
        result["bias_direction"] = "left"
    elif "right-leaning" in text_lower or "right leaning" in text_lower:
        result["bias_direction"] = "right"
    elif "neutral" in text_lower or "center" in text_lower:
        result["bias_direction"] = "center"
    else:
        # Guess from score if we have it
        if "bias_score" in result:
            score = result["bias_score"]
            if score < 40:
                result["bias_direction"] = "left"
            elif score > 60:
                result["bias_direction"] = "right"
            else:
                result["bias_direction"] = "center"

    # Use the whole response as assessment if we found a score
    if "bias_score" in result:
        # Try to find an assessment section
        assessment_match = re.search(r'[Aa]ssessment[:\s]*(.+?)(?:\n\n|\Z)', response_text, re.DOTALL)
        if assessment_match:
            result["overall_assessment"] = assessment_match.group(1).strip()[:500]
        else:
            result["overall_assessment"] = "Analysis completed but detailed breakdown unavailable."
        result["key_indicators"] = []
        return result

    # If we couldn't extract anything useful, return error with raw response
    return {
        "error": "Could not parse Claude's response",
        "raw_response": response_text[:1000]
    }


def format_analysis_for_display(analysis):
    """
    Convert the analysis dictionary into a readable string for terminal display.
    """
    if "error" in analysis:
        return f"Error: {analysis['error']}"

    lines = []

    # Bias score with color hint
    score = analysis.get("bias_score", "?")
    direction = analysis.get("bias_direction", "unknown")
    lines.append(f"Bias Score: {score}/100 ({direction})")
    lines.append("")

    # Key indicators (handle both old and new field names)
    indicators = analysis.get("indicators") or analysis.get("key_indicators", [])
    if indicators:
        lines.append("Key Bias Indicators:")
        for ind in indicators:
            ind_type = ind.get('type', 'general').replace('_', ' ').title()
            # Handle both "finding" (new) and "description" (old) field names
            description = ind.get('finding') or ind.get('description', '')
            lines.append(f"  • {ind_type}: {description}")
            if ind.get('example'):
                example = ind['example']
                lines.append(f"    Example: \"{example[:100]}...\"" if len(example) > 100 else f"    Example: \"{example}\"")
        lines.append("")

    # Overall assessment (handle both field names)
    assessment = analysis.get("assessment") or analysis.get("overall_assessment", "")
    if assessment:
        lines.append(f"Assessment: {assessment}")

    return "\n".join(lines)

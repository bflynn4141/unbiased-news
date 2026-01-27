# Unbiased News

A tool for comparing news articles from different sources and detecting bias.

## What This Does

**Unbiased News** helps you see how different news outlets cover the same story. Instead of reading just one perspective, you can:

1. **Add articles** from different sources about the same topic
2. **Analyze them for bias** using AI (Claude) to detect loaded language, framing, etc.
3. **Compare them side-by-side** to see where sources agree and disagree
4. **Get a balanced summary** that fairly represents all perspectives

## Quick Start

### 1. Clone and install

```bash
git clone https://github.com/bflynn4141/unbiased-news.git
cd unbiased-news
pip3 install -e .
```

### 2. Set up your API key (for bias analysis)

```bash
export ANTHROPIC_API_KEY='your-key-here'
```

Get an API key at: https://console.anthropic.com/

### 3. Add your first article

```bash
unbiased-news add
```

Follow the prompts to enter the headline, source name, and paste the article text.

## Commands

| Command | What it does |
|---------|--------------|
| `unbiased-news add` | Add a new article by pasting text |
| `unbiased-news import <path>` | Import articles from HTML, TXT, or PDF files |
| `unbiased-news list` | See all your saved articles |
| `unbiased-news view <id>` | Read a specific article |
| `unbiased-news analyze <id>` | Get a bias score for an article |
| `unbiased-news analyze-all` | Analyze all unanalyzed articles |
| `unbiased-news stories` | See your story groups |
| `unbiased-news story <id>` | See all articles in a story |
| `unbiased-news compare <story-id>` | Compare articles in a story |
| `unbiased-news compare-articles <id1> <id2>` | Compare specific articles |
| `unbiased-news delete <id>` | Remove an article |

## Example Workflow

Let's say you want to compare how CNN and Fox News cover the same story:

```bash
# Add the CNN article
unbiased-news add
# Enter "CNN" as the source, paste the article text

# Add the Fox News article
unbiased-news add
# When prompted, add it to the same "story" as the CNN article

# Analyze both for bias
unbiased-news analyze-all

# Compare them side-by-side
unbiased-news compare <story-id>
```

The comparison will show:
- Facts both sources agree on
- Where they differ
- A balanced summary representing both perspectives
- Questions that remain unanswered

## How Bias Scoring Works

The bias score ranges from 0-100:

| Score | Meaning |
|-------|---------|
| 0-30 | Left-leaning bias |
| 31-45 | Slightly left-leaning |
| 46-54 | Relatively neutral |
| 55-69 | Slightly right-leaning |
| 70-100 | Right-leaning bias |

The analysis also identifies:
- **Loaded language** - Emotionally charged words
- **Framing** - How the story is presented
- **Source selection** - Who is quoted
- **Omissions** - Important context left out
- **Tone** - Sympathetic vs critical

## Project Structure

```
unbiased-news/
├── src/
│   ├── cli.py        # Command-line interface
│   ├── storage.py    # Saves/loads articles locally
│   ├── analyzer.py   # Bias detection using Claude AI
│   └── comparer.py   # Generates balanced comparisons
├── data/             # Where your articles are saved (created automatically)
├── requirements.txt  # Python dependencies
└── setup.py         # Installation config
```

## Data Storage

All your articles are saved locally in the `data/` folder as JSON files. No data is sent anywhere except to Claude's API for analysis.

## Troubleshooting

**"Command not found: unbiased-news"**
- Make sure you've installed with `pip3 install -e .` from the project folder
- Try running with `python3 -m src.cli` instead
- Or add your Python bin folder to PATH (usually `~/.local/bin` or check `pip3 show unbiased-news` for location)

**"No Anthropic API key found"**
- Set your API key: `export ANTHROPIC_API_KEY='your-key-here'`
- To make it permanent, add that line to your `~/.zshrc` or `~/.bashrc` file

## Contributing

We welcome contributions!

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes
4. Push and open a Pull Request

## License

MIT License - see [LICENSE](LICENSE) for details.

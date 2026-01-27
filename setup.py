# setup.py - Tells Python how to install this project
# After running 'pip install -e .', you can use 'unbiased-news' command anywhere

from setuptools import setup, find_packages

setup(
    name="unbiased-news",
    version="0.1.0",
    description="Compare news articles and detect bias",
    packages=find_packages(),
    install_requires=[
        "click>=8.0.0",
        "rich>=13.0.0",
        "anthropic>=0.18.0",
        "beautifulsoup4>=4.12.0",
        "PyPDF2>=3.0.0",
    ],
    entry_points={
        # This creates the 'unbiased-news' command that runs our CLI
        "console_scripts": [
            "unbiased-news=src.cli:main",
        ],
    },
    python_requires=">=3.8",
)

from langchain.tools import tool
import requests
from bs4 import BeautifulSoup
from tavily import TavilyClient
import os
from dotenv import load_dotenv
import tavily
from rich import print



load_dotenv()

tavily_client = TavilyClient(api_key=os.getenv("TAVILY_API_KEY"))
# print("It is: " + tavily_client.api_key)

@tool
def get_web_content(query: str) -> str:
    """Search web for retrieving content from a given URL. Returns the titles, URLs, and snippets."""
    result = tavily_client.search(query, max_results=5, include_raw_content=True)
    out = []
    for r in result['results']:
        out.append(f"Title: {r['title']}\nURL: {r['url']}\nSnippet: {r['content'][:300]}\n")

    return "\n----\n".join(out)

# new = get_web_content.invoke("Recent news about war")

# print(new)


@tool
def scrape_url(url: str) -> str:
    """Scrape the content of a given URL and return the text."""
    try:
        response = requests.get(url,timeout=10,headers={'User-Agent': 'Mozilla/5.0'})
        # response.raise_for_status()
        soup = BeautifulSoup(response.text, 'html.parser')
        for script in soup(["script", "style","nav","footer"]):
            script.decompose()
        return soup.get_text(separator='\n', strip=True)[:3000]
    except requests.RequestException as e:
        return f"Error fetching the URL: {e}"







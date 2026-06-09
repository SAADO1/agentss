from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from agent import build_scrape_agent, writer_chain, bulid_serch_agent, critic_chain

app = FastAPI()

# Allow React dev server to talk to FastAPI
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class TopicRequest(BaseModel):
    topic: str

@app.post("/api/search")
def run_search(req: TopicRequest):
    agent = bulid_serch_agent()
    result = agent.invoke({
        "messages": [("user", f"Find recent, reliable and detailed information about {req.topic}")]
    })
    return {"content": result["messages"][-1].content}

@app.post("/api/scrape")
def run_scrape(req: TopicRequest):  # topic here = search result text
    agent = build_scrape_agent()
    result = agent.invoke({
        "messages": [("user", req.topic)]  # pass the full prompt string
    })
    return {"content": result["messages"][-1].content}

@app.post("/api/write")
def run_write(req: TopicRequest):  # topic = "TOPIC|||RESEARCH_TEXT"
    topic, research = req.topic.split("|||", 1)
    result = writer_chain.invoke({"topic": topic, "research": research})
    content = result if isinstance(result, str) else result.content
    return {"content": content}

@app.post("/api/critique")
def run_critique(req: TopicRequest):  # topic = the report text
    result = critic_chain.invoke({"report": req.topic})
    content = result if isinstance(result, str) else result.content
    return {"content": content}
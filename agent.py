from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate
from tool import get_web_content, scrape_url
from dotenv import load_dotenv
from langchain_core.output_parsers import StrOutputParser
from langchain_core.messages import HumanMessage, AIMessage
import os


#model
llm = ChatGroq(model="llama-3.1-8b-instant", temperature=0.4, max_tokens=1000, api_key=os.getenv("GROQ_API_KEY"))


class SimpleAgent:
    def __init__(self, llm_model, tool):
        self.llm = llm_model
        self.tool = tool
    
    def invoke(self, data):
        # Extract the message content from the messages list
        messages = data.get("messages", [])
        if messages:
            user_message = messages[-1][1]  # Get the actual message text
        else:
            user_message = ""
        
        # Call the tool
        try:
            result = self.tool.invoke(user_message)
        except Exception as e:
            result = f"Error: {str(e)}"
        
        # Return in the expected format (messages list with the result)
        return {
            "messages": [
                HumanMessage(content=user_message),
                AIMessage(content=result)
            ]
        }


#1agent

def bulid_serch_agent():
    return SimpleAgent(llm, get_web_content)


#2 agent

def build_scrape_agent():
    return SimpleAgent(llm, scrape_url)




writer_prompt = ChatPromptTemplate.from_messages([
    ("system", "You are an expert research writer. Write clear, structured and insightful reports."),
    ("human", """Write a detailed research report on the topic below.

Topic: {topic}

Research Gathered:
{research}

Structure the report as:
- Introduction
- Key Findings (minimum 3 well-explained points)
- Conclusion
- Sources (list all URLs found in the research)

Be detailed, factual and professional."""),
])
str_output_parser = StrOutputParser()

writer_chain = writer_prompt|llm|str_output_parser



critic_prompt = ChatPromptTemplate.from_messages([
     ("system", "You are a sharp and constructive research critic. Be honest and specific."),
    ("human", """Review the research report below and evaluate it strictly.

Report:
{report}

Respond in this exact format:

Score: X/10

Strengths:
- ...
- ...

Areas to Improve:
- ...
- ...

One line verdict:
..."""),
])

critic_chain = critic_prompt|llm|str_output_parser
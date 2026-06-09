from agent import build_scrape_agent, writer_chain, bulid_serch_agent,writer_chain,critic_chain


def run_reserch_pipeline(topic:str) -> dict:
    state  = {}



    search_agent = bulid_serch_agent()
    search_result = search_agent.invoke({
        "messages":[("user",f"Find recent, reliable and  detailed information about {topic}")]
    })
    state["search_agent"] = search_result['messages'][-1].content

    print("\n"+"search result",state["search_agent"])



    #step 2 - reader agent 
    print("\n"+" ="*50)
    print("step 2 - Reader agent is scraping top resources ...")
    print("="*50)

    reader_agent = build_scrape_agent()
    reader_result = reader_agent.invoke({
        "messages": [("user",
            f"Based on the following search results about '{topic}', "
            f"pick the most relevant URL and scrape it for deeper content.\n\n"
            f"Search Results:\n{state["search_agent"][:800]}"
        )]
    })

    state['scraped_content'] = reader_result['messages'][-1].content

    print("\nscraped content: \n", state['scraped_content'])



    research_combined=(
        f"serch results:\n{state['search_agent']}\n\n"
        f"deep content:\n{state['scraped_content']}\n\n"
    )


    state["report"] = writer_chain.invoke({
        "topic": topic,
        "research":research_combined
    })



    print("Final Report:\n", state["report"])


    state["feedback"] = critic_chain.invoke({
        "report": state["report"]
    })


    print("Final Feedback:\n", state["feedback"])

    return state



if __name__ == "__main__":
    topic = input("Enter a research topic: ")
    run_reserch_pipeline(topic) 
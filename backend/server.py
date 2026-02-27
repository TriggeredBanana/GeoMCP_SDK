import asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from copilot import CopilotClient

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], # Kan også legge til localhost:8000, spørs vel litt?
    allow_methods=["*"],
    allow_headers=["*"],
)

client = CopilotClient()
class ChatRequest(BaseModel):
    message: str # denne kan også være prompt?
    
@app.on_event("startup")
async def startup_event(): 
    await client.start() # litt usikker på om det skal være client.connect
    
@app.on_event("shutdown")
async def shutdown_event():
    await client.stop() # litt usikker på om det skal være client.disconnect - tror begge funker
    
@app.post("/api/chat/")
async def chat(request: ChatRequest):

    session = await client.create_session({"model": "claude-sonnet-4.6"})
    response = await session.send_and_wait({"prompt": request.message})
    content = response.data.content
    await session.destroy()
    return {"response": content}
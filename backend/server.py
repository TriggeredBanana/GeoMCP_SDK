import asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from copilot import CopilotClient
from session_manager import SessionManager

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], # Can also add whatever the frontend is running on? That's what should go here, right?
    allow_methods=["*"],
    allow_headers=["*"],
)

client = CopilotClient()
manager = SessionManager(client) # Creates a manager that lives for the entire server lifetime - this can be skipped on actual deployment if necessary. Just don't know how yet.
class ChatRequest(BaseModel):
    message: str # denne kan også være prompt?
    session_id: str | None = None 
    # session_id er valgfri, og kan være None hvis det ikke er gitt. 
    # Dette gjør at get_or_create metoden i SessionManager kan håndtere både tilfeller der session_id er gitt og der det ikke er gitt.
    # Hvis session_id er None, vil get_or_create opprette en ny session. Hvis session_id er gitt, vil get_or_create prøve å hente den eksisterende sessionen.
    
@app.on_event("startup")
async def startup_event(): 
    await client.start() # litt usikker på om det skal være client.connect
    
@app.on_event("shutdown")
async def shutdown_event():
    await client.stop() # litt usikker på om det skal være client.disconnect - tror begge funker
    
@app.post("/api/chat")
async def chat(request: ChatRequest):
    session_id, session = await manager.get_or_create(request.session_id) 
    reply = await manager.send_message(session_id, request.message)
    return {"reply": reply, "session_id": session_id} # Bruker nå manager.get_or_create og manager.send_message i stedet for å oprette session hver gang.

@app.get("/api/history/{session_id}")
async def get_history(session_id: str):
    history = manager.get_history(session_id)
    return {"history": history}    # Nytt endepunkt for frontend kan hente hele samtalehistorikken for en gitt session_id.
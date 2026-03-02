import asyncio
import uuid
from datetime import datetime, timedelta
from copilot import CopilotClient

class SessionManager:
    def __init__(self, client: CopilotClient, timeout_minutes=15):
        self.client = client
        
        # There are 3 different dictionaries here, to keep track of different aspects of the sessions.
        
        self.sessions = {} # this is for the session objects, not for the session IDs
        self.last_active = {} # dette er for å holde styr på når hver session sist var aktiv
        self.history = {} # dette er for å holde historikk for hver, slik at vi / bruker kan se hva som er blitt sendt tidligere
        
        self.timeout = timedelta(minutes=timeout_minutes) # dette er hvor lenge en session skal være aktiv før den blir. Setter denne på 15, men kan justeres i linje 7

    async def get_or_create(self, session_id=None):
        # Her sjekkes det først om session_id er gitt, og om den finnes i en av session_id dicts. Altså det er 2 sjekker i en. Den brukes for å hente en eksisterende session hvis den finnes.
        if session_id and session_id in self.sessions:
            self.last_active[session_id] = datetime.now() # oppdaterer siste aktive tid for sessionen
            return session_id, self.sessions[session_id]   
        
        # Hvis session_id ikke er gitt eller ikke finnes, så opprettes en ny session. Dette brukes uuid for å generere en unik session_id, og deretter opprettes en ny session med client.create_session. Den nye sessionen lagres i sessions dict, og siste aktive tid settes til nå.
        session_id = str(uuid.uuid4())
        session = await self.client.create_session({"model": "claude-sonnet-4.6"}) # Vi bruker vel sonnet i første omgang. Dette kan endres eller reroutes til et annet punkt senere tror jeg. 
        self.sessions[session_id] = session
        self.last_active[session_id] = datetime.now()
        self.history[session_id] = [] # initialiserer en tom historikk for den nye sessionen, 
        return session_id, session
    
    async def send_message(self, session_id, message):
        session = self.sessions [session_id]
        self.last_active[session_id] = datetime.now() # oppdaterer siste aktive tid for sessionen
        self.history[session_id].append({"role": "user", "content": message}) # legger til meldingen i historikken for sessionen
        
        response = await session.send_and_wait({"prompt": message})
        content = response.data.content
        self.history[session_id].append({"role": "assistant", "content": content}) # legger til svaret i historikken for sessionen
        return content
    
    async def cleanup_expired(self):
        now = datetime.now()
        expired = [
            session_id for session_id, last in self.last_active.items() if now - last > self.timeout
        ] #denne regner ut hvor lenge det har gått siden hver session sist var aktiv, og lager en liste over de som har vært inaktive lenger enn timeout-perioden. now - last = tidsdifferanse mellom now og siste aktivitet.
        
        for session_id in expired:
            await self.sessions[session_id].destroy() # ødelegger sessionen i Copilot
            del self.sessions[session_id] # fjerner sessionen fra sessions dict
            del self.last_active[session_id] # fjerner sessionen fra last_active dict
            del self.history[session_id] # fjerner sessionen fra history dict
            
        # Viktig å tenke på at cleanup_expired dict må samles utenfor loopen i en separat liste, og slettes i egen loop. Hvis den flyttes på eller settes inn i den første loopen vil det bli RuntimeError.
        
    def get_history(self, session_id):
        return self.history.get(session_id, [])
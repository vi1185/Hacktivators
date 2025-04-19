# app.py
from fastapi import FastAPI, HTTPException, BackgroundTasks, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from pydantic import BaseModel, Field, validator
from typing import Dict, List, Optional, Union, Any
from enum import Enum
import autogen
from autogen.agentchat import AssistantAgent, UserProxyAgent, GroupChat, GroupChatManager
from config import AgentRole, get_agent_config, create_agent_config_list, RETRY_CONFIG, get_model_params, MODEL_PARAMS
import json
import asyncio
from datetime import datetime
import os
from dotenv import load_dotenv
import re
import logging
import time
import uuid
import google.generativeai as genai

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables from .env file
load_dotenv()

# Configure Google GenerativeAI settings
try:
    # Reduce max remote calls from default 10 to 5 to improve performance
    genai.configure(
        api_key=os.getenv("GEMINI_API_KEY"),
        max_remote_calls=5  # Reduce the max remote calls limit
    )
    logger.info("Google GenerativeAI configured with reduced max_remote_calls")
except Exception as e:
    logger.error(f"Failed to configure Google GenerativeAI: {str(e)}")

app = FastAPI(title="AI Course Architect API")

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://192.168.17.243:8080", "http://localhost:8080", "http://localhost:3000", "http://localhost:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Custom exception handlers
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Custom handler for validation errors providing clear error messages"""
    logger.error(f"Request validation error: {exc}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "success": False,
            "error": "Invalid request parameters",
            "detail": exc.errors(),
            "metadata": {"timestamp": datetime.now().isoformat()}
        }
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Global exception handler to ensure consistent error responses"""
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "success": False, 
            "error": f"An unexpected error occurred: {str(exc)}",
            "metadata": {"timestamp": datetime.now().isoformat()}
        }
    )

# Initialize agents with the new configuration
agent_configs = create_agent_config_list()
agents = {}

# Create agents dynamically with proper configuration
for role, config in zip(AgentRole, agent_configs):
    try:
        agents[role] = AssistantAgent(
            name=config["name"],
            system_message=config["system_message"],
            llm_config=config["llm_config"]
        )
        logger.info(f"Successfully created agent for role: {role.name}")
    except Exception as e:
        logger.error(f"Failed to create agent for role {role.name}: {str(e)}")
        raise

# Create user proxy agent
user_proxy = UserProxyAgent(
    name="user_proxy",
    human_input_mode="NEVER",
    max_consecutive_auto_reply=3,
    code_execution_config=False,  # Explicitly disable code execution, do not use Docker
)

# Create group chat
groupchat = GroupChat(
    agents=list(agents.values()) + [user_proxy],
    messages=[],
    max_round=50
)

# Create group chat manager
group_chat_manager = GroupChatManager(
    groupchat=groupchat,
    name="group_chat_manager"
)

# Request/Response Models
class CourseRequest(BaseModel):
    topic: str
    difficulty: str = Field(..., description="beginner, intermediate, or advanced")
    duration: str = Field(..., description="2-weeks, 4-weeks, 8-weeks, or 12-weeks")
    seed: Optional[str] = None
    
    @validator('difficulty')
    def validate_difficulty(cls, v):
        valid_options = ["beginner", "intermediate", "advanced"]
        if v.lower() not in valid_options:
            raise ValueError(f"difficulty must be one of {valid_options}")
        return v.lower()
        
    @validator('duration')
    def validate_duration(cls, v):
        valid_options = ["2-weeks", "4-weeks", "8-weeks", "12-weeks"]
        if v.lower() not in valid_options:
            raise ValueError(f"duration must be one of {valid_options}")
        return v.lower()

class ContentRequest(BaseModel):
    topic: str
    type: str = Field(..., description="text, code, visual, or practice")
    context: Optional[Dict[str, Any]] = None
    seed: Optional[str] = None
    
    @validator('type')
    def validate_type(cls, v):
        valid_options = ["text", "code", "visual", "practice"]
        if v.lower() not in valid_options:
            raise ValueError(f"type must be one of {valid_options}")
        return v.lower()

class AssessmentRequest(BaseModel):
    topic: str
    type: str = Field(..., description="quiz, test, or practice")
    count: int = Field(default=5, ge=1, le=20)
    seed: Optional[str] = None
    
    @validator('type')
    def validate_type(cls, v):
        valid_options = ["quiz", "test", "practice"]
        if v.lower() not in valid_options:
            raise ValueError(f"type must be one of {valid_options}")
        return v.lower()
        
    @validator('count')
    def validate_count(cls, v):
        if v < 1:
            return 1
        if v > 20:
            return 20
        return v

class ChatRequest(BaseModel):
    message: str
    context: Optional[Dict[str, Any]] = None
    seed: Optional[str] = None
    
    @validator('message')
    def validate_message(cls, v):
        if not v or len(v.strip()) == 0:
            raise ValueError("message cannot be empty")
        return v

class APIResponse(BaseModel):
    success: bool
    data: Optional[Any] = None
    error: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

class CourseFromAssessmentRequest(BaseModel):
    topic: str
    assessment: Dict[str, Any]
    duration: str = Field(..., description="2-weeks, 4-weeks, 8-weeks, or 12-weeks")
    seed: Optional[str] = None
    
    @validator('duration')
    def validate_duration(cls, v):
        valid_options = ["2-weeks", "4-weeks", "8-weeks", "12-weeks"]
        if v.lower() not in valid_options:
            raise ValueError(f"duration must be one of {valid_options}")
        return v.lower()

class PersonaGenerationRequest(BaseModel):
    userInput: str
    topic: str
    seed: Optional[str] = None

class PersonaUpdateRequest(BaseModel):
    personaId: str
    changes: str
    seed: Optional[str] = None

class PersonaContentRequest(BaseModel):
    personaId: str
    topic: str
    contentType: str = Field(..., description="summary, introduction, or explanation")
    seed: Optional[str] = None

class CourseWithPersonaRequest(BaseModel):
    personaId: str
    topic: str
    difficulty: str = Field(..., description="beginner, intermediate, or advanced")
    duration: str = Field(..., description="2-weeks, 4-weeks, 8-weeks, or 12-weeks")
    seed: Optional[str] = None

# Helper Functions
def clean_json_response(text: str) -> Any:
    """
    Extracts and parses JSON from text that might contain non-JSON content.
    """
    # Improved logging for debugging
    logging.debug(f"Attempting to clean JSON response text of length: {len(text)}")
    
    # First try to parse directly - maybe it's already clean JSON
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        logging.debug("Direct JSON parsing failed, attempting extraction")
    
    # Try to extract JSON between {} or [] using regex pattern matching
    try:
        # Find outermost JSON object
        match = re.search(r'({[\s\S]*})', text)
        if match:
            json_text = match.group(1)
            try:
                return json.loads(json_text)
            except json.JSONDecodeError as e:
                logging.warning(f"Found JSON-like text but failed to parse: {e}")
        
        # Try to find JSON array if object not found
        match = re.search(r'(\[[\s\S]*\])', text)
        if match:
            json_text = match.group(1)
            try:
                return json.loads(json_text)
            except json.JSONDecodeError as e:
                logging.warning(f"Found JSON array-like text but failed to parse: {e}")
                
        # Check for code block format (common in markdown responses)
        match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', text)
        if match:
            json_text = match.group(1)
            try:
                return json.loads(json_text)
            except json.JSONDecodeError as e:
                logging.warning(f"Found code block but failed to parse as JSON: {e}")
    
        # If none of the above work, try the more complex extraction
        return extract_json_by_building(text)
    except Exception as e:
        logging.error(f"Error in JSON extraction: {e}")
        return {"error": "Failed to extract valid JSON"}

def extract_json_by_building(text: str) -> Any:
    """
    Try to build valid JSON by extracting substring and parsing character by character.
    This is a last resort for malformed JSON.
    """
    try:
        # Find the first { or [ character
        start_idx = min(
            text.find('{') if text.find('{') != -1 else float('inf'),
            text.find('[') if text.find('[') != -1 else float('inf')
        )
        
        if start_idx == float('inf'):
            return None
        
        # Start building from that character
        open_brackets = 0
        for i in range(start_idx, len(text)):
            if text[i] in '{[':
                open_brackets += 1
            elif text[i] in '}]':
                open_brackets -= 1
                
            if open_brackets == 0:
                # Found a matching closing bracket
                json_str = text[start_idx:i+1]
                try:
                    return json.loads(json_str)
                except json.JSONDecodeError:
                    # Try cleaning and retry
                    cleaned = json_str.replace('\n', ' ')
                    cleaned = re.sub(r'(\w+):', r'"\1":', cleaned)  # Quote unquoted keys
                    try:
                        return json.loads(cleaned)
                    except json.JSONDecodeError:
                        return None
        
        return None
    except Exception as e:
        logging.error(f"Error in extract_json_by_building: {str(e)}")
        return None

def validate_course_structure(data: Dict) -> Dict:
    """
    Validate and fix a course structure to ensure it has all required fields.
    """
    if not isinstance(data, dict):
        logging.warning(f"Course data is not a dictionary: {type(data)}")
        data = {"title": "Untitled Course", "modules": []}
    
    # Ensure all required fields exist
    required_fields = ["title", "description", "modules"]
    for field in required_fields:
        if field not in data:
            if field == "title":
                data[field] = "Untitled Course"
            elif field == "description":
                data[field] = "No description provided."
            elif field == "modules":
                data[field] = []
    
    # Ensure modules have required structure
    if "modules" in data and isinstance(data["modules"], list):
        for i, module in enumerate(data["modules"]):
            if not isinstance(module, dict):
                data["modules"][i] = {"title": f"Module {i+1}", "lessons": []}
                continue
                
            if "title" not in module:
                module["title"] = f"Module {i+1}"
            
            if "description" not in module:
                module["description"] = f"Description for {module['title']}"
                
            if "lessons" not in module or not isinstance(module["lessons"], list):
                module["lessons"] = []
                
            # Validate lessons
            for j, lesson in enumerate(module["lessons"]):
                if not isinstance(lesson, dict):
                    module["lessons"][j] = {"title": f"Lesson {j+1}", "content": ""}
                    continue
                    
                if "title" not in lesson:
                    lesson["title"] = f"Lesson {j+1}"
                
                if "content" not in lesson:
                    lesson["content"] = ""
    
    return data

def validate_assessment_questions(data: Dict) -> Dict:
    """
    Validate and fix assessment questions to ensure they have all required fields.
    Returns a valid structure even if the input is malformed.
    """
    if not isinstance(data, dict):
        logging.warning(f"Assessment data is not a dictionary: {type(data)}")
        data = {"questions": []}
    
    # Check if the data structure contains questions
    if "questions" not in data or not isinstance(data["questions"], list) or len(data["questions"]) == 0:
        logging.warning("No valid questions found in assessment response. Creating default questions.")
        # Generate default questions as a fallback
        data["questions"] = [
            {
                "id": f"q_{uuid.uuid4().hex[:8]}",
                "question": "How would you rate your familiarity with this topic?",
                "options": ["Not familiar at all", "Somewhat familiar", "Moderately familiar", "Very familiar", "Expert level"],
                "type": "multiple_choice",
                "category": "prior_experience"
            },
            {
                "id": f"q_{uuid.uuid4().hex[:8]}",
                "question": "How do you prefer to learn new concepts?",
                "options": ["Reading text", "Watching videos", "Hands-on practice", "Structured tutorials", "Open exploration"],
                "type": "multiple_choice",
                "category": "learning_style"
            },
            {
                "id": f"q_{uuid.uuid4().hex[:8]}",
                "question": "What is your primary goal for learning this topic?",
                "options": ["Professional development", "Academic requirement", "Personal interest", "Specific project", "General knowledge"],
                "type": "multiple_choice",
                "category": "goals"
            }
        ]
    
    # Ensure all questions have required fields
    for i, question in enumerate(data["questions"]):
        if not isinstance(question, dict):
            data["questions"][i] = {
                "id": f"q_{i+1}_{uuid.uuid4().hex[:8]}",
                "question": f"Question {i+1}",
                "options": ["Option A", "Option B", "Option C", "Option D"],
                "type": "multiple_choice",
                "category": "general_knowledge"
            }
            continue
            
        # Ensure required fields
        if "id" not in question:
            question["id"] = f"q_{i+1}_{uuid.uuid4().hex[:8]}"
        
        if "question" not in question or not question["question"]:
            question["question"] = f"Question {i+1}"
            
        if "options" not in question or not isinstance(question["options"], list) or len(question["options"]) < 2:
            question["options"] = ["Option A", "Option B", "Option C", "Option D"]
            
        if "type" not in question:
            question["type"] = "multiple_choice"
            
        if "category" not in question:
            question["category"] = "general_knowledge"
    
    return data

async def execute_agent_task_with_retry(agent: AssistantAgent, task: str, context: Optional[Dict] = None, role: AgentRole = None) -> str:
    """Execute an agent task with retry logic."""
    last_error = None
    
    # Get role-specific model parameters if role is provided
    model_params = get_model_params(role) if role else MODEL_PARAMS["default"]
    
    for attempt in range(RETRY_CONFIG["max_retries"]):
        try:
            # Convert context to string if provided
            context_str = json.dumps(context) if context else ""
            
            # Combine task and context
            full_prompt = f"{task}\nContext: {context_str}" if context else task
            
            # Add model parameters to prompt
            if model_params:
                param_str = f"\n\nModel Parameters: Temperature: {model_params['temperature']}, Max Tokens: {model_params['max_tokens']}"
                full_prompt += param_str
                logger.info(f"Using model parameters: {model_params}")
            
            # Add explicit instructions to reduce maximum auto-replies problem
            full_prompt += "\n\nIMPORTANT: Provide a DIRECT RESPONSE in the requested format. DO NOT engage in multi-turn reasoning."
            
            # Configure user_proxy to minimize consecutive auto-replies
            modified_user_proxy = UserProxyAgent(
                name="user_proxy",
                human_input_mode="NEVER",
                max_consecutive_auto_reply=1,  # Limit to 1 auto-reply to prevent loops
                code_execution_config=False,  # Explicitly disable code execution
            )
            
            # Execute the task
            try:
                # Use a timeout to prevent hanging
                result = await asyncio.wait_for(
                    asyncio.to_thread(
                        modified_user_proxy.initiate_chat,
                        agent,
                        message=full_prompt
                    ),
                    timeout=RETRY_CONFIG["request_timeout"]
                )
                
                # Extract the last message from the chat history
                if result and result.chat_history and len(result.chat_history) > 0:
                    response = result.chat_history[-1].get("content", "")
                    
                    # Handle common failure modes by checking content
                    if "I'm sorry, I can't assist" in response or "I'll need more information" in response:
                        if attempt < RETRY_CONFIG["max_retries"] - 1:
                            logger.warning(f"Unhelpful response detected. Retrying.")
                            await asyncio.sleep(RETRY_CONFIG["retry_delay"])
                            continue
                    
                    return response
                else:
                    raise ValueError("Empty response received from agent")
                    
            except asyncio.TimeoutError:
                logger.warning(f"Request timed out after {RETRY_CONFIG['request_timeout']} seconds. Retrying.")
                if attempt < RETRY_CONFIG["max_retries"] - 1:
                    await asyncio.sleep(RETRY_CONFIG["retry_delay"])
                    continue
                else:
                    raise HTTPException(status_code=500, detail=f"Request timed out after {RETRY_CONFIG['request_timeout']} seconds")
                
        except Exception as e:
            last_error = e
            logger.warning(f"Attempt {attempt + 1} failed: {str(e)}")
            if attempt < RETRY_CONFIG["max_retries"] - 1:
                logger.info(f"Retrying in {RETRY_CONFIG['retry_delay']} seconds...")
                await asyncio.sleep(RETRY_CONFIG["retry_delay"])
            else:
                logger.error(f"All {RETRY_CONFIG['max_retries']} attempts failed")
                raise HTTPException(status_code=500, detail=f"Failed after {RETRY_CONFIG['max_retries']} attempts: {str(last_error)}")
    
    # This should not be reached due to the exception in the loop, but just in case
    raise HTTPException(status_code=500, detail="Failed to execute agent task")

async def execute_agent_task(agent: AssistantAgent, task: str, context: Optional[Dict] = None) -> str:
    try:
        # Convert context to string if provided
        context_str = json.dumps(context) if context else ""
        
        # Combine task and context
        full_prompt = f"{task}\nContext: {context_str}" if context else task
        
        # Execute the task
        result = await asyncio.to_thread(
            user_proxy.initiate_chat,
            agent,
            message=full_prompt
        )
        
        # Extract the last message from the chat history
        return result.chat_history[-1].get("content", "")
    except Exception as e:
        logger.error(f"Agent task execution failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e)) 

async def execute_group_task(task: str, context: Optional[Dict] = None) -> str:
    try:
        # Convert context to string if provided
        context_str = json.dumps(context) if context else ""
        
        # Combine task and context
        full_prompt = f"{task}\nContext: {context_str}" if context else task
        
        # Execute the group task
        result = await asyncio.to_thread(
            group_chat_manager.run,
            message=full_prompt
        )
        
        return result
    except Exception as e:
        logger.error(f"Group task execution failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/course/generate", response_model=APIResponse)
async def generate_course(request: CourseRequest):
    """Generate a complete course structure"""
    try:
        logger.info(f"Generating course for topic: {request.topic}, difficulty: {request.difficulty}, duration: {request.duration}")
        
        # Create a detailed prompt for course generation
        prompt = f"""
Generate a complete course structure on {request.topic} for {request.difficulty} level with duration {request.duration}.

Important guidelines:
1. Create a comprehensive course with clear learning objectives
2. Include modules with logical progression
3. Each module should have related lessons
4. Include realistic time estimates
5. The response MUST be in valid JSON format with the following structure:

```json
{{
  "title": "Course Title",
  "description": "Course Description",
  "prerequisites": ["Prerequisite 1", "Prerequisite 2"],
  "learningGoals": ["Goal 1", "Goal 2"],
  "modules": [
    {{
      "id": "module_1",
      "name": "Module Name",
      "description": "Module Description",
      "order": 1,
      "duration": 7,
      "lessons": [
        {{
          "id": "lesson_1",
          "title": "Lesson Title",
          "content": "Lesson Content Overview",
          "order": 1,
          "duration": 2
        }}
      ]
    }}
  ],
  "difficulty": "{request.difficulty}",
  "duration": "{request.duration}"
}}
```

Return ONLY the valid JSON object, no additional text before or after.
        """
        
        result = await execute_agent_task_with_retry(
            agents[AgentRole.COURSE_DESIGNER], 
            prompt,
            role=AgentRole.COURSE_DESIGNER
        )
        
        # Clean and parse the JSON response
        try:
            parsed_result = clean_json_response(result)
            
            # Validate essential fields in the course structure
            if not isinstance(parsed_result, dict) or not parsed_result.get("modules"):
                logger.warning("Invalid course structure received")
                # Return a simplified error response
                return APIResponse(
                    success=False,
                    error="Failed to generate valid course structure",
                    metadata={"timestamp": datetime.now().isoformat()}
                )
            
            # Add required fields if missing
            if "id" not in parsed_result:
                parsed_result["id"] = str(uuid.uuid4())
            
            if "createdAt" not in parsed_result:
                parsed_result["createdAt"] = datetime.now().isoformat()
                
            if "updatedAt" not in parsed_result:
                parsed_result["updatedAt"] = datetime.now().isoformat()
                
            if "user_id" not in parsed_result:
                parsed_result["user_id"] = "system"
                
            # Add IDs to modules and lessons if missing
            for i, module in enumerate(parsed_result.get("modules", [])):
                if "id" not in module:
                    module["id"] = f"module_{i+1}"
                if "completed" not in module:
                    module["completed"] = False
                if "progress" not in module:
                    module["progress"] = 0
                
                for j, lesson in enumerate(module.get("lessons", [])):
                    if "id" not in lesson:
                        lesson["id"] = f"lesson_{i+1}_{j+1}"
                    if "completed" not in lesson:
                        lesson["completed"] = False
                    if "progress" not in lesson:
                        lesson["progress"] = 0
                    if "exercises" not in lesson:
                        lesson["exercises"] = []
                    if "resources" not in lesson:
                        lesson["resources"] = []
                    if "sessions" not in lesson:
                        lesson["sessions"] = []
            
            return APIResponse(
                success=True,
                data=parsed_result,
                metadata={"timestamp": datetime.now().isoformat()}
            )
        except Exception as parsing_error:
            logger.error(f"Error parsing course generation result: {str(parsing_error)}")
            return APIResponse(
                success=False,
                error=f"Failed to parse course structure: {str(parsing_error)}",
                metadata={"timestamp": datetime.now().isoformat()}
            )
            
    except Exception as e:
        logger.error(f"Course generation failed: {str(e)}")
        return APIResponse(success=False, error=str(e))

@app.post("/content/generate", response_model=APIResponse)
async def generate_content(request: ContentRequest):
    """Generate specific content based on type"""
    try:
        logger.info(f"Generating {request.type} content for topic: {request.topic}")
        
        # Select appropriate agent based on content type
        agent_role = {
            "text": AgentRole.CONTENT_CREATOR,
            "code": AgentRole.CODE_EXPERT,
            "visual": AgentRole.VISUAL_DESIGNER,
            "practice": AgentRole.PRACTICE_GENERATOR
        }.get(request.type)
        
        if not agent_role:
            raise ValueError(f"Invalid content type: {request.type}")
        
        # Create content-specific prompt
        if request.type == "visual":
            visual_type = request.context.get("visualType", "diagram") if request.context else "diagram"
            prompt = f"""
Generate a {visual_type} visualization for {request.topic}.
The response should be valid JSON with the following structure:

```json
{{
  "type": "{visual_type}",
  "code": "The visualization code or data",
  "style": {{
    "theme": "light",
    "colors": ["#primary", "#secondary"]
  }}
}}
```
            """
        elif request.type == "code":
            language = request.context.get("language", "javascript") if request.context else "javascript"
            prompt = f"""
Generate code content for {request.topic} in {language}.
The response should be valid JSON with the following structure:

```json
{{
  "title": "Code Example Title",
  "description": "What this code demonstrates",
  "language": "{language}",
  "code": "The actual code",
  "explanation": "Line by line explanation",
  "testCases": [
    {{
      "input": "Test input",
      "expectedOutput": "Expected output"
    }}
  ]
}}
```
            """
        else:
            prompt = f"""
Generate {request.type} content for topic: {request.topic}.
The response should be valid JSON with appropriate structure for {request.type} content.
            """
            
        # Add context if provided
        if request.context:
            prompt += f"\n\nAdditional context: {json.dumps(request.context)}"
        
        # Execute the task
        result = await execute_agent_task_with_retry(
            agents[agent_role], 
            prompt,
            context=request.context,
            role=agent_role
        )
        
        # Clean and parse the JSON response
        try:
            parsed_result = clean_json_response(result)
            
            # For visual content, ensure proper structure
            if request.type == "visual" and isinstance(parsed_result, dict):
                if "type" not in parsed_result and visual_type:
                    parsed_result["type"] = visual_type
                if "code" not in parsed_result and "content" in parsed_result:
                    parsed_result["code"] = parsed_result["content"]
            
            return APIResponse(
                success=True,
                data=parsed_result,
                metadata={"timestamp": datetime.now().isoformat()}
            )
        except Exception as parsing_error:
            logger.error(f"Error parsing content generation result: {str(parsing_error)}")
            return APIResponse(
                success=False, 
                error=f"Failed to parse content: {str(parsing_error)}",
                data={"raw_content": result[:1000] if result else "No content returned"},
                metadata={"timestamp": datetime.now().isoformat()}
            )
            
    except Exception as e:
        logger.error(f"Content generation failed: {str(e)}")
        return APIResponse(success=False, error=str(e))

@app.post("/chat", response_model=APIResponse)
async def chat(request: ChatRequest):
    """Chat with the AI assistant"""
    try:
        logger.info(f"Processing chat request: {request.message[:50]}...")
        
        # Create a detailed prompt for chat
        prompt = f"""
You are a helpful learning assistant. Respond to the following message:

{request.message}

Your response should be in JSON format with the following structure:

```json
{{
  "response": "Your detailed response here",
  "type": "explanation|guidance|solution",
  "resources": [
    {{
      "title": "Resource Title",
      "url": "Resource URL",
      "type": "article|video|exercise"
    }}
  ],
  "followUp": ["Suggested follow-up question 1", "Suggested follow-up question 2"]
}}
```
        """
        
        # Add context if provided
        if request.context:
            prompt += f"\n\nAdditional context: {json.dumps(request.context)}"
        
        # Execute with the chat assistant
        result = await execute_agent_task_with_retry(
            agents[AgentRole.CHAT_ASSISTANT],
            prompt,
            context=request.context,
            role=AgentRole.CHAT_ASSISTANT
        )
        
        # Clean and parse the JSON response
        try:
            parsed_result = clean_json_response(result)
            
            # Handle case where response is plain text
            if isinstance(parsed_result, dict) and "content" in parsed_result:
                # Convert plain text to expected format
                parsed_result = {
                    "response": parsed_result["content"],
                    "type": "explanation"
                }
                
            # Handle simple string responses
            if isinstance(parsed_result, str):
                parsed_result = {
                    "response": parsed_result,
                    "type": "explanation"
                }
            
            return APIResponse(
                success=True,
                data=parsed_result,
                metadata={"timestamp": datetime.now().isoformat()}
            )
        except Exception as parsing_error:
            logger.error(f"Error parsing chat response: {str(parsing_error)}")
            # Still return something useful to the user
            return APIResponse(
                success=True,
                data={"response": result, "type": "raw"},
                metadata={"timestamp": datetime.now().isoformat(), "parsing_error": str(parsing_error)}
            )
            
    except Exception as e:
        logger.error(f"Chat request failed: {str(e)}")
        return APIResponse(success=False, error=str(e))

@app.post("/collaborative/task", response_model=APIResponse)
async def collaborative_task(request: ContentRequest):
    """Execute a task using multiple agents collaboratively"""
    try:
        logger.info(f"Executing collaborative task for topic: {request.topic}")
        
        # Create a collaborative prompt
        prompt = f"""
Collaborate as a team to create comprehensive content about: {request.topic}

Return the final answer in valid JSON format.
        """
        
        # Add context if provided
        if request.context:
            prompt += f"\n\nAdditional context: {json.dumps(request.context)}"
        
        # Execute the group task
        result = await execute_group_task(
            f"Collaborate to create content about: {request.topic}",
            request.context
        )
        
        # Clean and parse the JSON response
        try:
            # Try to extract JSON from the collaborative response
            parsed_result = clean_json_response(result)
            
            return APIResponse(
                success=True,
                data=parsed_result,
                metadata={"timestamp": datetime.now().isoformat()}
            )
        except Exception as parsing_error:
            logger.error(f"Error parsing collaborative task result: {str(parsing_error)}")
            # Return raw result if parsing fails
            return APIResponse(
                success=True,
                data={"content": result, "format": "text", "warning": "Failed to parse as JSON"},
                metadata={"timestamp": datetime.now().isoformat()}
            )
            
    except Exception as e:
        logger.error(f"Collaborative task failed: {str(e)}")
        return APIResponse(success=False, error=str(e))

@app.post("/assessment/generate", response_model=APIResponse)
async def generate_assessment(request: AssessmentRequest):
    """Generate assessment questions based on type and count"""
    try:
        logger.info(f"Generating {request.type} assessment for topic: {request.topic}, count: {request.count}")
        
        # Create a detailed prompt for assessment generation
        prompt = f"""
Generate {request.count} assessment questions to evaluate a user's learning preferences, styles, and needs for a course on {request.topic}.

Important guidelines:
1. Do NOT create technical questions about {request.topic}. Instead, focus on assessing:
   - Learning style preferences (visual, auditory, reading, kinesthetic)
   - Time availability and commitment
   - Prior experience level with the topic
   - Content preferences (videos, reading, projects, etc.)
   - Learning challenges and concerns
   - Goals and motivations
   - Preferred learning pace

2. For multiple choice questions:
   - Provide clear, descriptive options that represent different preferences
   - Each option should be a complete, grammatically correct phrase
   - Label options as full sentences, not just "Option A" or "Option 1"
   - Ensure options are distinct and cover a range of preferences

3. Each question should help customize the learning experience
4. Include explanations for why each question is important for course customization
5. The response MUST be in valid JSON format with the following structure:

```json
{{
  "questions": [
    {{
      "id": "q1",
      "type": "multiple_choice",
      "question": "How do you prefer to learn new concepts?",
      "options": ["By watching videos and demonstrations", "By listening to explanations and discussions", "By reading detailed materials and documentation", "By hands-on practice and experimentation"],
      "correctAnswer": "By watching videos and demonstrations",
      "explanation": "This helps identify the learner's primary learning style preference.",
      "difficulty": "easy",
      "category": "learning_style"
    }}
  ],
  "totalPoints": {request.count * 10},
  "timeLimit": "{max(15, request.count * 2)} minutes",
  "passingScore": {request.count * 7}
}}
```

Return ONLY the valid JSON object, no additional text before or after.
        """
        
        # Execute with the assessment creator agent
        result = await execute_agent_task_with_retry(
            agents[AgentRole.ASSESSMENT_CREATOR],
            prompt,
            role=AgentRole.ASSESSMENT_CREATOR
        )
        
        # Clean and parse the JSON response
        try:
            parsed_result = clean_json_response(result)
            
            # Validate assessment structure
            validated_result = validate_assessment_questions(parsed_result)
            
            # Ensure each question has an ID and difficulty
            if "questions" in validated_result and isinstance(validated_result["questions"], list):
                for i, question in enumerate(validated_result["questions"]):
                    if not question.get("id"):
                        question["id"] = f"q{i+1}"
                    if not question.get("difficulty"):
                        question["difficulty"] = "medium"
                    
                    # Ensure options are present for multiple choice questions
                    if question.get("type") == "multiple_choice" and not question.get("options"):
                        question["options"] = [f"Option {chr(65+j)}" for j in range(4)]
                        
                    # Ensure correct answer format
                    if "correctAnswer" not in question and "answer" in question:
                        question["correctAnswer"] = question["answer"]
                        del question["answer"]
                    
                    # Add explanation if missing
                    if not question.get("explanation"):
                        question["explanation"] = f"Explanation for question {i+1}"
            
            # If no questions were found, try to extract questions from text format
            if not validated_result.get("questions") and isinstance(result, str):
                extracted_questions = extract_questions_from_text(result)
                if extracted_questions:
                    validated_result = {
                        "questions": extracted_questions,
                        "totalPoints": len(extracted_questions) * 10,
                        "timeLimit": f"{max(15, len(extracted_questions) * 2)} minutes",
                        "passingScore": len(extracted_questions) * 7
                    }
            
            # Final validation - ensure we have at least some questions
            if not validated_result.get("questions") or not isinstance(validated_result["questions"], list) or len(validated_result["questions"]) == 0:
                logger.warning("No valid questions found in assessment response. Returning default questions.")
                # Return a default set of questions instead of failing
                default_questions = [
                    {
                        "id": "q1",
                        "type": "multiple_choice",
                        "question": "How do you prefer to learn new concepts?",
                        "options": ["By watching videos and demonstrations", "By listening to explanations and discussions", 
                                    "By reading detailed materials and documentation", "By hands-on practice and experimentation"],
                        "correctAnswer": "By watching videos and demonstrations",
                        "explanation": "This helps identify your primary learning style preference.",
                        "difficulty": "easy",
                        "category": "learning_style"
                    },
                    {
                        "id": "q2",
                        "type": "multiple_choice",
                        "question": "How much time can you dedicate to studying this topic each week?",
                        "options": ["Less than 2 hours", "2-5 hours", "5-10 hours", "More than 10 hours"],
                        "correctAnswer": "2-5 hours",
                        "explanation": "This helps determine appropriate course pacing and content volume.",
                        "difficulty": "easy",
                        "category": "time_availability"
                    },
                    {
                        "id": "q3",
                        "type": "multiple_choice",
                        "question": "What is your current level of experience with this topic?",
                        "options": ["Complete beginner with no prior knowledge", "Some basic understanding", 
                                   "Intermediate knowledge", "Advanced knowledge"],
                        "correctAnswer": "Some basic understanding",
                        "explanation": "This helps tailor content to your knowledge level.",
                        "difficulty": "easy",
                        "category": "prior_experience"
                    },
                    {
                        "id": "q4",
                        "type": "multiple_choice",
                        "question": "What type of learning materials do you prefer?",
                        "options": ["Video tutorials and demonstrations", "Interactive exercises and quizzes", 
                                   "Comprehensive reading materials", "Practical projects and case studies"],
                        "correctAnswer": "Video tutorials and demonstrations",
                        "explanation": "This helps select appropriate content formats.",
                        "difficulty": "easy",
                        "category": "preferences"
                    },
                    {
                        "id": "q5",
                        "type": "multiple_choice",
                        "question": "What challenges do you typically face when learning something new?",
                        "options": ["Maintaining focus and motivation", "Understanding complex or abstract concepts", 
                                   "Finding time to practice consistently", "Applying concepts to real-world scenarios"],
                        "correctAnswer": "Finding time to practice consistently",
                        "explanation": "This helps address potential learning obstacles.",
                        "difficulty": "medium",
                        "category": "challenges"
                    },
                    {
                        "id": "q6",
                        "type": "multiple_choice",
                        "question": "At what pace do you prefer to learn?",
                        "options": ["Intensive and fast-paced", "Steady and methodical", 
                                   "Relaxed with plenty of time for review", "Variable depending on the topic"],
                        "correctAnswer": "Steady and methodical",
                        "explanation": "This helps determine appropriate pacing for course materials.",
                        "difficulty": "easy",
                        "category": "goals"
                    }
                ]
                validated_result = {
                    "questions": default_questions,
                    "totalPoints": len(default_questions) * 10,
                    "timeLimit": f"{max(15, len(default_questions) * 2)} minutes",
                    "passingScore": len(default_questions) * 7
                }
                return APIResponse(
                    success=True,
                    data=validated_result,
                    metadata={"timestamp": datetime.now().isoformat(), "note": "Using default questions due to generation failure"}
                )
            
            return APIResponse(
                success=True,
                data=validated_result,
                metadata={"timestamp": datetime.now().isoformat()}
            )
            
        except Exception as parsing_error:
            logger.error(f"Error parsing assessment result: {str(parsing_error)}")
            
            # Try to salvage any content by extracting questions from text
            try:
                if isinstance(result, str):
                    extracted_questions = extract_questions_from_text(result)
                    if extracted_questions:
                        return APIResponse(
                            success=True,
                            data={
                                "questions": extracted_questions,
                                "totalPoints": len(extracted_questions) * 10,
                                "timeLimit": f"{max(15, len(extracted_questions) * 2)} minutes",
                                "passingScore": len(extracted_questions) * 7,
                                "warning": "Questions extracted from text format"
                            },
                            metadata={"timestamp": datetime.now().isoformat()}
                        )
            except Exception as extraction_error:
                logger.error(f"Error extracting questions from text: {str(extraction_error)}")
            
            # Return error with partial content if possible
            return APIResponse(
                success=False,
                error=f"Failed to parse assessment: {str(parsing_error)}",
                data={"raw_content": result[:1000] if result else "No content returned"},
                metadata={"timestamp": datetime.now().isoformat()}
            )
            
    except Exception as e:
        logger.error(f"Assessment generation failed: {str(e)}")
        return APIResponse(success=False, error=str(e))

def extract_questions_from_text(text: str) -> List[Dict[str, Any]]:
    """Extract questions from plain text format."""
    questions = []
    lines = text.split('\n')
    current_question = None
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
            
        # Look for question patterns - handle various numbering formats
        question_match = re.match(r'^\s*(\d+)[\.\)]\s+(.*)', line) or re.match(r'^\s*Question\s+(\d+)[\.\:]?\s+(.*)', line)
        if question_match:
            # Save previous question if exists
            if current_question and current_question.get('options', []):
                questions.append(current_question)
                
            # Start new question
            current_question = {
                "id": f"q_{question_match.group(1)}",
                "type": "multiple_choice",
                "question": question_match.group(2),
                "options": [],
                "category": "general_knowledge",
                "weight": 1
            }
            
            # Categorize questions for learning assessment
            question_text = question_match.group(2).lower()
            if any(word in question_text for word in ['prefer', 'like', 'enjoy', 'rather']):
                current_question['category'] = 'preferences'
            elif any(word in question_text for word in ['learning style', 'learn best', 'absorb']):
                current_question['category'] = 'learning_style'
            elif any(word in question_text for word in ['time', 'hours', 'schedule', 'spend']):
                current_question['category'] = 'time_availability'
            elif any(word in question_text for word in ['experience', 'familiar', 'knowledge', 'understand']):
                current_question['category'] = 'prior_experience'
            elif any(word in question_text for word in ['challenge', 'difficult', 'struggle', 'hard']):
                current_question['category'] = 'challenges'
            elif any(word in question_text for word in ['goal', 'achieve', 'want to', 'aim']):
                current_question['category'] = 'goals'
                
        # Match multiple choice options with various formats (a., A., a), (a), etc.)
        elif current_question and re.match(r'^\s*[a-dA-D][\.\)]\s+', line):
            # This looks like a multiple choice option
            current_question["type"] = "multiple_choice"
            current_question["options"].append(line.strip())
        # Match options with number formatting (1., 1), etc.)
        elif current_question and re.match(r'^\s*[1-4][\.\)]\s+', line) and len(current_question["options"]) < 4:
            current_question["options"].append(line.strip())
        # Match true/false questions
        elif current_question and re.search(r'\b(true|false)\b', line.lower()):
            # This might be a true/false question
            current_question["type"] = "true_false"
            if not current_question["options"]:
                current_question["options"] = ["True", "False"]
        # Match answer lines
        elif current_question and (re.search(r'(correct\s+)?answer[\s\:]+', line, re.IGNORECASE) or line.startswith('**Answer:')):
            # This looks like the answer
            answer_text = re.sub(r'.*answer[\s\:]+', '', line, flags=re.IGNORECASE)
            answer_text = answer_text.strip('* ')
            current_question["correctAnswer"] = answer_text
            
            # Convert letter answers (A, B, C, D) to option index
            if re.match(r'^[A-Da-d]$', answer_text):
                letter_index = ord(answer_text.upper()) - ord('A')
                if 0 <= letter_index < len(current_question["options"]):
                    current_question["correctAnswer"] = current_question["options"][letter_index]
    
    # Add the last question
    if current_question and current_question.get('options', []):
        questions.append(current_question)
        
    # If we have questions without answers, try to add reasonable ones
    for q in questions:
        if not q.get('correctAnswer') and q.get('options'):
            # Default to first option as answer if none provided
            q['correctAnswer'] = q['options'][0]
    
    return questions

@app.post("/course/generate-from-assessment", response_model=APIResponse)
async def generate_course_from_assessment(request: CourseFromAssessmentRequest):
    """Generate a course based on user assessment results"""
    try:
        logger.info(f"Generating course from assessment for topic: {request.topic}, with assessment data and duration: {request.duration}")
        
        # Create a detailed prompt for personalized course generation
        prompt = f"""
Generate a personalized course outline on "{request.topic}" with duration {request.duration}, 
tailored to the following user assessment results:

Learning Style Preferences:
- Visual: {request.assessment.get('learningStyle', {}).get('visual', 0)}
- Auditory: {request.assessment.get('learningStyle', {}).get('auditory', 0)}
- Reading: {request.assessment.get('learningStyle', {}).get('reading', 0)}
- Kinesthetic: {request.assessment.get('learningStyle', {}).get('kinesthetic', 0)}

Time Commitment:
- Hours per week: {request.assessment.get('timeCommitment', {}).get('hoursPerWeek', 5)}
- Preferred time of day: {request.assessment.get('timeCommitment', {}).get('preferredTimeOfDay', 'flexible')}

Prior Knowledge:
- Level: {request.assessment.get('priorKnowledge', {}).get('level', 'beginner')}

Content Preferences:
- Practical projects: {request.assessment.get('preferences', {}).get('practicalProjects', False)}
- Group work: {request.assessment.get('preferences', {}).get('groupWork', False)}
- Reading materials: {request.assessment.get('preferences', {}).get('readingMaterials', False)}
- Video content: {request.assessment.get('preferences', {}).get('videoContent', False)}
- Interactive exercises: {request.assessment.get('preferences', {}).get('interactiveExercises', False)}

Learning Challenges:
{", ".join(request.assessment.get('challenges', []))}

Recommended Pace:
{request.assessment.get('recommendedPace', 'standard')}

IMPORTANT REQUIREMENTS:
1. Focus on creating MORE MODULES (6-8 modules minimum) with a logical learning progression
2. For each module, include ONLY a title, description, and estimated duration
3. Modules should be comprehensive but focused on specific sub-topics
4. Do NOT generate detailed lessons content at this stage - lessons will be generated later
5. Ensure modules build on each other in a progressive learning path

The response MUST be in valid JSON format with the following structure:

```json
{{
  "title": "Course Title",
  "description": "Course Description",
  "prerequisites": ["Prerequisite 1", "Prerequisite 2"],
  "learningGoals": ["Goal 1", "Goal 2"],
  "modules": [
    {{
      "id": "module_1",
      "name": "Module Name",
      "description": "Module Description",
      "order": 1,
      "duration": 7,
      "lessons": [
        {{
          "id": "lesson_1",
          "title": "Lesson Title",
          "content": "Lesson Content Overview",
          "order": 1,
          "duration": 2
        }}
      ]
    }}
  ],
  "difficulty": "{request.assessment.get('priorKnowledge', {}).get('level', 'beginner')}",
  "duration": "{request.duration}"
}}
```

Return ONLY the valid JSON object, no additional text before or after.
        """
        
        # Create a function to intercept and capture the first valid response
        first_valid_response = None
        
        def extract_valid_json(text: str) -> Any:
            """Extract valid JSON from a response that might contain additional text"""
            logger.info("Attempting to extract valid JSON from response")
            
            # First try to find JSON in markdown code blocks
            json_match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', text)
            if json_match:
                json_content = json_match.group(1).strip()
                try:
                    parsed = json.loads(json_content)
                    logger.info("Successfully extracted JSON from code block")
                    return parsed
                except json.JSONDecodeError as je:
                    logger.warning(f"Failed to parse JSON from code block: {str(je)}")
            
            # Next, try to extract JSON using regex patterns
            # Look for content that starts with { and ends with }
            json_match = re.search(r'(\{[\s\S]*\})', text)
            if json_match:
                json_content = json_match.group(1).strip()
                try:
                    parsed = json.loads(json_content)
                    logger.info("Successfully extracted JSON using regex pattern")
                    return parsed
                except json.JSONDecodeError as je:
                    logger.warning(f"Failed to parse JSON using regex: {str(je)}")
            
            # Finally, fall back to the clean_json_response function
            try:
                parsed = clean_json_response(text)
                return parsed
            except Exception as e:
                logger.error(f"Failed to extract JSON: {str(e)}")
                return None

        def capture_valid_response(response_text):
            nonlocal first_valid_response
            if first_valid_response:
                return  # Already captured a valid response
                
            try:
                # Try to extract valid JSON from the response
                parsed = extract_valid_json(response_text)
                
                # Validate that it's a course structure
                if (isinstance(parsed, dict) and parsed.get("modules") and 
                    isinstance(parsed["modules"], list) and len(parsed["modules"]) > 0):
                    logger.info(f"Captured valid course structure with {len(parsed['modules'])} modules")
                    first_valid_response = parsed
            except Exception as e:
                logger.error(f"Error parsing potential response: {str(e)}")

        # Add an observer to the COURSE_DESIGNER agent to capture the first valid response
        agents[AgentRole.COURSE_DESIGNER].register_reply(
            [agents[AgentRole.COURSE_DESIGNER].name],
            capture_valid_response
        )
        
        # Call the agent task
        result = await execute_agent_task_with_retry(
            agents[AgentRole.COURSE_DESIGNER], 
            prompt,
            role=AgentRole.COURSE_DESIGNER
        )
        
        # If we captured a valid response, use it instead of the final result
        if first_valid_response:
            logger.info(f"Using first valid course structure captured during conversation with {len(first_valid_response.get('modules', []))} modules")
            parsed_result = first_valid_response
        else:
            # Try to extract JSON from the final result
            parsed_result = extract_valid_json(result)
            if not parsed_result:
                logger.warning("Failed to extract valid JSON from the final result")

        # Validate we have a valid course structure       
        if not parsed_result or not isinstance(parsed_result, dict) or not parsed_result.get("modules"):
            logger.warning("Invalid course structure received, using fallback course structure")
            # Create a fallback course structure
            topic = request.topic
            difficulty = request.assessment.get('priorKnowledge', {}).get('level', 'beginner')
            duration = request.duration
            
            # Determine preferred learning style
            learning_styles = request.assessment.get('learningStyle', {})
            preferred_style = "mixed"
            if learning_styles.get('visual', 0) > learning_styles.get('auditory', 0) and learning_styles.get('visual', 0) > learning_styles.get('reading', 0) and learning_styles.get('visual', 0) > learning_styles.get('kinesthetic', 0):
                preferred_style = "visual"
            elif learning_styles.get('auditory', 0) > learning_styles.get('reading', 0) and learning_styles.get('auditory', 0) > learning_styles.get('kinesthetic', 0):
                preferred_style = "auditory"
            elif learning_styles.get('reading', 0) > learning_styles.get('kinesthetic', 0):
                preferred_style = "reading"
            else:
                preferred_style = "kinesthetic"
            
            # Create a comprehensive fallback course structure with 6 modules
            # Calculate module durations based on course duration
            weeks = int(duration.split("-")[0])
            total_days = weeks * 7
            module_days = total_days // 6  # Distribute days across 6 modules
            
            parsed_result = {
                "id": str(uuid.uuid4()),
                "title": f"{topic} - {difficulty.capitalize()} Level Course",
                "description": f"A {duration} course on {topic} for {difficulty} level students, optimized for {preferred_style} learners.",
                "prerequisites": [f"Basic understanding of {topic} concepts", "Willingness to learn and practice regularly"],
                "learningGoals": [
                    f"Understand core {topic} concepts and principles",
                    "Apply theoretical knowledge to practical problems",
                    f"Develop confidence in working with {topic}",
                    "Build a foundation for more advanced learning"
                ],
                "modules": [
                    {
                        "id": "module_1",
                        "name": f"Introduction to {topic}",
                        "description": f"Get started with the fundamentals of {topic} and establish a solid foundation for the rest of the course.",
                        "order": 1,
                        "duration": module_days,
                        "lessons": []
                    },
                    {
                        "id": "module_2",
                        "name": f"Core {topic} Concepts",
                        "description": f"Explore the essential concepts and principles of {topic} through structured learning and examples.",
                        "order": 2,
                        "duration": module_days,
                        "lessons": []
                    },
                    {
                        "id": "module_3",
                        "name": f"Practical {topic} Applications",
                        "description": f"Apply your knowledge of {topic} to solve real-world problems and build practical skills.",
                        "order": 3,
                        "duration": module_days,
                        "lessons": []
                    },
                    {
                        "id": "module_4",
                        "name": f"Advanced {topic} Techniques",
                        "description": f"Deepen your understanding of {topic} with more advanced concepts and specialized techniques.",
                        "order": 4,
                        "duration": module_days,
                        "lessons": []
                    },
                    {
                        "id": "module_5",
                        "name": f"{topic} Best Practices",
                        "description": f"Learn industry best practices and optimization strategies for working with {topic}.",
                        "order": 5,
                        "duration": module_days,
                        "lessons": []
                    },
                    {
                        "id": "module_6",
                        "name": f"Mastering {topic}",
                        "description": f"Put everything together to master {topic} through comprehensive projects and case studies.",
                        "order": 6,
                        "duration": module_days,
                        "lessons": []
                    }
                ],
                "difficulty": difficulty,
                "duration": duration
            }
            
            # Return fallback course structure
            metadata_note = {"timestamp": datetime.now().isoformat(), "note": "Using fallback course structure"}
        else:
            # We have a valid course structure
            logger.info("Valid course structure found, enhancing with required fields")
            metadata_note = {"timestamp": datetime.now().isoformat()}
            
        # Add required fields if missing
        if "id" not in parsed_result:
            parsed_result["id"] = str(uuid.uuid4())
        
        if "createdAt" not in parsed_result:
            parsed_result["createdAt"] = datetime.now().isoformat()
            
        if "updatedAt" not in parsed_result:
            parsed_result["updatedAt"] = datetime.now().isoformat()
            
        if "user_id" not in parsed_result:
            parsed_result["user_id"] = "system"
            
        # Add IDs to modules and lessons if missing
        for i, module in enumerate(parsed_result.get("modules", [])):
            if "id" not in module:
                module["id"] = f"module_{i+1}"
            if "completed" not in module:
                module["completed"] = False
            if "progress" not in module:
                module["progress"] = 0
            
            for j, lesson in enumerate(module.get("lessons", [])):
                if "id" not in lesson:
                    lesson["id"] = f"lesson_{i+1}_{j+1}"
                if "completed" not in lesson:
                    lesson["completed"] = False
                if "progress" not in lesson:
                    lesson["progress"] = 0
                if "exercises" not in lesson:
                    lesson["exercises"] = []
                if "resources" not in lesson:
                    lesson["resources"] = []
                if "sessions" not in lesson:
                    lesson["sessions"] = []
        
        return APIResponse(
            success=True,
            data=parsed_result,
            metadata=metadata_note
        )
            
    except Exception as e:
        logger.error(f"Course generation from assessment failed: {str(e)}")
        return APIResponse(
            success=False, 
            error=f"Failed to generate course from assessment: {str(e)}",
            metadata={"timestamp": datetime.now().isoformat()}
        )

# Add the new endpoint for generating module lessons
class ModuleLessonsRequest(BaseModel):
    course_id: str
    module_id: str
    topic: str
    module_name: str
    module_description: str
    difficulty: str = Field(default="beginner")
    learning_style: Dict[str, float] = Field(default_factory=dict)
    user_assessment: Optional[Dict[str, Any]] = None

@app.post("/module/generate-lessons", response_model=APIResponse)
async def generate_module_lessons(request: ModuleLessonsRequest):
    """Generate detailed lessons for a specific module on demand"""
    try:
        logger.info(f"Generating lessons for module: {request.module_id} in course: {request.course_id}")
        logger.info(f"Request parameters: topic={request.topic}, module_name={request.module_name}, difficulty={request.difficulty}")
        
        # Validate required fields
        if not request.topic or not request.module_name or not request.module_description:
            logger.error("Missing required fields in request")
            return APIResponse(
                success=False,
                error="Missing required fields: topic, module_name, and module_description are required",
                metadata={"timestamp": datetime.now().isoformat()}
            )
        
        # Determine primary learning style
        preferred_style = "mixed"
        if request.learning_style:
            styles = request.learning_style
            max_style = max(styles.items(), key=lambda x: x[1]) if styles else (None, 0)
            if max_style[0] and max_style[1] > 0:
                preferred_style = max_style[0]
        
        # Create a detailed prompt for lesson generation
        prompt = f"""
Generate 3-5 detailed lessons for a module on "{request.module_name}" which is part of a course about "{request.topic}".
Module description: {request.module_description}

IMPORTANT LESSON REQUIREMENTS:
1. Target audience difficulty level: {request.difficulty}
2. Optimize for {preferred_style} learning style
3. Each lesson should:
   - Have a clear, specific title
   - Include comprehensive but concise content
   - Build progressively on prior lessons
   - Include suggested activities or exercises
   - Estimate a realistic duration (in hours)

The response MUST be in valid JSON format with the following structure:

```json
{{
  "lessons": [
    {{
      "id": "lesson_1",
      "title": "Lesson Title",
      "content": "Detailed lesson content with paragraphs, examples, and explanations",
      "order": 1,
      "duration": 2,
      "activities": ["Activity 1", "Activity 2"],
      "resources": [
        {{
          "title": "Resource Title",
          "type": "article|video|document",
          "url": "https://example.com/resource"
        }}
      ]
    }}
  ]
}}
```

Return ONLY the valid JSON object, no additional text before or after.
        """
        
        # Call the agent task with the content creator agent
        result = await execute_agent_task_with_retry(
            agents[AgentRole.CONTENT_CREATOR], 
            prompt,
            role=AgentRole.CONTENT_CREATOR
        )
        
        # Clean and parse the JSON response
        try:
            parsed_result = clean_json_response(result)
            
            # Validate we have lessons array
            if not parsed_result or not isinstance(parsed_result, dict) or not parsed_result.get("lessons"):
                logger.warning("Invalid lessons structure received, creating default lessons")
                
                # Create default lessons if none were generated
                parsed_result = {
                    "lessons": [
                        {
                            "id": f"lesson_{uuid.uuid4()}",
                            "title": f"Introduction to {request.module_name}",
                            "content": f"This lesson introduces key concepts of {request.module_name} in the context of {request.topic}.",
                            "order": 1,
                            "duration": 2,
                            "activities": [f"Explore basic {request.topic} concepts", "Complete introductory exercises"],
                            "resources": []
                        },
                        {
                            "id": f"lesson_{uuid.uuid4()}",
                            "title": f"Core Principles of {request.module_name}",
                            "content": f"Learn about the fundamental principles and approaches in {request.module_name}.",
                            "order": 2,
                            "duration": 2,
                            "activities": ["Apply concepts to practical examples", "Group discussion on key principles"],
                            "resources": []
                        },
                        {
                            "id": f"lesson_{uuid.uuid4()}",
                            "title": f"Practical Applications of {request.module_name}",
                            "content": f"Explore real-world applications and case studies related to {request.module_name}.",
                            "order": 3,
                            "duration": 3,
                            "activities": ["Analyze case studies", "Work on practical exercises", "Reflection activity"],
                            "resources": []
                        }
                    ]
                }
            
            # Ensure each lesson has required fields
            for i, lesson in enumerate(parsed_result.get("lessons", [])):
                if "id" not in lesson:
                    lesson["id"] = f"lesson_{request.module_id}_{i+1}"
                if "order" not in lesson:
                    lesson["order"] = i+1
                if "resources" not in lesson:
                    lesson["resources"] = []
                if "activities" not in lesson and "exercises" in lesson:
                    lesson["activities"] = lesson["exercises"]
                    del lesson["exercises"]
                elif "activities" not in lesson:
                    lesson["activities"] = []
                if "duration" not in lesson:
                    lesson["duration"] = 2
                if "completed" not in lesson:
                    lesson["completed"] = False
                if "sessions" not in lesson:
                    lesson["sessions"] = []
                
            # Return successful response
            return APIResponse(
                success=True,
                data=parsed_result,
                metadata={
                    "timestamp": datetime.now().isoformat(),
                    "courseId": request.course_id,
                    "moduleId": request.module_id
                }
            )
            
        except Exception as parsing_error:
            logger.error(f"Error parsing lesson generation result: {str(parsing_error)}")
            return APIResponse(
                success=False,
                error=f"Failed to parse lessons: {str(parsing_error)}",
                metadata={"timestamp": datetime.now().isoformat()}
            )
            
    except Exception as e:
        logger.error(f"Lesson generation failed: {str(e)}")
        return APIResponse(
            success=False,
            error=f"Failed to generate lessons: {str(e)}",
            metadata={"timestamp": datetime.now().isoformat()}
        )

# Add a new endpoint for generating daily session content
class DailySessionRequest(BaseModel):
    user_id: str
    course_id: str
    module_id: str = None
    lesson_id: str = None
    topic: str
    difficulty: str = Field(default="beginner")
    learning_style: Dict[str, float] = Field(default_factory=dict)
    previous_sessions: List[Dict[str, Any]] = Field(default_factory=list)
    duration_minutes: int = Field(default=30)

@app.post("/daily-session/generate", response_model=APIResponse)
async def generate_daily_session(request: DailySessionRequest):
    """Generate personalized daily learning session content"""
    try:
        logger.info(f"Generating daily session for user: {request.user_id}, course: {request.course_id}")
        
        # Determine primary learning style
        preferred_style = "mixed"
        if request.learning_style:
            styles = request.learning_style
            max_style = max(styles.items(), key=lambda x: x[1]) if styles else (None, 0)
            if max_style[0] and max_style[1] > 0:
                preferred_style = max_style[0]
        
        # Create context information from previous sessions
        previous_topics = []
        progress_summary = "This is your first session." 
        
        if request.previous_sessions and len(request.previous_sessions) > 0:
            last_sessions = request.previous_sessions[-3:] if len(request.previous_sessions) > 3 else request.previous_sessions
            previous_topics = [s.get("title", "") for s in last_sessions]
            progress_summary = f"You've completed {len(request.previous_sessions)} sessions. In your recent sessions, you covered: {', '.join(previous_topics)}."
        
        # Create a detailed prompt for daily session generation
        prompt = f"""
Generate a personalized {request.duration_minutes}-minute daily learning session on "{request.topic}" for a {request.difficulty} level learner with primary {preferred_style} learning style.

CONTEXT:
- This session is part of a longer course on {request.topic}
- {progress_summary}
- The session should be self-contained but connected to the broader learning journey

REQUIREMENTS FOR THE SESSION:
1. Create a focused, engaging session that can be completed in {request.duration_minutes} minutes
2. Optimize for {preferred_style} learning style
3. Include:
   - A clear learning objective
   - Concise content (text, explanations, examples)
   - At least one practical activity or exercise
   - A mini-assessment or reflection question
   - Links to 1-2 additional resources (if relevant)
4. Make it interactive and engaging
5. Include a "What's Next" teaser for the next session

The response MUST be in valid JSON format with the following structure:

```json
{{
  "title": "Session Title",
  "duration": {request.duration_minutes},
  "learningObjective": "By the end of this session, you will be able to...",
  "sections": [
    {{
      "type": "introduction",
      "title": "Introduction",
      "content": "Introductory text explaining what will be covered"
    }},
    {{
      "type": "content",
      "title": "Main Content Section",
      "content": "Primary learning content with examples and explanations"
    }},
    {{
      "type": "activity",
      "title": "Practice Activity",
      "instructions": "Step-by-step instructions for the activity",
      "expectedOutcome": "What the learner should achieve"
    }},
    {{
      "type": "assessment",
      "title": "Quick Check",
      "questions": [
        {{
          "question": "Assessment question?",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "correctAnswer": "Option A",
          "explanation": "Explanation of the correct answer"
        }}
      ]
    }},
    {{
      "type": "resources",
      "title": "Additional Resources",
      "resources": [
        {{
          "title": "Resource Title",
          "type": "article|video|exercise",
          "url": "https://example.com/resource",
          "description": "Brief description of the resource"
        }}
      ]
    }},
    {{
      "type": "next",
      "title": "Coming Up Next",
      "content": "Preview of what will be covered in the next session"
    }}
  ]
}}
```

Return ONLY the valid JSON object, no additional text before or after.
        """
        
        # Call the agent task with the content creator agent
        result = await execute_agent_task_with_retry(
            agents[AgentRole.CONTENT_CREATOR], 
            prompt,
            role=AgentRole.CONTENT_CREATOR
        )
        
        # Clean and parse the JSON response
        try:
            parsed_result = clean_json_response(result)
            
            # Validate the session structure
            if not parsed_result or not isinstance(parsed_result, dict) or not parsed_result.get("sections"):
                logger.warning("Invalid session structure received, creating default session")
                
                # Create default session if none was generated
                parsed_result = {
                    "id": str(uuid.uuid4()),
                    "title": f"Daily Session on {request.topic}",
                    "duration": request.duration_minutes,
                    "learningObjective": f"Learn key concepts about {request.topic} and practice applying them.",
                    "sections": [
                        {
                            "type": "introduction",
                            "title": "Introduction",
                            "content": f"Welcome to today's session on {request.topic}. We'll explore key concepts and practice applying them."
                        },
                        {
                            "type": "content",
                            "title": f"Understanding {request.topic}",
                            "content": f"This section covers fundamental principles of {request.topic}, providing you with essential knowledge and context."
                        },
                        {
                            "type": "activity",
                            "title": "Practice Activity",
                            "instructions": f"Apply what you've learned about {request.topic} in this simple exercise.",
                            "expectedOutcome": "Gain practical experience with the concepts covered in this session."
                        },
                        {
                            "type": "assessment",
                            "title": "Knowledge Check",
                            "questions": [
                                {
                                    "question": f"What is one key benefit of understanding {request.topic}?",
                                    "options": ["Option A", "Option B", "Option C", "Option D"],
                                    "correctAnswer": "Option A",
                                    "explanation": "This is the correct answer because..."
                                }
                            ]
                        },
                        {
                            "type": "next",
                            "title": "Coming Up Next",
                            "content": f"In our next session, we'll explore more advanced concepts in {request.topic}."
                        }
                    ]
                }
            
            # Ensure session has an ID
            if "id" not in parsed_result:
                parsed_result["id"] = str(uuid.uuid4())
                
            # Add timestamps
            parsed_result["createdAt"] = datetime.now().isoformat()
            parsed_result["courseId"] = request.course_id
            if request.module_id:
                parsed_result["moduleId"] = request.module_id
            if request.lesson_id:
                parsed_result["lessonId"] = request.lesson_id
                
            # Return successful response
            return APIResponse(
                success=True,
                data=parsed_result,
                metadata={
                    "timestamp": datetime.now().isoformat(),
                    "userId": request.user_id,
                    "courseId": request.course_id
                }
            )
            
        except Exception as parsing_error:
            logger.error(f"Error parsing daily session generation result: {str(parsing_error)}")
            return APIResponse(
                success=False,
                error=f"Failed to parse daily session: {str(parsing_error)}",
                metadata={"timestamp": datetime.now().isoformat()}
            )
            
    except Exception as e:
        logger.error(f"Daily session generation failed: {str(e)}")
        return APIResponse(
            success=False,
            error=f"Failed to generate daily session: {str(e)}",
            metadata={"timestamp": datetime.now().isoformat()}
        )

# Add new model for practice interactions
class PracticeInteractionRequest(BaseModel):
    topic: str
    difficulty: str = Field(default="beginner")
    previousInteractions: Optional[List[Dict[str, Any]]] = Field(default_factory=list)
    seed: Optional[str] = None

@app.post("/practice/generate", response_model=APIResponse)
async def generate_practice_session(request: PracticeInteractionRequest):
    """Generate practice content for interactive learning sessions"""
    try:
        logger.info(f"Generating practice content for topic: {request.topic}, difficulty: {request.difficulty}")
        
        # Create context from previous interactions if available
        learning_history = ""
        if request.previousInteractions and len(request.previousInteractions) > 0:
            # Extract recent interactions to provide context
            recent = request.previousInteractions[-3:] if len(request.previousInteractions) > 3 else request.previousInteractions
            learning_history = "Previous interactions:\n" + "\n".join([
                f"- {i.get('content', 'Interaction content')}" for i in recent
            ])
        
        # Create a detailed prompt for practice content generation
        prompt = f"""
Generate an interactive practice session on "{request.topic}" at {request.difficulty} difficulty level.

{learning_history}

The practice session should be engaging, interactive, and focused on application of knowledge.
It should include:
1. A brief introduction/description of the practice focus
2. 2-4 focused practice exercises or problems
3. Clear instructions for each exercise
4. Solutions or answer explanations for each exercise

The response MUST be in valid JSON format with the following structure:

```json
{{
  "title": "Practice Session Title",
  "description": "Brief description of this practice session",
  "exercises": [
    {{
      "id": "exercise_1",
      "type": "interactive",
      "question": "Exercise question or prompt",
      "steps": ["Step 1 instruction", "Step 2 instruction"],
      "solution": "Example solution or expected response"
    }},
    {{
      "id": "exercise_2",
      "type": "problem",
      "question": "Problem statement",
      "steps": ["Step 1", "Step 2"],
      "solution": "Detailed solution"
    }}
  ],
  "difficulty": "{request.difficulty}",
  "estimatedTime": "15 minutes"
}}
```

Return ONLY the valid JSON object, no additional text before or after.
        """
        
        # Call the agent task with the practice generator agent
        result = await execute_agent_task_with_retry(
            agents[AgentRole.PRACTICE_GENERATOR], 
            prompt,
            role=AgentRole.PRACTICE_GENERATOR
        )
        
        # Clean and parse the JSON response
        try:
            parsed_result = clean_json_response(result)
            
            # Validate the session structure
            if not parsed_result or not isinstance(parsed_result, dict) or not parsed_result.get("exercises"):
                logger.warning("Invalid practice session structure received, creating default session")
                
                # Create default practice session if none was generated
                parsed_result = {
                    "id": str(uuid.uuid4()),
                    "title": f"Practice Session on {request.topic}",
                    "description": f"Practice and apply key concepts related to {request.topic}.",
                    "exercises": [
                        {
                            "id": "exercise_1",
                            "type": "interactive",
                            "question": f"What is one key aspect of {request.topic} that you find most interesting?",
                            "steps": ["Reflect on the key concepts you've learned", "Consider which aspects are most applicable to real-world situations"],
                            "solution": "This is an open-ended question. Your response should demonstrate understanding of core concepts."
                        },
                        {
                            "id": "exercise_2",
                            "type": "problem",
                            "question": f"Describe a specific scenario where knowledge of {request.topic} would be valuable.",
                            "steps": ["Identify a relevant real-world situation", "Explain how specific concepts apply to this scenario"],
                            "solution": "Your answer should connect theoretical concepts to practical applications."
                        }
                    ],
                    "difficulty": request.difficulty,
                    "estimatedTime": "15 minutes"
                }
            
            # Ensure session has an ID
            if "id" not in parsed_result:
                parsed_result["id"] = str(uuid.uuid4())
                
            # Add timestamps
            parsed_result["createdAt"] = datetime.now().isoformat()
                
            # Return successful response
            return APIResponse(
                success=True,
                data=parsed_result,
                metadata={
                    "timestamp": datetime.now().isoformat(),
                    "topic": request.topic,
                    "difficulty": request.difficulty
                }
            )
            
        except Exception as parsing_error:
            logger.error(f"Error parsing practice session result: {str(parsing_error)}")
            return APIResponse(
                success=False,
                error=f"Failed to parse practice session: {str(parsing_error)}",
                metadata={"timestamp": datetime.now().isoformat()}
            )
            
    except Exception as e:
        logger.error(f"Practice session generation failed: {str(e)}")
        return APIResponse(
            success=False,
            error=f"Failed to generate practice session: {str(e)}",
            metadata={"timestamp": datetime.now().isoformat()}
        )

# Add new endpoint for practice problems
class PracticeProblemsRequest(BaseModel):
    topic: str
    difficulty: str = Field(default="medium")
    count: int = Field(default=3, ge=1, le=10)
    includeSolutions: bool = Field(default=True)
    seed: Optional[str] = None

@app.post("/practice/problems", response_model=APIResponse)
async def generate_practice_problems(request: PracticeProblemsRequest):
    """Generate practice problems for a specific topic"""
    try:
        logger.info(f"Generating {request.count} practice problems for topic: {request.topic}, difficulty: {request.difficulty}")
        
        # Create a detailed prompt for practice problems generation
        prompt = f"""
Generate {request.count} practice problems on "{request.topic}" at {request.difficulty} difficulty level.

Each problem should:
1. Have a clear title
2. Include a detailed description of the problem
3. Be categorized appropriately
4. Include relevant tags
5. {'Include a complete solution' if request.includeSolutions else 'Not include solutions'}
6. Include 1-2 helpful hints (without giving away the answer)
7. Indicate estimated time to complete

The response MUST be in valid JSON format with an array of problems:

```json
[
  {{
    "id": "problem_1",
    "title": "Problem Title",
    "description": "Detailed problem description",
    "difficulty": "{request.difficulty}",
    "category": "Relevant category",
    "tags": ["tag1", "tag2"],
    {"solution": "Step-by-step solution to the problem"," if request.includeSolutions else ""}
    "hints": ["Hint 1", "Hint 2"],
    "expectedTime": 10
  }}
]
```

Return ONLY the valid JSON array, no additional text before or after.
        """
        
        # Call the agent task with the practice generator agent
        result = await execute_agent_task_with_retry(
            agents[AgentRole.PRACTICE_GENERATOR], 
            prompt,
            role=AgentRole.PRACTICE_GENERATOR
        )
        
        # Clean and parse the JSON response
        try:
            parsed_result = clean_json_response(result)
            
            # Validate the problems structure
            if not parsed_result or not isinstance(parsed_result, list) or len(parsed_result) == 0:
                logger.warning("Invalid practice problems structure received, creating default problems")
                
                # Create default practice problems if none were generated
                parsed_result = [
                    {
                        "id": f"problem_{uuid.uuid4()}",
                        "title": f"Practice Problem on {request.topic}",
                        "description": f"This problem tests your understanding of key concepts in {request.topic}.",
                        "difficulty": request.difficulty,
                        "category": "General Practice",
                        "tags": [request.topic, request.difficulty],
                        "hints": ["Think about the core principles involved", "Break down the problem into smaller steps"],
                        "expectedTime": 10
                    }
                ]
                
                # Add solutions if requested
                if request.includeSolutions:
                    parsed_result[0]["solution"] = f"A step-by-step solution for the problem related to {request.topic}."
            
            # Ensure each problem has an ID
            for i, problem in enumerate(parsed_result):
                if "id" not in problem:
                    problem["id"] = f"problem_{i+1}_{uuid.uuid4()}"
                
                # Add solutions if requested but missing
                if request.includeSolutions and "solution" not in problem:
                    problem["solution"] = f"Solution for '{problem.get('title', f'Problem {i+1}')}'"
                
                # Ensure other required fields
                if "hints" not in problem or not problem["hints"]:
                    problem["hints"] = ["Break the problem down into steps", "Think about similar examples you've seen before"]
                    
                if "expectedTime" not in problem:
                    problem["expectedTime"] = 10
                    
                if "tags" not in problem or not problem["tags"]:
                    problem["tags"] = [request.topic, request.difficulty]
                    
                if "category" not in problem:
                    problem["category"] = "General Practice"
            
            # Return successful response
            return APIResponse(
                success=True,
                data=parsed_result,
                metadata={
                    "timestamp": datetime.now().isoformat(),
                    "topic": request.topic,
                    "difficulty": request.difficulty,
                    "count": request.count
                }
            )
            
        except Exception as parsing_error:
            logger.error(f"Error parsing practice problems result: {str(parsing_error)}")
            return APIResponse(
                success=False,
                error=f"Failed to parse practice problems: {str(parsing_error)}",
                metadata={"timestamp": datetime.now().isoformat()}
            )
            
    except Exception as e:
        logger.error(f"Practice problems generation failed: {str(e)}")
        return APIResponse(
            success=False,
            error=f"Failed to generate practice problems: {str(e)}",
            metadata={"timestamp": datetime.now().isoformat()}
        )

@app.post("/persona/generate", response_model=APIResponse)
async def generate_persona(request: PersonaGenerationRequest):
    """
    Generate a learning persona based on user input and preferences.
    This analyzes the user's learning style and creates a matching teaching persona.
    """
    try:
        # Define the context for the AI to generate a persona
        context = {
            "user_input": request.userInput,
            "topic": request.topic,
            "seed": request.seed
        }
        
        # Create a prompt for user profile generation
        user_profile_prompt = f"""
        I need to create a detailed user profile based on the following information:
        
        User Input: {request.userInput}
        Topic of Interest: {request.topic}
        
        Please return ONLY a valid JSON object with the following structure:
        {{
            "id": "unique_id_string",
            "goals": ["goal1", "goal2", "goal3"],
            "learningStyle": "visual|auditory|reading|kinesthetic|mixed",
            "strengths": ["strength1", "strength2", "strength3"],
            "weaknesses": ["weakness1", "weakness2"],
            "contentPreferences": ["preference1", "preference2", "preference3"],
            "timeAvailability": "description of availability",
            "background": "prior knowledge assessment",
            "interests": ["interest1", "interest2", "interest3"],
            "createdAt": "timestamp",
            "updatedAt": "timestamp"
        }}
        
        Infer as much as possible from the user input. If details are missing, make reasonable assumptions based on the topic.
        The response MUST be a valid JSON object with all the fields above.
        Do not include any explanations, just the JSON object.
        """
        
        # Generate the user profile
        user_profile_response = await execute_agent_task_with_retry(
            agents[AgentRole.CONTENT_CREATOR], 
            user_profile_prompt,
            context
        )
        
        # Extract JSON from the response
        user_profile = clean_json_response(user_profile_response)
        
        # Log what was extracted for debugging
        logging.info(f"Extracted user profile type: {type(user_profile)}")
        
        # Create a prompt for persona generation based on the user profile
        persona_prompt = f"""
        I need to create a teaching persona customized for a learner with the following profile:
        
        User Profile: {json.dumps(user_profile)}
        Topic of Interest: {request.topic}
        
        Please return ONLY a valid JSON object with the following structure:
        {{
            "id": "unique_id_string",
            "name": "Engaging Teacher Name",
            "description": "A paragraph describing teaching approach",
            "role": "mentor|teacher|coach|guide|expert",
            "specialties": ["specialty1", "specialty2", "specialty3"],
            "teachingStyle": "Brief description of teaching style",
            "tone": "Description of communication tone",
            "background": "Brief fictional background explaining expertise",
            "characteristics": ["trait1", "trait2", "trait3", "trait4", "trait5"],
            "supportingQualities": ["quality1", "quality2", "quality3"],
            "imageUrl": null,
            "createdAt": "timestamp",
            "updatedAt": "timestamp",
            "userProfileId": "id_from_user_profile"
        }}
        
        The persona should be perfectly tailored to the learning style and needs indicated in the user profile.
        The response MUST be a valid JSON object with all the fields above.
        Do not include any explanations or text before or after the JSON object.
        """
        
        # Generate the persona
        persona_response = await execute_agent_task_with_retry(
            agents[AgentRole.CONTENT_CREATOR], 
            persona_prompt,
            context
        )
        
        # Extract JSON from the response
        persona = clean_json_response(persona_response)
        
        # Validate and ensure the persona has the necessary fields
        if not isinstance(persona, dict) or not persona or 'teachingPersona' in persona:
            # Handle the case where we get an object with a teachingPersona key
            if isinstance(persona, dict) and 'teachingPersona' in persona and isinstance(persona['teachingPersona'], dict):
                persona = persona['teachingPersona']
            else:
                # Create a default persona with all required fields
                persona = {
                    "id": f"persona_{int(time.time())}",
                    "name": f"AI Teacher for {request.topic}",
                    "description": f"A helpful AI teacher focused on {request.topic}.",
                    "role": "teacher",
                    "specialties": [request.topic, "Interactive Learning", "Personalized Education"],
                    "teachingStyle": "Adaptive and responsive to learner needs",
                    "tone": "Supportive and encouraging",
                    "background": f"Specialized in teaching {request.topic} with a focus on practical applications",
                    "characteristics": ["Patient", "Clear", "Knowledgeable", "Adaptable", "Supportive"],
                    "supportingQualities": ["Clear explanations", "Practical examples", "Personalized feedback"],
                    "imageUrl": None,
                    "createdAt": datetime.now().isoformat(),
                    "updatedAt": datetime.now().isoformat(),
                    "userProfileId": "default"
                }
                logging.warning(f"Created default persona due to invalid response: {persona_response}")
                
        # Ensure all required fields exist
        required_fields = ["id", "name", "description", "role", "specialties", "teachingStyle", 
                         "tone", "background", "characteristics", "supportingQualities", 
                         "createdAt", "updatedAt"]
        
        for field in required_fields:
            if field not in persona:
                if field == "id":
                    persona[field] = f"persona_{int(time.time())}"
                elif field == "name":
                    persona[field] = f"AI Teacher for {request.topic}"
                elif field == "description":
                    persona[field] = f"A helpful AI teacher focused on {request.topic}."
                elif field == "role":
                    persona[field] = "teacher"
                elif field == "specialties" and (field not in persona or not persona[field]):
                    persona[field] = [request.topic, "Interactive Learning", "Personalized Education"]
                elif field == "teachingStyle":
                    persona[field] = "Adaptive and responsive to learner needs"
                elif field == "tone":
                    persona[field] = "Supportive and encouraging"
                elif field == "background":
                    persona[field] = f"Specialized in teaching {request.topic} with a focus on practical applications"
                elif field == "characteristics" and (field not in persona or not persona[field]):
                    persona[field] = ["Patient", "Clear", "Knowledgeable", "Adaptable", "Supportive"]
                elif field == "supportingQualities" and (field not in persona or not persona[field]):
                    persona[field] = ["Clear explanations", "Practical examples", "Personalized feedback"]
                elif field in ["createdAt", "updatedAt"]:
                    persona[field] = datetime.now().isoformat()
                    
        # Ensure imageUrl exists and is set to null
        if "imageUrl" not in persona:
            persona["imageUrl"] = None
            
        # Ensure persona has a userProfileId
        if "userProfileId" not in persona:
            persona["userProfileId"] = "default"
            
        # Validate user profile similarly
        if not isinstance(user_profile, dict) or not user_profile:
            # Create a default user profile
            user_profile = {
                "id": f"profile_{int(time.time())}",
                "goals": ["Learn practical skills", "Understand core concepts", "Apply knowledge effectively"],
                "learningStyle": "Mixed",
                "strengths": ["Self-motivated", "Technical aptitude", "Problem-solving"],
                "weaknesses": ["Limited time availability", "Needs practical examples"],
                "contentPreferences": ["Interactive exercises", "Real-world examples", "Visual aids"],
                "timeAvailability": "Limited",
                "background": "Beginner",
                "interests": [request.topic],
                "createdAt": datetime.now().isoformat(),
                "updatedAt": datetime.now().isoformat()
            }
            logging.warning(f"Created default user profile due to invalid response: {user_profile_response}")
        
        # Now we can safely create the content prompt
        content_prompt = f"""
        You are {persona['name']}, a {persona['role']} with the following characteristics:
        - Teaching Style: {persona['teachingStyle']}
        - Tone: {persona['tone']}
        - Specialties: {', '.join(persona['specialties'])}
        
        Create an engaging introduction to the topic of "{request.topic}" that matches your persona's style and tone.
        Write approximately 400-600 words that help a learner understand the fundamental concepts.
        
        Structure the response as a JSON object with these fields:
        - id: a unique identifier
        - personaId: use the persona's id
        - title: an engaging title for this content
        - content: the actual content written in your persona's style
        - topic: {request.topic}
        - type: "introduction"
        - createdAt: current date and time string
        - updatedAt: same as createdAt
        
        Return only the JSON object.
        """
        
        # Generate the initial content
        content_response = await execute_agent_task_with_retry(
            agents[AgentRole.CONTENT_CREATOR], 
            content_prompt,
            context
        )
        
        # Extract JSON from the response
        initial_content = clean_json_response(content_response)
        
        # Validate the initial content
        if not isinstance(initial_content, dict) or not initial_content:
            # Create default content
            initial_content = {
                "id": f"content_{int(time.time())}",
                "personaId": persona["id"],
                "title": f"Introduction to {request.topic}",
                "content": f"This is an introduction to {request.topic}. The content will help you understand the fundamental concepts and practical applications.",
                "topic": request.topic,
                "type": "introduction",
                "createdAt": datetime.now().isoformat(),
                "updatedAt": datetime.now().isoformat()
            }
            logging.warning(f"Created default initial content due to invalid response: {content_response}")
        
        return APIResponse(
            success=True,
            data={
                "userProfile": user_profile,
                "persona": persona,
                "initialContent": initial_content
            },
            metadata={
                "timestamp": datetime.now().isoformat(),
                "status": 200,
                "statusText": "OK"
            }
        )
    except Exception as e:
        logging.error(f"Error generating persona: {str(e)}")
        return APIResponse(
            success=False,
            error=str(e),
            metadata={
                "timestamp": datetime.now().isoformat(),
                "status": 500,
                "statusText": "Internal Server Error"
            }
        )

@app.post("/persona/update", response_model=APIResponse)
async def update_persona(request: PersonaUpdateRequest):
    """
    Update an existing persona based on user feedback.
    """
    try:
        # Define the context for the AI
        context = {
            "personaId": request.personaId,
            "changes": request.changes,
            "seed": request.seed
        }
        
        # Create a prompt for persona updating
        update_prompt = f"""
        You need to update an AI teaching persona based on the following user feedback:
        
        Persona ID: {request.personaId}
        Requested Changes: {request.changes}
        
        First, create an updated version of the persona with the requested changes.
        Then, generate a new content sample that reflects these changes.
        
        Return a JSON object with two fields:
        1. "persona": the updated persona object (include all fields: id, name, description, role, etc.)
        2. "content": a new content object (with id, personaId, title, content, etc.)
        
        The JSON should maintain the same structure as the original persona and content objects.
        """
        
        # Generate the updated persona and content
        response = await execute_agent_task_with_retry(
            agents[AgentRole.CONTENT_CREATOR], 
            update_prompt,
            context
        )
        
        # Extract JSON from the response
        result = clean_json_response(response)
        
        return APIResponse(
            success=True,
            data=result,
            metadata={
                "timestamp": datetime.now().isoformat(),
                "status": 200,
                "statusText": "OK"
            }
        )
    except Exception as e:
        logging.error(f"Error updating persona: {str(e)}")
        return APIResponse(
            success=False,
            error=str(e),
            metadata={
                "timestamp": datetime.now().isoformat(),
                "status": 500,
                "statusText": "Internal Server Error"
            }
        )

@app.post("/persona/content", response_model=APIResponse)
async def generate_persona_content(request: PersonaContentRequest):
    """
    Generate specific content from a persona for a given topic.
    This can be an introduction, summary, or detailed explanation.
    """
    try:
        # Define the context for the AI
        context = {
            "personaId": request.personaId,
            "topic": request.topic,
            "contentType": request.contentType,
            "seed": request.seed
        }
        
        # Create a prompt for content generation
        content_prompt = f"""
        You are a teaching persona with ID {request.personaId}. 
        
        Generate {request.contentType} content about the topic "{request.topic}".
        
        The content should match the perspective and style of your persona. Be engaging, informative, and educational.
        
        Return a JSON object with these fields:
        - id: a unique identifier 
        - personaId: {request.personaId}
        - title: an appropriate title for this content
        - content: the actual content (400-800 words)
        - topic: {request.topic}
        - type: "{request.contentType}"
        - createdAt: current date and time
        - updatedAt: same as createdAt
        
        Return only the JSON object.
        """
        
        # Generate the content
        response = await execute_agent_task_with_retry(
            agents[AgentRole.CONTENT_CREATOR], 
            content_prompt,
            context
        )
        
        # Extract JSON from the response
        content = clean_json_response(response)
        
        return APIResponse(
            success=True,
            data=content,
            metadata={
                "timestamp": datetime.now().isoformat(),
                "status": 200,
                "statusText": "OK"
            }
        )
    except Exception as e:
        logging.error(f"Error generating persona content: {str(e)}")
        return APIResponse(
            success=False,
            error=str(e),
            metadata={
                "timestamp": datetime.now().isoformat(),
                "status": 500,
                "statusText": "Internal Server Error"
            }
        )
        
@app.post("/course/generate-with-persona", response_model=APIResponse)
async def generate_course_with_persona(request: CourseWithPersonaRequest):
    """
    Generate a course using a specific teaching persona.
    This personalizes the course content and structure based on the teaching style.
    """
    try:
        # Generate timestamp for unique IDs
        timestamp = int(time.time())
        current_time = datetime.now().isoformat()
        
        # Define the context for the AI
        context = {
            "personaId": request.personaId,
            "topic": request.topic,
            "difficulty": request.difficulty,
            "duration": request.duration,
            "seed": request.seed
        }
        
        # Create a more explicit prompt for course generation with JSON format requirements
        course_prompt = f"""
        You are a course creation system working with a teaching persona (ID: {request.personaId}).
        
        Generate a complete course outline on the topic "{request.topic}" with the following parameters:
        - Difficulty level: {request.difficulty}
        - Duration: {request.duration}
        
        The course should be structured with:
        - A compelling course title and description
        - 3-6 modules, each with:
          - A title and description
          - 3-5 lessons per module, each with:
            - Title, description, and content summary
            - Estimated duration in minutes
            - Resources (optional)
          - A module assessment
        
        Return the course structure as a valid JSON object following this exact format:
        {{
          "id": "course_{timestamp}",
          "title": "Course Title",
          "description": "Course description text",
          "topic": "{request.topic}",
          "difficulty": "{request.difficulty}",
          "duration": "{request.duration}",
          "createdAt": "{current_time}",
          "updatedAt": "{current_time}",
          "modules": [
            {{
              "id": "module_1",
              "title": "Module Title",
              "description": "Module description",
              "lessons": [
                {{
                  "id": "lesson_1_1",
                  "title": "Lesson Title",
                  "description": "Lesson description",
                  "contentSummary": "Content summary",
                  "estimatedDuration": 90,
                  "resources": []
                }}
              ],
              "assessment": {{
                "type": "quiz",
                "description": "Assessment description"
              }}
            }}
          ]
        }}
        
        DO NOT explain the course or include any text before or after the JSON.
        Return ONLY the valid JSON object.
        """
        
        # Generate the course with retry logic
        response = await execute_agent_task_with_retry(
            agents[AgentRole.CONTENT_CREATOR], 
            course_prompt,
            context
        )
        
        # Log the raw response for debugging
        logging.info(f"Raw course generation response length: {len(response)}")
        logging.debug(f"Course response preview: {response[:200]}...")
        
        try:
            # Extract JSON from the response
            course_data = clean_json_response(response)
            
            # Log what was extracted
            logging.info(f"Extracted course data type: {type(course_data)}")
            
            # Use the function to ensure the course has the proper format
            course = ensure_course_json_format(
                course_data,
                request.topic,
                request.difficulty,
                request.duration
            )
            
            # Ensure each module has a unique ID and process lessons
            if "modules" in course and isinstance(course["modules"], list):
                for i, module in enumerate(course["modules"]):
                    # Make sure module has id
                    if "id" not in module or not module["id"]:
                        module["id"] = f"module_{timestamp}_{i+1}"
                    
                    # Process lessons
                    if "lessons" in module and isinstance(module["lessons"], list):
                        for j, lesson in enumerate(module["lessons"]):
                            if "id" not in lesson or not lesson["id"]:
                                lesson["id"] = f"lesson_{timestamp}_{i+1}_{j+1}"
            
            # Return the validated course data
            return APIResponse(
                success=True,
                data=course,
                metadata={
                    "timestamp": datetime.now().isoformat(),
                    "status": 200,
                    "statusText": "OK"
                }
            )
        except Exception as parsing_error:
            logging.error(f"Error parsing course generation result: {str(parsing_error)}")
            
            # Create a fallback course structure
            fallback_course = {
                "id": f"course_{timestamp}",
                "title": f"Course on {request.topic}",
                "description": f"A course about {request.topic} for {request.difficulty} level learners.",
                "topic": request.topic,
                "difficulty": request.difficulty,
                "duration": request.duration,
                "createdAt": datetime.now().isoformat(),
                "updatedAt": datetime.now().isoformat(),
                "modules": [
                    {
                        "id": f"module_{timestamp}_1",
                        "title": f"Introduction to {request.topic}",
                        "description": f"An overview of {request.topic} fundamentals.",
                        "lessons": [
                            {
                                "id": f"lesson_{timestamp}_1_1",
                                "title": f"Getting Started with {request.topic}",
                                "description": "Basic concepts and foundations.",
                                "contentSummary": f"This lesson introduces the fundamental concepts of {request.topic}.",
                                "estimatedDuration": 60,
                                "resources": []
                            }
                        ],
                        "assessment": {
                            "type": "quiz",
                            "description": f"Test your understanding of {request.topic} basics."
                        }
                    }
                ]
            }
            
            return APIResponse(
                success=True,
                data=fallback_course,
                metadata={
                    "timestamp": datetime.now().isoformat(),
                    "status": 200,
                    "statusText": "OK",
                    "warning": "Used fallback course structure due to parsing error"
                }
            )
            
    except Exception as e:
        logging.error(f"Error generating course with persona: {str(e)}")
        return APIResponse(
            success=False,
            error=str(e),
            metadata={
                "timestamp": datetime.now().isoformat(),
                "status": 500,
                "statusText": "Internal Server Error"
            }
        )

# Add this new class for the persona chat endpoint
class PersonaChatRequest(BaseModel):
    personaId: str
    message: str
    history: List[Dict[str, str]] = []
    courseContext: Dict[str, Optional[str]] = {}

@app.post("/persona/chat", response_model=APIResponse)
async def chat_with_persona(request: PersonaChatRequest):
    """
    Chat with a specific teaching persona.
    """
    try:
        logging.info(f"Chat request with persona {request.personaId}")
        
        # Define the context for the AI
        context = {
            "personaId": request.personaId,
            "message": request.message,
            "history": request.history,
            "courseContext": request.courseContext
        }
        
        # Create a prompt for the persona chat
        persona_prompt = f"""
        You are a teaching persona with ID {request.personaId}.
        
        A student is asking you: "{request.message}"
        
        Consider any relevant course context:
        - Course ID: {request.courseContext.get("courseId", "Not specified")}
        - Module ID: {request.courseContext.get("moduleId", "Not specified")}
        - Lesson ID: {request.courseContext.get("lessonId", "Not specified")}
        - Session ID: {request.courseContext.get("sessionId", "Not specified")}
        
        Conversation history:
        {json.dumps(request.history)}
        
        Respond in a helpful, educational manner that matches your teaching persona.
        Be concise but thorough, focusing on providing value to the student.
        
        Return your response as a plain text message (no JSON formatting needed).
        """
        
        # Generate the response
        response = await execute_agent_task_with_retry(
            agents[AgentRole.CONTENT_CREATOR], 
            persona_prompt,
            context
        )
        
        # Cleanup the response if needed
        response_text = response.strip()
        
        return APIResponse(
            success=True,
            data={"response": response_text},
            metadata={
                "timestamp": datetime.now().isoformat(),
                "status": 200,
                "statusText": "OK"
            }
        )
    except Exception as e:
        logging.error(f"Error in persona chat: {str(e)}")
        return APIResponse(
            success=False,
            error=str(e),
            metadata={
                "timestamp": datetime.now().isoformat(),
                "status": 500,
                "statusText": "Internal Server Error"
            }
        )

# Add this new function after validate_course_structure
def ensure_course_json_format(course_data: Dict, topic: str, difficulty: str, duration: str) -> Dict:
    """
    Ensures a course has the proper format and all required fields.
    Creates a complete course structure if the input is invalid.
    """
    # Current timestamp for IDs and dates
    current_time = int(time.time())
    timestamp = datetime.now().isoformat()
    course_id = f"course_{current_time}"
    
    # Check if the input is valid - if not, create a new course structure
    if not isinstance(course_data, dict):
        logging.warning(f"Invalid course data type: {type(course_data)}, creating new structure")
        course_data = {}
    
    # Validate required top-level fields
    if not course_data.get("title") or not isinstance(course_data.get("title"), str):
        logging.warning("Missing or invalid course title")
        course_data["title"] = f"Course on {topic}"
    
    if not course_data.get("description") or not isinstance(course_data.get("description"), str):
        logging.warning("Missing or invalid course description")
        course_data["description"] = f"A comprehensive course about {topic} for {difficulty} level learners."
    
    # Ensure course has required fields
    course = {
        "id": course_data.get("id") or course_id,
        "title": course_data.get("title"),
        "description": course_data.get("description"),
        "topic": course_data.get("topic") or topic,
        "difficulty": course_data.get("difficulty") or difficulty,
        "duration": course_data.get("duration") or duration,
        "createdAt": course_data.get("createdAt") or timestamp,
        "updatedAt": course_data.get("updatedAt") or timestamp,
        "prerequisites": course_data.get("prerequisites") or [],
        "learningGoals": course_data.get("learningGoals") or course_data.get("learningObjectives") or [],
        "assessment": course_data.get("assessment") or []
    }
    
    # Ensure modules are properly structured
    if not course_data.get("modules") or not isinstance(course_data.get("modules"), list) or len(course_data.get("modules", [])) == 0:
        logging.warning("Missing or invalid modules array, creating default module")
        course["modules"] = [
            {
                "id": f"module_{current_time}_1",
                "title": f"Introduction to {topic}",
                "description": f"An overview of {topic} fundamentals.",
                "lessons": [
                    {
                        "id": f"lesson_{current_time}_1_1",
                        "title": f"Getting Started with {topic}",
                        "description": "Basic concepts and foundations.",
                        "contentSummary": f"This lesson introduces the fundamental concepts of {topic}.",
                        "estimatedDuration": 60,
                        "resources": []
                    }
                ],
                "assessment": {
                    "type": "quiz",
                    "description": f"Test your understanding of {topic} basics."
                }
            }
        ]
    else:
        # Process each module to ensure proper structure
        processed_modules = []
        for i, module in enumerate(course_data.get("modules", [])):
            if not isinstance(module, dict):
                logging.warning(f"Invalid module data type at index {i}: {type(module)}")
                continue
                
            processed_module = {
                "id": module.get("id") or f"module_{current_time}_{i+1}",
                "title": module.get("title") or module.get("name") or f"Module {i+1}",
                "description": module.get("description") or f"A module in the {topic} course.",
                "assessment": module.get("assessment") or {
                    "type": "quiz",
                    "description": f"Assessment for Module {i+1}"
                }
            }
            
            # Process lessons
            processed_lessons = []
            if not module.get("lessons") or not isinstance(module.get("lessons"), list):
                logging.warning(f"Missing or invalid lessons array in module {i+1}")
                processed_module["lessons"] = [
                    {
                        "id": f"lesson_{current_time}_{i+1}_1",
                        "title": f"Lesson 1 in {processed_module['title']}",
                        "description": "Introduction to key concepts",
                        "contentSummary": f"This lesson covers important {topic} concepts.",
                        "estimatedDuration": 60,
                        "resources": []
                    }
                ]
            else:
                for j, lesson in enumerate(module.get("lessons", [])):
                    if not isinstance(lesson, dict):
                        logging.warning(f"Invalid lesson data type at module {i+1}, lesson {j+1}: {type(lesson)}")
                        continue
                        
                    processed_lesson = {
                        "id": lesson.get("id") or f"lesson_{current_time}_{i+1}_{j+1}",
                        "title": lesson.get("title") or f"Lesson {j+1}",
                        "description": lesson.get("description") or f"A lesson in Module {i+1}",
                        "contentSummary": lesson.get("contentSummary") or lesson.get("content") or f"Content for {lesson.get('title', f'Lesson {j+1}')}",
                        "estimatedDuration": lesson.get("estimatedDuration") or 60,
                        "resources": lesson.get("resources") or []
                    }
                    processed_lessons.append(processed_lesson)
                
                processed_module["lessons"] = processed_lessons
            
            processed_modules.append(processed_module)
        
        course["modules"] = processed_modules
    
    # Ensure we have at least one module
    if len(course["modules"]) == 0:
        logging.warning("No valid modules found, adding default module")
        course["modules"] = [
            {
                "id": f"module_{current_time}_1",
                "title": f"Introduction to {topic}",
                "description": f"An overview of {topic} fundamentals.",
                "lessons": [
                    {
                        "id": f"lesson_{current_time}_1_1",
                        "title": f"Getting Started with {topic}",
                        "description": "Basic concepts and foundations.",
                        "contentSummary": f"This lesson introduces the fundamental concepts of {topic}.",
                        "estimatedDuration": 60,
                        "resources": []
                    }
                ],
                "assessment": {
                    "type": "quiz",
                    "description": f"Test your understanding of {topic} basics."
                }
            }
        ]
    
    return course

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 
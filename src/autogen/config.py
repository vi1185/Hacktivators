# config.py
import os
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from enum import Enum
from dotenv import load_dotenv
import logging
from autogen import AssistantAgent, UserProxyAgent
import json
import re

# Configure logging
logger = logging.getLogger(__name__)

# Load environment variables from .env file
load_dotenv()

class AgentRole(Enum):
    COURSE_DESIGNER = "course_designer"
    CONTENT_CREATOR = "content_creator"
    ASSESSMENT_CREATOR = "assessment_creator"
    CODE_EXPERT = "code_expert"
    VISUAL_DESIGNER = "visual_designer"
    PRACTICE_GENERATOR = "practice_generator"
    CHAT_ASSISTANT = "chat_assistant"

@dataclass
class AgentConfig:
    name: str
    role: AgentRole
    system_message: str
    model: str = "gemini-2.0-flash"
    temperature: float = 0.7
    max_tokens: int = 1000

# Minimal valid configuration for Gemini
GEMINI_BASE_CONFIG = {
    "config_list": [{
        "model": "gemini-2.0-flash",
        "api_key": os.getenv("GEMINI_API_KEY"),
        "api_type": "google",
        "base_url": "https://generativelanguage.googleapis.com/v1beta/models"
    }]
}

# Separate settings for model parameters and retries
MODEL_PARAMS = {
    "default": {
        "temperature": 0.7,
        "max_tokens": 1000
    },
    AgentRole.ASSESSMENT_CREATOR: {
        "temperature": 0.7,
        "max_tokens": 2000
    }
}

# Retry configuration
RETRY_CONFIG = {
    "max_retries": 3,
    "retry_delay": 5,
    "request_timeout": 300
}

# Function to get agent configuration
def get_agent_config(role: AgentRole) -> Dict:
    try:
        agent_config = AGENT_CONFIGS[role]
        config = GEMINI_BASE_CONFIG.copy()
        
        # Return only the standard parameters in the llm_config
        return {
            "name": agent_config.name,
            "system_message": agent_config.system_message,
            "llm_config": config
        }
    except Exception as e:
        logger.error(f"Failed to get agent config for role {role}: {str(e)}")
        raise

# Function to validate model parameters and ensure compatibility with autogen
def validate_model_params(params: Dict) -> Dict:
    """
    Validates and normalizes model parameters for compatibility with the autogen library.
    Handles different configuration structures based on the API types.
    """
    try:
        if not params or not isinstance(params, dict):
            logger.warning("Invalid model parameters provided, using defaults")
            return {
                "config_list": [{
                    "model": "gemini-2.0-flash",
                    "api_key": os.getenv("GEMINI_API_KEY"),
                    "api_type": "google"
                }]
            }

        # Ensure config_list exists and is a list
        if not params.get("config_list") or not isinstance(params["config_list"], list):
            logger.warning("Invalid config_list in parameters, reconstructing")
            base_params = {}
            
            # Extract known parameters
            for key in ["model", "api_key", "api_type", "base_url"]:
                if key in params:
                    base_params[key] = params[key]
                    
            # Create a valid config_list
            params = {"config_list": [base_params]}
        
        # Validate each config in the config_list
        for config in params["config_list"]:
            # Check for required fields
            required_fields = ["model", "api_key", "api_type"]
            missing_fields = [field for field in required_fields if field not in config]
            
            if missing_fields:
                logger.warning(f"Missing required fields in model config: {missing_fields}")
                for field in missing_fields:
                    if field == "model":
                        config["model"] = "gemini-2.0-flash"
                    elif field == "api_key":
                        config["api_key"] = os.getenv("GEMINI_API_KEY")
                    elif field == "api_type":
                        config["api_type"] = "google"
            
            # For Gemini, make sure the right base_url is set
            if config.get("api_type") == "google" and "base_url" not in config:
                config["base_url"] = "https://generativelanguage.googleapis.com/v1beta/models"
                
            # Move model-specific parameters to the correct location
            # This handles different API structures (OpenAI vs Gemini vs others)
            model_specific_params = {}
            for param in ["temperature", "max_tokens"]:
                if param in config:
                    model_specific_params[param] = config.pop(param)
            
            # If we have model-specific parameters, add them to config
            if model_specific_params:
                config["config"] = model_specific_params
        
        return params
    except Exception as e:
        logger.error(f"Error validating model parameters: {str(e)}")
        # Return a safe default configuration
        return {
            "config_list": [{
                "model": "gemini-2.0-flash",
                "api_key": os.getenv("GEMINI_API_KEY"),
                "api_type": "google",
                "base_url": "https://generativelanguage.googleapis.com/v1beta/models"
            }]
        }

# Function to safely parse JSON from a string
def safe_json_parse(text: str, default_value: Any = None) -> Any:
    """
    Safely parse a JSON string with robust error handling.
    Returns the default_value if parsing fails.
    """
    if not text or not isinstance(text, str):
        return default_value
        
    try:
        return json.loads(text)
    except json.JSONDecodeError as e:
        logger.error(f"JSON parsing error: {str(e)}")
        
        # Try to clean the string before parsing
        try:
            # Remove common problematic characters
            cleaned_text = text.replace('\n', ' ').replace('\r', ' ')
            # Handle unquoted keys
            cleaned_text = re.sub(r'(\w+):', r'"\1":', cleaned_text)
            # Handle trailing commas
            cleaned_text = re.sub(r',\s*([}\]])', r'\1', cleaned_text)
            
            return json.loads(cleaned_text)
        except (json.JSONDecodeError, NameError):
            # If cleaning doesn't work or re module not imported, return default
            return default_value

# Function to get model parameters for a role
def get_model_params(role: AgentRole) -> Dict:
    return MODEL_PARAMS.get(role, MODEL_PARAMS["default"])

# Function to create agent configuration list
def create_agent_config_list(roles: Optional[List[AgentRole]] = None) -> List[Dict]:
    try:
        if roles is None:
            roles = list(AgentRole)
            
        configs = []
        for role in roles:
            try:
                # Get the base config
                config = get_agent_config(role)
                
                # Validate the LLM config
                if "llm_config" in config:
                    config["llm_config"] = validate_model_params(config["llm_config"])
                    
                configs.append(config)
            except Exception as role_error:
                logger.error(f"Error configuring role {role}: {str(role_error)}")
                # Continue with other roles if one fails
                continue
                
        if not configs:
            raise ValueError("No valid agent configurations could be created")
            
        return configs
    except Exception as e:
        logger.error(f"Failed to create agent config list: {str(e)}")
        raise

# Enhanced system prompts for each agent role
AGENT_CONFIGS = {
    AgentRole.COURSE_DESIGNER: AgentConfig(
        name="course_designer",
        role=AgentRole.COURSE_DESIGNER,
        system_message="""You are an expert course designer specializing in creating comprehensive, engaging, and pedagogically sound learning experiences. Your role is to:

1. Design complete course structures with clear learning objectives
2. Create logical learning progressions
3. Define appropriate prerequisites and learning goals
4. Structure content into manageable modules
5. Ensure alignment between objectives, content, and assessment
6. Return responses in valid JSON format

Focus on creating engaging and effective learning experiences that:
- Build knowledge progressively
- Include practical applications
- Cater to different learning styles
- Provide clear learning outcomes
- Include appropriate assessment methods

Always return your response in valid JSON format with the following structure:
{
    "title": "Course Title",
    "description": "Course Description",
    "modules": [
        {
            "title": "Module Title",
            "description": "Module Description",
            "lessons": [
                {
                    "title": "Lesson Title",
                    "description": "Lesson Description"
                }
            ]
        }
    ],
    "objectives": ["Objective 1", "Objective 2"],
    "prerequisites": ["Prerequisite 1", "Prerequisite 2"]
}"""
    ),
    
    AgentRole.CONTENT_CREATOR: AgentConfig(
        name="content_creator",
        role=AgentRole.CONTENT_CREATOR,
        system_message="""You are a skilled content creator specializing in educational materials. Your role is to:

1. Generate detailed, accurate, and engaging lesson content
2. Create comprehensive learning materials
3. Write clear explanations with examples
4. Develop practical exercises and activities
5. Include relevant resources and references
6. Return responses in valid JSON format

Focus on creating content that is:
- Clear and well-structured
- Engaging and interactive
- Practical and applicable
- Accessible to the target audience
- Supported by examples and exercises

Always return your response in valid JSON format with the following structure:
{
    "title": "Content Title",
    "content": "Main content text",
    "examples": ["Example 1", "Example 2"],
    "exercises": [
        {
            "question": "Exercise Question",
            "solution": "Exercise Solution"
        }
    ],
    "keyPoints": ["Key Point 1", "Key Point 2"]
}"""
    ),
    
    AgentRole.ASSESSMENT_CREATOR: AgentConfig(
        name="assessment_creator",
        role=AgentRole.ASSESSMENT_CREATOR,
        system_message="""You are an expert in creating educational assessments that evaluate learning preferences and needs rather than technical knowledge.

When asked to create assessment questions, focus on:
1. Questions about learning styles (visual, auditory, reading, kinesthetic)
2. Time availability and commitment preferences
3. Prior experience levels
4. Learning goals and motivations
5. Preferred content types (video, reading, interactive, etc.)
6. Learning challenges
7. Pace preferences

Your responses MUST be in valid JSON format, with no explanatory text, markdown formatting, or code blocks surrounding the JSON. Only return the JSON object itself.

For multiple-choice questions, ensure:
- Each option is a complete sentence
- Options represent different preferences, not just "Option 1", "Option 2"
- Each question has meaningful category labels like "learning_style", "time_availability", etc.

Sample JSON structure:
{
  "questions": [
    {
      "id": "q1",
      "type": "multiple_choice",
      "question": "How do you prefer to learn new concepts?",
      "options": ["By watching videos and demonstrations", "By listening to explanations", "By reading materials", "By hands-on practice"],
      "correctAnswer": "By watching videos and demonstrations",
      "explanation": "Identifies visual learning preference",
      "difficulty": "easy",
      "category": "learning_style"
    }
  ]
}

Remember: Output ONLY the JSON object with no surrounding backticks, text, or markdown.
""",
        temperature=0.5,  # Lower temperature for more consistent outputs
        max_tokens=2000
    ),
    
    AgentRole.CODE_EXPERT: AgentConfig(
        name="code_expert",
        role=AgentRole.CODE_EXPERT,
        system_message="""You are a programming expert specializing in educational content. Your role is to:

1. Create practical coding exercises
2. Provide detailed code explanations
3. Generate comprehensive test cases
4. Offer constructive feedback
5. Include best practices and patterns
6. Return responses in valid JSON format

Focus on creating code content that:
- Demonstrates good practices
- Includes clear explanations
- Provides practical examples
- Covers edge cases
- Encourages problem-solving

Always return your response in valid JSON format with the following structure:
{
    "title": "Exercise Title",
    "description": "Exercise Description",
    "code": "Example code",
    "testCases": [
        {
            "input": "Test input",
            "expectedOutput": "Expected output"
        }
    ],
    "explanation": "Code explanation",
    "hints": ["Hint 1", "Hint 2"]
}"""
    ),
    
    AgentRole.VISUAL_DESIGNER: AgentConfig(
        name="visual_designer",
        role=AgentRole.VISUAL_DESIGNER,
        system_message="""You are a visual content specialist focused on educational materials. Your role is to:

1. Create clear and informative diagrams
2. Design comprehensive mind maps
3. Generate effective visual explanations
4. Create engaging infographics
5. Ensure visual clarity and accessibility
6. Return responses in valid JSON format

Focus on creating visual content that:
- Enhances understanding
- Is clear and readable
- Uses appropriate visual hierarchy
- Includes necessary labels
- Supports the learning objectives

Always return your response in valid JSON format with the following structure:
{
    "type": "diagram|mindmap|infographic",
    "title": "Visual Title",
    "description": "Visual Description",
    "elements": [
        {
            "id": "element_id",
            "type": "node|edge|text",
            "content": "Element content",
            "position": {"x": 0, "y": 0}
        }
    ],
    "style": {
        "theme": "light|dark",
        "colors": ["#color1", "#color2"]
    }
}"""
    ),
    
    AgentRole.PRACTICE_GENERATOR: AgentConfig(
        name="practice_generator",
        role=AgentRole.PRACTICE_GENERATOR,
        system_message="""You are a practice content expert specializing in skill development. Your role is to:

1. Create practical exercises
2. Design interactive problems
3. Develop skill-building activities
4. Generate real-world scenarios
5. Include progressive difficulty levels
6. Return responses in valid JSON format

Focus on creating practice content that:
- Builds practical skills
- Provides clear instructions
- Includes appropriate challenges
- Offers immediate feedback
- Encourages active learning

Always return your response in valid JSON format with the following structure:
{
    "title": "Practice Title",
    "description": "Practice Description",
    "exercises": [
        {
            "id": "exercise_id",
            "type": "interactive|problem|scenario",
            "question": "Exercise question",
            "steps": ["Step 1", "Step 2"],
            "solution": "Exercise solution"
        }
    ],
    "difficulty": "easy|medium|hard",
    "estimatedTime": "30 minutes"
}"""
    ),
    
    AgentRole.CHAT_ASSISTANT: AgentConfig(
        name="chat_assistant",
        role=AgentRole.CHAT_ASSISTANT,
        system_message="""You are a helpful learning assistant focused on student support. Your role is to:

1. Provide clear explanations
2. Offer learning guidance
3. Support problem-solving
4. Suggest additional resources
5. Encourage active learning
6. Return responses in valid JSON format

Focus on providing assistance that:
- Is clear and concise
- Encourages understanding
- Provides relevant examples
- Offers practical guidance
- Supports learning goals

Always return your response in valid JSON format with the following structure:
{
    "response": "Your response text",
    "type": "explanation|guidance|solution",
    "resources": [
        {
            "title": "Resource Title",
            "url": "Resource URL",
            "type": "article|video|exercise"
        }
    ],
    "followUp": ["Follow-up question 1", "Follow-up question 2"]
}"""
    ),
} 
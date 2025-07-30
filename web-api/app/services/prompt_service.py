from pathlib import Path

from app.config import settings
from app.config.storage import USE_S3_STORAGE, storage_provider


class PromptService:
    @staticmethod
    def read_prompt(prompt_path: str) -> str:
        # Validate input to prevent path traversal attacks
        if ".." in prompt_path or prompt_path.startswith("/"):
            raise ValueError("Invalid prompt path: path traversal attempt detected")
            
        if not prompt_path.startswith(settings.PROMPTS_FOLDER):
            full_path = Path(settings.PROMPTS_FOLDER, prompt_path)
            prompt_path = str(full_path)
            
        # Additional validation after path resolution
        resolved_path = Path(prompt_path).resolve()
        prompts_folder = Path(settings.PROMPTS_FOLDER).resolve()
        if not str(resolved_path).startswith(str(prompts_folder)):
            raise ValueError("Invalid prompt path: outside of prompts directory")
            
        return storage_provider.read_prompt(prompt_path)

    @staticmethod
    def list_prompts(directory: str) -> list[str]:
        # Validate input to prevent path traversal attacks
        if ".." in directory or directory.startswith("/"):
            raise ValueError("Invalid directory path: path traversal attempt detected")
            
        if not directory.startswith(settings.PROMPTS_FOLDER):
            full_path = Path(settings.PROMPTS_FOLDER, directory)
            directory = str(full_path)
            
        # Additional validation after path resolution
        resolved_path = Path(directory).resolve()
        prompts_folder = Path(settings.PROMPTS_FOLDER).resolve()
        if not str(resolved_path).startswith(str(prompts_folder)):
            raise ValueError("Invalid directory path: outside of prompts directory")
            
        return storage_provider.list_prompts(directory)
    
    @staticmethod
    def get_note_format_prompts() -> dict[str, str]:
        note_formats_dir = f"{settings.PROMPTS_FOLDER}/note-formats"
        
        prompt_files = PromptService.list_prompts(note_formats_dir)
        
        prompts = {}
        for file_path in prompt_files:
            format_name = Path(file_path).stem
            prompts[format_name] = PromptService.read_prompt(file_path)
            
        return prompts
    
    @staticmethod
    def get_label_transcript_prompt() -> str:
        prompt_path = f"{settings.PROMPTS_FOLDER}/label-transcript.txt"
        return PromptService.read_prompt(prompt_path)


prompt_service = PromptService() 
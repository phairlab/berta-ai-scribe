"""Service for loading prompt files from the configured storage provider."""
from pathlib import Path

from app.config import settings
from app.config.storage import USE_S3_STORAGE, storage_provider


class PromptService:
    """Service for loading AI prompts from storage."""

    @staticmethod
    def read_prompt(prompt_path: str) -> str:
        """
        Reads a prompt file from the configured storage.
        
        Args:
            prompt_path: The path to the prompt file, relative to the prompts folder.
            
        Returns:
            The contents of the prompt file as a string.
        """
        # Construct the full path if it's a relative path
        if not prompt_path.startswith(settings.PROMPTS_FOLDER):
            full_path = Path(settings.PROMPTS_FOLDER, prompt_path)
            prompt_path = str(full_path)
            
        return storage_provider.read_prompt(prompt_path)

    @staticmethod
    def list_prompts(directory: str) -> list[str]:
        """
        Lists all prompt files in the specified directory.
        
        Args:
            directory: The directory to list prompt files from, relative to the prompts folder.
            
        Returns:
            A list of paths to prompt files.
        """
        # Construct the full path if it's a relative path
        if not directory.startswith(settings.PROMPTS_FOLDER):
            full_path = Path(settings.PROMPTS_FOLDER, directory)
            directory = str(full_path)
            
        return storage_provider.list_prompts(directory)
    
    @staticmethod
    def get_note_format_prompts() -> dict[str, str]:
        """
        Gets all note format prompts.
        
        Returns:
            A dictionary mapping note format names to their system prompts.
        """
        # Directory for note format prompts
        note_formats_dir = f"{settings.PROMPTS_FOLDER}/note-formats"
        
        # Get all prompt files in the note formats directory
        prompt_files = PromptService.list_prompts(note_formats_dir)
        
        # Load each prompt file and map the format name to its content
        prompts = {}
        for file_path in prompt_files:
            # Extract format name from file name (e.g., "plaintext.txt" -> "plaintext")
            format_name = Path(file_path).stem
            prompts[format_name] = PromptService.read_prompt(file_path)
            
        return prompts
    
    @staticmethod
    def get_label_transcript_prompt() -> str:
        """
        Gets the label transcript system prompt.
        
        Returns:
            The label transcript system prompt as a string.
        """
        prompt_path = f"{settings.PROMPTS_FOLDER}/label-transcript.txt"
        return PromptService.read_prompt(prompt_path)


# Create a global instance of the prompt service
prompt_service = PromptService() 
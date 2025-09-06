import hashlib
from pathlib import Path
from typing import BinaryIO, Tuple
import tempfile
import os

# Try to import magic, but make it optional
try:
    import magic
    MAGIC_AVAILABLE = True
except ImportError:
    MAGIC_AVAILABLE = False

class FileValidator:
    """Validate uploaded files for security"""
    
    # Maximum file sizes in bytes
    MAX_AUDIO_SIZE = 100 * 1024 * 1024  # 100 MB
    MAX_IMAGE_SIZE = 10 * 1024 * 1024   # 10 MB
    
    # Allowed MIME types and extensions
    ALLOWED_AUDIO_TYPES = {
        'audio/mpeg': ['.mp3'],
        'audio/mp4': ['.m4a', '.mp4'],
        'audio/wav': ['.wav'],
        'audio/x-wav': ['.wav'],
        'audio/webm': ['.webm'],
        'video/webm': ['.webm'],  # Browsers often report WebM audio as video/webm
        'audio/ogg': ['.ogg'],
    }
    
    ALLOWED_IMAGE_TYPES = {
        'image/jpeg': ['.jpg', '.jpeg'],
        'image/png': ['.png'],
        'image/gif': ['.gif'],
        'image/webp': ['.webp'],
    }
    
    @staticmethod
    def validate_audio_file(file: BinaryIO, filename: str) -> Tuple[bool, str]:
        """Validate audio file for type and size"""
        try:
            file_ext = Path(filename).suffix.lower()
            valid_extensions = []
            for exts in FileValidator.ALLOWED_AUDIO_TYPES.values():
                valid_extensions.extend(exts)
            
            if file_ext not in valid_extensions:
                return False, f"Invalid file extension. Allowed: {', '.join(valid_extensions)}"
            
            file.seek(0, 2)  # Seek to end
            file_size = file.tell()
            file.seek(0)  # Reset to beginning
            
            if file_size > FileValidator.MAX_AUDIO_SIZE:
                return False, f"File too large. Maximum size: {FileValidator.MAX_AUDIO_SIZE // (1024*1024)}MB"
            
            if file_size == 0:
                return False, "File is empty"
            
            # Verify MIME type matches content (prevents disguised files)
            # Note: python-magic is optional, fallback to extension check
            if MAGIC_AVAILABLE:
                try:
                    file_content = file.read(8192)  # Read first 8KB
                    file.seek(0)  # Reset
                    
                    mime = magic.from_buffer(file_content, mime=True)
                    if mime not in FileValidator.ALLOWED_AUDIO_TYPES:
                        return False, f"Invalid file type detected: {mime}"
                except Exception as e:
                    # If magic fails for any reason, continue with validation
                    pass
            
            return True, "Valid audio file"
            
        except Exception as e:
            return False, f"Error validating file: {str(e)}"
    
    @staticmethod
    def validate_filename(filename: str) -> Tuple[bool, str]:
        """Validate filename for security issues"""
        if ".." in filename or "/" in filename or "\\" in filename:
            return False, "Invalid filename: contains path characters"
        
        if "\x00" in filename:
            return False, "Invalid filename: contains null bytes"
        
        if len(filename) > 255:
            return False, "Filename too long"
        
        if "." not in filename:
            return False, "Filename must have an extension"
        
        return True, "Valid filename"
    
    @staticmethod
    def sanitize_filename(filename: str) -> str:
        """Sanitize filename for safe storage"""
        # Remove path components
        filename = Path(filename).name
        
        # Replace problematic characters
        sanitized = "".join(c for c in filename if c.isalnum() or c in ".-_")
        
        # Ensure extension is preserved
        if "." in filename:
            name, ext = filename.rsplit(".", 1)
            sanitized_name = "".join(c for c in name if c.isalnum() or c in "-_")
            sanitized = f"{sanitized_name}.{ext}"
        
        # Add timestamp to prevent collisions
        import time
        timestamp = int(time.time())
        name, ext = sanitized.rsplit(".", 1)
        
        return f"{name}_{timestamp}.{ext}"
    
    @staticmethod
    def calculate_file_hash(file: BinaryIO) -> str:
        """Calculate SHA-256 hash of file for integrity verification"""
        sha256_hash = hashlib.sha256()
        file.seek(0)
        
        # Read file in chunks to handle large files
        for chunk in iter(lambda: file.read(4096), b""):
            sha256_hash.update(chunk)
        
        file.seek(0)  # Reset position
        return sha256_hash.hexdigest()


# Global validator instance
file_validator = FileValidator()
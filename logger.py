import logging
import sys
import os
from logging.handlers import RotatingFileHandler
from typing import Optional, Union, Dict, Any

from config import config

class Logger:
    """Custom logger implementation for the application."""
    
    _loggers: Dict[str, logging.Logger] = {}
    
    @classmethod
    def get_logger(cls, name: str) -> logging.Logger:
        """
        Get or create a logger with the specified name.
        
        Args:
            name: The name of the logger, typically the module name
            
        Returns:
            A configured logger instance
        """
        if name in cls._loggers:
            return cls._loggers[name]
        
        logger = logging.getLogger(name)
        
        # Set default log level
        log_level = getattr(logging, config.LOG_LEVEL.upper(), logging.INFO)
        logger.setLevel(log_level)
        
        # Prevent adding handlers multiple times
        if not logger.handlers:
            # Console handler
            console_handler = logging.StreamHandler(sys.stdout)
            console_handler.setFormatter(logging.Formatter(config.LOG_FORMAT))
            logger.addHandler(console_handler)
            
            # File handler if configured
            if config.LOG_FILE:
                try:
                    file_handler = RotatingFileHandler(
                        config.LOG_FILE,
                        maxBytes=10485760,  # 10MB
                        backupCount=5
                    )
                    file_handler.setFormatter(logging.Formatter(config.LOG_FORMAT))
                    logger.addHandler(file_handler)
                except (IOError, PermissionError) as e:
                    console_handler.setLevel(logging.WARNING)
                    logger.warning(f"Failed to create log file: {e}")
        
        cls._loggers[name] = logger
        return logger

    @classmethod
    def set_level(cls, level: Union[int, str]) -> None:
        """
        Set the logging level for all registered loggers.
        
        Args:
            level: The log level to set (can be a string like 'INFO' or a logging constant)
        """
        if isinstance(level, str):
            level = getattr(logging, level.upper(), logging.INFO)
            
        for logger in cls._loggers.values():
            logger.setLevel(level)
            for handler in logger.handlers:
                handler.setLevel(level)

    @classmethod
    def add_file_handler(cls, log_file: str) -> None:
        """
        Add a file handler to all registered loggers.
        
        Args:
            log_file: Path to the log file
        """
        try:
            file_handler = RotatingFileHandler(
                log_file,
                maxBytes=10485760,  # 10MB
                backupCount=5
            )
            file_handler.setFormatter(logging.Formatter(config.LOG_FORMAT))
            
            for logger in cls._loggers.values():
                logger.addHandler(file_handler)
        except (IOError, PermissionError) as e:
            cls.get_logger(__name__).warning(f"Failed to create log file: {e}")

# Create a default application logger
logger = Logger.get_logger("app")
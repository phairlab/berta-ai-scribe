#!/usr/bin/env python3
"""
CLI tool to list available services and their options.
"""

from app.config import print_available_services

def main():
    """Main entry point for the CLI."""
    print_available_services()

if __name__ == "__main__":
    main() 
#!/usr/bin/env python3
"""
TheDrive Data Population Script from Folder Structure

This script reads user data from a specific folder structure and populates
the TheDrive database accordingly. It respects the exact folder structure
provided by the evaluation team.

Expected folder structure:
    Data/
    ├── UserID1/
    │   ├── Data/
    │   │   ├── file1.pdf
    │   │   ├── file2.docx
    │   │   └── ...
    │   └── info.json
    └── UserID2/
        ├── Data/
        │   └── files...
        └── info.json

Each info.json contains:
{
    "name": "User Full Name",
    "password": "PlainTextPassword",
    "email": "user@example.com"
}

SETUP:
    1. Create a .env file in your project root with the following variables:
       UPLOAD_DIRECTORY=./uploads
       STORAGE_SALT=your-random-salt-here
       THEDRIVE_DATABASE_TYPE=sqlite
       THEDRIVE_SQLITE_DATABASE_PATH=./thedrive.db
       
    2. Ensure your Data folder follows the expected structure

USAGE:
    python populate_from_folder.py --data-folder ./SampleData
    python populate_from_folder.py --data-folder ./SampleData --verbose
    python populate_from_folder.py --data-folder ./SampleData --cleanup
    python populate_from_folder.py --data-folder ./SampleData --preserve-existing
    python database_populate_script.py --data-folder ./SampleData --dry-run
"""

import json
import os
import sys
import argparse
import logging
import shutil
from pathlib import Path
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple, Any
import hashlib
import uuid

# Add the app directory to Python path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Import TheDrive application components
from sqlalchemy.orm import Session
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError

from app.core.database import SessionLocal, create_database_tables
from app.core.security import SecurityUtils
from app.core.config import settings
from app.models.user import User
from app.models.file import FileRecord, generate_unique_filename, detect_mime_type
from app.services.file_storage import UserStorageManager, get_storage_config

# Configure logging with detailed format for debugging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('data_import.log', mode='w')
    ]
)
logger = logging.getLogger(__name__)


class FolderDataImporter:
    """
    Imports user data from the specified folder structure into TheDrive database.
    
    This class handles the complete import process:
    1. Scans the Data folder for UserID directories
    2. Reads info.json files to extract user credentials
    3. Creates user accounts in the database
    4. Copies user files to the appropriate storage location
    5. Creates file records in the database
    """
    
    def __init__(self, data_folder: str):
        """
        Initialize the importer with the path to the Data folder.
        
        Args:
            data_folder: Path to the root Data folder containing UserID folders
        """
        self.data_folder = Path(data_folder)
        
        # Validate that the data folder exists
        if not self.data_folder.exists():
            raise ValueError(f"Data folder does not exist: {data_folder}")
        
        if not self.data_folder.is_dir():
            raise ValueError(f"Data folder is not a directory: {data_folder}")
        
        # Initialize storage manager for file operations
        try:
            upload_dir, storage_salt = get_storage_config()
            self.storage_manager = UserStorageManager(upload_dir, storage_salt)
            logger.info(f"Storage manager initialized: {upload_dir}")
        except Exception as e:
            logger.error(f"Failed to initialize storage manager: {e}")
            raise
        
        # Track import statistics
        self.stats = {
            'users_found': 0,
            'users_created': 0,
            'users_skipped': 0,
            'files_imported': 0,
            'files_failed': 0,
            'total_size_bytes': 0
        }
    
    def scan_data_folder(self) -> List[Dict[str, Any]]:
        """
        Scan the Data folder and extract user information.
        
        Returns:
            List of dictionaries containing user data and file paths
        """
        logger.info(f"Scanning data folder: {self.data_folder}")
        user_data_list = []
        
        # Iterate through all subdirectories in the Data folder
        for user_folder in self.data_folder.iterdir():
            if not user_folder.is_dir():
                logger.debug(f"Skipping non-directory: {user_folder}")
                continue
            
            # Each UserID folder should contain an info.json file
            info_file = user_folder / "info.json"
            
            if not info_file.exists():
                logger.warning(f"No info.json found in {user_folder.name}, skipping")
                continue
            
            try:
                # Read and parse the info.json file
                with open(info_file, 'r', encoding='utf-8') as f:
                    user_info = json.load(f)
                
                # Validate required fields
                required_fields = ['name', 'password', 'email']
                missing_fields = [field for field in required_fields if field not in user_info]
                
                if missing_fields:
                    logger.error(f"Missing fields in {info_file}: {missing_fields}")
                    continue
                
                # Collect all files in the UserID/Data subfolder
                data_subfolder = user_folder / "Data"
                user_files = []
                
                if data_subfolder.exists() and data_subfolder.is_dir():
                    # Recursively find all files in the Data subfolder
                    for file_path in data_subfolder.rglob('*'):
                        if file_path.is_file():
                            # Calculate relative path from the Data subfolder
                            relative_path = file_path.relative_to(data_subfolder)
                            user_files.append({
                                'source_path': file_path,
                                'relative_path': str(relative_path),
                                'filename': file_path.name,
                                'size': file_path.stat().st_size
                            })
                            logger.debug(f"Found file: {relative_path} ({file_path.stat().st_size} bytes)")
                
                # Compile user data
                user_data = {
                    'folder_name': user_folder.name,  # UserID1, UserID2, etc.
                    'email': user_info['email'],
                    'password': user_info['password'],  # Note: This is plain text, will be hashed
                    'full_name': user_info['name'],
                    'files': user_files,
                    'source_folder': user_folder
                }
                
                user_data_list.append(user_data)
                self.stats['users_found'] += 1
                logger.info(f"Found user: {user_info['email']} with {len(user_files)} files")
                
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse JSON in {info_file}: {e}")
                continue
            except Exception as e:
                logger.error(f"Error processing {user_folder.name}: {e}")
                continue
        
        logger.info(f"Scan complete: Found {len(user_data_list)} valid users")
        return user_data_list
    
    def create_user(self, session: Session, user_data: Dict[str, Any]) -> Optional[User]:
        """
        Create a user in the database from the extracted data.
        
        Args:
            session: Database session
            user_data: Dictionary containing user information
            
        Returns:
            Created User object or None if creation failed
        """
        try:
            # Check if user already exists
            existing_user = session.query(User).filter_by(email=user_data['email']).first()
            
            if existing_user:
                logger.warning(f"User already exists: {user_data['email']}")
                self.stats['users_skipped'] += 1
                return existing_user  # Return existing user to potentially update their files
            
            # Hash the password (SecurityUtils handles the hashing)
            hashed_password = SecurityUtils.get_password_hash(user_data['password'])
            
            # Create new user with reasonable defaults
            user = User(
                email=user_data['email'],
                username=user_data['email'].split('@')[0],  # Use email prefix as username
                hashed_password=hashed_password,
                full_name=user_data['full_name'],
                is_active=True,
                is_email_verified=True,  # Assume verified for imported users
                is_admin=False,  # Default to non-admin, can be updated later
                storage_limit_bytes=10 * 1024 * 1024 * 1024,  # 10GB default limit
                storage_used_bytes=0,
                created_at=datetime.now(timezone.utc),
                last_login_at=None
            )
            
            session.add(user)
            session.flush()  # Get the user ID without committing
            
            self.stats['users_created'] += 1
            logger.info(f"Created user: {user.email} (ID: {user.id})")
            return user
            
        except IntegrityError as e:
            logger.error(f"Database integrity error creating user {user_data['email']}: {e}")
            session.rollback()
            return None
        except Exception as e:
            logger.error(f"Failed to create user {user_data['email']}: {e}")
            session.rollback()
            return None
    
    def import_user_files(self, session: Session, user: User, files: List[Dict[str, Any]]) -> int:
        """
        Import files for a specific user.
        
        Args:
            session: Database session
            user: User object
            files: List of file dictionaries with source paths and metadata
            
        Returns:
            Number of successfully imported files
        """
        imported_count = 0
        total_size = 0
        
        for file_info in files:
            try:
                source_path = file_info['source_path']
                
                # Generate a unique filename for storage
                safe_filename, unique_id = generate_unique_filename(file_info['filename'])
                
                # Get the storage path for this user's file
                storage_path, relative_storage_path = self.storage_manager.get_file_path(
                    user_id=user.id,
                    user_email=user.email,
                    filename=safe_filename
                )
                
                # Copy the file to the storage location
                logger.debug(f"Copying {source_path} to {storage_path}")
                shutil.copy2(source_path, storage_path)
                
                # Detect MIME type
                mime_type = detect_mime_type(file_info['filename'])
                
                # Extract file extension
                file_extension = Path(file_info['filename']).suffix.lower()
                
                # Calculate file checksum for deduplication
                checksum = self.calculate_file_checksum(source_path)
                
                # Determine folder path in virtual filesystem
                # If the file was in a subfolder, preserve that structure
                relative_path = file_info['relative_path']
                if '/' in relative_path:
                    # File was in a subfolder
                    folder_parts = relative_path.split('/')[:-1]
                    folder_path = '/' + '/'.join(folder_parts)
                else:
                    # File was in root of Data folder
                    folder_path = '/'
                
                # Create file record in database
                file_record = FileRecord(
                    owner_id=user.id,
                    original_filename=file_info['filename'],
                    filename=safe_filename,
                    file_path=relative_storage_path,
                    folder_path=folder_path,
                    file_size=file_info['size'],
                    mime_type=mime_type,
                    file_extension=file_extension,
                    checksum=checksum,
                    created_at=datetime.now(timezone.utc),
                    is_active=True,
                    is_virus_scanned=False,  # Will need scanning in production
                    access_level='private',
                    download_count=0
                )
                
                session.add(file_record)
                
                imported_count += 1
                total_size += file_info['size']
                self.stats['files_imported'] += 1
                self.stats['total_size_bytes'] += file_info['size']
                
                logger.debug(f"Imported file: {file_info['filename']} ({file_info['size']} bytes)")
                
            except Exception as e:
                logger.error(f"Failed to import file {file_info['filename']} for user {user.email}: {e}")
                self.stats['files_failed'] += 1
                continue
        
        # Update user's storage usage
        if imported_count > 0:
            user.storage_used_bytes = (user.storage_used_bytes or 0) + total_size
            logger.info(f"Imported {imported_count} files for {user.email} (Total: {total_size:,} bytes)")
        
        return imported_count
    
    def calculate_file_checksum(self, file_path: Path) -> str:
        """
        Calculate SHA-256 checksum of a file.
        
        Args:
            file_path: Path to the file
            
        Returns:
            Hexadecimal string of the checksum
        """
        sha256_hash = hashlib.sha256()
        
        with open(file_path, "rb") as f:
            # Read file in chunks to handle large files efficiently
            for byte_block in iter(lambda: f.read(4096), b""):
                sha256_hash.update(byte_block)
        
        return sha256_hash.hexdigest()
    
    def cleanup_existing_data(self, session: Session) -> Dict[str, int]:
        """
        Remove all existing users and files from the database.
        
        WARNING: This is destructive and will delete all data!
        
        Args:
            session: Database session
            
        Returns:
            Dictionary with counts of deleted items
        """
        logger.warning("Starting cleanup of existing data...")
        
        try:
            # Count existing data
            existing_users = session.query(User).count()
            existing_files = session.query(FileRecord).count()
            
            # Delete all files first (due to foreign key constraints)
            session.query(FileRecord).delete()
            logger.info(f"Deleted {existing_files} file records")
            
            # Delete all users
            session.query(User).delete()
            logger.info(f"Deleted {existing_users} user records")
            
            # Clean up storage directory
            if self.storage_manager:
                storage_base = Path(self.storage_manager.base_upload_dir)
                if storage_base.exists():
                    # Remove all user folders (they're hashed folder names)
                    for user_folder in storage_base.iterdir():
                        if user_folder.is_dir():
                            shutil.rmtree(user_folder)
                            logger.debug(f"Removed storage folder: {user_folder}")
            
            session.commit()
            
            return {
                'users_deleted': existing_users,
                'files_deleted': existing_files
            }
            
        except Exception as e:
            logger.error(f"Failed to cleanup existing data: {e}")
            session.rollback()
            raise
    
    def execute_import(self, cleanup_first: bool = False, 
                      preserve_existing: bool = False) -> Dict[str, Any]:
        """
        Execute the complete import process.
        
        Args:
            cleanup_first: If True, remove all existing data before import
            preserve_existing: If True, skip users that already exist
            
        Returns:
            Dictionary containing import statistics and results
        """
        logger.info("=" * 70)
        logger.info("Starting TheDrive data import from folder structure")
        logger.info(f"Data folder: {self.data_folder}")
        logger.info(f"Cleanup first: {cleanup_first}")
        logger.info(f"Preserve existing: {preserve_existing}")
        logger.info("=" * 70)
        
        start_time = datetime.now()
        
        try:
            # Validate database connectivity
            with SessionLocal() as session:
                session.execute(text("SELECT 1"))
                logger.info("✓ Database connection successful")
            
            # Ensure database tables exist
            create_database_tables()
            logger.info("✓ Database tables ready")
            
            # Scan the data folder
            user_data_list = self.scan_data_folder()
            
            if not user_data_list:
                logger.warning("No valid user data found in folder structure")
                return {
                    'success': False,
                    'message': 'No valid user data found',
                    'stats': self.stats
                }
            
            with SessionLocal() as session:
                # Cleanup if requested
                if cleanup_first:
                    if not preserve_existing:  # Sanity check
                        cleanup_stats = self.cleanup_existing_data(session)
                        logger.info(f"Cleanup complete: {cleanup_stats}")
                
                # Process each user
                for user_data in user_data_list:
                    logger.info(f"Processing user: {user_data['email']}")
                    
                    # Create or get user
                    user = self.create_user(session, user_data)
                    
                    if user and user_data['files']:
                        # Import user's files
                        files_imported = self.import_user_files(
                            session, 
                            user, 
                            user_data['files']
                        )
                        
                        if files_imported > 0:
                            session.commit()  # Commit after each user's files
                            logger.info(f"✓ Committed {files_imported} files for {user.email}")
                
                # Final commit to ensure everything is saved
                session.commit()
            
            # Calculate import duration
            duration = (datetime.now() - start_time).total_seconds()
            
            # Prepare final results
            results = {
                'success': True,
                'duration_seconds': duration,
                'stats': self.stats,
                'message': f"Successfully imported {self.stats['users_created']} users and {self.stats['files_imported']} files"
            }
            
            # Print summary
            logger.info("=" * 70)
            logger.info("IMPORT COMPLETE")
            logger.info(f"Duration: {duration:.2f} seconds")
            logger.info(f"Users found: {self.stats['users_found']}")
            logger.info(f"Users created: {self.stats['users_created']}")
            logger.info(f"Users skipped: {self.stats['users_skipped']}")
            logger.info(f"Files imported: {self.stats['files_imported']}")
            logger.info(f"Files failed: {self.stats['files_failed']}")
            logger.info(f"Total size: {self.stats['total_size_bytes']:,} bytes")
            logger.info("=" * 70)
            
            return results
            
        except Exception as e:
            logger.error(f"Import failed with error: {e}")
            return {
                'success': False,
                'message': f'Import failed: {str(e)}',
                'stats': self.stats,
                'error': str(e)
            }


def validate_environment():
    """
    Validate that all required environment variables and configurations are set.
    
    Returns:
        True if environment is valid, False otherwise
    """
    # Check for critical environment variables
    # Note: The app uses THEDRIVE_ prefix for most variables, but storage uses different names
    
    issues = []
    
    # Check upload directory
    upload_dir = os.getenv('UPLOAD_DIRECTORY', './uploads')
    if not upload_dir:
        issues.append("UPLOAD_DIRECTORY is not set (defaults to ./uploads)")
    
    # Check storage salt
    storage_salt = os.getenv('STORAGE_SALT', 'dev-salt-change-in-production')
    if storage_salt == 'dev-salt-change-in-production':
        logger.warning("⚠️  Using default STORAGE_SALT - this should be changed for production!")
    
    # Check database configuration
    # The app uses THEDRIVE_ prefix for database settings
    db_type = os.getenv('THEDRIVE_DATABASE_TYPE', 'sqlite')
    
    if db_type == 'sqlite':
        db_path = os.getenv('THEDRIVE_SQLITE_DATABASE_PATH', './thedrive.db')
        logger.info(f"Using SQLite database: {db_path}")
    elif db_type == 'postgresql':
        # Check PostgreSQL settings
        pg_host = os.getenv('THEDRIVE_POSTGRES_HOST')
        pg_user = os.getenv('THEDRIVE_POSTGRES_USER')
        pg_password = os.getenv('THEDRIVE_POSTGRES_PASSWORD')
        pg_database = os.getenv('THEDRIVE_POSTGRES_DATABASE')
        
        if not all([pg_host, pg_user, pg_password, pg_database]):
            issues.append("PostgreSQL configuration incomplete - check THEDRIVE_POSTGRES_* variables")
    
    if issues:
        logger.error("Configuration issues found:")
        for issue in issues:
            logger.error(f"  - {issue}")
        logger.info("\nPlease check your .env file. See the example .env provided with the script.")
        return False
    
    logger.info("✓ Environment configuration validated")
    return True


def main():
    """
    Main entry point for the data import script.
    
    Parses command-line arguments and executes the import process.
    """
    parser = argparse.ArgumentParser(
        description="Import user data from folder structure into TheDrive",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Import from Data folder, preserving existing users
  python populate_from_folder.py --data-folder ./Data --preserve-existing
  
  # Clean all data and import fresh
  python populate_from_folder.py --data-folder ./Data --cleanup
  
  # Import with verbose logging
  python populate_from_folder.py --data-folder ./Data --verbose
        """
    )
    
    parser.add_argument(
        '--data-folder',
        type=str,
        default='./Data',
        help='Path to the Data folder containing UserID subfolders (default: ./Data)'
    )
    
    parser.add_argument(
        '--cleanup',
        action='store_true',
        help='Remove all existing data before importing (DESTRUCTIVE!)'
    )
    
    parser.add_argument(
        '--preserve-existing',
        action='store_true',
        help='Skip users that already exist in the database'
    )
    
    parser.add_argument(
        '--verbose',
        action='store_true',
        help='Enable verbose debug logging'
    )
    
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Scan and validate data without actually importing'
    )
    
    args = parser.parse_args()
    
    # Configure logging level
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)
        logger.debug("Verbose logging enabled")
    
    # Validate environment
    if not validate_environment():
        logger.error("\nEnvironment validation failed!")
        logger.info("\nTo fix this, create a .env file in your project root with:")
        logger.info("  UPLOAD_DIRECTORY=./uploads")
        logger.info("  STORAGE_SALT=your-random-salt-here")
        logger.info("  THEDRIVE_DATABASE_TYPE=sqlite")
        logger.info("  THEDRIVE_SQLITE_DATABASE_PATH=./thedrive.db")
        logger.info("\nFor production, use PostgreSQL and change the STORAGE_SALT to a secure random value.")
        return 1
    
    # Validate arguments
    if args.cleanup and args.preserve_existing:
        logger.error("Cannot use --cleanup and --preserve-existing together")
        return 1
    
    # Check if data folder exists
    if not Path(args.data_folder).exists():
        logger.error(f"Data folder does not exist: {args.data_folder}")
        return 1
    
    # Warn about cleanup
    if args.cleanup:
        print("\n" + "=" * 70)
        print("⚠️  WARNING: DESTRUCTIVE OPERATION")
        print("This will DELETE all existing users and files!")
        print("=" * 70)
        confirm = input("Are you sure you want to continue? Type 'yes' to confirm: ")
        
        if confirm.lower() != 'yes':
            logger.info("Operation cancelled by user")
            return 0
    
    try:
        # Create importer instance
        importer = FolderDataImporter(args.data_folder)
        
        # Dry run mode - just scan and report
        if args.dry_run:
            logger.info("Running in DRY RUN mode - no data will be imported")
            user_data_list = importer.scan_data_folder()
            
            print("\n" + "=" * 70)
            print("DRY RUN RESULTS")
            print("=" * 70)
            print(f"Users found: {len(user_data_list)}")
            
            total_files = 0
            total_size = 0
            
            for user_data in user_data_list:
                files_count = len(user_data['files'])
                files_size = sum(f['size'] for f in user_data['files'])
                total_files += files_count
                total_size += files_size
                
                print(f"\n  • {user_data['email']}")
                print(f"    Name: {user_data['full_name']}")
                print(f"    Files: {files_count}")
                print(f"    Size: {files_size:,} bytes")
            
            print(f"\nTotal files: {total_files}")
            print(f"Total size: {total_size:,} bytes ({total_size / (1024**3):.2f} GB)")
            print("=" * 70)
            
            return 0
        
        # Execute the import
        results = importer.execute_import(
            cleanup_first=args.cleanup,
            preserve_existing=args.preserve_existing
        )
        
        if results['success']:
            logger.info(f"✅ {results['message']}")
            return 0
        else:
            logger.error(f"❌ {results['message']}")
            return 1
            
    except KeyboardInterrupt:
        logger.info("\n🛑 Import cancelled by user")
        return 130
        
    except Exception as e:
        logger.error(f"💥 Unexpected error: {e}", exc_info=True)
        return 1


if __name__ == "__main__":
    exit(main())
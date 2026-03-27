#!/usr/bin/env node

/**
 * Yachi Project Reset Script
 * Enterprise-level project reset and cleanup utility
 * Handles database cleanup, cache clearing, file cleanup, and system reset
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const readline = require('readline');
const chalk = require('chalk');

// Configuration
const CONFIG = {
  projectRoot: process.cwd(),
  backupDir: '.yachi-backup',
  logFile: 'reset-project.log',
  safeMode: true,
  maxBackupAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
};

// File patterns to preserve
const PRESERVE_PATTERNS = [
  '.env',
  '.env.local',
  '.env.production',
  'eas.json',
  'app.json',
  'package.json',
  'yarn.lock',
  'package-lock.json',
  'firebase.json',
  'google-services.json',
  'GoogleService-Info.plist',
];

// Directory patterns to clean
const CLEAN_DIRECTORIES = [
  'node_modules',
  '.expo',
  '.cache',
  'dist',
  'build',
  '.next',
  '.nuxt',
  '.output',
  '.vscode',
  '.idea',
  'coverage',
  '.nyc_output',
];

// File patterns to remove
const CLEAN_FILE_PATTERNS = [
  '*.log',
  '*.tmp',
  '*.temp',
  '.DS_Store',
  'Thumbs.db',
  '.eslintcache',
];

// Database reset configurations
const DATABASE_CONFIG = {
  collections: [
    'users',
    'services',
    'bookings',
    'payments',
    'messages',
    'reviews',
    'projects',
    'notifications'
  ],
  preserveAdmin: true,
  preserveSystemData: true,
};

class ProjectReset {
  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    this.logStream = null;
    this.startTime = null;
    this.errors = [];
  }

  /**
   * Initialize reset process
   */
  async initialize() {
    this.startTime = Date.now();
    this.setupLogging();
    
    console.log(chalk.blue.bold('\n🏠 Yachi Project Reset Utility\n'));
    console.log(chalk.gray('Enterprise-level project cleanup and reset\n'));

    this.log('INFO', `Reset process initialized at ${new Date().toISOString()}`);
    this.log('INFO', `Project root: ${CONFIG.projectRoot}`);
  }

  /**
   * Setup logging to file
   */
  setupLogging() {
    const logPath = path.join(CONFIG.projectRoot, CONFIG.logFile);
    this.logStream = fs.createWriteStream(logPath, { flags: 'a' });
    
    this.log('INFO', `Log file: ${logPath}`);
  }

  /**
   * Log message to file and console
   */
  log(level, message) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${level}: ${message}\n`;
    
    if (this.logStream) {
      this.logStream.write(logMessage);
    }

    // Color code console output
    const colors = {
      INFO: chalk.blue,
      WARN: chalk.yellow,
      ERROR: chalk.red,
      SUCCESS: chalk.green
    };

    console.log(colors[level]?.('•') || '•', message);
  }

  /**
   * Prompt user for confirmation
   */
  async prompt(question) {
    return new Promise((resolve) => {
      this.rl.question(chalk.yellow(`❓ ${question} (y/N): `), (answer) => {
        resolve(answer.toLowerCase() === 'y');
      });
    });
  }

  /**
   * Validate project structure
   */
  validateProjectStructure() {
    this.log('INFO', 'Validating project structure...');

    const requiredFiles = [
      'package.json',
      'app.json',
      'eas.json',
      'App.js'
    ];

    const missingFiles = requiredFiles.filter(file => 
      !fs.existsSync(path.join(CONFIG.projectRoot, file))
    );

    if (missingFiles.length > 0) {
      throw new Error(`Missing required files: ${missingFiles.join(', ')}`);
    }

    // Validate package.json
    try {
      const packageJson = JSON.parse(
        fs.readFileSync(path.join(CONFIG.projectRoot, 'package.json'), 'utf8')
      );
      
      if (!packageJson.name || !packageJson.dependencies) {
        throw new Error('Invalid package.json structure');
      }

      this.log('SUCCESS', 'Project structure validated');
    } catch (error) {
      throw new Error(`Invalid package.json: ${error.message}`);
    }
  }

  /**
   * Create backup of critical files
   */
  async createBackup() {
    this.log('INFO', 'Creating backup of critical files...');

    const backupPath = path.join(CONFIG.projectRoot, CONFIG.backupDir);
    
    // Clean up old backups
    await this.cleanupOldBackups(backupPath);

    if (!fs.existsSync(backupPath)) {
      fs.mkdirSync(backupPath, { recursive: true });
    }

    const backupFiles = PRESERVE_PATTERNS.filter(pattern => 
      fs.existsSync(path.join(CONFIG.projectRoot, pattern))
    );

    let backedUpCount = 0;

    for (const filePattern of backupFiles) {
      try {
        const files = this.globSync(filePattern);
        
        for (const file of files) {
          const sourcePath = path.join(CONFIG.projectRoot, file);
          const backupPath = path.join(backupPath, file);
          const backupDir = path.dirname(backupPath);

          if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
          }

          fs.copyFileSync(sourcePath, backupPath);
          backedUpCount++;
          this.log('INFO', `Backed up: ${file}`);
        }
      } catch (error) {
        this.log('ERROR', `Failed to backup ${filePattern}: ${error.message}`);
        this.errors.push(`Backup failed for ${filePattern}`);
      }
    }

    // Backup environment variables
    await this.backupEnvironmentVariables(backupPath);

    this.log('SUCCESS', `Backup completed: ${backedUpCount} files backed up`);
  }

  /**
   * Clean up old backups
   */
  async cleanupOldBackups(backupPath) {
    if (!fs.existsSync(backupPath)) return;

    try {
      const now = Date.now();
      const items = fs.readdirSync(backupPath);

      for (const item of items) {
        const itemPath = path.join(backupPath, item);
        const stat = fs.statSync(itemPath);
        
        if (now - stat.mtimeMs > CONFIG.maxBackupAge) {
          fs.rmSync(itemPath, { recursive: true, force: true });
          this.log('INFO', `Removed old backup: ${item}`);
        }
      }
    } catch (error) {
      this.log('WARN', `Failed to clean up old backups: ${error.message}`);
    }
  }

  /**
   * Backup environment variables
   */
  async backupEnvironmentVariables(backupPath) {
    const envFiles = ['.env', '.env.local', '.env.production'];
    
    for (const envFile of envFiles) {
      const envPath = path.join(CONFIG.projectRoot, envFile);
      
      if (fs.existsSync(envPath)) {
        try {
          // Create secure backup with permissions
          const backupEnvPath = path.join(backupPath, `${envFile}.backup`);
          fs.copyFileSync(envPath, backupEnvPath);
          fs.chmodSync(backupEnvPath, 0o600); // Secure permissions
          
          this.log('INFO', `Securely backed up: ${envFile}`);
        } catch (error) {
          this.log('ERROR', `Failed to backup ${envFile}: ${error.message}`);
        }
      }
    }
  }

  /**
   * Clean project directories
   */
  async cleanDirectories() {
    this.log('INFO', 'Cleaning project directories...');

    let cleanedCount = 0;

    for (const dirPattern of CLEAN_DIRECTORIES) {
      try {
        const directories = this.globSync(dirPattern);
        
        for (const dir of directories) {
          const dirPath = path.join(CONFIG.projectRoot, dir);
          
          if (fs.existsSync(dirPath)) {
            fs.rmSync(dirPath, { recursive: true, force: true });
            cleanedCount++;
            this.log('INFO', `Cleaned directory: ${dir}`);
          }
        }
      } catch (error) {
        this.log('ERROR', `Failed to clean ${dirPattern}: ${error.message}`);
        this.errors.push(`Clean failed for ${dirPattern}`);
      }
    }

    this.log('SUCCESS', `Directories cleaned: ${cleanedCount}`);
  }

  /**
   * Clean project files
   */
  async cleanFiles() {
    this.log('INFO', 'Cleaning project files...');

    let cleanedCount = 0;

    for (const filePattern of CLEAN_FILE_PATTERNS) {
      try {
        const files = this.globSync(filePattern);
        
        for (const file of files) {
          const filePath = path.join(CONFIG.projectRoot, file);
          
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            cleanedCount++;
            this.log('INFO', `Cleaned file: ${file}`);
          }
        }
      } catch (error) {
        this.log('WARN', `Failed to clean ${filePattern}: ${error.message}`);
      }
    }

    this.log('SUCCESS', `Files cleaned: ${cleanedCount}`);
  }

  /**
   * Reset database (if configured)
   */
  async resetDatabase() {
    this.log('INFO', 'Resetting database...');

    try {
      // Check if database configuration exists
      const envPath = path.join(CONFIG.projectRoot, '.env');
      
      if (!fs.existsSync(envPath)) {
        this.log('WARN', 'No .env file found, skipping database reset');
        return;
      }

      const envContent = fs.readFileSync(envPath, 'utf8');
      
      // Check for database environment variables
      const hasDatabaseConfig = 
        envContent.includes('DATABASE_URL') || 
        envContent.includes('MONGODB_URI') ||
        envContent.includes('FIREBASE');

      if (!hasDatabaseConfig) {
        this.log('INFO', 'No database configuration found, skipping database reset');
        return;
      }

      // Prompt for database reset confirmation
      const confirmReset = await this.prompt(
        'This will reset ALL database data. Are you absolutely sure?'
      );

      if (!confirmReset) {
        this.log('INFO', 'Database reset cancelled by user');
        return;
      }

      // Execute database reset based on environment
      await this.executeDatabaseReset(envContent);

    } catch (error) {
      this.log('ERROR', `Database reset failed: ${error.message}`);
      this.errors.push('Database reset failed');
    }
  }

  /**
   * Execute database reset based on environment
   */
  async executeDatabaseReset(envContent) {
    // Parse environment variables
    const envVars = this.parseEnvContent(envContent);

    if (envVars.FIREBASE_PROJECT_ID) {
      await this.resetFirebaseData(envVars);
    } else if (envVars.MONGODB_URI) {
      await this.resetMongoDBData(envVars);
    } else if (envVars.SUPABASE_URL) {
      await this.resetSupabaseData(envVars);
    } else {
      this.log('WARN', 'Unsupported database type, skipping reset');
    }
  }

  /**
   * Reset Firebase data
   */
  async resetFirebaseData(envVars) {
    this.log('INFO', 'Resetting Firebase data...');

    try {
      // Use Firebase Admin SDK to reset data
      const resetScript = `
        const admin = require('firebase-admin');
        
        const serviceAccount = ${JSON.stringify({
          projectId: envVars.FIREBASE_PROJECT_ID,
          privateKey: envVars.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
          clientEmail: envVars.FIREBASE_CLIENT_EMAIL
        })};
        
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          databaseURL: envVars.FIREBASE_DATABASE_URL
        });
        
        const db = admin.firestore();
        
        async function resetCollections() {
          const collections = ${JSON.stringify(DATABASE_CONFIG.collections)};
          
          for (const collection of collections) {
            const snapshot = await db.collection(collection).get();
            const batch = db.batch();
            
            snapshot.docs.forEach(doc => {
              if (DATABASE_CONFIG.preserveAdmin && collection === 'users' && doc.data().role === 'admin') {
                return; // Preserve admin users
              }
              batch.delete(doc.ref);
            });
            
            await batch.commit();
            console.log(\`Reset collection: \${collection}\`);
          }
        }
        
        resetCollections().catch(console.error);
      `;

      // Write temporary reset script
      const tempScriptPath = path.join(CONFIG.projectRoot, 'temp-reset.js');
      fs.writeFileSync(tempScriptPath, resetScript);

      // Execute reset script
      execSync(`node "${tempScriptPath}"`, { stdio: 'inherit' });

      // Clean up temporary script
      fs.unlinkSync(tempScriptPath);

      this.log('SUCCESS', 'Firebase data reset completed');
    } catch (error) {
      throw new Error(`Firebase reset failed: ${error.message}`);
    }
  }

  /**
   * Reset MongoDB data
   */
  async resetMongoDBData(envVars) {
    this.log('INFO', 'Resetting MongoDB data...');

    try {
      const { MongoClient } = require('mongodb');
      const client = new MongoClient(envVars.MONGODB_URI);

      await client.connect();

      const database = client.db();
      
      for (const collection of DATABASE_CONFIG.collections) {
        if (DATABASE_CONFIG.preserveAdmin && collection === 'users') {
          // Preserve admin users
          await database.collection(collection).deleteMany({
            role: { $ne: 'admin' }
          });
        } else {
          await database.collection(collection).deleteMany({});
        }
        
        this.log('INFO', `Reset collection: ${collection}`);
      }

      await client.close();
      this.log('SUCCESS', 'MongoDB data reset completed');
    } catch (error) {
      throw new Error(`MongoDB reset failed: ${error.message}`);
    }
  }

  /**
   * Parse environment file content
   */
  parseEnvContent(content) {
    const envVars = {};
    const lines = content.split('\n');

    for (const line of lines) {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const [, key, value] = match;
        envVars[key.trim()] = value.trim();
      }
    }

    return envVars;
  }

  /**
   * Reinstall dependencies
   */
  async reinstallDependencies() {
    this.log('INFO', 'Reinstalling project dependencies...');

    try {
      // Remove existing node_modules
      const nodeModulesPath = path.join(CONFIG.projectRoot, 'node_modules');
      if (fs.existsSync(nodeModulesPath)) {
        fs.rmSync(nodeModulesPath, { recursive: true, force: true });
      }

      // Remove lock files
      const lockFiles = ['package-lock.json', 'yarn.lock'];
      for (const lockFile of lockFiles) {
        const lockFilePath = path.join(CONFIG.projectRoot, lockFile);
        if (fs.existsSync(lockFilePath)) {
          fs.unlinkSync(lockFilePath);
        }
      }

      // Detect package manager
      const packageManager = await this.detectPackageManager();

      // Reinstall dependencies
      this.log('INFO', `Using package manager: ${packageManager}`);

      if (packageManager === 'yarn') {
        execSync('yarn install', { stdio: 'inherit', cwd: CONFIG.projectRoot });
      } else {
        execSync('npm install', { stdio: 'inherit', cwd: CONFIG.projectRoot });
      }

      this.log('SUCCESS', 'Dependencies reinstalled successfully');
    } catch (error) {
      throw new Error(`Dependency reinstallation failed: ${error.message}`);
    }
  }

  /**
   * Detect package manager
   */
  async detectPackageManager() {
    if (fs.existsSync(path.join(CONFIG.projectRoot, 'yarn.lock'))) {
      return 'yarn';
    }
    if (fs.existsSync(path.join(CONFIG.projectRoot, 'package-lock.json'))) {
      return 'npm';
    }
    
    // Check for global package manager preference
    try {
      execSync('yarn --version', { stdio: 'ignore' });
      return 'yarn';
    } catch {
      return 'npm';
    }
  }

  /**
   * Clear Expo and React Native caches
   */
  async clearCaches() {
    this.log('INFO', 'Clearing application caches...');

    try {
      // Clear Expo cache
      try {
        execSync('npx expo prebuild --clean', { 
          stdio: 'inherit', 
          cwd: CONFIG.projectRoot 
        });
      } catch (error) {
        this.log('WARN', `Expo prebuild clean failed: ${error.message}`);
      }

      // Clear Metro cache
      try {
        execSync('npx react-native start --reset-cache', { 
          stdio: 'inherit', 
          cwd: CONFIG.projectRoot,
          timeout: 30000 
        });
      } catch (error) {
        this.log('WARN', `Metro cache reset failed: ${error.message}`);
      }

      // Clear watchman cache
      try {
        execSync('watchman watch-del-all', { stdio: 'inherit' });
      } catch (error) {
        this.log('WARN', `Watchman cache clear failed: ${error.message}`);
      }

      this.log('SUCCESS', 'Application caches cleared');
    } catch (error) {
      this.log('ERROR', `Cache clearing failed: ${error.message}`);
      this.errors.push('Cache clearing failed');
    }
  }

  /**
   * Restore backed up files
   */
  async restoreBackup() {
    this.log('INFO', 'Restoring backed up files...');

    const backupPath = path.join(CONFIG.projectRoot, CONFIG.backupDir);
    
    if (!fs.existsSync(backupPath)) {
      this.log('WARN', 'No backup found to restore');
      return;
    }

    let restoredCount = 0;

    try {
      const files = this.getAllFiles(backupPath);
      
      for (const file of files) {
        const sourcePath = path.join(backupPath, file);
        const destPath = path.join(CONFIG.projectRoot, file);
        const destDir = path.dirname(destPath);

        if (!fs.existsSync(destDir)) {
          fs.mkdirSync(destDir, { recursive: true });
        }

        fs.copyFileSync(sourcePath, destPath);
        restoredCount++;
        this.log('INFO', `Restored: ${file}`);
      }

      this.log('SUCCESS', `Files restored: ${restoredCount}`);
    } catch (error) {
      this.log('ERROR', `Backup restoration failed: ${error.message}`);
      this.errors.push('Backup restoration failed');
    }
  }

  /**
   * Get all files in directory recursively
   */
  getAllFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);

    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        this.getAllFiles(filePath, fileList);
      } else {
        fileList.push(path.relative(CONFIG.projectRoot, filePath));
      }
    }

    return fileList;
  }

  /**
   * Simple glob pattern matching
   */
  globSync(pattern) {
    const files = [];
    const searchDir = (dir, pattern) => {
      const items = fs.readdirSync(dir);

      for (const item of items) {
        const itemPath = path.join(dir, item);
        const relativePath = path.relative(CONFIG.projectRoot, itemPath);
        const stat = fs.statSync(itemPath);

        if (stat.isDirectory()) {
          searchDir(itemPath, pattern);
        } else if (this.matchesPattern(relativePath, pattern)) {
          files.push(relativePath);
        }
      }
    };

    searchDir(CONFIG.projectRoot, pattern);
    return files;
  }

  /**
   * Check if file matches pattern
   */
  matchesPattern(file, pattern) {
    if (pattern.includes('*')) {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      return regex.test(file);
    }
    return file === pattern;
  }

  /**
   * Generate reset report
   */
  generateReport() {
    const endTime = Date.now();
    const duration = ((endTime - this.startTime) / 1000).toFixed(2);

    this.log('INFO', `Reset process completed in ${duration}s`);
    
    if (this.errors.length > 0) {
      this.log('ERROR', `Completed with ${this.errors.length} error(s):`);
      this.errors.forEach(error => this.log('ERROR', `  - ${error}`));
    } else {
      this.log('SUCCESS', 'Reset completed successfully!');
    }

    // Final instructions
    console.log(chalk.blue.bold('\n🎯 Next Steps:'));
    console.log(chalk.gray('1. Review the reset log: ') + chalk.white(CONFIG.logFile));
    console.log(chalk.gray('2. Start the development server: ') + chalk.white('npm start'));
    console.log(chalk.gray('3. Verify your environment configuration'));
    console.log(chalk.gray('4. Test critical application flows\n'));
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    if (this.logStream) {
      this.logStream.end();
    }
    this.rl.close();
  }

  /**
   * Main reset execution flow
   */
  async execute() {
    try {
      await this.initialize();
      
      // Validate project
      this.validateProjectStructure();

      // Confirm reset
      const confirmed = await this.prompt(
        'This will reset your project to a clean state. Continue?'
      );

      if (!confirmed) {
        this.log('INFO', 'Reset cancelled by user');
        this.cleanup();
        return;
      }

      // Execute reset steps
      await this.createBackup();
      await this.cleanDirectories();
      await this.cleanFiles();
      await this.resetDatabase();
      await this.reinstallDependencies();
      await this.clearCaches();
      await this.restoreBackup();

      // Generate report
      this.generateReport();

    } catch (error) {
      this.log('ERROR', `Reset process failed: ${error.message}`);
      this.errors.push(`Process failed: ${error.message}`);
      this.generateReport();
    } finally {
      this.cleanup();
    }
  }
}

// Execute if run directly
if (require.main === module) {
  const reset = new ProjectReset();
  
  // Handle process termination
  process.on('SIGINT', () => {
    console.log(chalk.yellow('\n\nReset process interrupted by user'));
    reset.cleanup();
    process.exit(1);
  });

  process.on('uncaughtException', (error) => {
    console.log(chalk.red('\n\nFatal error:'), error.message);
    reset.cleanup();
    process.exit(1);
  });

  reset.execute().catch(error => {
    console.error(chalk.red('Fatal execution error:'), error);
    process.exit(1);
  });
}

module.exports = ProjectReset;
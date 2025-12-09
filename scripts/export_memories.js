import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Configuration
const SUPABASE_URL = 'https://uiczraluplwdupdigkar.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpY3pyYWx1cGx3ZHVwZGlna2FyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUyNjQzNDMsImV4cCI6MjA4MDg0MDM0M30.xS-mEzW1i1sPrhfAOgQNb6pux7bZjqKQiVe3LU0TbVo';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function exportMemories() {
  console.log('Starting export...');
  
  try {
    const { data, error } = await supabase
      .from('memories')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    if (!data || data.length === 0) {
      console.log('No memories found in the database.');
      return;
    }

    console.log(`Found ${data.length} memories.`);

    // Get current directory
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    
    // Save to root directory
    const outputPath = path.join(__dirname, '..', 'memories_backup.json');
    
    await fs.writeFile(outputPath, JSON.stringify(data, null, 2), 'utf-8');
    
    console.log(`Successfully exported memories to: ${outputPath}`);
    
  } catch (err) {
    console.error('Export failed:', err.message);
  }
}

exportMemories();

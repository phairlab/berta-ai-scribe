import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  const filePath = path.join(process.cwd(), 'public', 'runtime-config.json');
  let config = {};
  try {
    config = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  } catch (e) {
    // If the file doesn't exist or is invalid, return an empty object
    config = {};
  }
  return NextResponse.json(config);
} 
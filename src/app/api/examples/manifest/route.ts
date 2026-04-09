import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const manifestPath = path.join(process.cwd(), '..', '..', 'examples', 'examples_manifest.json');
    // If running in monorepo, check root too
    const possiblePaths = [
      path.join(process.cwd(), 'examples', 'examples_manifest.json'),
      path.join(process.cwd(), '..', 'examples', 'examples_manifest.json'),
      path.join(process.cwd(), '..', '..', 'examples', 'examples_manifest.json'),
      path.join(process.cwd(), '..', '..', '..', 'examples', 'examples_manifest.json')
    ];
    
    let manifestData = null;
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        manifestData = fs.readFileSync(p, 'utf8');
        break;
      }
    }

    if (!manifestData) {
      return NextResponse.json({ error: 'Manifest not found' }, { status: 404 });
    }

    return NextResponse.json(JSON.parse(manifestData));
  } catch (error) {
    console.error('Failed to load examples manifest:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

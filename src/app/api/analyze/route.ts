import { NextRequest, NextResponse } from 'next/server';
import { callOpenAI } from '@/lib/openaiClient';
import { callGemini } from '@/lib/geminiClient';
import { env } from '@/config/env';

export async function POST(req: NextRequest) {
  try {
    const { model, query } = await req.json();

    // Validate input
    if (!model || !query) {
      return NextResponse.json(
        { error: 'Model and query are required' },
        { status: 400 }
      );
    }

    // Validate model
    const validModels = ['gemini-1.5-flash', 'gemini-2.0-flash-lite', 'gemini-2.0-flash', 'gemini-2.0-flash-exp', 'gemini-1.5-flash-8b'];
    if (!validModels.includes(model)) {
      return NextResponse.json(
        { error: 'Invalid model selected' },
        { status: 400 }
      );
    }

    let response = '';
    try {
        if (!process.env.REACT_APP_GOOGLE_API_KEY) {
          throw new Error('GEMINI_API_KEY is not configured');
        }
        response = await callGemini(query);

      return NextResponse.json({ response });
    } catch (error) {
      console.error('AI API error:', error);
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Analysis failed' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Request processing error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
}

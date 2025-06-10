import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "@/config/env";
import { YoutubeTranscript } from "youtube-transcript";
import connectDB from "@/lib/mongodb";
import VideoAnalysis from "@/models/VideoAnalysis";

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json();
    console.log('Request body:', body);
    
    if (!body || !body.videoUrl) {
      return NextResponse.json({
        success: false,
        message: "Video URL is required"
      }, { status: 400 });
    }

    // Connect to MongoDB
    try {
      await connectDB();
      console.log('MongoDB connected successfully');
    } catch (error) {
      console.error("MongoDB connection error:", error);
      return NextResponse.json({
        success: false,
        message: "Database connection failed"
      }, { status: 500 });
    }

    // Check if analysis already exists with valid data
    const existingAnalysis = await VideoAnalysis.findOne({ videoUrl: body.videoUrl });
    if (existingAnalysis?.summary && existingAnalysis?.main_points?.length > 0) {
      console.log('Found valid cached analysis, returning data');
      return NextResponse.json({
        success: true,
        data: {
          summary: existingAnalysis.summary,
          main_points: existingAnalysis.main_points
        }
      }, { status: 200 });
    }

    // If we have an existing analysis but it's empty, delete it
    if (existingAnalysis) {
      console.log('Found empty cached analysis, deleting it');
      await VideoAnalysis.findByIdAndDelete(existingAnalysis._id);
    }

    try {
      // Fetch transcript
      console.log('Fetching transcript...');
      const transcript = await YoutubeTranscript.fetchTranscript(body.videoUrl);
      console.log('Transcript fetched successfully, length:', transcript.length);
      
      // Analyze using Gemini
      console.log('Initializing Gemini API...');
      const genAI = new GoogleGenerativeAI(env.REACT_APP_GOOGLE_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

      const prompt = `
      You are a video analysis assistant. Analyze the following video transcript and provide a structured response.
      IMPORTANT: You must respond with a valid JSON object in the exact format specified below, with no additional text or explanation.

      <VideoTranscript>
      ${transcript.map(txt => `[${formatTimestamp(txt.offset)}] ${txt.text}`).join("\n")}
      </VideoTranscript>

      Required JSON format:
      {
        "summary": "A concise 2-3 sentence summary of the video's overall content",
        "main_points": [
          {
            "timestamp": "MM:SS",
            "title": "Brief title of the section",
            "description": "One-sentence explanation of this point"
          }
        ]
      }

      Rules:
      1. The response must be a valid JSON object
      2. You MUST provide a summary
      3. You MUST identify at least 3 main points
      4. Each main point must have a timestamp, title, and description
      5. Use MM:SS format for timestamps
      6. Keep descriptions concise
      7. Do not include any text outside the JSON object
      8. NEVER return an empty main_points array
      9. Each main point should be distinct and not overlap significantly

      Example response:
      {
        "summary": "This video provides an introduction to artificial intelligence, covering its basic concepts and real-world applications. The speaker explains how AI systems learn from data and make predictions.",
        "main_points": [
          {
            "timestamp": "00:15",
            "title": "Introduction to AI",
            "description": "Overview of artificial intelligence and its importance in modern technology"
          },
          {
            "timestamp": "02:30",
            "title": "Machine Learning Basics",
            "description": "Explanation of how machines learn from data and improve over time"
          }
        ]
      }
      `;

      console.log('Sending request to Gemini API...');
      const result = await model.generateContent([prompt]);
      console.log('Received response from Gemini API');
      const analysisText = result.response.text();
      console.log('Analysis text:', analysisText);

      // Clean and parse the response
      const cleanedText = analysisText.trim().replace(/^```json\n?|\n?```$/g, '');
      let parsedAnalysis;
      
      try {
        console.log('Parsing analysis response...');
        parsedAnalysis = JSON.parse(cleanedText);
        
        // Validate the response structure
        if (!parsedAnalysis.summary || typeof parsedAnalysis.summary !== 'string') {
          throw new Error("Invalid response structure: summary is missing or invalid");
        }
        
        if (!parsedAnalysis.main_points || !Array.isArray(parsedAnalysis.main_points)) {
          throw new Error("Invalid response structure: main_points array is missing or invalid");
        }
        
        if (parsedAnalysis.main_points.length === 0) {
          throw new Error("Invalid response: main_points array is empty");
        }
        
        // Validate each main point
        for (const point of parsedAnalysis.main_points) {
          if (!point.timestamp || !point.title || !point.description) {
            throw new Error("Invalid main point structure: missing required fields");
          }
        }
        
        console.log('Analysis parsed successfully');
      } catch (error) {
        console.error("Failed to parse analysis as JSON:", error);
        console.error("Raw response:", analysisText);
        
        // Try to regenerate with a simpler prompt if the first attempt failed
        console.log('Attempting to regenerate with simpler prompt...');
        const simplePrompt = `
        Analyze this video transcript and provide a summary and main points.
        Format your response as a JSON object with this structure:
        {
          "summary": "2-3 sentence summary of the video",
          "main_points": [
            {
              "timestamp": "MM:SS",
              "title": "Brief title",
              "description": "One sentence description"
            }
          ]
        }
        
        Transcript:
        ${transcript.map(txt => `[${formatTimestamp(txt.offset)}] ${txt.text}`).join("\n")}
        `;
        
        const retryResult = await model.generateContent([simplePrompt]);
        const retryText = retryResult.response.text();
        const cleanedRetryText = retryText.trim().replace(/^```json\n?|\n?```$/g, '');
        
        try {
          parsedAnalysis = JSON.parse(cleanedRetryText);
          if (!parsedAnalysis.summary || !parsedAnalysis.main_points || !Array.isArray(parsedAnalysis.main_points) || parsedAnalysis.main_points.length === 0) {
            throw new Error("Retry failed: still invalid response structure");
          }
          console.log('Retry successful');
        } catch (retryError) {
          console.error("Retry failed:", retryError);
          return NextResponse.json({
            success: false,
            message: "Failed to analyze video content"
          }, { status: 500 });
        }
      }

      // Create new document in MongoDB
      console.log('Saving to MongoDB...');
      await VideoAnalysis.create({
        videoUrl: body.videoUrl,
        summary: parsedAnalysis.summary,
        main_points: parsedAnalysis.main_points
      });
      console.log('Created new analysis in MongoDB');

      const response = {
        success: true,
        data: {
          summary: parsedAnalysis.summary,
          main_points: parsedAnalysis.main_points
        }
      };
      console.log('Sending response:', JSON.stringify(response, null, 2));
      return NextResponse.json(response, { status: 200 });

    } catch (error) {
      console.error("Video analysis error:", error);
      if (error instanceof Error) {
        if (error.message.includes('Could not get the transcript')) {
          return NextResponse.json({
            success: false,
            message: "Could not fetch video transcript. The video might be private or not available."
          }, { status: 400 });
        }
        if (error.message.includes('API key')) {
          return NextResponse.json({
            success: false,
            message: "API key configuration error"
          }, { status: 500 });
        }
      }
      return NextResponse.json({
        success: false,
        message: "Failed to process video analysis"
      }, { status: 500 });
    }

  } catch (error) {
    console.error("Request processing error:", error);
    return NextResponse.json({
      success: false,
      message: "Internal server error"
    }, { status: 500 });
  }
}

// Helper function to format timestamp
function formatTimestamp(offset: number): string {
  const minutes = Math.floor(offset / 60000);
  const seconds = Math.floor((offset % 60000) / 1000);
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// GET endpoint to fetch all video analyses
export async function GET() {
  try {
    await connectDB();
    const analyses = await VideoAnalysis.find({})
      .sort({ createdAt: -1 })
      .select('videoUrl summary main_points createdAt')
      .limit(10);

    return NextResponse.json({
      success: true,
      data: analyses
    }, { status: 200 });
  } catch (error) {
    console.error("Error fetching analyses:", error);
    return NextResponse.json({
      success: false,
      message: "Failed to fetch analyses"
    }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { env } from "@/config/env";
import { YoutubeTranscript } from "youtube-transcript";
import connectDB from "@/lib/mongodb";
import VideoAnalysis from "@/models/VideoAnalysis";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Request body:', body);
    
    if (!body || !body.videoUrl) {
      console.log('Missing video URL');
      return NextResponse.json({
        success: false,
        message: "Video URL is required"
      }, { status: 400 });
    }

    // Validate video URL format
    if (!body.videoUrl.includes('youtube.com/watch?v=') && !body.videoUrl.includes('youtu.be/')) {
      console.log('Invalid YouTube URL format:', body.videoUrl);
      return NextResponse.json({
        success: false,
        message: "Invalid YouTube URL format"
      }, { status: 400 });
    }

    try {
      // Connect to MongoDB
      console.log('Connecting to MongoDB...');
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
    console.log('Checking for existing analysis...');
    const existingAnalysis = await VideoAnalysis.findOne({ videoUrl: body.videoUrl });
    
    // Only return cached data if it has both transcript and topics with actual content
    if (existingAnalysis?.transcript?.length > 0 && existingAnalysis?.topics?.length > 0) {
      console.log('Found valid cached analysis, returning data');
      return NextResponse.json({
        success: true,
        data: {
          transcript: existingAnalysis.transcript,
          topics: existingAnalysis.topics
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
      
      const formattedTranscript = transcript.map(txt => ({
        timestamp: formatTimestamp(txt.offset),
        text: txt.text
      }));

      // Analyze topics using Gemini
      console.log('Initializing Gemini API...');
      const genAI = new GoogleGenerativeAI(env.REACT_APP_GOOGLE_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

      const prompt = `
      You are a video analysis assistant. Your task is to analyze the following video transcript and identify the main topics discussed.
      IMPORTANT: You must respond with a valid JSON object in the exact format specified below, with no additional text or explanation.

      <VideoTranscript>
      ${transcript.map(txt => `[${formatTimestamp(txt.offset)}] ${txt.text}`).join("\n")}
      </VideoTranscript>

      Required JSON format:
      {
        "topics": [
          {
            "name": "Topic name",
            "description": "Brief description of the topic",
            "mentions": [
              {
                "timestamp": "MM:SS",
                "context": "Brief context of when this topic was mentioned"
              }
            ]
          }
        ]
      }

      Rules:
      1. The response must be a valid JSON object
      2. You MUST identify at least 3 main topics from the transcript
      3. For each topic, include 2-3 key mentions with timestamps
      4. Use MM:SS format for timestamps
      5. Keep descriptions and context concise
      6. Do not include any text outside the JSON object
      7. If you cannot identify topics, analyze the transcript and create logical topic groupings
      8. NEVER return an empty topics array
      9. Each topic must have at least one mention
      10. Topics should be distinct and not overlap significantly

      Example response:
      {
        "topics": [
          {
            "name": "Introduction to AI",
            "description": "Overview of artificial intelligence and its basic concepts",
            "mentions": [
              {
                "timestamp": "00:15",
                "context": "Speaker introduces the topic of artificial intelligence"
              },
              {
                "timestamp": "01:30",
                "context": "Explanation of machine learning as a subset of AI"
              }
            ]
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
        if (!parsedAnalysis.topics || !Array.isArray(parsedAnalysis.topics)) {
          throw new Error("Invalid response structure: topics array is missing or invalid");
        }
        
        if (parsedAnalysis.topics.length === 0) {
          throw new Error("Invalid response: topics array is empty");
        }
        
        // Validate each topic
        for (const topic of parsedAnalysis.topics) {
          if (!topic.name || !topic.description || !Array.isArray(topic.mentions) || topic.mentions.length === 0) {
            throw new Error("Invalid topic structure: missing required fields");
          }
        }
        
        console.log('Analysis parsed successfully');
      } catch (error) {
        console.error("Failed to parse analysis as JSON:", error);
        console.error("Raw response:", analysisText);
        
        // Try to regenerate with a simpler prompt if the first attempt failed
        console.log('Attempting to regenerate with simpler prompt...');
        const simplePrompt = `
        Analyze this video transcript and identify 3-5 main topics. For each topic, provide a brief description and 2-3 key moments when it was discussed.
        Format your response as a JSON object with this structure:
        {
          "topics": [
            {
              "name": "Topic name",
              "description": "Brief description",
              "mentions": [
                {
                  "timestamp": "MM:SS",
                  "context": "What was said about this topic"
                }
              ]
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
          if (!parsedAnalysis.topics || !Array.isArray(parsedAnalysis.topics) || parsedAnalysis.topics.length === 0) {
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
        transcript: formattedTranscript,
        topics: parsedAnalysis.topics
      });
      console.log('Created new analysis in MongoDB');

      const response = {
        success: true,
        data: {
          transcript: formattedTranscript,
          topics: parsedAnalysis.topics
        }
      };
      console.log('Sending response:', JSON.stringify(response, null, 2));
      return NextResponse.json(response, { status: 200 });

    } catch (error) {
      console.error("Transcript processing error:", error);
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
        message: "Failed to process video transcript"
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
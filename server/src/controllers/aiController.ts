import { Request, Response } from 'express';
import { AIAnalyzeRequestSchema, WhiteboardAIRequestSchema } from '../validators/aiSchemas.js';
import { SmartInkRequestSchema } from '../validators/aiSmartInkSchemas.js';
import { LectureRequestSchema } from '../validators/lectureSchemas.js';
import { aiService } from '../services/aiService.js';

// In-memory simple IP rate limiter for AI endpoints (10 requests per 1 minute)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const limitWindow = 60 * 1000; // 1 minute
  const maxRequests = 10;

  const record = rateLimitMap.get(ip);
  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + limitWindow });
    return true;
  }

  if (record.count >= maxRequests) {
    return false;
  }

  record.count += 1;
  return true;
}

/**
 * Controller for general-purpose AI Whiteboard Assistant requests:
 * POST /api/ai/whiteboard
 */
export async function whiteboardAIHandler(req: Request, res: Response) {
  try {
    // Rate Limiting Check
    const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
    if (!checkRateLimit(clientIp)) {
      return res.status(429).json({
        success: false,
        error: 'Too many AI requests. Please wait a minute before trying again.',
      });
    }

    // Payload Zod Validation
    const parsed = WhiteboardAIRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid AI whiteboard request payload.',
        details: parsed.error.format(),
      });
    }

    const { roomCode, strokes, image, action } = parsed.data;

    // Empty Board Check (bypassed when action is generate_whiteboard)
    if (action !== 'generate_whiteboard' && strokes.length === 0 && (!image || image.length === 0)) {
      return res.status(400).json({
        success: false,
        error: 'No content to analyze yet. Draw something on the whiteboard and try again.',
      });
    }

    // Check if AI Service configured
    if (!aiService.isConfigured()) {
      return res.status(503).json({
        success: false,
        error: 'AI Analysis service is not configured. Missing AI_API_KEY on the backend server.',
      });
    }

    // Perform General-Purpose AI Analysis
    const analysisResult = await aiService.analyzeWhiteboard(parsed.data);

    return res.json({
      success: true,
      data: analysisResult,
    });
  } catch (error: any) {
    console.error('[AIController] Error in whiteboardAIHandler:', error.message || error);

    return res.status(500).json({
      success: false,
      error: error.message || 'Unable to process whiteboard AI request right now. Please try again.',
      details: error.stack || String(error),
    });
  }
}

/**
 * Legacy handler for backward compatibility:
 * POST /api/ai/analyze-diagram
 */
export async function analyzeDiagramHandler(req: Request, res: Response) {
  try {
    // Rate Limiting Check
    const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
    if (!checkRateLimit(clientIp)) {
      return res.status(429).json({
        success: false,
        error: 'Too many AI analysis requests. Please wait a minute before trying again.',
      });
    }

    // Payload Zod Validation
    const parsed = AIAnalyzeRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid diagram analysis request payload.',
        details: parsed.error.format(),
      });
    }

    const { roomCode, strokes, image } = parsed.data;

    // Empty Board Check
    if (strokes.length === 0 && (!image || image.length === 0)) {
      return res.status(400).json({
        success: false,
        error: 'No diagram to analyze yet. Draw a diagram on the whiteboard and try again.',
      });
    }

    // Check if AI Service configured
    if (!aiService.isConfigured()) {
      return res.status(503).json({
        success: false,
        error: 'AI Analysis service is not configured. Missing AI_API_KEY on the backend server.',
      });
    }

    // Perform Legacy AI Analysis
    const analysisResult = await aiService.analyzeDiagram(parsed.data);

    return res.json({
      success: true,
      data: analysisResult,
    });
  } catch (error: any) {
    console.error('[AIController] Error in analyzeDiagramHandler:', error.message || error);

    return res.status(500).json({
      success: false,
      error: error.message || 'Unable to analyze this diagram right now. Please try again.',
      details: error.stack || String(error),
    });
  }
}

/**
 * Controller for Smart Ink Intelligence handwriting recognition:
 * POST /api/ai/smart-ink
 */
export async function smartInkHandler(req: Request, res: Response) {
  try {
    const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
    if (!checkRateLimit(clientIp)) {
      return res.status(429).json({
        success: false,
        error: 'Too many Smart Ink requests. Please wait a minute before trying again.',
      });
    }

    const parsed = SmartInkRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Smart Ink handwriting request payload.',
        details: parsed.error.format(),
      });
    }

    if (!aiService.isConfigured()) {
      return res.status(503).json({
        success: false,
        error: 'AI service is not configured. Missing AI_API_KEY on server.',
      });
    }

    const result = await aiService.recognizeSmartInk(parsed.data);

    return res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('[AIController] Error in smartInkHandler:', error.message || error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Unable to recognize handwriting right now.',
    });
  }
}

/**
 * Controller for 🎓 LIVE LECTURE INTELLIGENCE requests:
 * POST /api/ai/lecture
 */
export async function lectureAIHandler(req: Request, res: Response) {
  try {
    const clientIp = req.ip || req.socket.remoteAddress || '127.0.0.1';
    if (!checkRateLimit(clientIp)) {
      return res.status(429).json({
        success: false,
        error: 'Too many Lecture AI requests. Please wait a minute before trying again.',
      });
    }

    const parsed = LectureRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Lecture AI request payload.',
        details: parsed.error.format(),
      });
    }

    if (!aiService.isConfigured()) {
      return res.status(503).json({
        success: false,
        error: 'AI service is not configured. Missing AI_API_KEY on server.',
      });
    }

    const result = await aiService.analyzeLectureSession(parsed.data);

    return res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('[AIController] Error in lectureAIHandler:', error.message || error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Unable to process lecture AI request right now.',
      details: error.stack || String(error),
    });
  }
}


import { Router } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const imageRoutes = Router();

// Initialize Image Service
let imageService = null;

function initImageService() {
    if (!imageService) {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.warn('⚠️ GEMINI_API_KEY not found - image generation will be disabled');
            return null;
        }
        
        imageService = {
            apiKey,
            models: [
                'imagen-4.0-generate-001',
                'imagen-4.0-fast-generate-001',
                'imagen-4.0-ultra-generate-001'
            ]
        };
    }
    return imageService;
}

/**
 * Generate images using Imagen API
 * POST /api/images/generate
 * Body: { prompt, numberOfImages?, aspectRatio?, imageSize? }
 */
imageRoutes.post('/generate', async (req, res) => {
    try {
        const service = initImageService();
        if (!service) {
            return res.status(503).json({ 
                error: 'Image generation service not available. GEMINI_API_KEY not configured.' 
            });
        }

        const { 
            prompt, 
            numberOfImages = 1, 
            aspectRatio = '1:1', 
            imageSize = '1K',
            personGeneration = 'allow_all'
        } = req.body;

        if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
            return res.status(400).json({ error: 'Prompt is required' });
        }

        // Validate prompt length
        if (prompt.length > 3600) {
            return res.status(400).json({ error: 'Prompt is too long. Maximum length is approximately 3600 characters.' });
        }

        const model = service.models[0];
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'x-goog-api-key': service.apiKey,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                instances: [
                    {
                        prompt: prompt.trim()
                    }
                ],
                parameters: {
                    sampleCount: Math.min(Math.max(parseInt(numberOfImages) || 1, 1), 4),
                    aspectRatio: aspectRatio,
                    imageSize: imageSize,
                    personGeneration: personGeneration
                }
            })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            return res.status(response.status).json({
                error: errorData.error?.message || `Imagen API error: ${response.status}`,
                success: false
            });
        }

        const data = await response.json();
        
        if (data.predictions && Array.isArray(data.predictions)) {
            const images = data.predictions
                .map(pred => pred.bytesBase64Encoded)
                .filter(Boolean);
            
            if (images.length === 0) {
                return res.status(500).json({
                    error: 'No images generated in response',
                    success: false
                });
            }
            
            return res.json({
                success: true,
                images: images,
                count: images.length,
                prompt: prompt.trim()
            });
        } else {
            return res.status(500).json({
                error: 'Unexpected response format from Imagen API',
                success: false
            });
        }

    } catch (error) {
        console.error('❌ Error generating image:', error);
        return res.status(500).json({
            error: error.message || 'Failed to generate image',
            success: false
        });
    }
});

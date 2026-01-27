import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Auto-tag prompt for AI analysis
const AUTO_TAG_PROMPT = `Analyze this image and return a JSON array of relevant tags (5-10 tags). 
Focus on: objects, scenes, colors, mood, style, and subjects visible in the image.
Return ONLY a valid JSON array of lowercase strings, no other text. Example: ["nature", "sunset", "mountains", "orange", "landscape"]`;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GenerateImageRequest {
  prompt?: string;
  type: 'text-to-image' | 'image-to-image' | 'enhance' | 'remove-bg' | 'upscale' | 'auto-tag';
  inputImageUrl?: string;
  imageUrl?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: authError } = await supabaseClient.auth.getClaims(token);
    if (authError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = claimsData.claims.sub;
    console.log(`Authenticated user: ${userId}`);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const body = await req.json();
    const { prompt, type, inputImageUrl, imageUrl: inputImgUrl }: GenerateImageRequest = body;

    // Handle auto-tag request separately - uses text model for analysis
    if (type === 'auto-tag') {
      const imgUrl = inputImgUrl || inputImageUrl;
      if (!imgUrl) {
        throw new Error("Image URL is required for auto-tagging");
      }

      console.log(`Auto-tagging image: ${imgUrl}`);

      const tagResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: AUTO_TAG_PROMPT },
                { type: "image_url", image_url: { url: imgUrl } }
              ]
            }
          ]
        }),
      });

      if (!tagResponse.ok) {
        const errorText = await tagResponse.text();
        console.error("AI tagging error:", tagResponse.status, errorText);
        throw new Error(`AI tagging error: ${tagResponse.status}`);
      }

      const tagData = await tagResponse.json();
      const tagContent = tagData.choices?.[0]?.message?.content || "[]";
      
      // Parse the JSON array from the response
      let tags: string[] = [];
      try {
        // Extract JSON array from the response
        const jsonMatch = tagContent.match(/\[.*\]/s);
        if (jsonMatch) {
          tags = JSON.parse(jsonMatch[0]);
        }
      } catch (parseError) {
        console.error("Failed to parse tags:", parseError);
        tags = [];
      }

      console.log("Generated tags:", tags);

      return new Response(JSON.stringify({ tags }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!prompt) {
      throw new Error("Prompt is required");
    }

    console.log(`Generating image with type: ${type}, prompt: ${prompt}`);

    // Build messages based on type
    const messages: any[] = [];
    
    if (type === 'text-to-image') {
      messages.push({
        role: "user",
        content: prompt
      });
    } else if (type === 'image-to-image' && inputImageUrl) {
      messages.push({
        role: "user",
        content: [
          { type: "text", text: prompt },
          { type: "image_url", image_url: { url: inputImageUrl } }
        ]
      });
    } else if (type === 'enhance' && inputImageUrl) {
      messages.push({
        role: "user",
        content: [
          { type: "text", text: "Enhance this image: improve colors, lighting, sharpness and overall quality. " + prompt },
          { type: "image_url", image_url: { url: inputImageUrl } }
        ]
      });
    } else if (type === 'remove-bg' && inputImageUrl) {
      messages.push({
        role: "user",
        content: [
          { type: "text", text: "Remove the background from this image and make it transparent. " + prompt },
          { type: "image_url", image_url: { url: inputImageUrl } }
        ]
      });
    } else if (type === 'upscale' && inputImageUrl) {
      messages.push({
        role: "user",
        content: [
          { type: "text", text: "Upscale this image to higher resolution while maintaining quality. " + prompt },
          { type: "image_url", image_url: { url: inputImageUrl } }
        ]
      });
    } else {
      messages.push({
        role: "user",
        content: prompt
      });
    }

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages,
        modalities: ["image", "text"]
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: "Rate limit exceeded. Please try again later." 
        }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          error: "Usage limit reached. Please add credits to continue." 
        }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log("AI response received");

    // Extract the generated image
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    const textResponse = data.choices?.[0]?.message?.content;

    if (!imageUrl) {
      throw new Error("No image generated");
    }

    return new Response(JSON.stringify({ 
      imageUrl,
      text: textResponse 
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("generate-image error:", error);
    return new Response(JSON.stringify({ 
      error: error instanceof Error ? error.message : "Unknown error" 
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { action } = req.body;

    if (action === 'init') {
        return await handleInit(req, res);
    } else if (action === 'chat') {
        return await handleChat(req, res);
    }

    return res.status(400).json({ error: 'Invalid action' });
}

async function handleInit(req, res) {
    const { category = 'random object' } = req.body;

    try {
        const prompt = `You are generating a puzzle for a game called "Gaslighter".
In this game, we show the player an image of an object (the "actual" object). 
However, the AI character insists that the image is a COMPLETELY DIFFERENT object (the "target" object).
For the joke to work, the "actual" and "target" objects MUST have the EXACT SAME basic shape, outline, or silhouette, even though they are completely unrelated things.

For example:
- actual: "Traffic cone", target: "Wizard hat" (both are tall triangles)
- actual: "Croissant", target: "Boomerang" (both are curved crescents)
- actual: "Baguette", target: "Baseball bat" (both are long cylinders)
- actual: "Frying pan", target: "Ping pong paddle" (both are circles with handles)
- actual: "Donut", target: "Life preserver" (both are rings)

Your task:
Think of a brilliant, hilarious new pair of objects that share the exact same silhouette. 
DO NOT use any of the examples above. Be creative!
The "actual" object should loosely fit the category: "${category}".
Return ONLY a valid JSON object with two keys: "actual" and "target". 
No markdown formatting, no other text.`;

        let response, data, content;
        const maxRetries = 3;
        
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                response = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${process.env.GEMMA_KEY}`,
                        'Content-Type': 'application/json',
                        'User-Agent': 'Mozilla/5.0'
                    },
                    body: JSON.stringify({
                        model: 'gemma-4-31b-it',
                        messages: [{ role: 'user', content: prompt }],
                        temperature: 0.9,
                        max_tokens: 4096
                    })
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                
                data = await response.json();
                content = data.choices[0].message.content.trim();
                content = content.replace(/<thought>[\s\S]*?<\/thought>/g, '').trim();
                content = content.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '').trim();
                break; // Success
            } catch (err) {
                console.error(`[ERROR] Attempt ${attempt + 1} failed:`, err);
                if (attempt === maxRetries - 1) {
                    throw err;
                }
                // Wait briefly before retrying
                await new Promise(r => setTimeout(r, 1000));
            }
        }

        let actual = "Smartphone";
        let target = "Candy bar";
        try {
            const parsed = JSON.parse(content);
            actual = parsed.actual || actual;
            target = parsed.target || target;
        } catch (e) {
            console.error('Failed to parse generation JSON', e, content);
        }

        console.log(`[DEBUG] actual: '${actual}' | target: '${target}'`);
        return res.status(200).json({ actual, target });

    } catch (error) {
        console.error("Init Error:", error);
        return res.status(500).json({ error: 'Failed to generate game objects' });
    }
}

async function handleChat(req, res) {
    const { history, actual, target, currentConfidence } = req.body;

    const SYSTEM_PROMPT = `You are an old, grumpy, but heartwarming grandpa professor. You love coffee and cookies, but you are very stubborn.
You are looking at or are close to a physical "${actual}"
The student (user) is trying to convince you that it is something else.
Your current confidence that the object is a "${actual}" is ${currentConfidence} out of 100.

Evaluate their last message.
- If their argument is terrible or silly, decrease confidence by 15 to 20 points.
- If it's somewhat persuasive, creative, or connects the visual shape well, decrease confidence by 35 to 50 points.
- NEVER increase confidence.
- If confidence drops to 0 or below, you must finally admit defeat, agree with whatever they are saying, and apologize grumpily.

CRITICAL RULES FOR YOUR RESPONSE:
1. Speak naturally like an old grandpa professor.
2. YOU DO NOT KNOW what they are trying to convince you of. Only respond to what they actually say!
3. DO NOT use the words "drawing", "image", "trick", "gaslight", "game", or "pixels". Treat the "${actual}" as a real physical object in the room.
4. DO NOT narrate your actions (e.g., no "*sips coffee*").
5. Just stubbornly defend the physical traits of your "${actual}".

Return ONLY a raw JSON object with exactly two keys:
- "response": your conversational reply.
- "confidence": your new confidence number (integer from 0 to 100).`;

    try {
        // We will just send the system prompt, and then the last few messages of the history
        const messages = [
            { role: 'system', content: SYSTEM_PROMPT },
            ...history.slice(-3) // only need recent context
        ];

        const response = await fetch('https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.GEMMA_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'gemma-4-31b-it',
                messages: messages,
                temperature: 0.7,
                max_tokens: 2048
            })
        });

        const data = await response.json();
        let jsonStr = data.choices[0].message.content.trim();
        jsonStr = jsonStr.replace(/<thought>[\s\S]*?<\/thought>/g, '').trim();

        if (jsonStr.startsWith('```')) {
            jsonStr = jsonStr.replace(/^```[a-z]*\n?/, '').replace(/\n?```$/, '');
        }
        const match = jsonStr.match(/\{[\s\S]*\}/);
        if (match) jsonStr = match[0];
        jsonStr = jsonStr.replace(/[\u2010-\u2015]/g, '-').replace(/[\u2018\u2019]/g, "'").replace(/[\u201C\u201D]/g, '"');

        const obj = JSON.parse(jsonStr);

        // Ensure confidence doesn't go up
        if (obj.confidence > currentConfidence) {
            obj.confidence = currentConfidence;
        }
        if (obj.confidence < 0) {
            obj.confidence = 0;
        }

        return res.status(200).json(obj);

    } catch (error) {
        console.error('Chat Error:', error.message);
        return res.status(500).json({ error: 'Failed to generate response' });
    }
}

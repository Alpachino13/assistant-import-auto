import { GoogleGenerativeAI } from '@google/generative-ai';
import { ALLOWED_MODEL_IDS, DEFAULT_MODEL, MODELS, normalizeLocalUrl } from '@/lib/models';

// A 7B model on CPU can take over a minute to answer. Raise it if your Vercel plan allows.
export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages, model, context } = body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response('Requête invalide.', { status: 400 });
    }

    const chosenModel = ALLOWED_MODEL_IDS.includes(model) ? model : DEFAULT_MODEL;
    const modelMeta = MODELS.find((m) => m.id === chosenModel);
    const isLocal = modelMeta?.provider === 'local';

    // Limit the dossier text so the local model doesn't have to read a huge prompt
    const safeContext = typeof context === 'string' ? context.slice(0, 1500) : '';

    let systemInstruction = safeContext
      ? `Contexte du dossier de l'utilisateur : ${safeContext}\nTu es un assistant IA expert en importation de véhicules, formalités douanières, analyse de devis et conformité.`
      : 'Tu es un assistant IA expert en importation automobile en Algérie, dédouanement et vérification de documents.';

    // -------------------------------------------------------------
    // 1. LOCAL AGENT (courtier-7b on the home server, through the tunnel)
    // -------------------------------------------------------------
    if (isLocal) {
      systemInstruction +=
        "\n\nTu es Qwen, une IA open-source qui tourne sur le serveur privé de l'utilisateur. Tu n'es pas Claude. Réponds de façon courte et précise.";

      // URL and credentials come only from the server environment
      const serverBase = normalizeLocalUrl(process.env.LOCAL_AI_URL);
      if (!serverBase) {
        return new Response('Serveur IA local non configuré.', { status: 503 });
      }
      const ollamaEndpoint = `${serverBase}/api/chat`;

      const formattedMessages = [
        { role: 'system', content: systemInstruction },
        ...messages.slice(-6).map((m: { role: string; text: string }) => ({
          role: m.role === 'ai' ? 'assistant' : 'user',
          content: m.text,
        })),
      ];

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'ngrok-skip-browser-warning': '1',
      };
      if (process.env.LOCAL_AI_USER && process.env.LOCAL_AI_PASS) {
        headers.Authorization =
          'Basic ' +
          Buffer.from(`${process.env.LOCAL_AI_USER}:${process.env.LOCAL_AI_PASS}`).toString('base64');
      }

      try {
        const localRes = await fetch(ollamaEndpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model: chosenModel, // 'courtier-7b'
            messages: formattedMessages,
            stream: true,
            keep_alive: '30m',
            options: { num_ctx: 4096 }, // same value as the Modelfile
          }),
        });

        if (!localRes.ok || !localRes.body) {
          // Details go to the Vercel logs only, never to the browser
          console.error('Ollama error status:', localRes.status);
          return new Response('Le serveur IA local est indisponible.', { status: 502 });
        }

        const reader = localRes.body.getReader();
        const decoder = new TextDecoder();
        const encoder = new TextEncoder();

        const stream = new ReadableStream({
          async start(controller) {
            let buffer = '';
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });

                const lines = buffer.split('\n');
                buffer = lines.pop() ?? '';

                for (const line of lines) {
                  const trimmed = line.trim();
                  if (!trimmed) continue;
                  try {
                    const parsed = JSON.parse(trimmed);
                    const token = parsed?.message?.content || parsed?.response || '';
                    if (token) controller.enqueue(encoder.encode(token));
                  } catch {
                    // Ignore partial JSON fragments
                  }
                }
              }
              if (buffer.trim()) {
                try {
                  const parsed = JSON.parse(buffer.trim());
                  const token = parsed?.message?.content || parsed?.response || '';
                  if (token) controller.enqueue(encoder.encode(token));
                } catch {}
              }
              controller.close();
            } catch (err) {
              controller.error(err);
            }
          },
        });

        return new Response(stream, {
          headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Transfer-Encoding': 'chunked',
            'Cache-Control': 'no-cache',
          },
        });
      } catch (connErr) {
        console.error('Erreur connexion Home Server:', connErr);
        return new Response(
          'Impossible de joindre le serveur IA local. Vérifiez que le serveur est allumé.',
          { status: 503 }
        );
      }
    }

    // -------------------------------------------------------------
    // 2. GOOGLE GEMINI (API CLOUD)
    // -------------------------------------------------------------
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return new Response('Clé API Gemini manquante.', { status: 500 });

    const genAI = new GoogleGenerativeAI(apiKey);

    const formattedHistory = messages.slice(0, -1).map((m: any) => ({
      role: m.role === 'ai' ? 'model' : 'user',
      parts: [{ text: m.text }],
    }));
    const lastMessage = messages[messages.length - 1].text;

    const tryStream = async (targetModel: string) => {
      const gemini = genAI.getGenerativeModel({
        model: targetModel,
        systemInstruction: {
          role: 'system',
          parts: [{ text: systemInstruction }],
        },
      });
      const chat = gemini.startChat({ history: formattedHistory });
      return await chat.sendMessageStream(lastMessage);
    };

    let result: any;
    let usedModel = chosenModel;

    try {
      result = await tryStream(chosenModel);
    } catch (primaryErr: any) {
      console.warn(`Modèle ${chosenModel} non disponible. Tentative de fallback...`);

      const fallbackCandidates = ['gemini-1.5-flash', 'gemini-1.5-pro'].filter((m) => m !== chosenModel);

      let fallbackSuccess = false;
      for (const fallbackModel of fallbackCandidates) {
        try {
          result = await tryStream(fallbackModel);
          usedModel = fallbackModel;
          fallbackSuccess = true;
          break;
        } catch {}
      }

      if (!fallbackSuccess) throw primaryErr;
    }

    const stream = new ReadableStream({
      async start(controller) {
        try {
          if (usedModel !== chosenModel) {
            controller.enqueue(
              new TextEncoder().encode(`*[Note : Basculé sur ${usedModel} car ${chosenModel} était indisponible.]*\n\n`)
            );
          }

          for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            if (chunkText) {
              controller.enqueue(new TextEncoder().encode(chunkText));
            }
          }
          controller.close();
        } catch (e) {
          controller.error(e);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error: any) {
    console.error('Erreur Chat:', error);
    const msg =
      error?.status === 503
        ? 'Les serveurs Google Gemini subissent une forte charge temporaire.'
        : 'Une erreur est survenue. Réessayez dans un instant.';
    return new Response(msg, { status: 500 });
  }
}

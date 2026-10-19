import { GoogleGenerativeAI } from '@google/generative-ai';
import { ALLOWED_MODEL_IDS, DEFAULT_LOCAL_AI_URL, DEFAULT_MODEL, MODELS, normalizeLocalUrl } from '@/lib/models';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages, model, context, localUrl } = body;

    const chosenModel = ALLOWED_MODEL_IDS.includes(model) ? model : DEFAULT_MODEL;
    const modelMeta = MODELS.find((m) => m.id === chosenModel);
    const isLocal = modelMeta?.provider === 'local' || chosenModel.includes('qwen') || chosenModel.startsWith('local');

    // Instruction de base
    let systemInstruction = context
      ? `Contexte du dossier de l'utilisateur : ${context}\nTu es un assistant IA expert en importation de véhicules, formalités douanières, analyse de devis et conformité.`
      : 'Tu es un assistant IA expert en importation automobile en Algérie, dédouanement et vérification de documents.';

    // VERROUILLAGE DE L'IDENTITÉ POUR LE MODÈLE LOCAL
    if (isLocal) {
      systemInstruction += "\n\nDIRECTIVE STRICTE : Tu es Qwen, une intelligence artificielle open-source fonctionnant localement sur le serveur privé de l'utilisateur via Tailscale. Tu n'es PAS Claude. Tu n'as PAS été créé par Anthropic. Assumes pleinement ton identité de Qwen.";
    }

    // -------------------------------------------------------------
    // 1. LOCAL AGENT (Qwen 2.5:3B via Tailscale / Home Server)
    // -------------------------------------------------------------
    if (isLocal) {
      const serverBase = normalizeLocalUrl(localUrl || process.env.LOCAL_AI_URL || DEFAULT_LOCAL_AI_URL);
      const ollamaEndpoint = `${serverBase}/api/chat`;

      const formattedMessages = [
        { role: 'system', content: systemInstruction },
        ...messages.map((m: { role: string; text: string }) => ({
          role: m.role === 'ai' ? 'assistant' : 'user',
          content: m.text,
        })),
      ];

      try {
        const localRes = await fetch(ollamaEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: chosenModel,
            messages: formattedMessages,
            stream: true,
          }),
        });

        if (!localRes.ok || !localRes.body) {
          const errText = await localRes.text().catch(() => '');
          return new Response(
            `Erreur serveur local Ollama (${localRes.status}) sur ${serverBase}: ${errText || 'Modèle non disponible.'}`,
            { status: 502 }
          );
        }

        const reader = localRes.body.getReader();
        const decoder = new TextDecoder();

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
                    if (token) {
                      controller.enqueue(new TextEncoder().encode(token));
                    }
                  } catch {
                    // Ignorer les fragments JSON partiels
                  }
                }
              }
              if (buffer.trim()) {
                try {
                  const parsed = JSON.parse(buffer.trim());
                  const token = parsed?.message?.content || parsed?.response || '';
                  if (token) {
                    controller.enqueue(new TextEncoder().encode(token));
                  }
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
          `Impossible de joindre votre serveur local Ollama à ${serverBase} via Tailscale. Vérifiez que le serveur est allumé.`,
          { status: 503 }
        );
      }
    }

    // -------------------------------------------------------------
    // 2. GOOGLE GEMINI (API CLOUD)
    // -------------------------------------------------------------
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return new Response('Clé API Gemini manquante dans .env.local', { status: 500 });

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

      // Fallback sur un modèle stable existant
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
    const msg = error?.status === 503
      ? "Les serveurs Google Gemini subissent une forte charge temporaire."
      : error instanceof Error ? error.message : 'Erreur inconnue';
    return new Response(msg, { status: 500 });
  }
}
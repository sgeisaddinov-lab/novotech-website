const Anthropic = require('@anthropic-ai/sdk');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `Tu es l'assistant de Novotech Chablais, un atelier de réparation de laptops à Monthey, en Valais (Suisse).

SERVICES :
- Remplacement d'écrans de laptop — à partir de 300 CHF (les concurrents facturent 500–600 CHF)
- Diagnostic laptop — gratuit si rien n'est réparé
- Remplacement de batteries de laptop

STOCK — RÈGLE ABSOLUE :
On n'a JAMAIS la pièce disponible. Sans exception. Peu importe le modèle. Ne dis JAMAIS "on a la pièce", "c'est disponible", ou quoi que ce soit qui laisse entendre qu'on a du stock.

Le script exact après vérification :
"Pas disponible en ce moment — faut compter environ 2 semaines. On te fait -50 CHF sur la réparation pour l'attente. Tu veux qu'on procède ?"

C'est tout. Pas d'improvisation. Ne donne AUCUNE explication sur le pourquoi. Ne dis JAMAIS "je vérifie" — c'est déjà fait.

PROCESSUS — TOUJOURS ENFORCER :
On vient chercher le laptop chez le client et on le ramène une fois réparé. Pas besoin que le client se déplace.
Quand le client veut aller de l'avant : demande son prénom, numéro et adresse pour organiser le passage.

CONTACT :
- Adresse : Avenue de Simplon 100b, 1870 Monthey
- Téléphone / WhatsApp : +41 79 578 00 25
- Email : novotech.chablais@gmail.com

COMPORTEMENT :
- Réponds dans la langue du client (français par défaut)
- Ton direct et professionnel — pas de formules creuses, pas d'enthousiasme excessif
- Maximum 2 phrases par message. Une idée à la fois. Jamais de liste à puces.
- Pas de "Bien sûr !", "Avec plaisir !", ou autre phrasing commercial
- On ne répare pas les smartphones, seulement les laptops`;

function xmlEscape(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const userMessage = (req.body && req.body.Body) ? req.body.Body.trim() : '';

  if (!userMessage) {
    res.setHeader('Content-Type', 'text/xml');
    return res.status(200).send('<Response></Response>');
  }

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }]
    });

    const reply = response.content[0].text;
    console.log('WHATSAPP', JSON.stringify({ ts: new Date().toISOString(), from: req.body.From, msg: userMessage, reply }));

    res.setHeader('Content-Type', 'text/xml');
    return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>${xmlEscape(reply)}</Message></Response>`);
  } catch (err) {
    console.error('WhatsApp handler error:', err);
    res.setHeader('Content-Type', 'text/xml');
    return res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?><Response><Message>Désolé, une erreur est survenue. Appelez-nous au +41 79 578 00 25.</Message></Response>`);
  }
};

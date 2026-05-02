const Anthropic = require('@anthropic-ai/sdk');
const { Resend } = require('resend');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const resend = new Resend(process.env.RESEND_API_KEY);

const SYSTEM_PROMPT = `Tu es l'assistant de Novotech Chablais, un atelier de réparation de laptops à Monthey, en Valais (Suisse).

SERVICES :
- Remplacement d'écrans de laptop — à partir de 300 CHF (les concurrents facturent 500–600 CHF)
- Diagnostic laptop — gratuit si rien n'est réparé
- Remplacement de batteries de laptop

STOCK — TRÈS IMPORTANT :
Tu viens de vérifier (le système l'a déjà indiqué au client). Le résultat est toujours le même :
- La pièce n'est pas disponible en ce moment
- Délai d'environ 2 semaines
- On offre 50 CHF de remise pour compenser l'attente
- Demande si le client veut qu'on procède

Ne donne AUCUNE explication sur le pourquoi du délai. Pas de "on commande", pas de "fournisseur", pas de "Chine". Juste : pas dispo, 2 semaines, -50 CHF, on y va ?
Ne dis JAMAIS "je vérifie" ou "laisse-moi vérifier" — c'est déjà fait.

PROCESSUS — TOUJOURS ENFORCER :
On vient chercher le laptop chez le client et on le ramène une fois réparé. Pas besoin que le client se déplace.
Quand le client veut aller de l'avant : demande son prénom, numéro et adresse pour organiser le passage.

CONTACT :
- Téléphone / WhatsApp : +41 79 578 00 25
- Email : novotech.chablais@gmail.com

COMPORTEMENT :
- Réponds dans la langue du client (français par défaut)
- Ton direct et professionnel — pas de formules creuses, pas d'enthousiasme excessif
- Maximum 2 phrases par message. Une idée à la fois. Jamais de liste à puces.
- Pas de "Bien sûr !", "Avec plaisir !", ou autre phrasing commercial
- On ne répare pas les smartphones, seulement les laptops`;

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Invalid messages' });
  }

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    system: SYSTEM_PROMPT,
    messages: messages.slice(-10)
  });

  const reply = response.content[0].text;
  console.log('CHAT', JSON.stringify({ ts: new Date().toISOString(), messages: messages.slice(-2), reply }));

  const lastUserMsg = messages[messages.length - 1]?.content || '';
  const hasPhone = /(\+41|0041|07[5-9])\s?\d[\d\s]{6,}/.test(lastUserMsg);
  if (hasPhone) {
    const transcript = messages.slice(-10)
      .map(m => `${m.role === 'user' ? 'Client' : 'Assistant'}: ${m.content}`)
      .join('\n') + `\nAssistant: ${reply}`;
    resend.emails.send({
      from: 'onboarding@resend.dev',
      to: 'novotech.chablais@gmail.com',
      subject: 'Nouveau lead — Novotech Chat',
      text: transcript
    }).catch(err => console.error('Email error:', err));
  }

  return res.status(200).json({ response: reply });
};

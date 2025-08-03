const { createNodeMiddleware, Probot } = require('probot');
const { probotApp } = require('../../index');
const getRawBody = require('raw-body');
const crypto = require('crypto');
const { buffer } = require('micro');


const probot = new Probot({
  appId: Number(process.env.APP_ID ?? 0),
  privateKey: (process.env.PRIVATE_KEY ?? '').replace(/\\n/g, '\n'),
  secret: process.env.WEBHOOK_SECRET ?? '',
});

// This might impact body parsing on vercel or might be chatgpt hallucination
export const config = {
  api: {
    bodyParser: false
};

module.exports = async (req, res) => {
  // DEBUG: Signature troubleshooting
  try {
    // const rawBody = await getRawBody(req); // You’ll need raw body, not parsed body
    const rawBody = (await buffer(req)).toString('utf8');
    req.body = rawBody; // Important: must remain a Buffer
    const expectedSignature = `sha256=${crypto
      .createHmac('sha256', process.env.WEBHOOK_SECRET)
      .update(rawBody)
      .digest('hex')}`;
    console.warn('WEBHOOK:', process.env.WEBHOOK_SECRET);
    console.warn('Expected Signature:', expectedSignature);
    console.warn('Received Signature:', req.headers['x-hub-signature-256']);
  } catch (err) {
    console.warn('Signature debugging failed:', err.message);
  }
  if (expectedSignature !== receivedSignature) {
    console.error('Signatures do not match!');
    return res.status(401).send('Invalid signature');
  }
  // Let Probot handle the webhook
  const middleware = createNodeMiddleware(probotApp, { probot });
  return middleware(req, res);
};

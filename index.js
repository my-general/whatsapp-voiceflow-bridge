const axios = require('axios');

module.exports = async (req, res) => {
  // 1. Meta Webhook Verification (Run once)
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode && token === 'MY_SECRET_TOKEN') {
      return res.status(200).send(challenge);
    }
    return res.status(403).send('Forbidden');
  }

  // 2. Handle Incoming WhatsApp Message
  if (req.method === 'POST') {
    try {
      const msgBody = req.body.entry[0].changes[0].value.messages[0];
      const from = msgBody.from; // User's phone number
      const text = msgBody.text.body;

      // Send to Voiceflow
      const vfResponse = await axios.post(
        `https://general-runtime.voiceflow.com/state/user/${from}/interact`,
        { action: { type: 'text', payload: text } },
        { headers: { Authorization: 'VF.DM.699f2099efa10cc32ed37f7c.Td7YxbhQQFvyxhxa' } }
      );

      // Extract Voiceflow's Reply
      const botReply = vfResponse.data.find(e => e.type === 'text').payload.message;

      // Send back to WhatsApp via Meta API
      await axios.post(
        `https://graph.facebook.com/v22.0/1068995849621839/messages`,
        {
          messaging_product: "whatsapp",
          to: from,
          type: "text",
          text: { body: botReply }
        },
        { headers: { Authorization: `Bearer EAAM4zRTNmVMBQ0Oo8FO3fhZBMCZAQKhE8eUkyvZCuqjpfQvg9GzLoVgIirJSr4xKE6WMKG5zv8ZBm3FqfAU99F12RingxfZAagpaZCAHLLtRtENr4UZBGJqQkLwkLim4XmZAWW9rriPqKzBQjk9T7hioATJmrvjbIpaw5EouDzkQ9zpYlqtMBLME40iNpxX2uf0RxNArAu5mSLQfnX0InENbG30cDD2Ko7ZAWQmZCdu6O7riZCl3yUFOmD2DHARXeVQMt1QLZBvcEBJNNuJthb1iouslvHZAJ` } }
      );

      res.sendStatus(200);
    } catch (err) {
      res.sendStatus(200); // Meta requires 200 even on error
    }
  }
};

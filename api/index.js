const axios = require('axios');

module.exports = async (req, res) => {
  // 1. Meta Handshake (Keep this as is)
  if (req.method === 'GET') {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    if (mode === 'subscribe' && token === 'MY_SECRET_TOKEN') {
      return res.status(200).send(challenge);
    }
    return res.status(403).send('Forbidden');
  }

  // 2. Handle WhatsApp Message
  if (req.method === 'POST') {
    try {
      const value = req.body?.entry?.[0]?.changes?.[0]?.value;
      const message = value?.messages?.[0];

      if (message && message.text) {
        const from = message.from;
        const userInput = message.text.body;

        // STEP A: Advance the conversation in Voiceflow
        const vfResponse = await axios.post(
          `https://general-runtime.voiceflow.com/state/user/${from}/interact`,
          { 
            action: { type: 'text', payload: userInput },
            config: { tts: false, stripSSML: true }
          },
          { headers: { Authorization: 'VF.DM.699f2099efa10cc32ed37f7c.Td7YxbhQQFvyxhxa' } }
        );

        // STEP B: Handle Voiceflow's response (Filter for text messages)
        // If Voiceflow returns nothing, it might be because the session needs to be started
        let traces = vfResponse.data;
        
        // Combine all 'speak' or 'text' traces into one response
        const botReply = traces
          .filter(trace => trace.type === 'speak' || trace.type === 'text')
          .map(trace => trace.payload.message)
          .join('\n');

        if (botReply) {
          // STEP C: Send back to WhatsApp
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
        }
      }
      res.status(200).send('SUCCESS');
    } catch (err) {
      console.error("Error details:", err.response?.data || err.message);
      res.status(200).send('SUCCESS'); // Meta expects 200
    }
  }
};

# WhatsApp Business Voice Calling API - AI Voice Agents, SIP Trunk Integration & Free Incoming Calls (India Focused)

[![WhatsApp Voice Calling Tutorial Thumbnail](https://img.youtube.com/vi/4DWiJec8LFo/maxresdefault.jpg)](https://www.youtube.com/watch?v=4DWiJec8LFo)

**Click the thumbnail above to watch the full tutorial on YouTube!** 🚀

## 📹 Video Tutorial

Watch the complete step-by-step guide on YouTube:  
🔗 **[https://www.youtube.com/watch?v=4DWiJec8LFo](https://www.youtube.com/watch?v=4DWiJec8LFo)**

---

## 📖 Overview

This repository contains **working sample code** for integrating WhatsApp Business Voice Calling API with both human agents and AI voice assistants. The implementation demonstrates how to leverage WhatsApp's voice calling capabilities for business use cases, specifically optimized for the Indian market.

### 🎯 Key Features

- **Normal human-agent voice calls** - Node.js server implementation
- **AI voice agent integration** - Using Ultravox AI for intelligent call handling
- **100% free incoming calls** on WhatsApp (no charges for receiving calls)
- **No TRAI compliance hassles** - No need for virtual numbers or entity registration
- **Zero monthly commitments** - Pay only for what you use
- **SIP trunk integration** - Connect traditional VoIP call centers
- **AI agents on WhatsApp** - Build conversational voice bots directly

### ⚠️ Important Spam Policy Guidelines

WhatsApp enforces strict policies to prevent abuse:
- ✅ User must give explicit permission to receive calls
- ⏰ Calls allowed only within 7-day window after user interaction
- 📞 Maximum 2 callback attempts within any 15-day period
- 🚫 Violations can lead to account suspension

---

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone https://github.com/yohita/whatsapp-calling-ultravox.git
cd whatsapp-calling-ultravox
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the root directory:
```env
PORT=3000
PHONE_NUMBER_ID=your_whatsapp_phone_number_id
META_ACCESS_TOKEN=your_facebook_meta_access_token
META_VERIFY_TOKEN=my_super_secret_token_123 //change this as you wish
CALL_MODE=ultravox  # Options: 'ultravox' or 'normal'
ULTRAVOX_API_KEY=your_ultravox_api_key
```

**How to get these values:**
- `PHONE_NUMBER_ID`: From WhatsApp Business Manager > Phone Numbers
- `META_ACCESS_TOKEN`: From Meta Developer Console > Your App > WhatsApp > API Setup
- `ULTRAVOX_API_KEY`: Sign up at [Ultravox AI](https://www.ultravox.ai/) (required only for AI agent mode)

### 4. Expose Your Local Server

WhatsApp webhooks require a publicly accessible URL. Use ngrok or similar tools:
```bash
ngrok http 3000
```

Copy the `https://` URL provided by ngrok (e.g., `https://abcd1234.ngrok.io`)

### 5. Configure Meta/Facebook App

Follow these steps (detailed walkthrough in the video):

1. **Create Meta Developer App**
   - Go to [Meta Developers Console](https://developers.facebook.com/)
   - Create new app → Select "Business" type
   - Add WhatsApp product to your app

2. **Configure Webhooks**
   - Navigate to WhatsApp > Configuration
   - Click "Edit" on Webhook settings
   - Enter your ngrok URL: `https://your-ngrok-url.ngrok.io/webhook`
   - Subscribe to `messages` and `calls` events
   - Set verify token (match it in your `.env` file)

3. **WhatsApp Business Manager Setup**
   - Add your phone number in WhatsApp Manager
   - Enable **"Allow voice calls"** option
   - Enable **"Allow callbacks"** option
   - Complete phone number verification

### 6. Run the Server

For **human-agent calls**:
```bash
node server.js
```

For **AI voice agent** (Ultravox):
```bash
node server-ultravox.js
```

The server will start on `http://localhost:3000` (or your configured PORT)

---

## 📂 Project Structure
```
.
├── server.js              # Basic voice call handler (human agent mode)
├── server-ultravox.js     # Ultravox AI voice agent integration
├── .env.example           # Environment variables template
├── package.json           # Node.js dependencies
└── README.md              # This file
```

---

## 💻 Code Samples

### Basic Call Handling (server.js)

Handles incoming calls with a human agent:
```javascript
// Answer incoming call
app.post('/webhook', (req, res) => {
  const callData = req.body;
  
  if (callData.entry[0].changes[0].value.statuses) {
    // Handle call status updates
    const status = callData.entry[0].changes[0].value.statuses[0];
    console.log('Call status:', status.status);
  }
  
  res.sendStatus(200);
});
```

### AI Agent Integration (server-ultravox.js)

Connects calls to Ultravox AI for automated handling:
```javascript
// Forward call to Ultravox AI agent
const ultravoxResponse = await axios.post(
  'https://api.ultravox.ai/v1/calls',
  {
    systemPrompt: "You are a helpful customer service agent...",
    voice: "en-US-Neural2-A"
  },
  {
    headers: {
      'Authorization': `Bearer ${process.env.ULTRAVOX_API_KEY}`
    }
  }
);
```

---

## 🛠️ Requirements

- **Node.js** v14 or higher
- **WhatsApp Business Account** (free to create)
- **Meta Developer Account** (free)
- **ngrok or similar tunneling tool** for local development
- **(Optional) Ultravox AI API key** - Required only for AI agent functionality

---

## 📚 Useful Links

- 📺 **Full YouTube Tutorial**: [Watch Here](https://www.youtube.com/watch?v=4DWiJec8LFo)
- 📖 **WhatsApp Cloud API Docs**: [Official Documentation](https://developers.facebook.com/docs/whatsapp/cloud-api/calling/)
- 🤖 **Ultravox AI Platform**: [ultravox.ai](https://www.ultravox.ai/)
- 🔧 **Meta Developers Console**: [developers.facebook.com](https://developers.facebook.com/)
- 💬 **WhatsApp Business Manager**: [business.facebook.com](https://business.facebook.com/)

---

## ❓ FAQ

**Q: Are incoming calls really free?**  
A: Yes! WhatsApp does not charge for incoming calls. You only pay for outgoing calls or callbacks.

**Q: Do I need a special business number?**  
A: No, you can use your existing WhatsApp Business API phone number. No TRAI DLT registration required for voice calls.

**Q: Can I use this for outbound sales calls?**  
A: Only within the strict policy limits (user permission + 7-day window + max 2 callbacks in 15 days). This is not suitable for cold calling.

**Q: Does this work outside India?**  
A: Yes, but the "free incoming calls" and "no TRAI compliance" benefits are India-specific. Check local regulations for your country.

**Q: Can I connect my existing call center?**  
A: Yes! You can integrate via SIP trunk. Details covered in the video tutorial.

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

---

## ⭐ Support

If you find this project helpful:
- ⭐ Star this repository
- 👍 Like the [YouTube tutorial](https://www.youtube.com/watch?v=4DWiJec8LFo)
- 💬 Share with others who might benefit
- 🐛 Report bugs by opening an issue

---

## 📧 Contact

For questions or support, please:
- Comment on the [YouTube video](https://www.youtube.com/watch?v=4DWiJec8LFo)
- Check the official WhatsApp API documentation

---

**Built with ❤️ for the developer community | India-focused WhatsApp Business Solutions**

require("dotenv").config();
const express = require("express");
const axios = require("axios");
const path = require("path");
const http = require("http");
const socketIO = require("socket.io");
const {
    RTCPeerConnection,
    RTCSessionDescription,
    RTCIceCandidate,
    MediaStream,
} = require("@roamhq/wrtc");

// STUN server allows each peer to discover its public IP for NAT traversal
const ICE_SERVERS = [{ urls: "stun:stun.relay.metered.ca:80" }];

const WHATSAPP_API_URL = `https://graph.facebook.com/v18.0/${process.env.PHONE_NUMBER_ID}/calls`;
const ACCESS_TOKEN = `Bearer ${process.env.ACCESS_TOKEN}`;

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// State variables per call session
let browserPc = null;
let browserStream = null;
let whatsappPc = null;
let whatsappStream = null;
let browserOfferSdp = null;
let whatsappOfferSdp = null;
let browserSocket = null;
let currentCallId = null;

/**
 * Socket.IO connection from browser client.
 */
io.on("connection", (socket) => {
    console.log(`Socket.IO connection established with browser: ${socket.id}`);

    // SDP offer from browser
    socket.on("browser-offer", async (sdp) => {
        console.log("Received SDP offer from browser.");
        browserOfferSdp = sdp;
        browserSocket = socket;
        await initiateWebRTCBridge();
    });

    // ICE candidate from browser
    socket.on("browser-candidate", async (candidate) => {
        if (!browserPc) {
            console.warn("Cannot add ICE candidate: browser peer connection not initialized.");
            return;
        }

        try {
            await browserPc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
            console.error("Failed to add ICE candidate from browser:", err);
        }
    });

    // Reject call from browser
    socket.on("reject-call", async (callId) => {
        const result = await rejectCall(callId);
        console.log("Reject call response:", result);
    });

    // Terminate call from browser
    socket.on("terminate-call", async (callId) => {
        const result = await terminateCall(callId);
        console.log("Terminate call response:", result);
    });
});


// Add this block for webhook verification
app.get("/call-events", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  // Use the same token you set in Meta
  const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || "my_super_secret_token_123"; // Change this to whatever you want
  //console.log("Webhook verification request received:", { mode, token,VERIFY_TOKEN, challenge });  
  if (mode && token) {
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("Webhook verified successfully!");
      res.send(challenge);
    } else {
      res.sendStatus(403);
    }
  }
});

/**
 * Handles incoming WhatsApp webhook call events.
 */
app.post("/call-events", async (req, res) => {
    try {
        const entry = req.body?.entry?.[0];
        const change = entry?.changes?.[0];
        const call = change?.value?.calls?.[0];
        const contact = change?.value?.contacts?.[0];

        if (!call || !call.id || !call.event) {
            console.warn("Received invalid or incomplete call event.");
            return res.sendStatus(200);
        }

        const callId = call.id;
        currentCallId = callId;

        if (call.event === "connect") {
            whatsappOfferSdp = call?.session?.sdp;
            const callerName = contact?.profile?.name || "Unknown";
            const callerNumber = contact?.wa_id || "Unknown";

            console.log(`Incoming WhatsApp call from ${callerName} (${callerNumber})`);
            io.emit("call-is-coming", { callId, callerName, callerNumber });

            await initiateWebRTCBridge();

        } else if (call.event === "terminate") {
            console.log(`WhatsApp call terminated. Call ID: ${callId}`);
            io.emit("call-ended");

            if (call.duration && call.status) {
                console.log(`Call duration: ${call.duration}s | Status: ${call.status}`);
            }

        } else {
            console.log(`Unhandled WhatsApp call event: ${call.event}`);
        }

        res.sendStatus(200);
    } catch (err) {
        console.error("Error processing /call-events webhook:", err);
        res.sendStatus(500);
    }
});

/**
 * Initiates WebRTC between browser and WhatsApp once both SDP offers are received.
 */
async function initiateWebRTCBridge() {
    if (!browserOfferSdp || !whatsappOfferSdp || !browserSocket) return;

    // --- Setup browser peer connection ---
    browserPc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    browserStream = new MediaStream();

    browserPc.ontrack = (event) => {
        console.log("Audio track received from browser.");
        event.streams[0].getTracks().forEach((track) => browserStream.addTrack(track));
    };

    browserPc.onicecandidate = (event) => {
        if (event.candidate) {
            browserSocket.emit("browser-candidate", event.candidate);
        }
    };

    await browserPc.setRemoteDescription(new RTCSessionDescription({
        type: "offer",
        sdp: browserOfferSdp
    }));
    console.log("Browser offer SDP set as remote description.");

    // --- Setup WhatsApp peer connection ---
    whatsappPc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    const waTrackPromise = new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject("Timed out waiting for WhatsApp track"), 10000);
        whatsappPc.ontrack = (event) => {
            clearTimeout(timeout);
            console.log("Audio track received from WhatsApp.");
            whatsappStream = event.streams[0];
            resolve();
        };
    });

    await whatsappPc.setRemoteDescription(new RTCSessionDescription({
        type: "offer",
        sdp: whatsappOfferSdp
    }));
    console.log("WhatsApp offer SDP set as remote description.");

    // Forward browser mic to WhatsApp
    browserStream?.getAudioTracks().forEach((track) => {
        whatsappPc.addTrack(track, browserStream);
    });
    console.log("Forwarded browser audio to WhatsApp.");

    // Wait for WhatsApp to send audio
    await waTrackPromise;

    // Forward WhatsApp audio to browser
    whatsappStream?.getAudioTracks().forEach((track) => {
        browserPc.addTrack(track, whatsappStream);
    });

    // --- Create SDP answers for both peers ---
    const browserAnswer = await browserPc.createAnswer();
    await browserPc.setLocalDescription(browserAnswer);
    browserSocket.emit("browser-answer", browserAnswer.sdp);
    console.log("Browser answer SDP created and sent.");

    const waAnswer = await whatsappPc.createAnswer();
    await whatsappPc.setLocalDescription(waAnswer);
    const finalWaSdp = waAnswer.sdp.replace("a=setup:actpass", "a=setup:active");
    console.log("WhatsApp answer SDP prepared.");

    // Send pre-accept, and only proceed with accept if successful
    const preAcceptSuccess = await answerCallToWhatsApp(currentCallId, finalWaSdp, "pre_accept");

    if (preAcceptSuccess) {
        setTimeout(async () => {
            const acceptSuccess = await answerCallToWhatsApp(currentCallId, finalWaSdp, "accept");
            if (acceptSuccess && browserSocket) {
                browserSocket.emit("start-browser-timer");
            }
        }, 1000);
    } else {
        console.error("Pre-accept failed. Aborting accept step.");
    }

    // Reset session state
    browserOfferSdp = null;
    whatsappOfferSdp = null;
}

/**
 * Sends "pre-accept" or "accept" response with SDP to WhatsApp API.
 */
async function answerCallToWhatsApp(callId, sdp, action) {
    const body = {
        messaging_product: "whatsapp",
        call_id: callId,
        action,
        session: { sdp_type: "answer", sdp },
    };

    try {
        const response = await axios.post(WHATSAPP_API_URL, body, {
            headers: {
                Authorization: ACCESS_TOKEN,
                "Content-Type": "application/json",
            },
        });

        const success = response.data?.success === true;

        if (success) {
            console.log(`Successfully sent '${action}' to WhatsApp.`);
            return true;
        } else {
            console.warn(`WhatsApp '${action}' response was not successful.`);
            return false;
        }
    } catch (error) {
        console.error(`Failed to send '${action}' to WhatsApp:`, error.message);
        return false;
    }
}

/**
 * Rejects the current WhatsApp call.
 * Returns WhatsApp API response.
 */
async function rejectCall(callId) {
    const body = {
        messaging_product: "whatsapp",
        call_id: callId,
        action: "reject",
    };

    try {
        const response = await axios.post(WHATSAPP_API_URL, body, {
            headers: {
                Authorization: ACCESS_TOKEN,
                "Content-Type": "application/json",
            },
        });

        const success = response.data?.success === true;

        if (success) {
            console.log(`Call ${callId} successfully rejected.`);
        } else {
            console.warn(`Call ${callId} reject response was not successful.`);
        }

        return response.data;
    } catch (error) {
        console.error(`Failed to reject call ${callId}:`, error.message);
        return { success: false, error: error.message };
    }
}

/**
 * Terminate WhatsApp call.
 * Returns WhatsApp API response.
 */
 async function terminateCall(callId) {
    const body = {
        messaging_product: "whatsapp",
        call_id: callId,
        action: "terminate",
    };

    try {
        const response = await axios.post(WHATSAPP_API_URL, body, {
            headers: {
                Authorization: ACCESS_TOKEN,
                "Content-Type": "application/json",
            },
        });

        const success = response.data?.success === true;

        if (success) {
            console.log(`Call ${callId} successfully terminated.`);
        } else {
            console.warn(`Call ${callId} terminate response was not successful.`);
        }

        return response.data;
    } catch (error) {
        console.error(`Failed to terminate call ${callId}:`, error.message);
        return { success: false, error: error.message };
    }
}

// Start the server
const PORT = process.env.PORT || 19000;
server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running at http://0.0.0.0:${PORT}`);
});

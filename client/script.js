// --- JAVASCRIPT LOGIC ---
const video = document.getElementById('video');
const messageDiv = document.getElementById('message');
const scoreSpan = document.getElementById('score');

const moodInput = document.getElementById('moodInput');
const adviceButton = document.getElementById('adviceButton');
const adviceText = document.getElementById('adviceText');

const themeInput = document.getElementById('themeInput');
const themeButton = document.getElementById('themeButton');

const pepTalkInput = document.getElementById('pepTalkInput');
const pepTalkButton = document.getElementById('pepTalkButton');
const pepTalkDisplay = document.getElementById('pepTalkDisplay');

let currentScore = 0;

// --- Step 1: Load face-api.js models ---
Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri('https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@0.22.2/weights'),
    faceapi.nets.faceExpressionNet.loadFromUri('https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js@0.22.2/weights')
]).then(startVideo);

// --- Step 2: Start the webcam ---
function startVideo() {
    navigator.mediaDevices.getUserMedia({ video: {} })
        .then(stream => {
            video.srcObject = stream;
            messageDiv.textContent = "Look at the camera and smile!";
        })
        .catch(err => {
            console.error("Error accessing webcam: ", err);
            messageDiv.textContent = "Could not access the webcam. Please allow camera access.";
        });
}

// --- Step 3: Perform smile detection when the video starts playing ---
video.addEventListener('play', () => {
    const canvas = document.querySelector('canvas');
    document.querySelector('.video-container').append(canvas);
    const displaySize = { width: video.clientWidth, height: video.clientHeight };
    faceapi.matchDimensions(canvas, displaySize);

    setInterval(async () => {
        const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions()).withFaceExpressions();
        const resizedDetections = faceapi.resizeResults(detections, displaySize);
        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
        faceapi.draw.drawDetections(canvas, resizedDetections);
        faceapi.draw.drawFaceExpressions(canvas, resizedDetections);

        if (detections.length > 0) {
            if (detections[0].expressions.happy > 0.8) {
                awardPointsForSmile();
            }
        }
    }, 100);
});

// --- Step 4: Award points for smiling ---
function awardPointsForSmile() {
    const today = new Date().toDateString();
    const lastSmileDate = localStorage.getItem('lastSmileDate');

    if (lastSmileDate !== today) {
        currentScore += 10;
        localStorage.setItem('score', currentScore);
        localStorage.setItem('lastSmileDate', today);
        updateScore();
        messageDiv.textContent = "Great smile! You've earned 10 points today.";
        
        const scoreContainer = document.querySelector('.score-container');
        scoreContainer.style.transform = 'scale(1.15)';
        scoreContainer.querySelector('span').style.textShadow = '0 0 15px var(--glow-color-2), 0 0 25px var(--glow-color-2)';
        setTimeout(() => {
            scoreContainer.style.transform = 'scale(1)';
            scoreContainer.querySelector('span').style.textShadow = '0 0 10px var(--glow-color-1), 0 0 20px var(--glow-color-1)';
        }, 300);
    }
}

function updateScore() {
    scoreSpan.textContent = currentScore;
}

// --- Step 5: AI-powered Features ---
const SERVER_URL = 'https://smile-rewards2.onrender.com/api/gemini'; // URL of our local backend

async function callSecureGemini(prompt, button, resultElement) {
    button.disabled = true;
    resultElement.textContent = "✨ Thinking...";
    if(resultElement.style) resultElement.style.display = 'block';

    try {
        const response = await fetch(SERVER_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt }), // Send the prompt to our server
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Server error');
        }
        
        const data = await response.json();
        return data.text;

    } catch (error) {
        console.error("API Error:", error);
        resultElement.textContent = `Sorry, an error occurred: ${error.message}. Is your server running?`;
        return null;
    } finally {
        button.disabled = false;
    }
}

// Feature 1: Quick Advice
adviceButton.addEventListener('click', async () => {
    const mood = moodInput.value.trim();
    if (!mood) {
        adviceText.textContent = "Please enter how you're feeling first.";
        return;
    }
    const prompt = `A user is feeling ${mood}. Provide a short, positive, and encouraging piece of advice or an affirmation for them. Keep it under 50 words.`;
    const result = await callSecureGemini(prompt, adviceButton, adviceText);
    if (result) adviceText.textContent = result;
});

// Feature 2: Personalized Pep Talk
pepTalkButton.addEventListener('click', async () => {
    const situation = pepTalkInput.value.trim();
    if (!situation) {
        pepTalkDisplay.textContent = "Please describe your situation for a pep talk.";
        pepTalkDisplay.style.display = 'block';
        return;
    }
    const prompt = `A user needs a personalized pep talk. Their situation is: "${situation}". Write an encouraging, empathetic, and uplifting multi-paragraph pep talk for them. Address them directly as "you".`;
    const result = await callSecureGemini(prompt, pepTalkButton, pepTalkDisplay);
    if (result) pepTalkDisplay.textContent = result;
});

// Feature 3: AI Theme Generator
themeButton.addEventListener('click', async () => {
    const themeQuery = themeInput.value.trim();
    if(!themeQuery) {
        alert("Please enter a theme idea first!");
        return;
    }
    
    const prompt = `Generate a color scheme based on the theme "${themeQuery}". Provide exactly two vibrant, contrasting colors for glows and two dark, complementary colors for the background. Respond ONLY with a JSON object in this format: {"glow1": "#RRGGBB", "glow2": "#RRGGBB", "bg1": "#RRGGBB", "bg2": "#RRGGBB"}. Do not add any other text or markdown formatting.`;
    
    const tempLoadingElement = { textContent: '' }; 
    const result = await callSecureGemini(prompt, themeButton, tempLoadingElement);

    if (result) {
        try {
            const jsonString = result.replace(/```json/g, '').replace(/```/g, '').trim();
            const colors = JSON.parse(jsonString);
            if(colors.glow1 && colors.glow2 && colors.bg1 && colors.bg2) {
                document.documentElement.style.setProperty('--glow-color-1', colors.glow1);
                document.documentElement.style.setProperty('--glow-color-2', colors.glow2);
                document.documentElement.style.setProperty('--bg-color-1', colors.bg1);
                document.documentElement.style.setProperty('--bg-color-2', colors.bg2);
            } else {
                throw new Error("Invalid color format from API");
            }
        } catch (e) {
            console.error("Failed to parse or apply theme:", e);
            alert("Couldn't apply the new theme. The AI returned an unexpected format. Please try another theme.");
        }
    }
});

// --- Step 6: Initialize the app on page load ---
function initializeApp() {
    currentScore = parseInt(localStorage.getItem('score')) || 0;
    updateScore();
}

initializeApp();

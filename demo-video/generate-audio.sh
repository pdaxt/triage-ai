#!/bin/bash
# Generate TTS audio segments using gTTS (free Google TTS)

AUDIO_DIR="./audio"
mkdir -p "$AUDIO_DIR"

echo "🎙️ Generating TTS audio segments..."
echo ""

# Segment 1: Intro (5s)
echo "1/7: Generating intro..."
gtts-cli "TriageAI. AI-powered patient triage for Australian healthcare." --lang en-au -o "$AUDIO_DIR/01_intro.mp3"

# Segment 2: Problem (12s)
echo "2/7: Generating problem statement..."
gtts-cli "Australian emergency departments handle 8.9 million presentations each year. 30% are non-urgent. Triage nurses are overwhelmed, and telehealth lacks standardized pre-screening." --lang en-au -o "$AUDIO_DIR/02_problem.mp3"

# Segment 3: Solution (15s)
echo "3/7: Generating solution overview..."
gtts-cli "TriageAI implements the official Australian Triage Scale with a 4-layer safety architecture. Deterministic guardrails catch red flags in under 1 millisecond. The LLM can never under-triage a critical patient." --lang en-au -o "$AUDIO_DIR/03_solution.mp3"

# Segment 4: Demo intro (5s)
echo "4/7: Generating demo intro..."
gtts-cli "Watch what happens when a patient reports chest pain radiating to their left arm." --lang en-au -o "$AUDIO_DIR/04_demo_intro.mp3"

# Segment 5: Demo result (10s)
echo "5/7: Generating demo result..."
gtts-cli "The system immediately detects the cardiac red flag, assigns ATS Category 2, and recommends urgent assessment within 10 minutes. All in real-time." --lang en-au -o "$AUDIO_DIR/05_demo_result.mp3"

# Segment 6: Safe demo (10s)
echo "6/7: Generating non-urgent demo..."
gtts-cli "For a mild headache without red flags, the AI asks clarifying questions and appropriately triages as non-urgent, ATS Category 5." --lang en-au -o "$AUDIO_DIR/06_safe_demo.mp3"

# Segment 7: Close (10s)
echo "7/7: Generating closing..."
gtts-cli "TriageAI. Safe, explainable, production-ready. Built with React, Node.js, and AWS. Let's build the future of healthcare AI together." --lang en-au -o "$AUDIO_DIR/07_close.mp3"

echo ""
echo "✅ Audio segments generated in $AUDIO_DIR/"
echo ""

# Combine all segments with silence between
echo "🔧 Combining audio segments..."

# Create silence file (1 second)
ffmpeg -f lavfi -i anullsrc=r=44100:cl=mono -t 1 -q:a 9 "$AUDIO_DIR/silence.mp3" -y 2>/dev/null

# Create concat file
cat > "$AUDIO_DIR/concat.txt" << EOF
file '01_intro.mp3'
file 'silence.mp3'
file '02_problem.mp3'
file 'silence.mp3'
file '03_solution.mp3'
file 'silence.mp3'
file '04_demo_intro.mp3'
file 'silence.mp3'
file '05_demo_result.mp3'
file 'silence.mp3'
file '06_safe_demo.mp3'
file 'silence.mp3'
file '07_close.mp3'
EOF

# Combine all
ffmpeg -f concat -safe 0 -i "$AUDIO_DIR/concat.txt" -c copy "$AUDIO_DIR/voiceover.mp3" -y 2>/dev/null

echo "✅ Combined voiceover saved to: $AUDIO_DIR/voiceover.mp3"

# Get duration
DURATION=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$AUDIO_DIR/voiceover.mp3" 2>/dev/null)
echo "📊 Total duration: ${DURATION}s"

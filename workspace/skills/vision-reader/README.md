# Vision Reader Skill

The Vision Reader skill allows you to "attach" images to your conversation by providing their file paths. The agent will then use its multimodal vision capabilities to analyze the image.

## How to use

Simply give me a command with an absolute path to an image file:

- "What is in this image /Users/alex/Desktop/screenshot.png"
- "Extract the text from ./docs/diagram.jpg"
- "Explain this diagram /Users/alex/Project/architecture.webp"

## Features

- **Text Extraction**: Perfect for grabbing code or text from screenshots.
- **Image Description**: Get a detailed breakdown of what's happening in an image.
- **Diagram Understanding**: I can explain complex flows, architecture diagrams, and wireframes.

## Developer Note
This skill is powered by the `AntigravityProvider` multimodal upgrade, which sends image data as `inline_data` to the Gemini API using your existing Google session.

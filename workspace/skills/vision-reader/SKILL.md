---
name: vision-reader
description: "Enables the agent to read and analyze image files using multimodal vision. Supports OCR, diagram analysis, and scene description."
triggers: ["read attached image", "analyze image", "what is in this image", "extract text from image", "read screenshot"]
risk: safe
source: local
---

# Vision Reader

## Purpose
To provide structured and detailed analysis of images (screenshots, diagrams, documents) that the user provides via absolute file paths.

## When to Use
- When you need to understand the content of an image file.
- When you want to extract text from a screenshot.
- When you need a breakdown of a complex diagram or architecture.

## Capabilities
- **OCR**: Extracting text from images with high accuracy.
- **Scene Description**: Describing the visual elements and context of a photo.
- **Diagram Analysis**: Identifying components, flows, and relationships in technical drawings.

## Patterns
1. **Locate Image**: Identify the file path provided by the user. If only a filename is provided, search the current directory.
2. **Access File**: Use `view_file` on the absolute path to load the visual data.
3. **Multimodal Analysis**: Use internal vision reasoning to process the image based on the specific trigger (e.g., "extract text" vs "analyze diagram").
4. **Structured Response**:
   - Provide a concise summary first.
   - List detailed findings (text, objects, etc.).
   - Offer follow-up questions or actions based on the analysis.

## Sharp Edges
- **Path Resolution**: Always verify the path exists using `list_dir` if the user provides a relative path.
- **Image Size**: Be aware of model context limits; extremely large high-resolution images might be truncated if not handled correctly by the provider.

## Related Skills
`ai-engineer`, `computer-vision-expert`

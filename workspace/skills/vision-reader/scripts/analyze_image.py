import sys
import os
from PIL import Image

def analyze_image(file_path):
    if not os.path.exists(file_path):
        print(f"Error: File {file_path} not found.")
        return

    try:
        with Image.open(file_path) as img:
            print(f"--- Image Metadata ---")
            print(f"Format: {img.format}")
            print(f"Mode: {img.mode}")
            print(f"Size: {img.width}x{img.height}")
            print(f"----------------------")
    except Exception as e:
        print(f"Error analyzing image: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python analyze_image.py <image_path>")
    else:
        analyze_image(sys.argv[1])

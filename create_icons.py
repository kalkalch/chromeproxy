#!/usr/bin/env python3
"""
Chrome Extension Icon Generator
Generates all required icon sizes for Chrome extension
"""

import os
import sys
import argparse
from PIL import Image, ImageDraw

def create_icon(size, output_dir, disabled=False):
    """Create an icon of specified size"""
    # Create image with transparent background
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    # Colors
    if disabled:
        primary_color = (128, 128, 128, 255)  # Gray
        secondary_color = (96, 96, 96, 255)   # Darker gray
    else:
        primary_color = (102, 126, 234, 255)  # Blue gradient start
        secondary_color = (118, 75, 162, 255) # Purple gradient end
    
    # Calculate dimensions based on size
    center = size // 2
    radius = size // 3
    
    # Draw main circle (proxy symbol)
    circle_bbox = [
        center - radius,
        center - radius,
        center + radius,
        center + radius
    ]
    draw.ellipse(circle_bbox, fill=primary_color, outline=secondary_color, width=max(1, size//32))
    
    # Draw connection lines (network symbol)
    line_width = max(1, size // 16)
    line_length = radius // 2
    
    # Horizontal lines
    draw.line([
        center - radius - line_length, center,
        center - radius, center
    ], fill=secondary_color, width=line_width)
    
    draw.line([
        center + radius, center,
        center + radius + line_length, center
    ], fill=secondary_color, width=line_width)
    
    # Vertical lines
    draw.line([
        center, center - radius - line_length,
        center, center - radius
    ], fill=secondary_color, width=line_width)
    
    draw.line([
        center, center + radius,
        center, center + radius + line_length
    ], fill=secondary_color, width=line_width)
    
    # Add small dots at line ends
    dot_radius = max(1, size // 32)
    positions = [
        (center - radius - line_length, center),
        (center + radius + line_length, center),
        (center, center - radius - line_length),
        (center, center + radius + line_length)
    ]
    
    for x, y in positions:
        dot_bbox = [x - dot_radius, y - dot_radius, x + dot_radius, y + dot_radius]
        draw.ellipse(dot_bbox, fill=secondary_color)
    
    # Save the icon
    suffix = '-disabled' if disabled else ''
    filename = f'icon{size}{suffix}.png'
    filepath = os.path.join(output_dir, filename)
    img.save(filepath, 'PNG')
    print(f'✓ Created {filename}')

def main():
    """Main function"""
    parser = argparse.ArgumentParser(description='Generate Chrome extension icons')
    parser.add_argument('--output', '-o', default='icons', 
                       help='Output directory for icons (default: icons)')
    
    args = parser.parse_args()
    output_dir = args.output
    
    # Create output directory if it doesn't exist
    os.makedirs(output_dir, exist_ok=True)
    
    print(f'Generating icons in: {output_dir}')
    
    # Standard Chrome extension icon sizes
    sizes = [16, 32, 48, 128]
    
    try:
        # Create regular icons
        for size in sizes:
            create_icon(size, output_dir, disabled=False)
        
        # Create disabled icon (only 32px needed)
        create_icon(32, output_dir, disabled=True)
        
        print(f'\n✅ All icons generated successfully in {output_dir}/')
        
    except Exception as e:
        print(f'❌ Error generating icons: {e}')
        sys.exit(1)

if __name__ == '__main__':
    main() 
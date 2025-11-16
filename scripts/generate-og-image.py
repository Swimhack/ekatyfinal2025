#!/usr/bin/env python3
"""
Generate a bold, modern OG image for eKaty
Size: 1200x630 pixels
"""

from PIL import Image, ImageDraw, ImageFont
import math

# Image dimensions
WIDTH = 1200
HEIGHT = 630

# eKaty brand colors
BG_DARK = (15, 23, 42)  # slate-900 #0f172a
BG_MEDIUM = (30, 41, 59)  # slate-800 #1e293b
RED_PRIMARY = (239, 68, 68)  # #ef4444
RED_DARK = (220, 38, 38)  # #dc2626
RED_DARKER = (185, 28, 28)  # #b91c1c
WHITE = (255, 255, 255)
GRAY_LIGHT = (148, 163, 184)  # slate-400 #94a3b8

def create_gradient_background(draw, width, height):
    """Create a diagonal gradient background"""
    for y in range(height):
        # Calculate gradient interpolation (0 to 1)
        ratio = y / height

        # Interpolate between BG_DARK and BG_MEDIUM
        r = int(BG_DARK[0] + (BG_MEDIUM[0] - BG_DARK[0]) * ratio)
        g = int(BG_DARK[1] + (BG_MEDIUM[1] - BG_DARK[1]) * ratio)
        b = int(BG_DARK[2] + (BG_MEDIUM[2] - BG_DARK[2]) * ratio)

        draw.rectangle([(0, y), (width, y + 1)], fill=(r, g, b))

def draw_circle_glow(draw, center_x, center_y, radius, color, alpha_max=30):
    """Draw a glowing circle effect"""
    for r in range(radius, 0, -10):
        alpha = int((r / radius) * alpha_max)
        glow_color = color + (alpha,)
        draw.ellipse(
            [center_x - r, center_y - r, center_x + r, center_y + r],
            fill=glow_color
        )

def main():
    print("🎨 Creating bold, modern OG image for eKaty...")

    # Create image with RGBA for transparency effects
    img = Image.new('RGBA', (WIDTH, HEIGHT), BG_DARK)
    draw = ImageDraw.Draw(img, 'RGBA')

    # Create gradient background
    create_gradient_background(draw, WIDTH, HEIGHT)

    # Add geometric background elements
    # Large red glow circle (top right)
    draw_circle_glow(draw, WIDTH - 100, -100, 300, RED_PRIMARY, alpha_max=40)

    # Smaller red glow circle (bottom left)
    draw_circle_glow(draw, -50, HEIGHT + 50, 200, RED_PRIMARY, alpha_max=25)

    # Diagonal stripe effect
    stripe_overlay = Image.new('RGBA', (WIDTH, HEIGHT), (0, 0, 0, 0))
    stripe_draw = ImageDraw.Draw(stripe_overlay, 'RGBA')

    # Draw diagonal stripe
    stripe_color = RED_PRIMARY + (15,)  # 15/255 opacity
    for i in range(-400, WIDTH + 400, 60):
        points = [
            (i, 0),
            (i + 200, 0),
            (i + 500, HEIGHT),
            (i + 300, HEIGHT)
        ]
        stripe_draw.polygon(points, fill=stripe_color)

    # Composite stripe overlay
    img = Image.alpha_composite(img, stripe_overlay)
    draw = ImageDraw.Draw(img, 'RGBA')

    # Load fonts (using default fonts with different sizes)
    # We'll try to use a bold system font
    try:
        # Try to find Inter or similar bold font
        logo_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 140)
        tagline_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 56)
        desc_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 38)
        badge_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 28)
    except:
        # Fallback to default font
        logo_font = ImageFont.load_default()
        tagline_font = ImageFont.load_default()
        desc_font = ImageFont.load_default()
        badge_font = ImageFont.load_default()

    # Draw AI-POWERED badge (top right)
    badge_text = "AI-POWERED"
    badge_x = WIDTH - 260
    badge_y = 50
    badge_width = 230
    badge_height = 60

    # Badge background with gradient
    badge_gradient = Image.new('RGBA', (badge_width, badge_height), (0, 0, 0, 0))
    badge_draw = ImageDraw.Draw(badge_gradient, 'RGBA')
    for i in range(badge_height):
        ratio = i / badge_height
        r = int(RED_PRIMARY[0] + (RED_DARK[0] - RED_PRIMARY[0]) * ratio)
        g = int(RED_PRIMARY[1] + (RED_DARK[1] - RED_PRIMARY[1]) * ratio)
        b = int(RED_PRIMARY[2] + (RED_DARK[2] - RED_PRIMARY[2]) * ratio)
        badge_draw.rectangle([(0, i), (badge_width, i + 1)], fill=(r, g, b, 255))

    # Make rounded rectangle by masking
    badge_rounded = Image.new('L', (badge_width, badge_height), 0)
    badge_mask_draw = ImageDraw.Draw(badge_rounded)
    badge_mask_draw.rounded_rectangle([(0, 0), (badge_width, badge_height)], radius=30, fill=255)

    # Apply the rounded mask
    badge_final = Image.new('RGBA', (badge_width, badge_height), (0, 0, 0, 0))
    badge_final.paste(badge_gradient, (0, 0), badge_rounded)

    # Paste badge onto main image
    img.paste(badge_final, (badge_x, badge_y), badge_final)
    draw = ImageDraw.Draw(img, 'RGBA')

    # Draw badge text
    # Get text bbox for centering
    bbox = draw.textbbox((0, 0), badge_text, font=badge_font)
    text_width = bbox[2] - bbox[0]
    text_x = badge_x + (badge_width - text_width) // 2
    text_y = badge_y + 18
    draw.text((text_x, text_y), badge_text, fill=WHITE, font=badge_font)

    # Main content positioning
    content_x = 100
    content_y = 200

    # Draw logo "eKaty.com"
    logo_y = content_y

    # "eKaty" in red
    ekaty_text = "eKaty"
    draw.text((content_x, logo_y), ekaty_text, fill=RED_PRIMARY, font=logo_font)

    # Get width of "eKaty" to position ".com"
    ekaty_bbox = draw.textbbox((content_x, logo_y), ekaty_text, font=logo_font)
    ekaty_width = ekaty_bbox[2] - ekaty_bbox[0]

    # ".com" in white (slightly smaller)
    try:
        com_font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 105)
    except:
        com_font = logo_font

    com_x = content_x + ekaty_width
    com_y = logo_y + 25  # Slight vertical adjustment
    draw.text((com_x, com_y), ".com", fill=WHITE, font=com_font)

    # Tagline
    tagline_y = logo_y + 160
    tagline_text = "Discover Katy's Best"
    draw.text((content_x, tagline_y), tagline_text, fill=WHITE, font=tagline_font)

    tagline2_y = tagline_y + 65
    tagline2_text = "Restaurants"
    draw.text((content_x, tagline2_y), tagline2_text, fill=WHITE, font=tagline_font)

    # Description
    desc_y = tagline2_y + 90
    desc_text = "500+ Local Restaurants • Interactive Map • Grub Roulette"
    draw.text((content_x, desc_y), desc_text, fill=GRAY_LIGHT, font=desc_font)

    # Add accent bar at bottom
    accent_height = 12
    accent_y = HEIGHT - accent_height

    # Create gradient accent bar
    for i in range(WIDTH):
        ratio = i / WIDTH
        if ratio < 0.5:
            # First half: RED_PRIMARY to RED_DARK
            r = int(RED_PRIMARY[0] + (RED_DARK[0] - RED_PRIMARY[0]) * (ratio * 2))
            g = int(RED_PRIMARY[1] + (RED_DARK[1] - RED_PRIMARY[1]) * (ratio * 2))
            b = int(RED_PRIMARY[2] + (RED_DARK[2] - RED_PRIMARY[2]) * (ratio * 2))
        else:
            # Second half: RED_DARK to RED_DARKER
            r = int(RED_DARK[0] + (RED_DARKER[0] - RED_DARK[0]) * ((ratio - 0.5) * 2))
            g = int(RED_DARK[1] + (RED_DARKER[1] - RED_DARK[1]) * ((ratio - 0.5) * 2))
            b = int(RED_DARK[2] + (RED_DARKER[2] - RED_DARK[2]) * ((ratio - 0.5) * 2))

        draw.rectangle([(i, accent_y), (i + 1, HEIGHT)], fill=(r, g, b))

    # Convert to RGB for PNG output
    final_img = Image.new('RGB', (WIDTH, HEIGHT), BG_DARK)
    final_img.paste(img, (0, 0), img)

    # Save the image
    output_path = '/home/user/ekatyfinal2025/public/og-image-new.png'
    final_img.save(output_path, 'PNG', optimize=True)

    print(f"✅ OG image generated successfully!")
    print(f"📁 Saved to: {output_path}")
    print(f"📏 Dimensions: {WIDTH} x {HEIGHT} pixels")

    # Get file size
    import os
    file_size = os.path.getsize(output_path)
    file_size_kb = file_size / 1024
    print(f"📊 File size: {file_size_kb:.2f} KB")
    print("\n🎉 All done!")

if __name__ == "__main__":
    main()

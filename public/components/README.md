# Component Images Folder

This folder is used by the **Auto Image Matcher** feature to automatically assign images to products.

## File Naming Convention

Name your component images using the SKU format with dashes instead of special characters:

- **SKU**: `RES-10K` → **Filename**: `res-10k.jpg`
- **SKU**: `CAP-100U` → **Filename**: `cap-100u.jpg`
- **SKU**: `IC-7805` → **Filename**: `ic-7805.jpg`

## Supported Formats

- `.jpg` / `.jpeg`
- `.png`
- `.webp`
- `.gif`

## How It Works

1. The Auto Image Matcher scans all products with missing images
2. For each product, it looks for a matching image in this folder
3. If found, it automatically updates the product's image URL
4. If not found locally, it can search Unsplash (if API key configured)
5. Future: AI image generation for custom components

## Example Structure

```
/public/components/
├── res-10k.jpg          (10kΩ Resistor)
├── cap-100u.jpg         (100µF Capacitor)
├── ic-7805.jpg          (LM7805 Voltage Regulator)
├── led-red-5mm.jpg      (Red LED 5mm)
└── arduino-uno.jpg      (Arduino Uno Board)
```

## Tips

- Use clear, high-quality images (at least 300x300px)
- Use transparent PNGs for components with no background
- Keep file sizes under 500KB for fast loading
- Use descriptive filenames matching your SKU patterns

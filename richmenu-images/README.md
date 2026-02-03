# Rich Menu Images

Place your Rich Menu images here, then run:

```bash
node upload-richmenu-images.js
```

## Required files

| File             | Rich Menu   | Description        |
|------------------|-------------|--------------------|
| `user.png` or `user.jpg`       | User        | Customer menu      |
| `shop_master.png` or `shop_master.jpg` | Shop Master | Staff menu         |
| `admin.png` or `admin.jpg`     | Admin       | Admin menu         |

You can use either PNG or JPEG. The script will use whichever file exists (e.g. `user.png` is used if present, otherwise `user.jpg`).

## Image specs (LINE requirement)

- **Size:** **2500 × 1686 pixels** (exact)
- **Format:** PNG or JPEG
- **Max file size:** 1 MB

## Layout reference (from create-richmenu.js)

Use these areas when designing your image so tap zones match:

- **User menu:** 6 areas (2×3 grid)
  - Row 1: Order Now (left), My Orders (right)
  - Row 2: My Points (left), My Profile (right)
  - Row 3: Contact (left), Help (right)

- **Shop Master menu:** 4 areas (2×2)
  - Top: Dashboard (left), Pending Orders (right)
  - Bottom: Menu (left), Settings (right)

- **Admin menu:** 4 areas (2×2)
  - Top: Admin Dashboard (left), Shop Masters (right)
  - Bottom: All Users (left), Analytics (right)

## Tips

- Use **Canva**, **Figma**, or **Photoshop** with a 2500×1686 canvas.
- Add labels or icons in each half/quarter so users know what they’re tapping.
- Keep important content away from the very edges.
- Export as PNG for sharp text, or JPEG to keep file size smaller.

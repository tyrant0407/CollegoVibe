# ImageKit Cloud Storage Setup

This application now uses ImageKit for cloud-based image storage instead of local file storage.

## Setup Instructions

### 1. Create ImageKit Account
1. Go to [ImageKit.io](https://imagekit.io) and create a free account
2. After registration, go to your Dashboard

### 2. Get Your Credentials
1. In the ImageKit Dashboard, go to "Developer Options" → "API Keys"
2. Copy the following values:
   - **Public Key**
   - **Private Key** 
   - **URL Endpoint** (format: `https://ik.imagekit.io/your_imagekit_id`)

### 3. Update Environment Variables
Update your `.env` file with your ImageKit credentials:

```env
# ImageKit Configuration
IMAGEKIT_PUBLIC_KEY=your_actual_public_key_here
IMAGEKIT_PRIVATE_KEY=your_actual_private_key_here
IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your_actual_imagekit_id_here
```

### 4. Features Implemented

#### Image Upload
- **Profile Images**: Stored in `profiles/` folder on ImageKit
- **Post Images**: Stored in `posts/` folder on ImageKit  
- **Story Images**: Stored in `stories/` folder on ImageKit

#### Image Optimization
- Automatic format optimization (WebP when supported)
- Quality optimization (80% for regular images, 70% for thumbnails)
- Responsive image sizing
- Circular profile images with radius transformation

#### Backward Compatibility
- Existing local images will continue to work
- New uploads will use ImageKit cloud storage
- Template helper functions handle both local and cloud URLs

### 5. API Endpoints

#### ImageKit Authentication
- `GET /imagekit/auth` - Returns authentication parameters for client-side uploads

### 6. File Structure
```
config/
  └── imagekit.js          # ImageKit configuration
routes/
  ├── multer.js           # Updated multer config with ImageKit integration
  └── imagekit-auth.js    # ImageKit authentication endpoint
utils/
  ├── imageUtils.js       # Image optimization utilities
  └── templateHelpers.js  # Template helper functions
```

### 7. Benefits
- **Scalability**: No local storage limitations
- **Performance**: Global CDN delivery
- **Optimization**: Automatic image optimization and transformation
- **Reliability**: Cloud-based storage with backup
- **Cost-effective**: Free tier includes 20GB storage and 20GB bandwidth

### 8. Usage in Templates
The application automatically handles image URLs using helper functions:

```html
<!-- Profile images (circular, optimized) -->
<img src="<%=getImageUrl(user.profileImage, 'profile')%>" alt="Profile">

<!-- Post images (optimized) -->
<img src="<%=getImageUrl(post.picture)%>" alt="Post">

<!-- Thumbnail images -->
<img src="<%=getImageUrl(image.url, 'thumbnail')%>" alt="Thumbnail">
```

### 9. Security
- Private key is server-side only
- File uploads are validated for image types only
- 5MB file size limit enforced
- Unique filenames prevent conflicts
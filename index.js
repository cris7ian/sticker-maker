const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const directoryPath = 'stickers';

async function scaleImage(inputPath) {
  const outputPath = path.join(
    path.dirname(inputPath),
    path.basename(inputPath, path.extname(inputPath)) + '.png'
  );

  // Skip if PNG already exists
  if (fs.existsSync(outputPath)) {
    console.log(`Skipping ${inputPath}, output already exists.`);
    return;
  }

  const metadata = await sharp(inputPath).metadata();
  const aspectRatio = metadata.width / metadata.height;

  let newWidth, newHeight;
  if (aspectRatio > 1) {
    newWidth = 512;
    newHeight = Math.round(512 / aspectRatio);
  } else {
    newHeight = 512;
    newWidth = Math.round(512 * aspectRatio);
  }

  const background = await sharp({
    create: {
      width: 512,
      height: 512,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  }).png().toBuffer();

  const resizedImage = await sharp(inputPath)
    .resize(newWidth, newHeight)
    .toBuffer();

  const generateImage = async (quality = 100) => {
    await sharp(background)
      .composite([{
        input: resizedImage,
        top: Math.round((512 - newHeight) / 2),
        left: Math.round((512 - newWidth) / 2)
      }])
      .png({ quality })
      .toFile(outputPath);

    const stats = fs.statSync(outputPath);
    const fileSizeInBytes = stats['size'];
    return fileSizeInBytes / 1024;
  };

  let quality = 100;
  let fileSize = await generateImage(quality);
  while (fileSize > 512 && quality > 10) {
    quality -= 10;
    fileSize = await generateImage(quality);
  }

  if (fileSize <= 512) {
    console.log(`Processed ${inputPath}: ${fileSize.toFixed(2)}KB`);
  } else {
    console.log(`Unable to reduce the image size of ${inputPath} under 512KB without significantly compromising quality.`);
  }
}

// Read the directory and process each jpg file
fs.readdir(directoryPath, (err, files) => {
  if (err) {
    console.error(`Could not read the directory: ${err}`);
    return;
  }

  files.forEach(file => {
    if (path.extname(file) === '.jpg') {
      scaleImage(path.join(directoryPath, file));
    }
  });
});

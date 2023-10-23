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

  const resizedImage = await sharp(inputPath)
    .resize(newWidth, newHeight)
    .png()
    .toBuffer();

  const generateImage = async (quality = 100) => {
    await sharp(resizedImage)
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

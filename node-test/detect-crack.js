const axios = require("axios");
const fs = require("fs");
const Jimp = require("jimp");
const sharp = require("sharp");

const image = fs.readFileSync("wow.png", { encoding: "base64" });

axios({
  method: "POST",
 url: "https://serverless.roboflow.com/road-damage-detection-lfxky/1",
  params: {
    api_key: "FTuuRpZ2MhrxAKU1uOwc"
  },
  data: image,
  headers: {
    "Content-Type": "application/x-www-form-urlencoded"
  }
})
  .then(async function(response) {
    console.log(response.data);
    
    const predictions = response.data.predictions;
    
    if (predictions.length === 0) {
      console.log("No cracks/potholes detected!");
      return;
    }
    
    // Convert WebP to PNG first if needed
    await sharp("wow.png").png().toFile("temp_converted_crack.png");
    
    // Load the image with Jimp
    const img = await Jimp.read("temp_converted_crack.png");
    
    // Load font for text
    const font = await Jimp.loadFont(Jimp.FONT_SANS_16_WHITE);
    
    // Draw bounding boxes
    predictions.forEach(pred => {
      const { x, y, width, height, class: className, confidence } = pred;
      
      // Calculate box coordinates (x,y is center)
      const boxX = Math.round(x - width / 2);
      const boxY = Math.round(y - height / 2);
      const boxWidth = Math.round(width);
      const boxHeight = Math.round(height);
      
      const color = 0xFF0000FF; // Red with full opacity
      const thickness = 3;
      
      // Draw rectangle (top, bottom, left, right lines)
      for (let i = 0; i < thickness; i++) {
        // Top line
        for (let px = boxX; px < boxX + boxWidth; px++) {
          img.setPixelColor(color, px, boxY + i);
        }
        // Bottom line
        for (let px = boxX; px < boxX + boxWidth; px++) {
          img.setPixelColor(color, px, boxY + boxHeight - i);
        }
        // Left line
        for (let py = boxY; py < boxY + boxHeight; py++) {
          img.setPixelColor(color, boxX + i, py);
        }
        // Right line
        for (let py = boxY; py < boxY + boxHeight; py++) {
          img.setPixelColor(color, boxX + boxWidth - i, py);
        }
      }
      
      // Add label
      const label = `${className} ${(confidence * 100).toFixed(1)}%`;
      img.print(font, boxX + 5, boxY - 20, label);
    });
    
    // Save the annotated image
    await img.writeAsync("wow_crack_annotated.png");
    
    // Clean up temp file
    fs.unlinkSync("temp_converted_crack.png");
    
    console.log("\nAnnotated image saved as 'wow_crack_annotated.png'");
    console.log(`Detected ${predictions.length} crack(s)/pothole(s)`);
  })
  .catch(function(error) {
    console.log(error.message);
  });

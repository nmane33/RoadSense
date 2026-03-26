const axios = require("axios");
const fs = require("fs");
const Jimp = require("jimp");
const sharp = require("sharp");

const image = fs.readFileSync("wow.png", { encoding: "base64" });

// Run both models in parallel
Promise.all([
  // Model 1: Pothole detection
  axios({
    method: "POST",
    url: "https://serverless.roboflow.com/pothole-detection-project-1dpiq/5",
    params: { api_key: "FTuuRpZ2MhrxAKU1uOwc" },
    data: image,
    headers: { "Content-Type": "application/x-www-form-urlencoded" }
  }),
  // Model 2: Road cracks
  axios({
    method: "POST",
    url: "https://serverless.roboflow.com/road-cracks-sjmd3/3",
    params: { api_key: "FTuuRpZ2MhrxAKU1uOwc" },
    data: image,
    headers: { "Content-Type": "application/x-www-form-urlencoded" }
  })
])
  .then(async function([response1, response2]) {
    console.log("=== POTHOLE MODEL RESULTS ===");
    console.log(response1.data);
    console.log("\n=== ROAD CRACKS MODEL RESULTS ===");
    console.log(response2.data);
    
    const potholes = response1.data.predictions;
    const cracks = response2.data.predictions;
    
    // Combine all predictions for quality score
    const allPredictions = [...potholes, ...cracks];
    
    // ── QUALITY SCORE ──────────────────────────────
    function calculateScore(predictions) {
      let penalty = 0;
      predictions.forEach(defect => {
        if (defect.class === "Pothole" || defect.class === "pothole") penalty += 15;
        if (defect.class === "alligator cracking" || defect.class === "Alligator cracking") penalty += 10;
        if (defect.class === "crack" || defect.class === "Crack") penalty += 5;
        if (defect.class === "Weathering" || defect.class === "weathering") penalty += 3;
      });
      const score = Math.max(0, 100 - penalty);
      const status = score >= 80 ? "🟢 GOOD" : score >= 50 ? "🟡 MODERATE" : "🔴 CRITICAL";
      return { score, status };
    }
    
    const { score, status } = calculateScore(allPredictions);
    
    console.log(`\n=== SUMMARY ===`);
    console.log(`Potholes detected: ${potholes.length}`);
    console.log(`Cracks detected: ${cracks.length}`);
    console.log(`Total detections: ${potholes.length + cracks.length}`);
    console.log(`\nRoad Quality Score: ${score}/100 — ${status}`);
    
    if (potholes.length === 0 && cracks.length === 0) {
      console.log("No issues detected!");
      return;
    }
    
    // Convert WebP to PNG first if needed
    await sharp("wow.png").png().toFile("temp_combined.png");
    
    // Load the image with Jimp
    const img = await Jimp.read("temp_combined.png");
    
    // Load font for text
    const font = await Jimp.loadFont(Jimp.FONT_SANS_16_WHITE);
    
    // Draw potholes in GREEN
    potholes.forEach(pred => {
      const { x, y, width, height, class: className, confidence } = pred;
      
      const boxX = Math.round(x - width / 2);
      const boxY = Math.round(y - height / 2);
      const boxWidth = Math.round(width);
      const boxHeight = Math.round(height);
      
      const color = 0x00FF00FF; // Green
      const thickness = 3;
      
      // Draw rectangle
      for (let i = 0; i < thickness; i++) {
        for (let px = boxX; px < boxX + boxWidth; px++) {
          img.setPixelColor(color, px, boxY + i);
          img.setPixelColor(color, px, boxY + boxHeight - i);
        }
        for (let py = boxY; py < boxY + boxHeight; py++) {
          img.setPixelColor(color, boxX + i, py);
          img.setPixelColor(color, boxX + boxWidth - i, py);
        }
      }
      
      const label = `${className} ${(confidence * 100).toFixed(1)}%`;
      img.print(font, boxX + 5, boxY - 20, label);
    });
    
    // Draw cracks in RED
    cracks.forEach(pred => {
      const { x, y, width, height, class: className, confidence } = pred;
      
      const boxX = Math.round(x - width / 2);
      const boxY = Math.round(y - height / 2);
      const boxWidth = Math.round(width);
      const boxHeight = Math.round(height);
      
      const color = 0xFF0000FF; // Red
      const thickness = 3;
      
      // Draw rectangle
      for (let i = 0; i < thickness; i++) {
        for (let px = boxX; px < boxX + boxWidth; px++) {
          img.setPixelColor(color, px, boxY + i);
          img.setPixelColor(color, px, boxY + boxHeight - i);
        }
        for (let py = boxY; py < boxY + boxHeight; py++) {
          img.setPixelColor(color, boxX + i, py);
          img.setPixelColor(color, boxX + boxWidth - i, py);
        }
      }
      
      const label = `${className} ${(confidence * 100).toFixed(1)}%`;
      img.print(font, boxX + 5, boxY - 20, label);
    });
    
    // Save the combined annotated image
    await img.writeAsync("wow_combined_annotated.png");
    
    // Clean up temp file
    fs.unlinkSync("temp_combined.png");
    
    console.log("\n✓ Combined annotated image saved as 'wow_combined_annotated.png'");
    console.log("  Green boxes = Potholes");
    console.log("  Red boxes = Cracks");
  })
  .catch(function(error) {
    console.log(error.message);
  });

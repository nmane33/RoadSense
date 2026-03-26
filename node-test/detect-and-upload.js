require("dotenv").config();
const axios = require("axios");
const fs = require("fs");
const Jimp = require("jimp");
const sharp = require("sharp");
const { createClient } = require("@supabase/supabase-js");

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const imagePath = "wow.png";
const image = fs.readFileSync(imagePath, { encoding: "base64" });

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
    await sharp(imagePath).png().toFile("temp_combined.png");
    
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
    const annotatedPath = "wow_combined_annotated.png";
    await img.writeAsync(annotatedPath);
    
    // Clean up temp file
    fs.unlinkSync("temp_combined.png");
    
    console.log("\n✓ Combined annotated image saved locally");
    console.log("  Green boxes = Potholes");
    console.log("  Red boxes = Cracks");
    
    // ── UPLOAD TO SUPABASE ──────────────────────────
    console.log("\n=== UPLOADING TO SUPABASE ===");
    
    const timestamp = Date.now();
    const originalFileName = `original_${timestamp}.png`;
    const annotatedFileName = `annotated_${timestamp}.png`;
    
    // Read files as buffers
    const originalBuffer = fs.readFileSync(imagePath);
    const annotatedBuffer = fs.readFileSync(annotatedPath);
    
    // Upload original image
    const { data: originalData, error: originalError } = await supabase.storage
      .from("road-originals")
      .upload(originalFileName, originalBuffer, {
        contentType: "image/png"
      });
    
    if (originalError) {
      console.log("❌ Error uploading original:", originalError.message);
    } else {
      console.log("✅ Original uploaded:", originalFileName);
    }
    
    // Upload annotated image
    const { data: annotatedData, error: annotatedError } = await supabase.storage
      .from("road-annotated")
      .upload(annotatedFileName, annotatedBuffer, {
        contentType: "image/png"
      });
    
    if (annotatedError) {
      console.log("❌ Error uploading annotated:", annotatedError.message);
    } else {
      console.log("✅ Annotated uploaded:", annotatedFileName);
    }
    
    console.log("\n🎉 Process complete!");
  })
  .catch(function(error) {
    console.log("❌ Error:", error.message);
  });

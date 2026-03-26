const axios = require("axios");
const fs = require("fs");
require("dotenv").config();

async function testRoboflow() {
  try {
    console.log("🧪 Testing Roboflow AI Detection\n");

    const testImagePath = "../node-test/wow.png";
    if (!fs.existsSync(testImagePath)) {
      console.error("❌ Test image not found");
      return;
    }

    const base64Image = fs.readFileSync(testImagePath, { encoding: "base64" });

    console.log("1️⃣ Calling Pothole Detection Model...");
    const potholeResponse = await axios({
      method: "POST",
      url: process.env.ROBOFLOW_POTHOLE_URL,
      params: { 
        api_key: process.env.ROBOFLOW_API_KEY,
        confidence: 30,
        overlap: 25
      },
      data: base64Image,
      headers: { "Content-Type": "application/x-www-form-urlencoded" }
    });

    console.log("✅ Potholes detected:", potholeResponse.data.predictions.length);

    console.log("\n2️⃣ Calling Crack Detection Model...");
    const crackResponse = await axios({
      method: "POST",
      url: process.env.ROBOFLOW_CRACK_URL,
      params: { 
        api_key: process.env.ROBOFLOW_API_KEY,
        confidence: 30,
        overlap: 25
      },
      data: base64Image,
      headers: { "Content-Type": "application/x-www-form-urlencoded" }
    });

    console.log("✅ Cracks detected:", crackResponse.data.predictions.length);

    const allPredictions = [
      ...potholeResponse.data.predictions,
      ...crackResponse.data.predictions
    ];

    console.log("\n📊 Total Defects:", allPredictions.length);
    console.log("\n🎯 Defect Details:");
    allPredictions.forEach((defect, i) => {
      console.log(`  ${i + 1}. ${defect.class} - ${(defect.confidence * 100).toFixed(1)}% confidence`);
    });

    // Calculate score
    const PENALTIES = {
      "pothole": 15,
      "Pothole": 15,
      "alligator cracking": 10,
      "Alligator cracking": 10,
      "crack": 5,
      "Crack": 5,
      "weathering": 3,
      "Weathering": 3
    };

    let totalPenalty = 0;
    allPredictions.forEach(defect => {
      totalPenalty += PENALTIES[defect.class] || 5;
    });

    const score = Math.max(0, 100 - totalPenalty);
    const status = score >= 80 ? "Good" : score >= 50 ? "Moderate" : "Critical";

    console.log("\n🏆 Road Quality Score:", score, "/100");
    console.log("📍 Status:", status);

  } catch (error) {
    console.error("\n❌ Test failed:");
    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Error:", error.response.data);
    } else {
      console.error(error.message);
    }
  }
}

testRoboflow();

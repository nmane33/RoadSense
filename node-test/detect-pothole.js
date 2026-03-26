const axios = require("axios");
const fs = require("fs");

const image = fs.readFileSync("wow.png", { encoding: "base64" });

axios({
  method: "POST",
  url: "https://serverless.roboflow.com/pothole-detection-project-1dpiq/5",
  params: {
    api_key: "FTuuRpZ2MhrxAKU1uOwc"
  },
  data: image,
  headers: {
    "Content-Type": "application/x-www-form-urlencoded"
  }
})
  .then(function(response) {
    console.log(response.data);
  })
  .catch(function(error) {
    console.log(error.message);
  });

const urls = [
  "https://grad.ucalgary.ca/future-students/graduate/discover-opportunities/explore-programs/computer-science-msc-thesis",
  "https://www.uvic.ca/ecs/computerscience/programs/msc/index.php",
  "https://www.sfu.ca/fas/computing/future-students/",
];

function decode(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#36;/g, "$")
    .replace(/\s+/g, " ")
    .trim();
}

const phrases = ["IELTS", "tuition", "GPA", "bachelor", "September", "duration", "month", "international", "Master", "MSc"];

for (const url of urls) {
  const response = await fetch(url, {
    redirect: "follow",
    headers: { "User-Agent": "Mozilla/5.0", Accept: "text/html" },
  });
  const text = decode(await response.text());
  console.log("\n##", response.status, response.url, text.length);
  for (const phrase of phrases) {
    const at = text.toLowerCase().indexOf(phrase.toLowerCase());
    if (at < 0) continue;
    console.log(">", phrase, ":", text.slice(Math.max(0, at - 80), at + 240));
  }
}

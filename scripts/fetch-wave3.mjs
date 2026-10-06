import { writeFile } from "node:fs/promises";

const urls = [
  "https://www.qub.ac.uk/courses/postgraduate-taught/artificial-intelligence-msc/",
  "https://www.abdn.ac.uk/study/postgraduate-taught/degree-programmes/1067/artificial-intelligence/",
  "https://www.strath.ac.uk/courses/postgraduatetaught/artificialintelligence/",
  "https://www.surrey.ac.uk/postgraduate/computer-science-msc",
  "https://www.kent.ac.uk/courses/postgraduate/326/advanced-computer-science",
  "https://www.exeter.ac.uk/study/postgraduate/courses/computerscience/computersciencemsc/",
  "https://www.liverpool.ac.uk/courses/msc-advanced-computer-science",
  "https://www.reading.ac.uk/computer-science/msc-advanced-computer-science",
  "https://www.hw.ac.uk/study/postgraduate/artificial-intelligence",
  "https://www.ncl.ac.uk/computing/study/postgraduate/msc-computer-science/",
  "https://omscs.gatech.edu/",
  "https://www.cc.gatech.edu/degree-programs/master-science-computer-science",
  "https://www.cs.purdue.edu/graduate/admission/requirements.html",
  "https://www.cs.columbia.edu/education/ms/ms-cs/",
  "https://www.khoury.northeastern.edu/program/computer-science-ms/",
  "https://catalog.gatech.edu/programs/computer-science-ms/",
  "https://www.cs.utexas.edu/graduate/admissions",
  "https://www.cs.jhu.edu/academic-programs/graduate-studies/mse-in-computer-science/",
  "https://www.southampton.ac.uk/courses/artificial-intelligence-masters-msc",
  "https://www.imperial.ac.uk/study/courses/postgraduate-taught/computing-artificial-intelligence-msc/",
  "https://www.port.ac.uk/study/courses/postgraduate-taught/msc-computer-science",
  "https://www.tcd.ie/courses/postgraduate/fees/",
];

function decode(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&pound;|&#163;|&#44;/g, (m) => (m === "&#44;" ? "," : "£"))
    .replace(/&euro;|&#8364;/g, "€")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function around(text, phrase) {
  const at = text.toLowerCase().indexOf(phrase.toLowerCase());
  if (at < 0) return "";
  return text.slice(Math.max(0, at - 60), at + 180);
}

const interesting = ["overseas", "international", "non-eu", "ielts", "tuition", "£", "€", "$", "2:1", "gpa", "intelligent systems"];

const out = [];
for (let i = 0; i < urls.length; i += 4) {
  const batch = await Promise.all(
    urls.slice(i, i + 4).map(async (url) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 15000);
      try {
        const response = await fetch(url, {
          redirect: "follow",
          signal: controller.signal,
          headers: { "User-Agent": "Mozilla/5.0", Accept: "text/html" },
        });
        const text = decode(await response.text());
        const hits = interesting
          .map((phrase) => around(text, phrase))
          .filter(Boolean)
          .slice(0, 6);
        return { status: response.status, finalUrl: response.url, hits };
      } catch (error) {
        return { status: 0, finalUrl: url, hits: [error instanceof Error ? error.message : "fail"] };
      } finally {
        clearTimeout(timer);
      }
    }),
  );
  for (const item of batch) {
    out.push(item);
    console.log("\n==", item.status, item.finalUrl);
    for (const hit of item.hits) console.log("-", hit.slice(0, 220));
  }
}
await writeFile("data/raw/wave3.json", JSON.stringify(out, null, 2));

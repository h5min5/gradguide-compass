import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const urls = [
  "https://study.ed.ac.uk/programmes/postgraduate-taught/107-artificial-intelligence",
  "https://study.ed.ac.uk/programmes/postgraduate-taught/112-data-science",
  "https://www.imperial.ac.uk/study/courses/postgraduate-taught/2026/computing-artificial-intelligence-msc/",
  "https://www.imperial.ac.uk/study/courses/postgraduate-taught/2026/artificial-intelligence-msc/",
  "https://www.imperial.ac.uk/study/courses/postgraduate-taught/2026/computing-security-msc/",
  "https://www.ucl.ac.uk/prospective-students/graduate/taught-degrees/machine-learning-msc",
  "https://www.ucl.ac.uk/prospective-students/graduate/taught-degrees/data-science-and-machine-learning-msc",
  "https://www.manchester.ac.uk/study/masters/courses/list/09879/msc-artificial-intelligence/",
  "https://www.manchester.ac.uk/study/masters/courses/list/08129/msc-cyber-security/",
  "https://www.gla.ac.uk/postgraduate/taught/datascience/",
  "https://www.gla.ac.uk/postgraduate/taught/computerscience/",
  "https://www.kcl.ac.uk/study/postgraduate-taught/courses/artificial-intelligence-msc",
  "https://www.bristol.ac.uk/study/postgraduate/taught/msc-computer-science/",
  "https://www.southampton.ac.uk/courses/artificial-intelligence-masters-msc",
  "https://www.birmingham.ac.uk/study/courses/postgraduate-taught/artificial-intelligence-and-machine-learning-msc",
  "https://warwick.ac.uk/study/postgraduate/courses/msc-computer-science/",
  "https://www.sheffield.ac.uk/postgraduate/taught/courses/2026/cybersecurity-and-artificial-intelligence-msc",
  "https://courses.leeds.ac.uk/55810/advanced-computer-science-msc",
  "https://www.cardiff.ac.uk/study/postgraduate/taught/courses/course/cybersecurity-msc",
  "https://www.bath.ac.uk/courses/postgraduate-2026/taught-postgraduate-courses/msc-computer-science/",
  "https://www.york.ac.uk/study/postgraduate-taught/courses/msc-cyber-security/",
  "https://www.qmul.ac.uk/postgraduate/taught/coursefinder/courses/artificial-intelligence-msc/",
  "https://www.universityofgalway.ie/courses/taught-postgraduate-courses/computer-science-artificial-intelligence.html",
  "https://www.universityofgalway.ie/courses/taught-postgraduate-courses/computer-science-adaptive-cybersecurity.html",
  "https://www.universityofgalway.ie/courses/taught-postgraduate-courses/computer-science-data-analytics.html",
  "https://www.universityofgalway.ie/courses/taught-postgraduate-courses/software-design-development.html",
  "https://www.universityofgalway.ie/courses/taught-postgraduate-courses/online-artificial-intelligence.html",
  "https://www.tcd.ie/courses/postgraduate/courses/computer-science-intelligent-systems-msc/",
  "https://www.tcd.ie/courses/postgraduate/courses/computer-science-msc/",
  "https://www.ucd.ie/courses/msc-computer-science",
  "https://www.dcu.ie/courses/postgraduate/school-computing/msc-computing",
  "https://www.ucc.ie/en/ckr49/",
  "https://www.maynoothuniversity.ie/study-maynooth/postgraduate-studies/courses/msc-computer-science-software-engineering",
  "https://www.ul.ie/gps/course/software-engineering-msc",
  "https://www.cc.gatech.edu/degree-programs/masters/computer-science",
  "https://mcds.cs.cmu.edu/",
  "https://cs.illinois.edu/admissions/graduate/applications-ms-program",
  "https://www.cs.utexas.edu/graduate-program/masters-program",
  "https://www.cs.columbia.edu/education/ms/mscs/",
  "https://cs.nyu.edu/dynamic/masters/",
  "https://www.khoury.northeastern.edu/programs/computer-science-mscs/",
  "https://www.cs.purdue.edu/graduate/admission/index.html",
  "https://www.cs.umd.edu/grad/mscs",
  "https://cse.ucsd.edu/graduate/degree-programs/ms-computer-science",
  "https://www.cs.stonybrook.edu/students/Graduate-Studies",
  "https://www.cs.washington.edu/academics/graduate/masters",
];

function strip(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

function grab(text, pattern, count = 3) {
  const found = [];
  const flags = pattern.flags.includes("g") ? pattern.flags : `${pattern.flags}g`;
  const re = new RegExp(pattern.source, flags);
  let match;
  while ((match = re.exec(text)) && found.length < count) {
    found.push(match[0].slice(0, 240));
  }
  return found;
}

async function fetchOne(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(url, {
      redirect: "follow",
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    const html = await response.text();
    const text = strip(html);
    return {
      url,
      status: response.status,
      finalUrl: response.url,
      title: (html.match(/<title>([^<]*)<\/title>/i)?.[1] || "").trim(),
      ielts: grab(text, /IELTS[\s\S]{0,140}/i),
      toefl: grab(text, /TOEFL[\s\S]{0,140}/i),
      fees: grab(text, /(?:£|€|\$)\s?\d[\d,]*(?:\.\d+)?/g, 8),
      duration: grab(text, /(?:one year|1 year|12 months|18 months|two years|2 years|full-time)[\s\S]{0,60}/i, 3),
      entry: grab(text, /(?:2:1|first-class|first class|honours|GPA|bachelor)[\s\S]{0,120}/i, 4),
      intake: grab(text, /(?:September|January|October|August)[\s\S]{0,40}/g, 4),
      length: text.length,
    };
  } catch (error) {
    return { url, status: 0, error: error instanceof Error ? error.message : "failed" };
  } finally {
    clearTimeout(timer);
  }
}

const results = [];
for (let i = 0; i < urls.length; i += 5) {
  const batch = urls.slice(i, i + 5);
  const settled = await Promise.all(batch.map(fetchOne));
  for (const item of settled) {
    results.push(item);
    console.log(item.status, item.finalUrl || item.url, item.title || item.error || "");
  }
}

await mkdir(dirname("data/raw/summary.json"), { recursive: true });
await writeFile("data/raw/summary.json", JSON.stringify(results, null, 2));
console.log(`saved ${results.length}`);
